"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { FormErrorSummary } from "@/components/forms/form-error-summary";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { fieldValue, initialActionState, type FormAction } from "@/lib/action-state";

export function AddMemberForm({ action, groupId }: { action: FormAction; groupId: string }) {
  const [state, formAction] = useActionState(action, initialActionState, `/g/${groupId}`);
  return (
    <form action={formAction} noValidate className="mt-6 space-y-4" aria-label="Add member">
      <FormErrorSummary message={state.status === "error" ? state.message : undefined} />
      <FormField id="member-name" label="Member name" error={state.fieldErrors?.name}>
        <Input key={JSON.stringify(state.values ?? {})} id="member-name" name="name" required autoComplete="off"
          defaultValue={fieldValue(state, "name")} aria-invalid={Boolean(state.fieldErrors?.name)}
          aria-describedby={state.fieldErrors?.name ? "member-name-description" : undefined} />
      </FormField>
      <SubmitButton>Add member</SubmitButton>
      <p role="status" aria-live="polite" className="flex items-start gap-2 text-sm">
        {state.status === "success" && <><Check className="mt-1 size-4 shrink-0" aria-hidden="true" />{state.message}</>}
      </p>
    </form>
  );
}
