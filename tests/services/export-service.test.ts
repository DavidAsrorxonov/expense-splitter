import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/connection";
import type { CurrencyCode } from "@/domain/currency";
import { parseAmount } from "@/domain/money";
import { NotFoundError } from "@/services/errors";
import {
  addExpense,
  archiveExpense,
  type AddExpenseInput,
} from "@/services/expense-service";
import { exportExpensesCsv } from "@/services/export-service";
import {
  addMember,
  archiveMember,
  createGroup,
} from "@/services/group-service";
import { getGroupOverview } from "@/services/overview-service";
import type { Group, Member } from "@/types";
import { createTestDb } from "../helpers/db";

let db: Db;
let group: Group;
let alice: Member;
let bob: Member;

beforeEach(() => {
  db = createTestDb();
  group = createGroup(db, { name: "Housemates", currency: "JPY" });
  alice = addMember(db, group.id, "Alice");
  bob = addMember(db, group.id, "Bob");
});

afterEach(() => {
  db.close();
});

function spend(overrides: Partial<AddExpenseInput> = {}) {
  return addExpense(db, {
    groupId: group.id,
    paidBy: alice.id,
    amountMinor: 1001,
    note: "Coffee",
    spentOn: "2026-11-05",
    participantIds: [alice.id, bob.id],
    ...overrides,
  });
}

// Decode valid exported CSV, including quoted commas and embedded newlines.
function readCsv(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === ",") {
      row.push(field);
      field = "";
    } else if (!quoted && char === "\r" && text[i + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
    } else {
      field += char;
    }
  }

  expect(quoted).toBe(false);
  expect(row).toEqual([]);
  expect(field).toBe("");

  return rows;
}

function minor(cell: string, currency: CurrencyCode): number {
  if (cell === "") return 0;

  const value = parseAmount(cell, currency);
  if (value === null) {
    throw new Error(`Invalid exported amount: ${cell}`);
  }
  return value;
}

describe("exportExpensesCsv", () => {
  it("exports a BOM, the header, CRLF endings, and integer JPY amounts", () => {
    spend();

    expect(exportExpensesCsv(db, group.id)).toEqual({
      filename: "housemates-expenses.csv",
      content:
        "\uFEFFDate,Note,Paid by,Amount,Status,Alice,Bob\r\n" +
        "2026-11-05,Coffee,Alice,1001,active,501,500\r\n",
    });
  });

  it.each([
    ["Housemates", "housemates-expenses.csv"],
    ["My Trip!", "my-trip-expenses.csv"],
    ["食費", "group-expenses.csv"],
  ])("creates the filename for %s", (name, filename) => {
    const created = createGroup(db, { name, currency: "JPY" });

    expect(exportExpensesCsv(db, created.id).filename).toBe(filename);
  });

  it("exports a header even when the group has no expenses", () => {
    expect(exportExpensesCsv(db, group.id).content).toBe(
      "\uFEFFDate,Note,Paid by,Amount,Status,Alice,Bob\r\n",
    );
  });

  it("excludes archived expenses by default and includes them on request", () => {
    const archived = spend({ spentOn: "2026-11-01" });
    archiveExpense(db, group.id, archived.id);
    archiveMember(db, group.id, bob.id);

    spend({
      note: "Active",
      amountMinor: 250,
      participantIds: [alice.id],
    });

    const activeOnly = readCsv(exportExpensesCsv(db, group.id).content);
    expect(activeOnly).toEqual([
      [
        "Date",
        "Note",
        "Paid by",
        "Amount",
        "Status",
        "Alice",
        "Bob (archived)",
      ],
      ["2026-11-05", "Active", "Alice", "250", "active", "250", ""],
    ]);

    const all = readCsv(
      exportExpensesCsv(db, group.id, { includeArchived: true }).content,
    );
    expect(all).toEqual([
      activeOnly[0],
      ["2026-11-01", "Coffee", "Alice", "1001", "archived", "501", "500"],
      activeOnly[1],
    ]);
  });

  it("keeps the archived payer's name and share column", () => {
    spend({ participantIds: [alice.id] });
    archiveMember(db, group.id, alice.id);

    const table = readCsv(exportExpensesCsv(db, group.id).content);

    expect(table[0][5]).toBe("Alice (archived)");
    expect(table[1][2]).toBe("Alice (archived)");
    expect(table[1][5]).toBe("1001");
  });

  it("escapes commas, quotes, and newlines while preserving Unicode", () => {
    spend({ note: 'Café, "beans"\nand 食費' });

    expect(exportExpensesCsv(db, group.id).content).toBe(
      "\uFEFFDate,Note,Paid by,Amount,Status,Alice,Bob\r\n" +
        '2026-11-05,"Café, ""beans""\nand 食費",Alice,1001,active,501,500\r\n',
    );
  });

  it("neutralizes formulas in notes, member headers, and payer names", () => {
    const member = addMember(db, group.id, "=Carol");
    spend({
      paidBy: member.id,
      participantIds: [member.id],
      note: "=1+1",
    });

    const table = readCsv(exportExpensesCsv(db, group.id).content);

    expect(table[0][7]).toBe("'=Carol");
    expect(table[1][1]).toBe("'=1+1");
    expect(table[1][2]).toBe("'=Carol");
  });

  it("exports USD minor units as two decimal places", () => {
    const usdGroup = createGroup(db, { name: "Trip", currency: "USD" });
    const member = addMember(db, usdGroup.id, "Traveler");

    spend({
      groupId: usdGroup.id,
      paidBy: member.id,
      participantIds: [member.id],
    });

    const row = readCsv(exportExpensesCsv(db, usdGroup.id).content)[1];

    expect(row[3]).toBe("10.01");
    expect(row[5]).toBe("10.01");
  });

  it("does not include another group's expenses, members, or shares", () => {
    spend();
    const other = createGroup(db, { name: "Other", currency: "JPY" });
    const zed = addMember(db, other.id, "Zed");

    spend({
      groupId: other.id,
      paidBy: zed.id,
      participantIds: [zed.id],
      note: "Private trip",
      amountMinor: 9999,
    });

    expect(readCsv(exportExpensesCsv(db, group.id).content)).toEqual([
      ["Date", "Note", "Paid by", "Amount", "Status", "Alice", "Bob"],
      ["2026-11-05", "Coffee", "Alice", "1001", "active", "501", "500"],
    ]);
  });

  it("rejects an unknown group", () => {
    expect(() => exportExpensesCsv(db, "missing")).toThrow(NotFoundError);
  });

  it.each(["JPY", "USD", "EUR", "UZS"] as const)(
    "round-trips shares, monthly totals, and balances for %s",
    (currency) => {
      const trip = createGroup(db, { name: "Trip", currency });
      const a = addMember(db, trip.id, "Alice");
      const b = addMember(db, trip.id, "Bob");
      const c = addMember(db, trip.id, "Carol");

      spend({
        groupId: trip.id,
        paidBy: a.id,
        participantIds: [a.id, b.id, c.id],
        amountMinor: 1001,
        note: 'Coffee, "beans"\nand milk',
        spentOn: "2026-10-01",
      });
      spend({
        groupId: trip.id,
        paidBy: b.id,
        participantIds: [a.id, c.id],
        amountMinor: 755,
        note: "=1+1",
      });
      spend({
        groupId: trip.id,
        paidBy: c.id,
        participantIds: [b.id],
        amountMinor: 300,
        note: "Café 食費",
      });

      const archived = spend({
        groupId: trip.id,
        paidBy: a.id,
        participantIds: [a.id, b.id],
        amountMinor: 4000,
      });
      archiveExpense(db, trip.id, archived.id);

      const overview = getGroupOverview(db, trip.id);
      const [header, ...rows] = readCsv(exportExpensesCsv(db, trip.id).content);

      expect(rows).toHaveLength(3);
      expect(rows.every((row) => row[4] === "active")).toBe(true);
      expect(rows.map((row) => row[1])).toEqual([
        'Coffee, "beans"\nand milk',
        "'=1+1",
        "Café 食費",
      ]);

      // Each expense's shares add up to its amount.
      for (const row of rows) {
        const shares = row
          .slice(5)
          .reduce((sum, cell) => sum + minor(cell, currency), 0);
        expect(shares).toBe(minor(row[3], currency));
      }

      // Exported spending matches the overview's monthly totals.
      const exportedTotal = rows.reduce(
        (sum, row) => sum + minor(row[3], currency),
        0,
      );
      const monthlyTotal = overview.monthlyTotals.reduce(
        (sum, month) => sum + month.totalMinor,
        0,
      );
      expect(exportedTotal).toBe(2056);
      expect(exportedTotal).toBe(monthlyTotal);

      // Without settlements, paid minus shares equals each balance.
      expect(overview.settlements).toEqual([]);

      for (const balance of overview.balances) {
        const column = header.indexOf(balance.name);
        expect(column).toBeGreaterThanOrEqual(5);

        const paid = rows
          .filter((row) => row[2] === balance.name)
          .reduce((sum, row) => sum + minor(row[3], currency), 0);
        const owed = rows.reduce(
          (sum, row) => sum + minor(row[column], currency),
          0,
        );

        expect(paid - owed).toBe(balance.balanceMinor);
      }
    },
  );
});
