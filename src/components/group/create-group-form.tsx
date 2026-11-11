"use client";

import { useActionState, useState } from "react";
import { createGroupAction } from "@/app/actions";
import { FormErrorSummary } from "@/components/forms/form-error-summary";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const submittedCurrency =
    typeof state.values?.currency === "string" ? state.values.currency : "JPY";
  // A new action result restores failed submissions or resets a successful form.
  const [selection, setSelection] = useState({ state, value: submittedCurrency });
  const currency = selection.state === state ? selection.value : submittedCurrency;
  const currencyIsSupported = Object.hasOwn(CURRENCIES, currency);
  const currencyItems = (Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => ({
    value: code, label: currencyLabels[code],
  }));

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
      <FormErrorSummary
        message={state.status === "error" ? state.message : undefined}
      />
      {/* Remount uncontrolled fields when returned defaults change after an error. */}
      <fieldset
        key={JSON.stringify(state.values ?? {})}
        className="min-w-0 space-y-6"
      >
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
          <Select
            name="currency"
            required
            items={currencyItems}
            value={currencyIsSupported ? currency : null}
            onValueChange={(value) => setSelection({ state, value: value ?? "" })}
          >
            <SelectTrigger
              id="group-currency"
              aria-invalid={Boolean(state.fieldErrors?.currency)}
              aria-describedby="group-currency-description"
            >
              <SelectValue placeholder="Choose a currency" />
            </SelectTrigger>
            <SelectContent>
              {currencyItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </fieldset>
      <div>
        <SubmitButton pendingLabel="Creating group…">Create group</SubmitButton>
      </div>
    </form>
  );
}
