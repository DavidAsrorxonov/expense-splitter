import type { CurrencyCode } from "@/domain/currency";
import type { Transfer } from "@/domain/minimze-transfers";
import type { FormAction } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import type { Member, Settlement } from "@/types";
import { RecordPaymentForm } from "./record-payment-form";
import { SettlementHistory } from "./settlement-history";

type SettleUpPanelProps = {
  transfers: readonly Transfer[];
  settlements: readonly Settlement[];
  members: readonly Member[];
  currency: CurrencyCode;
  groupId: string;
  suggestedAction: FormAction;
  manualAction: FormAction;
  className?: string;
};

export function SettleUpPanel({ transfers, settlements, members, currency, groupId, suggestedAction, manualAction, className }: SettleUpPanelProps) {
  return (
    <section aria-labelledby="settle-up-heading" className={cn("min-w-0 border border-border p-6", className)}>
      <h2 id="settle-up-heading" className="text-xl font-medium">Settle up</h2>
      <RecordPaymentForm mode="suggested" action={suggestedAction} groupId={groupId} transfers={transfers} members={members} currency={currency} />
      <RecordPaymentForm mode="manual" action={manualAction} groupId={groupId} members={members} currency={currency} />
      <p className="mt-6 text-sm text-text-meta">To reverse an incorrect entry, record the same amount in the opposite direction.</p>
      <SettlementHistory settlements={settlements} members={members} currency={currency} />
    </section>
  );
}
