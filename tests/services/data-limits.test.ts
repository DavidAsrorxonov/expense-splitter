import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/connection";
import { DEFAULT_LIMITS, type Limits } from "@/domain/limits";
import * as groupsRepo from "@/repos/groups";
import { countMembers } from "@/repos/members";
import { countExpenses } from "@/repos/expenses";
import { countSettlements } from "@/repos/settlements";
import { createGroup, addMember, archiveMember } from "@/services/group-service";
import { addExpense, archiveExpense, type AddExpenseInput } from "@/services/expense-service";
import { recordSettlement } from "@/services/settle-service";
import { searchGroupExpenses } from "@/services/search-service";
import { ValidationError } from "@/services/errors";
import { createTestDb } from "../helpers/db";

let db: Db;
beforeEach(() => { db = createTestDb(); });
afterEach(() => { db.close(); vi.restoreAllMocks(); });

const limits = (overrides: Partial<Limits>): Limits => ({ ...DEFAULT_LIMITS, ...overrides });

function snapshot() {
  return ["groups", "members", "expenses", "splits", "settlements"].map((table) =>
    db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),
  );
}

function expectRejectedWithoutWrites(action: () => unknown, message: string) {
  const before = snapshot();
  let failure: unknown;
  try { action(); } catch (error) { failure = error; }
  expect(failure).toBeInstanceOf(ValidationError);
  expect((failure as Error).message).toBe(message);
  expect(snapshot()).toEqual(before);
}

function fixture(name = "Trip") {
  const group = createGroup(db, { name, currency: "JPY" });
  const alice = addMember(db, group.id, "Alice");
  const bob = addMember(db, group.id, "Bob");
  const expense: AddExpenseInput = {
    groupId: group.id, paidBy: alice.id, amountMinor: 101,
    note: "Dinner", spentOn: "2026-11-15", participantIds: [alice.id, bob.id],
  };
  const settlement = { groupId: group.id, fromMember: bob.id, toMember: alice.id, amountMinor: 10 };
  return { group, alice, bob, expense, settlement };
}

describe("deployment data limits", () => {
  it("keeps the agreed production defaults", () => {
    expect(DEFAULT_LIMITS).toEqual({
      maxMembersPerGroup: 50, maxExpensesPerGroup: 2000,
      maxSettlementsPerGroup: 1000, maxGroups: 2000,
      maxNameLength: 80, maxNoteLength: 200,
    });
  });

  it("counts empty and unknown groups as zero", () => {
    expect(groupsRepo.countGroups(db)).toBe(0);
    for (const count of [countMembers, countExpenses, countSettlements]) {
      expect(count(db, "missing12345")).toBe(0);
    }
    const group = createGroup(db, { name: "Empty", currency: "JPY" });
    expect(groupsRepo.countGroups(db)).toBe(1);
    for (const count of [countMembers, countExpenses, countSettlements]) {
      expect(count(db, group.id)).toBe(0);
    }
  });

  it("allows groups up to the cap, then rejects without writes", () => {
    const cap = limits({ maxGroups: 2 });
    createGroup(db, { name: "One", currency: "JPY" }, cap);
    createGroup(db, { name: "Two", currency: "USD" }, cap);
    expect(groupsRepo.countGroups(db)).toBe(2);
    expectRejectedWithoutWrites(
      () => createGroup(db, { name: "Three", currency: "EUR" }, cap),
      "New groups can't be created right now.",
    );
    // A cap lowered below existing usage must also reject new rows.
    expectRejectedWithoutWrites(
      () => createGroup(db, { name: "Four", currency: "JPY" }, limits({ maxGroups: 1 })),
      "New groups can't be created right now.",
    );
  });

  it("rolls back group insertion if the subsequent group read fails", () => {
    vi.spyOn(groupsRepo, "findGroup").mockImplementationOnce(() => {
      throw new Error("Simulated read failure");
    });
    expect(() => createGroup(db, { name: "Rollback", currency: "JPY" })).toThrow("Simulated read failure");
    expect(groupsRepo.countGroups(db)).toBe(0);
  });

  it("counts archived members toward the cap, isolated to their group", () => {
    const group = createGroup(db, { name: "Trip", currency: "JPY" });
    const cap = limits({ maxMembersPerGroup: 2 });
    const alice = addMember(db, group.id, "Alice", cap);
    addMember(db, group.id, "Bob", cap);
    archiveMember(db, group.id, alice.id);
    expect(countMembers(db, group.id)).toBe(2);
    expectRejectedWithoutWrites(
      () => addMember(db, group.id, "Carol", cap),
      "This group has reached the limit of 2 members.",
    );
    expectRejectedWithoutWrites(
      () => addMember(db, group.id, "Carol", limits({ maxMembersPerGroup: 1 })),
      "This group has reached the limit of 1 members.",
    );
    const other = createGroup(db, { name: "Other", currency: "JPY" });
    addMember(db, other.id, "Carol", cap);
    expect(countMembers(db, other.id)).toBe(1);
    expect(countMembers(db, group.id)).toBe(2);
  });

  it("counts archived expenses toward the cap without creating rejected splits or FTS entries", () => {
    const f = fixture();
    const cap = limits({ maxExpensesPerGroup: 2 });
    const first = addExpense(db, f.expense, cap);
    addExpense(db, f.expense, cap);
    archiveExpense(db, f.group.id, first.id);
    expect(countExpenses(db, f.group.id)).toBe(2);
    expectRejectedWithoutWrites(
      () => addExpense(db, { ...f.expense, note: "Rejectedmarker" }, cap),
      "This group has reached the limit of 2 expenses.",
    );
    expect(searchGroupExpenses(db, f.group.id, "Rejectedmarker", { includeArchived: true })).toEqual([]);
    expectRejectedWithoutWrites(
      () => addExpense(db, f.expense, limits({ maxExpensesPerGroup: 1 })),
      "This group has reached the limit of 1 expenses.",
    );
    const other = fixture("Other");
    addExpense(db, other.expense, cap);
    expect(countExpenses(db, other.group.id)).toBe(1);
    expect(countExpenses(db, f.group.id)).toBe(2);
  });

  it("enforces settlement caps per group and leaves the ledger unchanged on rejection", () => {
    const f = fixture();
    const cap = limits({ maxSettlementsPerGroup: 2 });
    recordSettlement(db, f.settlement, cap);
    recordSettlement(db, f.settlement, cap);
    expect(countSettlements(db, f.group.id)).toBe(2);
    expectRejectedWithoutWrites(
      () => recordSettlement(db, f.settlement, cap),
      "This group has reached the limit of 2 settlements.",
    );
    expectRejectedWithoutWrites(
      () => recordSettlement(db, f.settlement, limits({ maxSettlementsPerGroup: 1 })),
      "This group has reached the limit of 1 settlements.",
    );
    const other = fixture("Other");
    recordSettlement(db, other.settlement, cap);
    expect(countSettlements(db, other.group.id)).toBe(1);
    expect(countSettlements(db, f.group.id)).toBe(2);
  });

  it.each([3, DEFAULT_LIMITS.maxNameLength])("enforces trimmed group/member name length %i at the service boundary", (maximum) => {
    const cap = maximum === DEFAULT_LIMITS.maxNameLength ? undefined : limits({ maxNameLength: maximum });
    const name = "x".repeat(maximum);
    const group = createGroup(db, { name: ` ${name} `, currency: "JPY" }, cap);
    expect(group.name).toBe(name);
    expect(addMember(db, group.id, ` ${name} `, cap).name).toBe(name);
    expectRejectedWithoutWrites(
      () => createGroup(db, { name: name + "x", currency: "JPY" }, cap),
      `Group name must be ${maximum} characters or fewer.`,
    );
    expectRejectedWithoutWrites(
      () => addMember(db, group.id, name + "x", cap),
      `Member name must be ${maximum} characters or fewer.`,
    );
  });

  it.each([3, DEFAULT_LIMITS.maxNoteLength])("enforces trimmed note length %i and leaves expenses/shares unchanged", (maximum) => {
    const f = fixture();
    const cap = maximum === DEFAULT_LIMITS.maxNoteLength ? undefined : limits({ maxNoteLength: maximum });
    const note = "x".repeat(maximum);
    expect(addExpense(db, { ...f.expense, note: ` ${note} ` }, cap).note).toBe(note);
    expectRejectedWithoutWrites(
      () => addExpense(db, { ...f.expense, note: note + "x" }, cap),
      `Expense note must be ${maximum} characters or fewer.`,
    );
    expect(addExpense(db, { ...f.expense, note: "   " }, cap).note).toBe("");
  });
});
