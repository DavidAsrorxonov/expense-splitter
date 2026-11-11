import { Amount } from "@/components/money/amount";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CurrencyCode } from "@/domain/currency";
import { monthBarPercents } from "@/lib/presenters";
import { cn } from "@/lib/utils";
import type { MonthlyTotal } from "@/types";

type MonthlyTotalsProps = {
  totals: readonly MonthlyTotal[];
  currency: CurrencyCode;
  className?: string;
};

export function MonthlyTotals({ totals, currency, className }: MonthlyTotalsProps) {
  const widths = monthBarPercents(totals);
  return (
    <section aria-labelledby="monthly-totals-heading" className={cn("min-w-0 border-t border-border pt-6", className)}>
      <h2 id="monthly-totals-heading" className="mb-6 text-xl font-medium">Monthly totals</h2>
      {totals.length === 0 ? (
        <p className="text-text-secondary">No spending recorded yet.</p>
      ) : (
        <Table aria-labelledby="monthly-totals-heading" containerLabel="Monthly totals — scroll to see all columns">
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totals.map((total, index) => (
              <TableRow key={total.month}>
                <TableCell className="w-1/2">
                  <time dateTime={total.month} className="font-mono">{total.month}</time>
                  <div aria-hidden="true" className="mt-2 h-1 w-full">
                    <div className="h-full bg-brand-accent" style={{ width: `${widths[index]}%` }} />
                  </div>
                </TableCell>
                <TableCell className="text-right"><Amount minor={total.totalMinor} currency={currency} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
