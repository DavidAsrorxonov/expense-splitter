"use client";

import { Amount } from "@/components/money/amount";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CurrencyCode } from "@/domain/currency";
import type { FormAction } from "@/lib/action-state";
import type { GroupView } from "@/lib/group-view";
import { memberName } from "@/lib/presenters";
import type { Expense, Member } from "@/types";
import { RestoreExpenseForm } from "./restore-expense-form";
import { RestoreFeedback } from "./restore-feedback";
import { useRestoreAction } from "./use-restore-action";

export function ArchivedExpensesTable({ expenses, members, currency, groupId, view, restoreAction }: {
  expenses: readonly Expense[];
  members: readonly Member[];
  currency: CurrencyCode;
  groupId: string;
  view: GroupView;
  restoreAction: FormAction;
}) {
  const { state, formAction, pending, feedbackRef } = useRestoreAction(restoreAction, groupId, view, "archived-expenses");

  return (
    <section aria-labelledby="archived-expenses-heading" className="min-w-0 space-y-4 border-t border-border pt-8">
      <h2 id="archived-expenses-heading" tabIndex={-1} className="text-xl font-medium">Archived expenses</h2>
      <p className="text-sm text-text-secondary">All archived expenses, regardless of your search. Restoring an expense includes it in balances and spending again.</p>
      <RestoreFeedback state={state} feedbackRef={feedbackRef} />
      {expenses.length === 0 ? (
        <p className="text-text-secondary">No archived expenses.</p>
      ) : (
        <Table aria-labelledby="archived-expenses-heading" containerLabel="Archived expenses — scroll to see all columns" className="min-w-208 table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Date</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="w-36">Paid by</TableHead>
              <TableHead className="w-40 text-right">Amount</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-40"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-mono"><time dateTime={expense.spentOn}>{expense.spentOn}</time></TableCell>
                <TableCell className="wrap-anywhere">{expense.note || "—"}</TableCell>
                <TableCell className="wrap-anywhere">{memberName(expense.paidBy, members)}</TableCell>
                <TableCell className="text-right wrap-anywhere"><Amount minor={expense.amountMinor} currency={currency} /></TableCell>
                <TableCell className="text-text-secondary">Archived</TableCell>
                <TableCell>
                  <RestoreExpenseForm action={formAction} expenseId={expense.id} label={expense.note || expense.spentOn} state={state} pending={pending} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
