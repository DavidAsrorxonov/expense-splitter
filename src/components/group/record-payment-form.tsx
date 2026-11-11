"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { FormErrorSummary } from "@/components/forms/form-error-summary";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Amount } from "@/components/money/amount";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { decimalsFor, type CurrencyCode } from "@/domain/currency";
import type { Transfer } from "@/domain/minimze-transfers";
import { fieldValue, initialActionState, type FormAction } from "@/lib/action-state";
import { memberName, transferSentence } from "@/lib/presenters";
import type { Member } from "@/types";

type RecordPaymentFormProps = {
  action: FormAction; groupId: string; members: readonly Member[]; currency: CurrencyCode;
} & ({ mode: "suggested"; transfers: readonly Transfer[] } | { mode: "manual" });

export function RecordPaymentForm(props: RecordPaymentFormProps) {
  const { action, groupId, members, currency } = props;
  const [state, formAction, pending] = useActionState(action, initialActionState, `/g/${groupId}`);
  const [memberSelections, setMemberSelections] = useState({
    state, fromMember: fieldValue(state, "fromMember"), toMember: fieldValue(state, "toMember"),
  });
  const feedback = <>
    <FormErrorSummary message={state.status === "error" ? state.message : undefined} />
    <p role="status" aria-live="polite" className="flex items-start gap-2 text-sm">
      {state.status === "success" && <><Check className="mt-1 size-4 shrink-0" aria-hidden="true" />{state.message}</>}
    </p>
  </>;

  if (props.mode === "suggested") {
    // Keep the action state above the list so confirmation survives a settled suggestion disappearing.
    return <div className="mt-6 space-y-4">
      {feedback}
      {props.transfers.length === 0 ? (
        <p className="flex items-start gap-2"><Check className="mt-1 size-4 shrink-0" aria-hidden="true" />Everyone is settled up.</p>
      ) : <ul className="space-y-6">
        {props.transfers.map((transfer) => {
          const from = memberName(transfer.from, members);
          const to = memberName(transfer.to, members);
          return <li key={`${transfer.from}-${transfer.to}-${transfer.amountMinor}`} className="space-y-3">
            <span className="sr-only">{transferSentence(from, to, transfer.amountMinor, currency)}</span>
            <div aria-hidden="true" className="flex items-start gap-2">
              <ArrowRight className="mt-1 size-4 shrink-0 text-brand-accent" />
              <p>{from} pays {to}{" "}<Amount minor={transfer.amountMinor} currency={currency} className="text-brand-accent" /></p>
            </div>
            <form action={formAction} aria-label={`Record payment: ${transferSentence(from, to, transfer.amountMinor, currency)}`}>
              <input type="hidden" name="fromMember" value={transfer.from} />
              <input type="hidden" name="toMember" value={transfer.to} />
              <input type="hidden" name="amountMinor" value={transfer.amountMinor} />
              <SubmitButton variant="outline" disabled={pending} aria-label={`Record payment: ${transferSentence(from, to, transfer.amountMinor, currency)}`}>Record payment</SubmitButton>
            </form>
          </li>;
        })}
      </ul>}
    </div>;
  }

  const disabled = members.length < 2;
  const whole = decimalsFor(currency) === 0;
  return (
    <form action={formAction} noValidate aria-labelledby="manual-payment-heading" className="mt-8 space-y-4 border-t border-border pt-6">
      <h3 id="manual-payment-heading" className="font-medium">Record a payment</h3>
      {disabled && <p className="text-sm text-text-secondary">Add at least two members to record a payment.</p>}
      {feedback}
      <fieldset key={JSON.stringify(state.values ?? {})} disabled={disabled} className="min-w-0 space-y-4 disabled:opacity-60">
        <legend className="sr-only">Payment details</legend>
        {(["fromMember", "toMember"] as const).map((field) => {
          const value = memberSelections.state === state ? memberSelections[field] : fieldValue(state, field);
          const items = members.map((member) => ({ value: String(member.id), label: memberName(member.id, members) }));
          const unavailable = value !== "" && !items.some((item) => item.value === value);
          if (unavailable) items.push({ value, label: "Previously selected member is unavailable" });
          const id = `payment-${field}`;
          return <FormField key={field} id={id} label={field === "fromMember" ? "Sender" : "Recipient"} error={state.fieldErrors?.[field]}>
            <Select name={field} required disabled={disabled} items={items} value={value || null}
              onValueChange={(nextValue) => setMemberSelections((current) => ({
                state,
                fromMember: current.state === state ? current.fromMember : fieldValue(state, "fromMember"),
                toMember: current.state === state ? current.toMember : fieldValue(state, "toMember"),
                [field]: nextValue ?? "",
              }))}>
              <SelectTrigger id={id} aria-invalid={Boolean(state.fieldErrors?.[field])}
                aria-describedby={state.fieldErrors?.[field] ? `${id}-description` : undefined}>
                <SelectValue placeholder="Choose a member" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value} disabled={unavailable && item.value === value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>;
        })}
        <FormField id="payment-amount" label={`Amount (${currency})`} hint={whole ? "Whole yen, e.g. 1500" : "e.g. 12.50"} error={state.fieldErrors?.amount}>
          <Input id="payment-amount" name="amount" type="text" inputMode={whole ? "numeric" : "decimal"} required
            defaultValue={fieldValue(state, "amount")} aria-invalid={Boolean(state.fieldErrors?.amount)} aria-describedby="payment-amount-description" />
        </FormField>
        <SubmitButton variant="outline" disabled={disabled}>Record payment</SubmitButton>
      </fieldset>
    </form>
  );
}
