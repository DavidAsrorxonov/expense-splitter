export type Balance = { memberId: number; balanceMinor: number };
export type Transfer = { from: number; to: number; amountMinor: number };

type Entry = { memberId: number; remaining: number };

const largestFirst = (a: Entry, b: Entry) =>
  b.remaining - a.remaining || a.memberId - b.memberId;

export function minimizeTransfers(balances: Balance[]): Transfer[] {
  if (balances.some((b) => !Number.isSafeInteger(b.balanceMinor))) {
    throw new Error("Balances must be integers");
  }
  if (new Set(balances.map((b) => b.memberId)).size !== balances.length) {
    throw new Error("Member IDs must be unique");
  }
  if (balances.reduce((total, b) => total + b.balanceMinor, 0) !== 0) {
    throw new Error("Balances must sum to zero");
  }

  const debtors: Entry[] = balances
    .filter((b) => b.balanceMinor < 0)
    .map((b) => ({ memberId: b.memberId, remaining: -b.balanceMinor }));
  const creditors: Entry[] = balances
    .filter((b) => b.balanceMinor > 0)
    .map((b) => ({ memberId: b.memberId, remaining: b.balanceMinor }));

  const transfers: Transfer[] = [];

  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort(largestFirst);
    creditors.sort(largestFirst);

    const debtor = debtors[0];
    const creditor = creditors[0];
    const amountMinor = Math.min(debtor.remaining, creditor.remaining);

    transfers.push({
      from: debtor.memberId,
      to: creditor.memberId,
      amountMinor,
    });

    debtor.remaining -= amountMinor;
    creditor.remaining -= amountMinor;
    if (debtor.remaining === 0) debtors.shift();
    if (creditor.remaining === 0) creditors.shift();
  }

  return transfers;
}
