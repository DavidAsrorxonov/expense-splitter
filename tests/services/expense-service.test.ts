import { describe, it, expect, beforeEach } from "vitest";
import type { Db } from "@/db/connection";
import { listBalances } from "@/repos/balances";
import { listExpenses, listSplits } from "@/repos/expenses";
import { NotFoundError, ValidationError } from "@/services/errors";
import {
  addExpense,
  archiveExpense,
  type AddExpenseInput,
} from "@/services/expense-service";
import {
  addMember,
  archiveMember,
  createGroup,
} from "@/services/group-service";
import type { Group, Member } from "@/types";
import { createTestDb } from "../helpers/db";

let db: Db;
let group: Group;
let alice: Member;
let bob: Member;
let carol: Member;

beforeEach(() => {
  db = createTestDb();
  group = createGroup(db, { name: "Housemates", currency: "JPY" });
  alice = addMember(db, group.id, "Alice");
  bob = addMember(db, group.id, "Bob");
  carol = addMember(db, group.id, "Carol");
});

const input = (overrides: Partial<AddExpenseInput> = {}): AddExpenseInput => ({
  groupId: group.id,
  paidBy: alice.id,
  amountMinor: 3000,
  note: "Groceries",
  spentOn: "2026-11-05",
  participantIds: [alice.id, bob.id, carol.id],
  ...overrides,
});

const count = (table: "expenses" | "splits") =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

describe("addExpense", () => {
  it("stores the expense and splits the amount with the remainder rule", () => {
    const expense = addExpense(db, input({ amountMinor: 1000 }));

    expect(expense.amountMinor).toBe(1000);
    expect(listSplits(db, expense.id)).toEqual([
      { memberId: alice.id, shareMinor: 334 },
      { memberId: bob.id, shareMinor: 333 },
      { memberId: carol.id, shareMinor: 333 },
    ]);
  });

  it("produces balances that sum to zero, even when the payer is not in the split", () => {
    addExpense(db, input({ participantIds: [bob.id, carol.id] }));

    const balances = listBalances(db, group.id).map((b) => b.balanceMinor);
    expect(balances).toEqual([3000, -1500, -1500]);
    expect(balances.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("trims the note", () => {
    expect(addExpense(db, input({ note: "  Groceries  " })).note).toBe(
      "Groceries",
    );
  });

  it("rejects invalid amounts and writes nothing", () => {
    for (const amountMinor of [0, -5, 10.5, NaN]) {
      expect(() => addExpense(db, input({ amountMinor }))).toThrow(
        ValidationError,
      );
    }
    expect(count("expenses")).toBe(0);
  });

  it("rejects empty or duplicate participants", () => {
    expect(() => addExpense(db, input({ participantIds: [] }))).toThrow(
      ValidationError,
    );
    expect(() =>
      addExpense(db, input({ participantIds: [bob.id, bob.id] })),
    ).toThrow(ValidationError);
    expect(count("expenses")).toBe(0);
  });

  it("rejects invalid dates", () => {
    for (const spentOn of ["2026-02-30", "2026-13-45", "11/05/2026", ""]) {
      expect(() => addExpense(db, input({ spentOn }))).toThrow(ValidationError);
    }
    expect(count("expenses")).toBe(0);
  });

  it("rejects payers and participants that are unknown, archived, or in another group", () => {
    const other = createGroup(db, { name: "Other", currency: "JPY" });
    const zed = addMember(db, other.id, "Zed");
    const dan = addMember(db, group.id, "Dan");
    archiveMember(db, group.id, dan.id);

    const bad: Partial<AddExpenseInput>[] = [
      { participantIds: [alice.id, zed.id] },
      { participantIds: [alice.id, dan.id] },
      { participantIds: [alice.id, 999] },
      { paidBy: zed.id },
      { paidBy: 999 },
    ];
    for (const overrides of bad) {
      expect(() => addExpense(db, input(overrides))).toThrow(ValidationError);
    }
    expect(count("expenses")).toBe(0);
    expect(count("splits")).toBe(0);
  });

  it("throws NotFoundError for an unknown group", () => {
    expect(() => addExpense(db, input({ groupId: "nope" }))).toThrow(
      NotFoundError,
    );
  });

  it("rolls back everything when a step fails mid-transaction", () => {
    db.exec(`
      CREATE TRIGGER fail_splits BEFORE INSERT ON splits
      BEGIN SELECT RAISE(ABORT, 'boom'); END;
    `);

    expect(() => addExpense(db, input())).toThrow(/boom/);
    expect(count("expenses")).toBe(0);
    expect(count("splits")).toBe(0);
  });
});

describe("archiveExpense", () => {
  it("removes the expense from balances and from the active list", () => {
    const expense = addExpense(db, input());
    archiveExpense(db, group.id, expense.id);

    expect(listBalances(db, group.id).map((b) => b.balanceMinor)).toEqual([
      0, 0, 0,
    ]);
    expect(listExpenses(db, group.id)).toEqual([]);
  });

  it("rejects archiving the same expense twice", () => {
    const expense = addExpense(db, input());
    archiveExpense(db, group.id, expense.id);
    expect(() => archiveExpense(db, group.id, expense.id)).toThrow(
      ValidationError,
    );
  });

  it("throws NotFoundError when the expense is not in the group", () => {
    const other = createGroup(db, { name: "Other", currency: "JPY" });
    const zed = addMember(db, other.id, "Zed");
    const foreign = addExpense(db, {
      groupId: other.id,
      paidBy: zed.id,
      amountMinor: 100,
      note: "",
      spentOn: "2026-11-05",
      participantIds: [zed.id],
    });

    expect(() => archiveExpense(db, group.id, foreign.id)).toThrow(
      NotFoundError,
    );
    expect(() => archiveExpense(db, group.id, 999)).toThrow(NotFoundError);
  });
});
