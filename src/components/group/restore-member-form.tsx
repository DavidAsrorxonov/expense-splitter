"use client";

import { SubmitButton } from "@/components/forms/submit-button";
import type { ActionState } from "@/lib/action-state";

export function RestoreMemberForm({ action, memberId, name, state, pending }: {
  action: (formData: FormData) => void;
  memberId: number;
  name: string;
  state: ActionState;
  pending: boolean;
}) {
  const error = state.status === "error" && state.values?.memberId === String(memberId)
    ? state.message
    : undefined;
  const errorId = `restore-member-${memberId}-error`;

  return (
    <form action={action} aria-describedby={error ? errorId : undefined} className="space-y-2">
      <input type="hidden" name="memberId" value={memberId} />
      <SubmitButton variant="secondary" pendingLabel="Restoring…" disabled={pending} aria-label={`Restore member ${name}`}>
        Restore
      </SubmitButton>
      {error && <p id={errorId} role="alert" className="text-sm text-destructive wrap-anywhere">Error: {error}</p>}
    </form>
  );
}
