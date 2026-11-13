import type { Db } from "@/db/connection";
import { toCsv } from "@/domain/csv";
import { buildExpensesTable } from "@/domain/expenses-table";
import { listExpenses, listGroupSplits } from "@/repos/expenses";
import { findGroup } from "@/repos/groups";
import { listMembers } from "@/repos/members";
import { NotFoundError } from "./errors";

export function exportExpensesCsv(
  db: Db,
  groupId: string,
  options: { includeArchived?: boolean } = {},
): { filename: string; content: string } {
  return db.transaction(() => {
    const group = findGroup(db, groupId);

    if (!group) {
      throw new NotFoundError("Group not found");
    }

    const members = listMembers(db, groupId, true);
    const expenses = listExpenses(
      db,
      groupId,
      options.includeArchived ?? false,
    );
    const splits = listGroupSplits(db, groupId);

    const table = buildExpensesTable({
      currency: group.currency,
      members: members.map((member) => ({
        id: member.id,
        name: member.name,
        archived: member.archivedAt !== null,
      })),
      expenses: expenses.map((expense) => ({
        id: expense.id,
        paidBy: expense.paidBy,
        amountMinor: expense.amountMinor,
        note: expense.note,
        spentOn: expense.spentOn,
        archived: expense.archivedAt !== null,
      })),
      splits,
    });

    const slug =
      group.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "group";

    return {
      filename: `${slug}-expenses.csv`,
      content: "\uFEFF" + toCsv(table),
    };
  })();
}
