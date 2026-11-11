"use client";

import { useActionState } from "react";
import { createGroupAction } from "@/app/actions";
import { FormErrorSummary } from "@/components/forms/form-error-summary";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { CURRENCIES, type CurrencyCode } from "@/domain/currency";
import { initialActionState } from "@/lib/action-state";

const currencyLabels: Record<CurrencyCode, string> = {
  JPY: "JPY — Japanese yen",
  USD: "USD — US dollar",
  EUR: "EUR — Euro",
  UZS: "UZS — Uzbekistani som",
};

export function CreateGroupForm() {
  const [state, formAction] = useActionState(
    createGroupAction,
    initialActionState,
    "/",
  );
  const name = typeof state.values?.name === "string" ? state.values.name : "";
  const currency =
    typeof state.values?.currency === "string" ? state.values.currency : "JPY";
  const currencyIsSupported = Object.hasOwn(CURRENCIES, currency);

  return (
    <form
      action={formAction}
      noValidate
      aria-labelledby="create-group-heading"
      className="flex w-full flex-col gap-6 border border-border p-6 sm:p-8"
    >
      <h2 id="create-group-heading" className="text-xl font-medium">
        Create a group
      </h2>
      <FormErrorSummary message={state.status === "error" ? state.message : undefined} />
      {/* Remount uncontrolled fields when returned defaults change after an error. */}
      <fieldset key={JSON.stringify(state.values ?? {})} className="min-w-0 space-y-6">
        <legend className="sr-only">Group details</legend>
        <FormField
          id="group-name"
          label="Group name"
          hint="Choose a name for your household, trip, or group of friends."
          error={state.fieldErrors?.name}
        >
          <Input
            id="group-name"
            name="name"
            type="text"
            autoComplete="off"
            required
            maxLength={80}
            defaultValue={name}
            aria-invalid={Boolean(state.fieldErrors?.name)}
            aria-describedby="group-name-description"
          />
        </FormField>
        <FormField
          id="group-currency"
          label="Currency"
          hint="All expenses in this group use this currency."
          error={state.fieldErrors?.currency}
        >
          <select
            id="group-currency"
            name="currency"
            required
            defaultValue={currency}
            aria-invalid={Boolean(state.fieldErrors?.currency)}
            aria-describedby="group-currency-description"
            className="min-h-11 w-full min-w-0 border border-input bg-background px-3 py-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-foreground focus-visible:outline-offset-2 aria-invalid:border-destructive"
          >
            {!currencyIsSupported && (
              <option value={currency} disabled>Choose a currency</option>
            )}
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
              <option key={code} value={code}>{currencyLabels[code]}</option>
            ))}
          </select>
        </FormField>
      </fieldset>
      <div>
        <SubmitButton pendingLabel="Creating group…">Create group</SubmitButton>
      </div>
    </form>
  );
}
