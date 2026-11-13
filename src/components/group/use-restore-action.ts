"use client";

import { useActionState, useEffect, useRef } from "react";
import { initialActionState, type FormAction } from "@/lib/action-state";
import { groupHref, type GroupView } from "@/lib/group-view";

// Call from the list, not an individual row: restored rows are removed.
export function useRestoreAction(
  action: FormAction,
  groupId: string,
  view: GroupView,
  section: "archived-expenses" | "archived-members",
) {
  const permalink = `${groupHref(groupId, { ...view, showArchived: true })}#${section}-heading`;
  const [state, formAction, pending] = useActionState(action, initialActionState, permalink);
  const feedbackRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "success") feedbackRef.current?.focus();
  }, [state]);

  return { state, formAction, pending, feedbackRef };
}
