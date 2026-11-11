import type { Db } from "@/db/connection";
import { addExpense, archiveExpense } from "@/services/expense-service";
import {
  addMember,
  archiveMember,
  createGroup,
} from "@/services/group-service";
import { recordSettlement } from "@/services/settle-service";

/**
 * Builds an awkward but legal state: Bob is archived while still having a
 * non-zero balance (Alice: -500, Bob: +500).
 */
export function setupArchivedLeftover(db: Db) {
  const group = createGroup(db, { name: "Leftover", currency: "JPY" });
  const alice = addMember(db, group.id, "Alice");
  const bob = addMember(db, group.id, "Bob");

  const expense = addExpense(db, {
    groupId: group.id,
    paidBy: alice.id,
    amountMinor: 1000,
    note: "",
    spentOn: "2026-11-05",
    participantIds: [alice.id, bob.id],
  });
  recordSettlement(db, {
    groupId: group.id,
    fromMember: bob.id,
    toMember: alice.id,
    amountMinor: 500,
  });

  archiveMember(db, group.id, bob.id); // allowed: balances are both 0 right now
  archiveExpense(db, group.id, expense.id); // now Bob's balance becomes +500

  return { group, alice, bob };
}
