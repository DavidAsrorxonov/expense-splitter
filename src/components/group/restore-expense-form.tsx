"use client";

import { SubmitButton } from "@/components/forms/submit-button";
import type { ActionState } from "@/lib/action-state";

export function RestoreExpenseForm({ action, expenseId, label, state, pending }: {
  action: (formData: FormData) => void;
  expenseId: number;
  label: string;
  state: ActionState;
  pending: boolean;
}) {
  const error = state.status === "error" && state.values?.expenseId === String(expenseId)
    ? state.message
    : undefined;
  const errorId = `restore-expense-${expenseId}-error`;

  return (
    <form action={action} aria-describedby={error ? errorId : undefined} className="space-y-2">
      <input type="hidden" name="expenseId" value={expenseId} />
      <SubmitButton variant="secondary" pendingLabel="Restoring…" disabled={pending} aria-label={`Restore expense ${label}`}>
        Restore
      </SubmitButton>
      {error && <p id={errorId} role="alert" className="text-sm text-destructive wrap-anywhere">Error: {error}</p>}
    </form>
  );
}
