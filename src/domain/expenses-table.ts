import type { CurrencyCode } from "./currency";
import { neutralizeFormula } from "./csv";
import { toDecimalString } from "./money";

export type ExpensesTableInput = {
  currency: CurrencyCode;
  members: {
    id: number;
    name: string;
    archived: boolean;
  }[];
  expenses: {
    id: number;
    paidBy: number;
    amountMinor: number;
    note: string;
    spentOn: string;
    archived: boolean;
  }[];
  splits: {
    expenseId: number;
    memberId: number;
    shareMinor: number;
  }[];
};

export function buildExpensesTable(input: ExpensesTableInput): string[][] {
  const members = [...input.members].sort((a, b) => a.id - b.id);
  const expenses = [...input.expenses].sort((a, b) => {
    if (a.spentOn !== b.spentOn) {
      return a.spentOn < b.spentOn ? -1 : 1;
    }
    return a.id - b.id;
  });

  const labels = new Map(
    members.map((member) => [
      member.id,
      neutralizeFormula(member.name + (member.archived ? " (archived)" : "")),
    ]),
  );

  const shares = new Map(
    input.splits.map((split) => [
      `${split.expenseId}:${split.memberId}`,
      split.shareMinor,
    ]),
  );

  const header = [
    "Date",
    "Note",
    "Paid by",
    "Amount",
    "Status",
    ...members.map((member) => labels.get(member.id)!),
  ];

  const rows = expenses.map((ex) => [
    ex.spentOn,
    neutralizeFormula(ex.note),
    labels.get(ex.paidBy) ?? "",
    toDecimalString(ex.amountMinor, input.currency),
    ex.archived ? "archived" : "active",
    ...members.map((m) => {
      const share = shares.get(`${ex.id}:${m.id}`);
      return share === undefined ? "" : toDecimalString(share, input.currency);
    }),
  ]);

  return [header, ...rows];
}
