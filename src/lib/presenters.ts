import type { CurrencyCode } from "@/domain/currency";
import { formatAmount } from "@/domain/money";
import type { Member, MemberBalance, MonthlyTotal } from "@/types";

export function sortBalances(balances: readonly MemberBalance[]): MemberBalance[] {
  const rank = (value: number) => (value > 0 ? 0 : value < 0 ? 1 : 2);
  return [...balances].sort((a, b) => {
    const groupOrder = rank(a.balanceMinor) - rank(b.balanceMinor);
    if (groupOrder !== 0) return groupOrder;

    const amountOrder = a.balanceMinor > 0
      ? b.balanceMinor - a.balanceMinor
      : a.balanceMinor - b.balanceMinor;
    return amountOrder || a.name.localeCompare(b.name, "en-US") || a.memberId - b.memberId;
  });
}

export function balanceSentence(
  name: string,
  balanceMinor: number,
  currency: CurrencyCode,
  archived: boolean,
): string {
  const label = archived ? `${name} (archived)` : name;
  if (balanceMinor === 0) return `${label} is settled up`;
  const direction = balanceMinor > 0 ? "is owed" : "owes";
  return `${label} ${direction} ${formatAmount(Math.abs(balanceMinor), currency)}`;
}

export function transferSentence(
  fromName: string,
  toName: string,
  amountMinor: number,
  currency: CurrencyCode,
): string {
  return `${fromName} pays ${toName} ${formatAmount(amountMinor, currency)}`;
}

export function monthBarPercents(totals: readonly MonthlyTotal[]): number[] {
  const largest = totals.reduce((max, total) => Math.max(max, total.totalMinor), 0);
  return totals.map(({ totalMinor }) =>
    largest === 0 || totalMinor <= 0 ? 0 : Math.max(2, (totalMinor / largest) * 100),
  );
}

export function memberName(memberId: number, members: readonly Member[]): string {
  const member = members.find((candidate) => candidate.id === memberId);
  if (!member) return "Unknown member";
  return member.archivedAt ? `${member.name} (archived)` : member.name;
}
