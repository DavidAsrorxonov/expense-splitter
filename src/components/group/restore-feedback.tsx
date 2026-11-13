"use client";

import type { Ref } from "react";
import { Check } from "lucide-react";
import type { ActionState } from "@/lib/action-state";

// Keep this outside the rows, including when the archived list becomes empty.
export function RestoreFeedback({ state, feedbackRef }: {
  state: ActionState;
  feedbackRef: Ref<HTMLParagraphElement>;
}) {
  return (
    <p
      ref={feedbackRef}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex items-start gap-2 text-sm wrap-anywhere"
    >
      {state.status === "success" && (
        <>
          <Check className="mt-1 size-4 shrink-0" aria-hidden="true" />
          {state.message}
        </>
      )}
    </p>
  );
}
