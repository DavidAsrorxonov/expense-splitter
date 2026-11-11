"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { FormErrorSummary } from "@/components/forms/form-error-summary";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
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
  const paidBy = fieldValue(state, "paidBy");
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
            <select id="expense-payer" name="paidBy" required defaultValue={paidBy} aria-invalid={Boolean(state.fieldErrors?.paidBy)}
              aria-describedby={state.fieldErrors?.paidBy ? "expense-payer-description" : undefined}
              className="min-h-11 w-full min-w-0 border border-input bg-background px-3 py-3 text-base aria-invalid:border-destructive">
              <option value="">Choose a payer</option>
              {paidBy && !activeMembers.some((member) => String(member.id) === paidBy) && <option value={paidBy} disabled>Previously selected payer is unavailable</option>}
              {activeMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </FormField>
          <FormField id="expense-amount" label={`Amount (${currency})`} hint={whole ? "Whole yen, e.g. 1500" : "e.g. 12.50"} error={state.fieldErrors?.amount}>
            <Input id="expense-amount" name="amount" type="text" inputMode={whole ? "numeric" : "decimal"} required
              defaultValue={fieldValue(state, "amount")} aria-invalid={Boolean(state.fieldErrors?.amount)} aria-describedby="expense-amount-description" />
          </FormField>
          <FormField id="expense-date" label="Date" error={state.fieldErrors?.spentOn}>
            <Input id="expense-date" name="spentOn" type="date" required defaultValue={fieldValue(state, "spentOn", today)}
              aria-invalid={Boolean(state.fieldErrors?.spentOn)} aria-describedby={state.fieldErrors?.spentOn ? "expense-date-description" : undefined} />
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
