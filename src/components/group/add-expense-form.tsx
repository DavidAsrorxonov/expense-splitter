"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { DatePickerInput } from "@/components/forms/date-picker-input";
import { FormErrorSummary } from "@/components/forms/form-error-summary";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { decimalsFor, type CurrencyCode } from "@/domain/currency";
import { fieldValue, initialActionState, type FormAction } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import type { Member } from "@/types";
import { ParticipantPicker } from "./participant-picker";

export function AddExpenseForm({ action, groupId, members, currency, today, className }: {
  action: FormAction; groupId: string; members: readonly Member[]; currency: CurrencyCode; today: string; className?: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState, `/g/${groupId}`);
  const activeMembers = members.filter((member) => member.archivedAt === null);
  const disabled = activeMembers.length === 0;
  const [payerSelection, setPayerSelection] = useState({ state, value: fieldValue(state, "paidBy") });
  const paidBy = payerSelection.state === state ? payerSelection.value : fieldValue(state, "paidBy");
  const payerItems = activeMembers.map((member) => ({ value: String(member.id), label: member.name }));
  const payerUnavailable = paidBy !== "" && !payerItems.some((item) => item.value === paidBy);
  if (payerUnavailable) payerItems.push({ value: paidBy, label: "Previously selected payer is unavailable" });
  const selectedIds = state.values?.participantIds;
  const whole = decimalsFor(currency) === 0;
  return (
    <section aria-labelledby="add-expense-heading" className={cn("min-w-0 border border-border p-6", className)}>
      <h2 id="add-expense-heading" className="text-xl font-medium">Add expense</h2>
      {disabled && <p className="mt-4 text-sm text-text-secondary">Add at least one member first.</p>}
      <form action={formAction} noValidate className="mt-6 space-y-6" aria-labelledby="add-expense-heading">
        <FormErrorSummary message={state.status === "error" ? state.message : undefined} />
        <fieldset key={JSON.stringify(state.values ?? {})} disabled={disabled} className="min-w-0 space-y-6 disabled:opacity-60">
          <legend className="sr-only">Expense details</legend>
          <FormField id="expense-payer" label="Paid by" error={state.fieldErrors?.paidBy}>
            <Select name="paidBy" required disabled={disabled} items={payerItems}
              value={paidBy || null} onValueChange={(value) => setPayerSelection({ state, value: value ?? "" })}>
              <SelectTrigger id="expense-payer" aria-invalid={Boolean(state.fieldErrors?.paidBy)}
                aria-describedby={state.fieldErrors?.paidBy ? "expense-payer-description" : undefined}>
                <SelectValue placeholder="Choose a payer" />
              </SelectTrigger>
              <SelectContent>
                {payerItems.map((item) => (
                  <SelectItem key={item.value} value={item.value} disabled={payerUnavailable && item.value === paidBy}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="expense-amount" label={`Amount (${currency})`} hint={whole ? "Whole yen, e.g. 1500" : "e.g. 12.50"} error={state.fieldErrors?.amount}>
            <Input id="expense-amount" name="amount" type="text" inputMode={whole ? "numeric" : "decimal"} required
              defaultValue={fieldValue(state, "amount")} aria-invalid={Boolean(state.fieldErrors?.amount)} aria-describedby="expense-amount-description" />
          </FormField>
          <FormField id="expense-date" label="Date" hint="Type YYYY-MM-DD or Month DD, YYYY." error={state.fieldErrors?.spentOn}>
            <DatePickerInput id="expense-date" name="spentOn" defaultValue={fieldValue(state, "spentOn", today)}
              today={today} resetKey={state} disabled={disabled} invalid={Boolean(state.fieldErrors?.spentOn)}
              describedBy="expense-date-description" />
          </FormField>
          <FormField id="expense-note" label="Note (optional)" error={state.fieldErrors?.note}>
            <Input id="expense-note" name="note" maxLength={200} defaultValue={fieldValue(state, "note")}
              aria-invalid={Boolean(state.fieldErrors?.note)} aria-describedby={state.fieldErrors?.note ? "expense-note-description" : undefined} />
          </FormField>
          <ParticipantPicker members={activeMembers} selectedIds={Array.isArray(selectedIds) ? selectedIds : undefined} error={state.fieldErrors?.participantIds} />
          <SubmitButton disabled={disabled}>Add expense</SubmitButton>
        </fieldset>
        <p role="status" aria-live="polite" className="flex items-start gap-2 text-sm">
          {state.status === "success" && <><Check className="mt-1 size-4 shrink-0" aria-hidden="true" />{state.message}</>}
        </p>
      </form>
    </section>
  );
}
