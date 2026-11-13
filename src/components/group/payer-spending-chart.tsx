"use client";

import { useContext, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Amount } from "@/components/money/amount";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CurrencyCode } from "@/domain/currency";
import { formatAmount } from "@/domain/money";
import type { spendingByPayer } from "@/lib/chart-data";
import { paginate } from "@/lib/pagination";
import { GroupPanelVisibilityContext } from "./group-panel-visibility";

const chartConfig = { totalMinor: { label: "Paid", color: "var(--brand-accent)" } } satisfies ChartConfig;

export function PayerSpendingChart({ payers, currency }: {
  payers: ReturnType<typeof spendingByPayer>;
  currency: CurrencyCode;
}) {
  const panelVisible = useContext(GroupPanelVisibilityContext);
  const [requestedPage, setRequestedPage] = useState(1);
  const { items, page, pageCount, first, last, total } = paginate(payers, requestedPage);
  // Keep the same scale on every page so bars remain comparable.
  const maximum = Math.max(1, payers[0]?.totalMinor ?? 0);
  return (
    <section aria-labelledby="payer-spending-heading" className="min-w-0 space-y-4 border-t border-border pt-8 lg:border-t-0 lg:pt-0">
      <div>
        <h3 id="payer-spending-heading" className="text-lg font-medium">Spending by payer</h3>
        <p className="mt-2 text-sm text-text-secondary">Who paid for expenses, before repayments. See Balances for who currently owes or is owed.</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">Add an expense to compare spending by payer.</p>
      ) : (
        <>
          {pageCount > 1 && <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" aria-live="polite" className="text-sm text-text-secondary">{first}–{last} of {total} payers</p>
            <nav aria-label="Spending by payer pages" className="flex gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setRequestedPage(page - 1)}>Previous</Button>
              <Button variant="outline" disabled={page === pageCount} onClick={() => setRequestedPage(page + 1)}>Next</Button>
            </nav>
          </div>}
          {panelVisible && <ChartContainer config={chartConfig} className="min-h-40 w-full aspect-auto" style={{ height: Math.max(160, items.length * 48 + 48) }} aria-label="Spending by payer horizontal bar chart">
            <BarChart accessibilityLayer aria-label={`Spending by payer in ${currency}`} layout="vertical" data={items} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false}
                tickFormatter={(name: string) => name.length > 14 ? `${name.slice(0, 13)}…` : name} />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} domain={[0, maximum]} minTickGap={32}
                tickFormatter={(value: number) => formatAmount(Math.round(value), currency)} tick={{ fontSize: 10, fontFamily: "var(--font-space-mono)" }} />
              <ChartTooltip isAnimationActive={false} cursor={{ fill: "var(--muted)" }} content={
                <ChartTooltipContent formatter={(value) => typeof value === "number" ? <Amount minor={value} currency={currency} /> : null} />
              } />
              <Bar dataKey="totalMinor" fill="var(--color-totalMinor)" maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>}
          <details>
            <summary className="min-h-11 cursor-pointer py-3 text-sm underline-offset-4 hover:underline">View full names and exact amounts</summary>
            <Table aria-label="Spending by payer totals" containerLabel="Spending by payer totals">
              <TableHeader><TableRow><TableHead>Paid by</TableHead><TableHead className="text-right">Total paid</TableHead></TableRow></TableHeader>
              <TableBody>{items.map((payer) => (
                <TableRow key={payer.memberId}>
                  <TableCell className="wrap-anywhere">{payer.name}</TableCell>
                  <TableCell className="text-right"><Amount minor={payer.totalMinor} currency={currency} /></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </details>
        </>
      )}
    </section>
  );
}
