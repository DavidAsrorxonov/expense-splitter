import { describe, expect, it } from "vitest";
import {
  buildExpensesTable,
  type ExpensesTableInput,
} from "@/domain/expenses-table";
import { parseAmount } from "@/domain/money";

function fixture(): ExpensesTableInput {
  return {
    currency: "USD",
    members: [
      { id: 3, name: "Carol", archived: true },
      { id: 2, name: "Bob", archived: false },
      { id: 1, name: "Alice", archived: false },
    ],
    expenses: [
      {
        id: 10,
        paidBy: 1,
        amountMinor: 1001,
        note: "Coffee beans",
        spentOn: "2026-11-05",
        archived: false,
      },
    ],
    splits: [
      { expenseId: 10, memberId: 1, shareMinor: 501 },
      { expenseId: 10, memberId: 2, shareMinor: 500 },
    ],
  };
}

describe("buildExpensesTable", () => {
  it("orders member columns by ID and includes archived labels", () => {
    const table = buildExpensesTable(fixture());

    expect(table).toEqual([
      [
        "Date",
        "Note",
        "Paid by",
        "Amount",
        "Status",
        "Alice",
        "Bob",
        "Carol (archived)",
      ],
      [
        "2026-11-05",
        "Coffee beans",
        "Alice",
        "10.01",
        "active",
        "5.01",
        "5.00",
        "",
      ],
    ]);
  });

  it("orders expenses by date ascending, then ID ascending", () => {
    const input = fixture();
    const expense = input.expenses[0];

    input.expenses = [
      { ...expense, id: 30, note: "Later", spentOn: "2026-11-06" },
      { ...expense, id: 20, note: "Second", spentOn: "2026-11-01" },
      { ...expense, id: 10, note: "First", spentOn: "2026-11-01" },
    ];

    expect(
      buildExpensesTable(input)
        .slice(1)
        .map((row) => row[1]),
    ).toEqual(["First", "Second", "Later"]);
  });

  it("distinguishes a zero share from a non-participant", () => {
    const input = fixture();
    input.expenses[0].amountMinor = 1;
    input.splits = [
      { expenseId: 10, memberId: 1, shareMinor: 1 },
      { expenseId: 10, memberId: 2, shareMinor: 0 },
    ];

    expect(buildExpensesTable(input)[1].slice(5)).toEqual(["0.01", "0.00", ""]);
  });

  it.each([
    ["JPY", "1001", "501", "500"],
    ["USD", "10.01", "5.01", "5.00"],
    ["EUR", "10.01", "5.01", "5.00"],
    ["UZS", "10.01", "5.01", "5.00"],
  ] as const)(
    "formats amounts and preserves share totals for %s",
    (currency, amount, aliceShare, bobShare) => {
      const input = fixture();
      input.currency = currency;
      const rows = buildExpensesTable(input).slice(1);

      expect(rows[0][3]).toBe(amount);
      expect(rows[0].slice(5)).toEqual([aliceShare, bobShare, ""]);

      for (const row of rows) {
        const shares = row.slice(5).filter((cell) => cell !== "");
        const parsedShares = shares.map((cell) => parseAmount(cell, currency));

        expect(parsedShares.every((share) => share !== null)).toBe(true);

        const total = parsedShares.reduce<number>(
          (sum, share) => sum + (share ?? 0),
          0,
        );

        expect(total).toBe(parseAmount(row[3], currency));
      }
    },
  );

  it("neutralizes notes, header names, and payer names", () => {
    const input = fixture();
    input.members.find((member) => member.id === 1)!.name = "=Alice";
    input.members.find((member) => member.id === 3)!.name = "@Carol";
    input.expenses[0].note = "=SUM(A1:A2)";
    input.expenses[0].paidBy = 3;

    const table = buildExpensesTable(input);

    expect(table[0].slice(5)).toEqual(["'=Alice", "Bob", "'@Carol (archived)"]);
    expect(table[1][1]).toBe("'=SUM(A1:A2)");
    expect(table[1][2]).toBe("'@Carol (archived)");
  });

  it("marks archived expenses without removing them", () => {
    const input = fixture();
    input.expenses[0].archived = true;

    const table = buildExpensesTable(input);

    expect(table).toHaveLength(2);
    expect(table[1][4]).toBe("archived");
  });

  it("uses an empty payer cell when the payer is unknown", () => {
    const input = fixture();
    input.expenses[0].paidBy = 999;

    expect(buildExpensesTable(input)[1][2]).toBe("");
  });

  it("preserves punctuation and newlines for the CSV serializer", () => {
    const input = fixture();
    input.expenses[0].note = 'Coffee, "beans"\nand milk';

    expect(buildExpensesTable(input)[1][1]).toBe('Coffee, "beans"\nand milk');
  });

  it("returns a header when there are no expenses", () => {
    const input = fixture();
    input.expenses = [];
    input.splits = [];

    expect(buildExpensesTable(input)).toEqual([
      [
        "Date",
        "Note",
        "Paid by",
        "Amount",
        "Status",
        "Alice",
        "Bob",
        "Carol (archived)",
      ],
    ]);
  });

  it("does not mutate its input", () => {
    const input = fixture();
    input.expenses.push({
      ...input.expenses[0],
      id: 5,
      spentOn: "2026-10-01",
    });
    const original = structuredClone(input);

    buildExpensesTable(input);

    expect(input).toEqual(original);
  });
});
