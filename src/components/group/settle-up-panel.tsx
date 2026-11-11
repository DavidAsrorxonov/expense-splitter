import { ArrowRight, Check } from "lucide-react";
import { Amount } from "@/components/money/amount";
import type { CurrencyCode } from "@/domain/currency";
import type { Transfer } from "@/domain/minimze-transfers";
import { memberName, transferSentence } from "@/lib/presenters";
import { cn } from "@/lib/utils";
import type { Member, Settlement } from "@/types";
import { SettlementHistory } from "./settlement-history";

type SettleUpPanelProps = {
  transfers: readonly Transfer[];
  settlements: readonly Settlement[];
  members: readonly Member[];
  currency: CurrencyCode;
  className?: string;
};

export function SettleUpPanel({
  transfers,
  settlements,
  members,
  currency,
  className,
}: SettleUpPanelProps) {
  return (
    <section
      aria-labelledby="settle-up-heading"
      className={cn("min-w-0 border border-border p-6", className)}
    >
      <h2 id="settle-up-heading" className="text-xl font-medium">
        Settle up
      </h2>
      {transfers.length === 0 ? (
        <p className="mt-6 flex items-start gap-2">
          <Check className="mt-1 size-4 shrink-0" aria-hidden="true" />
          Everyone is settled up.
        </p>
      ) : (
        <ul className="mt-6 space-y-6">
          {transfers.map((transfer) => {
            const from = memberName(transfer.from, members);
            const to = memberName(transfer.to, members);
            return (
              <li key={`${transfer.from}-${transfer.to}`}>
                <span className="sr-only">
                  {transferSentence(from, to, transfer.amountMinor, currency)}
                </span>
                <div aria-hidden="true" className="flex items-start gap-2">
                  <ArrowRight className="mt-1 size-4 shrink-0 text-brand-accent" />
                  <p>
                    {from} pays {to}{" "}
                    <Amount
                      minor={transfer.amountMinor}
                      currency={currency}
                      className="text-brand-accent"
                    />
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <SettlementHistory
        settlements={settlements}
        members={members}
        currency={currency}
      />
    </section>
  );
}
