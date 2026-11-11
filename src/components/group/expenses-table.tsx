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
};

export function ExpensesTable({
  expenses,
  members,
  currency,
  className,
}: ExpensesTableProps) {
  return (
    <section
      aria-labelledby="expenses-heading"
      className={cn("min-w-0 border-t border-border pt-6", className)}
    >
      <h2 id="expenses-heading" className="mb-6 text-xl font-medium">
        Expenses
      </h2>
      {expenses.length === 0 ? (
        <p className="text-text-secondary">No expenses yet.</p>
      ) : (
        <Table
          aria-labelledby="expenses-heading"
          containerLabel="Expenses — scroll to see all columns"
          className="min-w-xl table-fixed"
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Date</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="w-36">Paid by</TableHead>
              <TableHead className="w-40 text-right">Amount</TableHead>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
