"use client";

import { useActionState, useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { FormErrorSummary } from "@/components/forms/form-error-summary";
import { initialActionState, type FormAction } from "@/lib/action-state";
import { ArchiveExpenseForm } from "./archive-expense-form";
import { Amount } from "@/components/money/amount";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CurrencyCode } from "@/domain/currency";
import { memberName } from "@/lib/presenters";
import { cn } from "@/lib/utils";
import type { Expense, Member } from "@/types";

type ExpensesTableProps = {
  expenses: readonly Expense[];
  members: readonly Member[];
  currency: CurrencyCode;
  className?: string;
  groupId: string;
  archiveAction: FormAction;
};

export function ExpensesTable({
  expenses,
  members,
  currency,
  className,
  groupId,
  archiveAction,
}: ExpensesTableProps) {
  const [state, formAction, pending] = useActionState(
    archiveAction,
    initialActionState,
    `/g/${groupId}`,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (state.status === "success") headingRef.current?.focus();
  }, [state]);
  return (
    <section
      aria-labelledby="expenses-heading"
      className={cn("min-w-0", className)}
    >
      <h2
        ref={headingRef}
        tabIndex={-1}
        id="expenses-heading"
        className="mb-6 text-xl font-medium"
      >
        Expenses
      </h2>
      <FormErrorSummary
        message={state.status === "error" ? state.message : undefined}
      />
      <p
        role="status"
        aria-live="polite"
        className="mb-4 flex items-start gap-2 text-sm"
      >
        {state.status === "success" && (
          <>
            <Check className="mt-1 size-4 shrink-0" aria-hidden="true" />
            {state.message}
          </>
        )}
      </p>
      {expenses.length === 0 ? (
        <p className="text-text-secondary">
          No expenses yet. Use “Add expense” above to record the first one.
        </p>
      ) : (
        <Table
          aria-labelledby="expenses-heading"
          containerLabel="Expenses — scroll to see all columns"
          className="min-w-176 table-fixed"
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Date</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="w-36">Paid by</TableHead>
              <TableHead className="w-40 text-right">Amount</TableHead>
              <TableHead className="w-32">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-mono">
                  <time dateTime={expense.spentOn}>{expense.spentOn}</time>
                </TableCell>
                <TableCell className="wrap-anywhere">
                  {expense.note || "—"}
                </TableCell>
                <TableCell className="wrap-anywhere">
                  {memberName(expense.paidBy, members)}
                </TableCell>
                <TableCell className="text-right wrap-anywhere">
                  <Amount minor={expense.amountMinor} currency={currency} />
                </TableCell>
                <TableCell>
                  <ArchiveExpenseForm
                    action={formAction}
                    expenseId={expense.id}
                    label={expense.note || expense.spentOn}
                    pending={pending}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
