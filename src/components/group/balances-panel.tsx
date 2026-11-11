import type { CurrencyCode } from "@/domain/currency";
import { balanceSentence, sortBalances } from "@/lib/presenters";
import { cn } from "@/lib/utils";
import type { MemberBalance } from "@/types";
import { Amount } from "@/components/money/amount";

type BalancesPanelProps = {
  balances: readonly MemberBalance[];
  currency: CurrencyCode;
  className?: string;
};

export function BalancesPanel({ balances, currency, className }: BalancesPanelProps) {
  return (
    <section aria-labelledby="balances-heading" className={cn("min-w-0 border border-border p-6", className)}>
      <h2 id="balances-heading" className="text-xl font-medium">Balances</h2>
      {balances.length === 0 ? (
        <p className="mt-6 text-text-secondary">No member balances yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border">
          {sortBalances(balances).map((balance) => (
            <li key={balance.memberId} className="py-4 first:pt-0 last:pb-0">
              <span className="sr-only">
                {balanceSentence(balance.name, balance.balanceMinor, currency, balance.archivedAt !== null)}
              </span>
              <div aria-hidden="true" className="space-y-2">
                <p className="font-medium">
                  {balance.name}{balance.archivedAt !== null && " (archived)"}
                </p>
                {balance.balanceMinor === 0 ? (
                  <p className="text-sm text-text-secondary">is settled up</p>
                ) : (
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-sm text-text-secondary">{balance.balanceMinor > 0 ? "is owed" : "owes"}</span>
                    <Amount minor={Math.abs(balance.balanceMinor)} currency={currency} className="text-2xl" />
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
