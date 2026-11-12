import { describe, expect, it } from "vitest";
import { expenseSummary, monthLabel, monthlySpendingPage, spendingByPayer } from "@/lib/chart-data";
import type { Expense, Member, MonthlyTotal } from "@/types";

const members: Member[] = [
  { id: 1, groupId: "group", name: "Alice", archivedAt: null },
  { id: 2, groupId: "group", name: "Bob", archivedAt: "2026-01-01" },
  { id: 3, groupId: "group", name: "Alice", archivedAt: "2026-01-01" },
];
function expense(id: number, paidBy: number, amountMinor: number, archivedAt: string | null = null): Expense {
  return { id, paidBy, amountMinor, archivedAt, groupId: "group", note: "", spentOn: "2026-01-01", createdAt: "2026-01-01T00:00:00Z" };
}

describe("expense summary", () => {
  it("summarizes active expenses and rounds the average to the currency's minor unit", () => {
    expect(expenseSummary([expense(1, 1, 1250), expense(2, 2, 1251), expense(3, 1, 9999, "2026-01-01")]))
      .toEqual({ count: 2, totalMinor: 2501, averageMinor: 1251 });
  });
  it("handles an empty group without a NaN average", () => {
    expect(expenseSummary([])).toEqual({ count: 0, totalMinor: 0, averageMinor: null });
    expect(expenseSummary([expense(1, 1, 100, "2026-01-01")])).toEqual({ count: 0, totalMinor: 0, averageMinor: null });
  });
});

describe("spending by payer", () => {
  it("groups by member ID and sorts largest spending first, preserving archived names", () => {
    const input = Object.freeze([expense(1, 1, 100), expense(2, 2, 500), expense(3, 1, 200), expense(4, 3, 50)]);
    expect(spendingByPayer(input, members)).toEqual([
      { memberId: 2, name: "Bob (archived)", totalMinor: 500 },
      { memberId: 1, name: "Alice", totalMinor: 300 },
      { memberId: 3, name: "Alice (archived)", totalMinor: 50 },
    ]);
    expect(input[0].amountMinor).toBe(100);
  });
  it("omits archived expenses and members who have not paid for an expense", () => {
    expect(spendingByPayer([expense(1, 1, 100), expense(2, 2, 500, "2026-01-01")], members))
      .toEqual([{ memberId: 1, name: "Alice", totalMinor: 100 }]);
  });
  it("breaks total ties by label and labels missing references", () => {
    expect(spendingByPayer([expense(1, 2, 100), expense(2, 1, 100)], members).map((payer) => payer.memberId)).toEqual([1, 2]);
    expect(spendingByPayer([expense(1, 999, 100)], members)[0].name).toBe("Unknown member");
    expect(spendingByPayer([], members)).toEqual([]);
  });
  it("keeps totals consistent with the overview", () => {
    const input = [expense(1, 1, 1), expense(2, 2, 1251), expense(3, 1, 10)];
    expect(spendingByPayer(input, members).reduce((sum, payer) => sum + payer.totalMinor, 0)).toBe(expenseSummary(input).totalMinor);
  });
});

describe("monthly chart periods", () => {
  it("orders months chronologically and fills missing months with zero", () => {
    const totals = Object.freeze([{ month: "2026-03", totalMinor: 300 }, { month: "2026-01", totalMinor: 100 }]);
    expect(monthlySpendingPage(totals, 1)).toEqual({ page: 1, pageCount: 1, items: [
      { month: "2026-01", totalMinor: 100 }, { month: "2026-02", totalMinor: 0 }, { month: "2026-03", totalMinor: 300 },
    ] });
    expect(totals[0].month).toBe("2026-03");
  });
  it("starts with the latest twelve months and pages back without repeating months", () => {
    const totals: MonthlyTotal[] = [{ month: "2025-01", totalMinor: 100 }, { month: "2026-03", totalMinor: 300 }];
    const latest = monthlySpendingPage(totals, 1);
    const earlier = monthlySpendingPage(totals, 2);
    expect(latest.items).toHaveLength(12);
    expect(latest.items[0].month).toBe("2025-04");
    expect(latest.items[11].month).toBe("2026-03");
    expect(earlier.items.map((item) => item.month)).toEqual(["2025-01", "2025-02", "2025-03"]);
    expect(earlier.items.concat(latest.items).reduce((sum, item) => sum + item.totalMinor, 0)).toBe(400);
  });
  it("handles empty history, a single month, and stale pages after archiving", () => {
    expect(monthlySpendingPage([], 9)).toEqual({ page: 1, pageCount: 1, items: [] });
    const totals = [{ month: "2026-11", totalMinor: 100 }];
    expect(monthlySpendingPage(totals, 5)).toEqual({ page: 1, pageCount: 1, items: totals });
    expect(monthlySpendingPage(totals, NaN).page).toBe(1);
    expect(monthlySpendingPage(totals, -2).page).toBe(1);
  });
  it("does not allocate a row for every month across a very long history", () => {
    const totals = [{ month: "0001-01", totalMinor: 100 }, { month: "9999-12", totalMinor: 200 }];
    const latest = monthlySpendingPage(totals, 1);
    expect(latest.items).toHaveLength(12);
    expect(latest.pageCount).toBe(9999);
    expect(monthlySpendingPage(totals, latest.pageCount).items[0]).toEqual({ month: "0001-01", totalMinor: 100 });
  });
  it("labels months consistently without local-time date conversion", () => {
    expect(monthLabel("2026-01")).toBe("Jan 2026");
    expect(monthLabel("2026-12")).toBe("Dec 2026");
  });
});
