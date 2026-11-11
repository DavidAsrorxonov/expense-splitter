import type { CurrencyCode } from "./domain/currency";

export type Group = {
  id: string;
  name: string;
  currency: CurrencyCode;
  createdAt: string;
};

export type Member = {
  id: number;
  groupId: string;
  name: string;
  archivedAt: string | null;
};

export type Expense = {
  id: number;
  groupId: string;
  paidBy: number;
  amountMinor: number;
  note: string;
  spentOn: string;
  createdAt: string;
  archivedAt: string | null;
};

export type Settlement = {
  id: number;
  groupId: string;
  fromMember: number;
  toMember: number;
  amountMinor: number;
  createdAt: string;
};

export type MemberBalance = {
  memberId: number;
  groupId: string;
  name: string;
  archivedAt: string | null;
  balanceMinor: number;
};

export type MonthlyTotal = { month: string; totalMinor: number };
