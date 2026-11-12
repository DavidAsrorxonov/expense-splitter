import { Amount } from "@/components/money/amount";
import type { CurrencyCode } from "@/domain/currency";
import { expenseSummary, spendingByPayer } from "@/lib/chart-data";
import type { Expense, Member, MonthlyTotal } from "@/types";
import { MonthlySpendingChart } from "./monthly-spending-chart";
import { PayerSpendingChart } from "./payer-spending-chart";

export function ExpenseOverview({ expenses, members, monthlyTotals, currency }: {
  expenses: readonly Expense[];
  members: readonly Member[];
  monthlyTotals: readonly MonthlyTotal[];
  currency: CurrencyCode;
}) {
  const summary = expenseSummary(expenses);
  return (
    <section aria-labelledby="spending-overview-heading" className="min-w-0 space-y-8">
      <div>
        <h2 id="spending-overview-heading" className="text-xl font-medium">Spending overview</h2>
        <p className="mt-2 text-sm text-text-secondary">All recorded spending, excluding archived expenses. Repayments are shown in Payments.</p>
      </div>
      <dl className="grid gap-6 border-y border-border py-6 sm:grid-cols-3">
        <div className="min-w-0 space-y-2">
          <dt className="text-sm text-text-secondary">Total spending</dt>
          <dd className="text-2xl wrap-anywhere"><Amount minor={summary.totalMinor} currency={currency} /></dd>
        </div>
        <div className="min-w-0 space-y-2">
          <dt className="text-sm text-text-secondary">Expenses</dt>
          <dd className="text-2xl">{summary.count.toLocaleString("en-US")}</dd>
        </div>
        <div className="min-w-0 space-y-2">
          <dt className="text-sm text-text-secondary">Average expense</dt>
          <dd className="text-2xl wrap-anywhere">{summary.averageMinor === null ? "—" : <Amount minor={summary.averageMinor} currency={currency} />}</dd>
        </div>
      </dl>
      <div className="grid min-w-0 items-start gap-8 lg:grid-cols-2">
        <MonthlySpendingChart totals={monthlyTotals} currency={currency} />
        <PayerSpendingChart payers={spendingByPayer(expenses, members)} currency={currency} />
      </div>
    </section>
  );
}
