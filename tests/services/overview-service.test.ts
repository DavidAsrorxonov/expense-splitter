import { describe, it, expect } from "vitest";
import { NotFoundError } from "@/services/errors";
import { addExpense } from "@/services/expense-service";
import { addMember, createGroup } from "@/services/group-service";
import { getGroupOverview } from "@/services/overview-service";
import { recordSettlement } from "@/services/settle-service";
import { createTestDb } from "../helpers/db";

describe("getGroupOverview", () => {
  it("returns everything the group page needs", () => {
    const db = createTestDb();
    const group = createGroup(db, { name: "Housemates", currency: "JPY" });
    const alice = addMember(db, group.id, "Alice");
    const bob = addMember(db, group.id, "Bob");
    const carol = addMember(db, group.id, "Carol");

    addExpense(db, {
      groupId: group.id,
      paidBy: alice.id,
      amountMinor: 3000,
      note: "Groceries",
      spentOn: "2026-11-05",
      participantIds: [alice.id, bob.id, carol.id],
    });
    recordSettlement(db, {
      groupId: group.id,
      fromMember: bob.id,
      toMember: alice.id,
      amountMinor: 1000,
    });

    const overview = getGroupOverview(db, group.id);

    expect(overview.group.id).toBe(group.id);
    expect(overview.members.map((m) => m.name)).toEqual([
      "Alice",
      "Bob",
      "Carol",
    ]);
    expect(overview.balances.map((b) => b.balanceMinor)).toEqual([
      1000, 0, -1000,
    ]);
    expect(overview.expenses).toHaveLength(1);
    expect(overview.settlements).toHaveLength(1);
    expect(overview.monthlyTotals).toEqual([
      { month: "2026-11", totalMinor: 3000 },
    ]);
    expect(overview.suggestedTransfers).toEqual([
      { from: carol.id, to: alice.id, amountMinor: 1000 },
    ]);
  });

  it("throws NotFoundError for an unknown group", () => {
    expect(() => getGroupOverview(createTestDb(), "nope")).toThrow(
      NotFoundError,
    );
  });
});
