"use client";

import { useContext, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Amount } from "@/components/money/amount";
import type { CurrencyCode } from "@/domain/currency";
import { formatAmount } from "@/domain/money";
import { monthLabel, monthlySpendingPage } from "@/lib/chart-data";
import type { MonthlyTotal } from "@/types";
import { MonthlyTotals } from "./monthly-totals";
import { GroupPanelVisibilityContext } from "./group-panel-visibility";

const chartConfig = { totalMinor: { label: "Spending", color: "var(--brand-accent)" } } satisfies ChartConfig;

export function MonthlySpendingChart({ totals, currency }: { totals: readonly MonthlyTotal[]; currency: CurrencyCode }) {
  const panelVisible = useContext(GroupPanelVisibilityContext);
  const [requestedPage, setRequestedPage] = useState(1);
  const { items, page, pageCount } = monthlySpendingPage(totals, requestedPage);
  const maximum = Math.max(1, ...items.map((item) => item.totalMinor));
  return (
    <section aria-labelledby="monthly-spending-heading" className="min-w-0 space-y-4">
      <h3 id="monthly-spending-heading" className="text-lg font-medium">Monthly spending</h3>
      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">Add an expense to see spending over time.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" aria-live="polite" className="text-sm text-text-secondary">
              {monthLabel(items[0].month)}{items.length > 1 && ` – ${monthLabel(items[items.length - 1].month)}`}
            </p>
            {pageCount > 1 && <nav aria-label="Monthly spending periods" className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={page === pageCount} onClick={() => setRequestedPage(page + 1)}>Earlier months</Button>
              <Button variant="outline" disabled={page === 1} onClick={() => setRequestedPage(page - 1)}>Later months</Button>
            </nav>}
          </div>
          {panelVisible && <ChartContainer config={chartConfig} className="h-72 min-h-72 w-full aspect-auto sm:h-80" aria-label="Monthly spending bar chart">
            <BarChart accessibilityLayer aria-label={`Monthly spending in ${currency}`} data={items} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} minTickGap={24} tickMargin={12} />
              <YAxis width={96} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, maximum]}
                tickFormatter={(value: number) => formatAmount(Math.round(value), currency)} tick={{ fontSize: 10, fontFamily: "var(--font-space-mono)" }} />
              <ChartTooltip isAnimationActive={false} cursor={{ fill: "var(--muted)" }} content={
                <ChartTooltipContent labelFormatter={(label) => monthLabel(String(label))}
                  formatter={(value) => typeof value === "number" ? <Amount minor={value} currency={currency} /> : null} />
              } />
              <Bar dataKey="totalMinor" fill="var(--color-totalMinor)" maxBarSize={64} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>}
          <details>
            <summary className="min-h-11 cursor-pointer py-3 text-sm underline-offset-4 hover:underline">View exact monthly totals</summary>
            <MonthlyTotals totals={items} currency={currency} />
          </details>
        </>
      )}
    </section>
  );
}
