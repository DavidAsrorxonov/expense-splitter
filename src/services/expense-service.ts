import type { Db } from "../db/connection";
import { splitEqually } from "../domain/splits";
import {
  archiveExpense as archiveExpenseRow,
  findExpense,
  insertExpense,
  insertSplits,
  listSplits,
} from "../repos/expenses";
import { findGroup } from "../repos/groups";
import { listMembers } from "../repos/members";
import type { Expense } from "../types";
import { NotFoundError, ValidationError } from "./errors";

export type AddExpenseInput = {
  groupId: string;
  paidBy: number;
  amountMinor: number;
  note: string;
  spentOn: string; // YYYY-MM-DD
  participantIds: number[];
};

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function addExpense(db: Db, input: AddExpenseInput): Expense {
  return db.transaction((): Expense => {
    if (!findGroup(db, input.groupId))
      throw new NotFoundError("Group not found");

    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new ValidationError("Amount must be a positive whole number");
    }
    if (input.participantIds.length === 0) {
      throw new ValidationError("Choose at least one participant");
    }
    if (new Set(input.participantIds).size !== input.participantIds.length) {
      throw new ValidationError("Participants must be unique");
    }
    if (!isValidDate(input.spentOn)) {
      throw new ValidationError(
        "Date must be a real date in YYYY-MM-DD format",
      );
    }

    const activeIds = new Set(listMembers(db, input.groupId).map((m) => m.id));
    if (!activeIds.has(input.paidBy)) {
      throw new ValidationError("Payer must be an active member of this group");
    }
    if (!input.participantIds.every((id) => activeIds.has(id))) {
      throw new ValidationError(
        "Every participant must be an active member of this group",
      );
    }

    const expenseId = insertExpense(db, {
      groupId: input.groupId,
      paidBy: input.paidBy,
      amountMinor: input.amountMinor,
      note: input.note.trim(),
      spentOn: input.spentOn,
    });
    insertSplits(
      db,
      expenseId,
      splitEqually(input.amountMinor, input.participantIds),
    );

    const splitTotal = listSplits(db, expenseId).reduce(
      (total, s) => total + s.shareMinor,
      0,
    );
    if (splitTotal !== input.amountMinor) {
      throw new Error("Split total does not match the expense amount");
    }

    const expense = findExpense(db, expenseId);
    if (!expense) throw new Error("Expense missing right after insert");
    return expense;
  })();
}

export function archiveExpense(
  db: Db,
  groupId: string,
  expenseId: number,
): void {
  const expense = findExpense(db, expenseId);
  if (!expense || expense.groupId !== groupId) {
    throw new NotFoundError("Expense not found");
  }
  if (!archiveExpenseRow(db, expenseId)) {
    throw new ValidationError("Expense is already archived");
  }
}
