import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GroupPanelVisibilityContext } from "@/components/group/group-panel-visibility";
import { GroupTabs } from "@/components/group/group-tabs";
import { MonthlySpendingChart } from "@/components/group/monthly-spending-chart";
import { PayerSpendingChart } from "@/components/group/payer-spending-chart";

const monthlyChart = () => createElement(MonthlySpendingChart, {
  totals: [{ month: "2025-01", totalMinor: 1000 }, { month: "2026-02", totalMinor: 2000 }],
  currency: "USD",
});
const payerChart = () => createElement(PayerSpendingChart, {
  payers: Array.from({ length: 11 }, (_, index) => ({
    memberId: index + 1, name: `Payer ${index + 1}`, totalMinor: 1000 - index,
  })),
  currency: "USD",
});

describe.each([
  { name: "monthly spending", chart: monthlyChart, navigation: "Earlier months", table: "View exact monthly totals" },
  { name: "payer spending", chart: payerChart, navigation: "Next", table: "View full names and exact amounts" },
])("$name chart visibility", ({ chart, navigation, table }) => {
  it("omits the responsive canvas in a hidden panel but retains controls and exact values", () => {
    const html = renderToStaticMarkup(createElement(GroupPanelVisibilityContext.Provider, { value: false }, chart()));

    expect(html).not.toContain('data-slot="chart"');
    expect(html).not.toContain("recharts-responsive-container");
    expect(html).toContain(navigation);
    expect(html).toContain(table);
    expect(html).toContain("<table");
  });

  it("renders the responsive canvas when its panel is visible", () => {
    const html = renderToStaticMarkup(createElement(GroupPanelVisibilityContext.Provider, { value: true }, chart()));
    expect(html).toContain('data-slot="chart"');
    expect(html).toContain("recharts-responsive-container");
  });

  it("still renders when used outside the group tabs", () => {
    expect(renderToStaticMarkup(chart())).toContain('data-slot="chart"');
  });
});

it("keeps charts available in the server-rendered stacked fallback", () => {
  const html = renderToStaticMarkup(createElement(GroupTabs, {
    expenses: monthlyChart(), balances: payerChart(), payments: "Payments", members: "Members",
  }));

  expect(html.match(/data-slot="chart"/g)).toHaveLength(2);
  expect(html).toContain("View exact monthly totals");
  expect(html).toContain("View full names and exact amounts");
});
