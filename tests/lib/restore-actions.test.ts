import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/connection";
import { initialActionState } from "@/lib/action-state";
import { findExpense } from "@/repos/expenses";
import { findMember } from "@/repos/members";
import { addExpense, archiveExpense } from "@/services/expense-service";
import { addMember, archiveMember, createGroup } from "@/services/group-service";
import { getGroupBalances } from "@/services/balance-service";
import { searchGroupExpenses } from "@/services/search-service";
import { restoreExpenseAction, restoreMemberAction } from "@/app/g/[groupId]/actions";
import { createTestDb } from "../helpers/db";

const mocks = vi.hoisted(() => ({ getAppDb: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getAppDb: mocks.getAppDb }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

let db: Db;
let groupId: string;
let expenseId: number;
let memberId: number;

beforeEach(() => {
  vi.resetAllMocks();
  db = createTestDb();
  mocks.getAppDb.mockReturnValue(db);
  groupId = createGroup(db, { name: "Housemates", currency: "JPY" }).id;
  const alice = addMember(db, groupId, "Alice");
  const bob = addMember(db, groupId, "Bob");
  memberId = bob.id;
  expenseId = addExpense(db, {
    groupId, paidBy: alice.id, amountMinor: 1000, note: "Coffee",
    spentOn: "2026-11-05", participantIds: [alice.id, bob.id],
  }).id;
  archiveExpense(db, groupId, expenseId);
  archiveMember(db, groupId, memberId);
});

afterEach(() => db.close());

function form(field: string, value: string | Blob): FormData {
  const data = new FormData();
  data.append(field, value);
  return data;
}

describe.each([
  { kind: "Expense", field: "expenseId", action: restoreExpenseAction, id: () => expenseId },
  { kind: "Member", field: "memberId", action: restoreMemberAction, id: () => memberId },
])("restore $kind action", ({ kind, field, action, id }) => {
  it("restores the item and revalidates the group page", async () => {
    const state = await action(groupId, initialActionState, form(field, String(id())));

    expect(state).toEqual({ status: "success", message: `${kind} restored.` });
    expect(mocks.revalidatePath).toHaveBeenCalledExactlyOnceWith(`/g/${groupId}`);
    const item = kind === "Expense" ? findExpense(db, id()) : findMember(db, id());
    expect(item?.archivedAt).toBeNull();
    if (kind === "Expense") {
      expect(searchGroupExpenses(db, groupId, "coffee").map((expense) => expense.id)).toEqual([id()]);
      expect(getGroupBalances(db, groupId).map((balance) => balance.balanceMinor)).toEqual([500, -500]);
    }
  });

  it("rejects an invalid group link before accessing the database", async () => {
    const state = await action("invalid", initialActionState, form(field, String(id())));

    expect(state).toMatchObject({ status: "error", message: "Invalid group link." });
    expect(mocks.getAppDb).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects missing, malformed, duplicate, and file IDs without a database write", async () => {
    const duplicate = form(field, String(id()));
    duplicate.append(field, String(id()));
    const inputs = [
      new FormData(), duplicate, form(field, new Blob(["1"])),
      ...["", "0", "-1", "1.5", "1e2", "9007199254740992"].map((value) => form(field, value)),
    ];

    for (const input of inputs) {
      expect(await action(groupId, initialActionState, input)).toMatchObject({
        status: "error", message: `Choose a valid ${kind.toLowerCase()} to restore.`,
      });
    }
    expect(mocks.getAppDb).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a cross-group restore and preserves the row ID for inline feedback", async () => {
    const other = createGroup(db, { name: "Other", currency: "JPY" });
    const state = await action(other.id, initialActionState, form(field, String(id())));

    expect(state).toMatchObject({
      status: "error", message: `${kind} not found`, values: { [field]: String(id()) },
    });
    const item = kind === "Expense" ? findExpense(db, id()) : findMember(db, id());
    expect(item?.archivedAt).toEqual(expect.any(String));
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("maps an unknown item to a readable error", async () => {
    expect(await action(groupId, initialActionState, form(field, "999"))).toMatchObject({
      status: "error", message: `${kind} not found`, values: { [field]: "999" },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects restoring an already active item", async () => {
    await action(groupId, initialActionState, form(field, String(id())));
    mocks.revalidatePath.mockClear();

    expect(await action(groupId, initialActionState, form(field, String(id())))).toMatchObject({
      status: "error", message: `${kind} is not archived`, values: { [field]: String(id()) },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rethrows unexpected failures without reporting success", async () => {
    const error = new Error("Database unavailable");
    mocks.getAppDb.mockImplementationOnce(() => { throw error; });

    await expect(action(groupId, initialActionState, form(field, String(id())))).rejects.toBe(error);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

it("returns the duplicate-name error for the affected member", async () => {
  addMember(db, groupId, "Bob");

  expect(await restoreMemberAction(groupId, initialActionState, form("memberId", String(memberId)))).toMatchObject({
    status: "error",
    message: '"Bob" is already in this group, so this member can\'t be restored.',
    values: { memberId: String(memberId) },
  });
  expect(findMember(db, memberId)?.archivedAt).toEqual(expect.any(String));
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
});
