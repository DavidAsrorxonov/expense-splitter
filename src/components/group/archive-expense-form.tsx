"use client";

import { SubmitButton } from "@/components/forms/submit-button";

// The table owns useActionState so removing a row does not remove its feedback.
export function ArchiveExpenseForm({ action, expenseId, label, pending }: {
  action: (formData: FormData) => void;
  expenseId: number;
  label: string;
  pending: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="expenseId" value={expenseId} />
      <SubmitButton variant="ghost" pendingLabel="Archiving…" disabled={pending} aria-label={`Archive expense ${label}`}>Archive</SubmitButton>
    </form>
  );
}
