import { Amount } from "@/components/money/amount";
import type { CurrencyCode } from "@/domain/currency";
import { memberName } from "@/lib/presenters";
import type { Member, Settlement } from "@/types";

type SettlementHistoryProps = {
  settlements: readonly Settlement[];
  members: readonly Member[];
  currency: CurrencyCode;
};

export function SettlementHistory({ settlements, members, currency }: SettlementHistoryProps) {
  return (
    <section aria-labelledby="settlement-history-heading" className="mt-8 border-t border-border pt-6">
      <h3 id="settlement-history-heading" className="text-base font-medium">Recorded payments</h3>
      {settlements.length === 0 ? (
        <p className="mt-4 text-sm text-text-secondary">No payments recorded yet.</p>
      ) : (
        <ol className="mt-4 divide-y divide-border">
          {settlements.map((settlement) => (
            <li key={settlement.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
              <p className="text-sm">
                {memberName(settlement.fromMember, members)} to {memberName(settlement.toMember, members)}
                {" — "}<Amount minor={settlement.amountMinor} currency={currency} />
              </p>
              <time dateTime={settlement.createdAt} className="block font-mono text-xs text-text-meta">
                {settlement.createdAt.slice(0, 10)} (UTC)
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
