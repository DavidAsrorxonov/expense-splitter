import type { Db } from "@/db/connection";
import {
  findExpense,
  listArchivedExpenses,
  restoreExpense as restoreExpenseRow,
} from "@/repos/expenses";
import { findGroup } from "@/repos/groups";
import {
  findMember,
  listArchivedMembers,
  listMembers,
  restoreMember as restoreMemberRow,
} from "@/repos/members";
import type { Expense, Member } from "@/types";
import { NotFoundError, ValidationError } from "./errors";

export function restoreExpense(
  db: Db,
  groupId: string,
  expenseId: number,
): void {
  db.transaction(() => {
    const expense = findExpense(db, expenseId);
    if (!expense || expense.groupId !== groupId) {
      throw new NotFoundError("Expense not found");
    }

    if (!restoreExpenseRow(db, expenseId)) {
      throw new ValidationError("Expense is not archived");
    }
  })();
}

export function restoreMember(db: Db, groupId: string, memberId: number): void {
  db.transaction(() => {
    const member = findMember(db, memberId);
    if (!member || member.groupId !== groupId) {
      throw new NotFoundError("Member not found");
    }

    if (member.archivedAt === null) {
      throw new ValidationError("Member is not archived");
    }

    const duplicate = listMembers(db, groupId).some(
      (actMem) => actMem.name === member.name,
    );

    if (duplicate) {
      throw new ValidationError(
        `"${member.name}" is already in this group, so this member can't be restored.`,
      );
    }

    if (!restoreMemberRow(db, memberId)) {
      throw new ValidationError("Member is not archived");
    }
  })();
}

export function getArchivedItems(
  db: Db,
  groupId: string,
): { expenses: Expense[]; members: Member[] } {
  return db.transaction(() => {
    if (!findGroup(db, groupId)) {
      throw new NotFoundError("Group not found");
    }

    return {
      expenses: listArchivedExpenses(db, groupId),
      members: listArchivedMembers(db, groupId),
    };
  })();
}
