import type { Expense, Member, MonthlyTotal } from "@/types";
import { memberName } from "./presenters";

export function expenseSummary(expenses: readonly Expense[]) {
  const active = expenses.filter((expense) => expense.archivedAt === null);
  const totalMinor = active.reduce((sum, expense) => sum + expense.amountMinor, 0);
  return {
    count: active.length,
    totalMinor,
    averageMinor: active.length ? Math.round(totalMinor / active.length) : null,
  };
}

export function spendingByPayer(expenses: readonly Expense[], members: readonly Member[]) {
  const totals = new Map<number, number>();
  for (const expense of expenses) {
    if (expense.archivedAt !== null) continue;
    totals.set(expense.paidBy, (totals.get(expense.paidBy) ?? 0) + expense.amountMinor);
  }
  return Array.from(totals, ([memberId, totalMinor]) => ({
    memberId, name: memberName(memberId, members), totalMinor,
  })).sort((a, b) => b.totalMinor - a.totalMinor || a.name.localeCompare(b.name, "en-US") || a.memberId - b.memberId);
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthLabel(month: string): string {
  return `${months[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

// Build at most twelve rows, even if expenses are separated by many years.
export function monthlySpendingPage(totals: readonly MonthlyTotal[], requestedPage: number) {
  if (totals.length === 0) return { items: [], page: 1, pageCount: 1 };
  const indexOf = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;
  const indexed = new Map(totals.map((total) => [indexOf(total.month), total.totalMinor]));
  let first = Infinity;
  let last = -Infinity;
  for (const index of indexed.keys()) {
    first = Math.min(first, index);
    last = Math.max(last, index);
  }
  const pageCount = Math.ceil((last - first + 1) / 12);
  const page = Math.min(pageCount, Math.max(1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1));
  const end = last - (page - 1) * 12;
  const start = Math.max(first, end - 11);
  const items: MonthlyTotal[] = [];
  for (let index = start; index <= end; index++) {
    const month = `${String(Math.floor(index / 12)).padStart(4, "0")}-${String(index % 12 + 1).padStart(2, "0")}`;
    items.push({ month, totalMinor: indexed.get(index) ?? 0 });
  }
  return { items, page, pageCount };
}
