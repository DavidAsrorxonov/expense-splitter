import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/connection";
import { findExpense } from "@/repos/expenses";
import { findMember, listMembers } from "@/repos/members";
import {
  getArchivedItems,
  restoreExpense,
  restoreMember,
} from "@/services/archive-service";
import { getGroupBalances } from "@/services/balance-service";
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
import { searchGroupExpenses } from "@/services/search-service";
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
    amountMinor: 1000,
    note: "Coffee beans",
    spentOn: "2026-11-05",
    participantIds: [alice.id, bob.id],
    ...overrides,
  });
}

describe("restoreExpense", () => {
  it("restores the original balances and search visibility", () => {
    const expense = spend();
    const originalBalances = getGroupBalances(db, group.id);

    expect(searchGroupExpenses(db, group.id, "coffee")).toEqual([expense]);

    archiveExpense(db, group.id, expense.id);

    expect(searchGroupExpenses(db, group.id, "coffee")).toEqual([]);
    expect(
      getGroupBalances(db, group.id).map((balance) => balance.balanceMinor),
    ).toEqual([0, 0]);

    restoreExpense(db, group.id, expense.id);

    expect(findExpense(db, expense.id)?.archivedAt).toBeNull();
    expect(getGroupBalances(db, group.id)).toEqual(originalBalances);
    expect(searchGroupExpenses(db, group.id, "coffee")).toEqual([expense]);
  });

  it.each(["payer", "participant"] as const)(
    "allows restoration when the %s was archived afterwards",
    (role) => {
      const expense = spend();
      archiveExpense(db, group.id, expense.id);

      const member = role === "payer" ? alice : bob;
      archiveMember(db, group.id, member.id);

      restoreExpense(db, group.id, expense.id);

      const balances = getGroupBalances(db, group.id);
      const archivedBalance = balances.find(
        (balance) => balance.memberId === member.id,
      );

      expect(archivedBalance).toBeDefined();
      expect(archivedBalance?.archivedAt).toEqual(expect.any(String));
      expect(archivedBalance?.balanceMinor).toBe(role === "payer" ? 500 : -500);
      expect(
        balances.reduce((sum, balance) => sum + balance.balanceMinor, 0),
      ).toBe(0);
    },
  );

  it("rejects an already active expense", () => {
    const expense = spend();

    expect(() => restoreExpense(db, group.id, expense.id)).toThrow(
      new ValidationError("Expense is not archived"),
    );
    expect(findExpense(db, expense.id)?.archivedAt).toBeNull();
  });

  it("rejects an expense belonging to another group without restoring it", () => {
    const expense = spend();
    archiveExpense(db, group.id, expense.id);
    const other = createGroup(db, { name: "Other", currency: "JPY" });

    expect(() => restoreExpense(db, other.id, expense.id)).toThrow(
      NotFoundError,
    );
    expect(findExpense(db, expense.id)?.archivedAt).toEqual(expect.any(String));
  });

  it("rejects an unknown expense", () => {
    expect(() => restoreExpense(db, group.id, 999)).toThrow(NotFoundError);
  });
});

describe("restoreMember", () => {
  it("makes an archived member active again", () => {
    archiveMember(db, group.id, alice.id);

    restoreMember(db, group.id, alice.id);

    expect(findMember(db, alice.id)?.archivedAt).toBeNull();
    expect(listMembers(db, group.id).map((member) => member.id)).toContain(
      alice.id,
    );
  });

  it("rejects an active duplicate name and leaves both members unchanged", () => {
    archiveMember(db, group.id, alice.id);
    const replacement = addMember(db, group.id, "Alice");

    expect(() => restoreMember(db, group.id, alice.id)).toThrow(
      new ValidationError(
        `"Alice" is already in this group, so this member can't be restored.`,
      ),
    );
    expect(findMember(db, alice.id)?.archivedAt).toEqual(expect.any(String));
    expect(findMember(db, replacement.id)?.archivedAt).toBeNull();
  });

  it("allows duplicate names when the other member is archived", () => {
    archiveMember(db, group.id, alice.id);
    const replacement = addMember(db, group.id, "Alice");
    archiveMember(db, group.id, replacement.id);

    restoreMember(db, group.id, alice.id);

    expect(findMember(db, alice.id)?.archivedAt).toBeNull();
    expect(findMember(db, replacement.id)?.archivedAt).toEqual(
      expect.any(String),
    );
  });

  it("rejects an already active member", () => {
    expect(() => restoreMember(db, group.id, alice.id)).toThrow(
      new ValidationError("Member is not archived"),
    );
  });

  it("rejects a member belonging to another group without restoring them", () => {
    archiveMember(db, group.id, alice.id);
    const other = createGroup(db, { name: "Other", currency: "JPY" });

    expect(() => restoreMember(db, other.id, alice.id)).toThrow(NotFoundError);
    expect(findMember(db, alice.id)?.archivedAt).toEqual(expect.any(String));
  });

  it("rejects an unknown member", () => {
    expect(() => restoreMember(db, group.id, 999)).toThrow(NotFoundError);
  });
});

describe("getArchivedItems", () => {
  it("returns only this group's archived items in the required order", () => {
    const older = spend({ spentOn: "2026-11-01" });
    const newer = spend({ spentOn: "2026-11-05" });
    const sameDate = spend({ spentOn: "2026-11-05" });

    for (const expense of [older, newer, sameDate]) {
      archiveExpense(db, group.id, expense.id);
    }

    // This active expense has no effect on member balances.
    spend({ participantIds: [alice.id] });

    // Archive in reverse order to verify ordering by member ID.
    archiveMember(db, group.id, bob.id);
    archiveMember(db, group.id, alice.id);
    addMember(db, group.id, "Carol");

    const other = createGroup(db, { name: "Other", currency: "JPY" });
    const zed = addMember(db, other.id, "Zed");
    const foreign = spend({
      groupId: other.id,
      paidBy: zed.id,
      participantIds: [zed.id],
    });
    archiveExpense(db, other.id, foreign.id);
    archiveMember(db, other.id, zed.id);

    const archived = getArchivedItems(db, group.id);

    expect(archived.expenses.map((expense) => expense.id)).toEqual([
      sameDate.id,
      newer.id,
      older.id,
    ]);
    expect(archived.members.map((member) => member.id)).toEqual([
      alice.id,
      bob.id,
    ]);
    expect(
      archived.expenses.every((expense) => expense.archivedAt !== null),
    ).toBe(true);
    expect(archived.members.every((member) => member.archivedAt !== null)).toBe(
      true,
    );
  });

  it("returns empty lists when nothing is archived", () => {
    spend();

    expect(getArchivedItems(db, group.id)).toEqual({
      expenses: [],
      members: [],
    });
  });

  it("rejects an unknown group", () => {
    expect(() => getArchivedItems(db, "missing")).toThrow(NotFoundError);
  });
});
