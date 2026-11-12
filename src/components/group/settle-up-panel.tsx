import type { CurrencyCode } from "@/domain/currency";
import type { Transfer } from "@/domain/minimze-transfers";
import type { FormAction } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import type { Member } from "@/types";
import { RecordPaymentForm } from "./record-payment-form";

type SettleUpPanelProps = {
  transfers: readonly Transfer[];
  members: readonly Member[];
  currency: CurrencyCode;
  groupId: string;
  suggestedAction: FormAction;
  className?: string;
};

export function SettleUpPanel({ transfers, members, currency, groupId, suggestedAction, className }: SettleUpPanelProps) {
  return (
    <section aria-labelledby="settle-up-heading" className={cn("min-w-0 border border-border p-6", className)}>
      <h2 id="settle-up-heading" className="text-xl font-medium">Settle up</h2>
      <RecordPaymentForm mode="suggested" action={suggestedAction} groupId={groupId} transfers={transfers} members={members} currency={currency} />
    </section>
  );
}
