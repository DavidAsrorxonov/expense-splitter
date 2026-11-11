import { describe, expect, it } from "vitest";
import { parseAddExpenseForm, parseAddMemberForm, parseArchiveExpenseForm, parseArchiveMemberForm, parseManualPaymentForm, parseRecordPaymentForm } from "@/lib/forms";
import { addExpense, archiveExpense } from "@/services/expense-service";
import { addMember, archiveMember, createGroup } from "@/services/group-service";
import { getGroupOverview } from "@/services/overview-service";
import { recordSettlement } from "@/services/settle-service";
import { ValidationError } from "@/services/errors";
import { createTestDb } from "../helpers/db";

function form(values: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const entry of Array.isArray(value) ? value : [value]) data.append(key, entry);
  }
  return data;
}

function input<T>(result: { success: true; data: T } | { success: false }): T {
  if (!result.success) throw new Error("Expected valid form input");
  return result.data;
}

describe("group forms with services", () => {
  it("supports partial payments, reversals, suggested payments and archived-member corrections", () => {
    const db = createTestDb();
    try {
      const group = createGroup(db, { name: "Trip", currency: "JPY" });
      const [alice, bob, carol] = ["Alice", "Bob", "Carol"].map((name) => {
        const parsed = input(parseAddMemberForm(form({ name: ` ${name} ` })));
        return addMember(db, group.id, parsed.name);
      });
      const expense = addExpense(db, { groupId: group.id, ...input(parseAddExpenseForm(form({
        paidBy: String(alice.id), amount: "1001", spentOn: "2026-11-11", note: "Dinner",
        participantIds: [String(bob.id), String(carol.id)],
      }), group.currency)) });
      const balances = () => getGroupOverview(db, group.id).balances.map((balance) => balance.balanceMinor);
      expect(balances()).toEqual([1001, -501, -500]);
      expect(() => archiveMember(db, group.id, bob.id)).toThrow(ValidationError);

      for (const [from, to] of [[bob, alice], [alice, bob]]) {
        recordSettlement(db, { groupId: group.id, ...input(parseManualPaymentForm(form({
          fromMember: String(from.id), toMember: String(to.id), amount: "100",
        }), group.currency)) });
        if (from.id === bob.id) expect(balances()).toEqual([901, -401, -500]);
      }
      expect(balances()).toEqual([1001, -501, -500]);
      for (const transfer of getGroupOverview(db, group.id).suggestedTransfers) {
        recordSettlement(db, { groupId: group.id, ...input(parseRecordPaymentForm(form({
          fromMember: String(transfer.from), toMember: String(transfer.to), amountMinor: String(transfer.amountMinor),
        }))) });
      }
      expect(balances()).toEqual([0, 0, 0]);
      expect(getGroupOverview(db, group.id).suggestedTransfers).toEqual([]);
      const memberInput = input(parseArchiveMemberForm(form({ memberId: String(bob.id) })));
      archiveMember(db, group.id, memberInput.memberId);
      expect(getGroupOverview(db, group.id).members.find((member) => member.id === bob.id)?.archivedAt).not.toBeNull();

      recordSettlement(db, { groupId: group.id, ...input(parseManualPaymentForm(form({
        fromMember: String(bob.id), toMember: String(alice.id), amount: "50",
      }), group.currency)) });
      const overview = getGroupOverview(db, group.id);
      expect(overview.settlements).toHaveLength(5);
      expect(overview.settlements[0].amountMinor).toBe(50);
      expect(overview.balances.find((balance) => balance.memberId === bob.id)?.balanceMinor).toBe(50);
      const expenseInput = input(parseArchiveExpenseForm(form({ expenseId: String(expense.id) })));
      archiveExpense(db, group.id, expenseInput.expenseId);
      expect(getGroupOverview(db, group.id).expenses).toEqual([]);
      expect(getGroupOverview(db, group.id).monthlyTotals).toEqual([]);
      expect(balances().reduce((sum, value) => sum + value, 0)).toBe(0);
    } finally {
      db.close();
    }
  });

  it("keeps decimal currencies in integer minor units from expense entry through settlement", () => {
    const db = createTestDb();
    try {
      const group = createGroup(db, { name: "USD trip", currency: "USD" });
      const alice = addMember(db, group.id, "Alice");
      const bob = addMember(db, group.id, "Bob");
      addExpense(db, { groupId: group.id, ...input(parseAddExpenseForm(form({
        paidBy: String(alice.id), amount: "12.51", spentOn: "2026-11-11", note: "Lunch",
        participantIds: [String(alice.id), String(bob.id)],
      }), group.currency)) });
      expect(getGroupOverview(db, group.id).balances.map((balance) => balance.balanceMinor)).toEqual([625, -625]);
      recordSettlement(db, { groupId: group.id, ...input(parseManualPaymentForm(form({
        fromMember: String(bob.id), toMember: String(alice.id), amount: "6.25",
      }), group.currency)) });
      expect(getGroupOverview(db, group.id).balances.map((balance) => balance.balanceMinor)).toEqual([0, 0]);
    } finally {
      db.close();
    }
  });
});
