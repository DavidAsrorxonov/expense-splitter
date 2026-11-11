"use client";

import { useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";
import type { Member } from "@/types";

const subscribe = () => () => {};
const explanation = "Past expenses keep this member’s name. Only members with a settled balance can be archived.";

// The members panel owns the action state and alert region, including after removal.
export function ArchiveMemberDialog({ member, action, state, pending, feedbackRef }: {
  member: Member;
  action: (formData: FormData) => void;
  state: ActionState;
  pending: boolean;
  feedbackRef: RefObject<HTMLDivElement | null>;
}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [openedState, setOpenedState] = useState<ActionState | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const form = <form action={action}>
    <input type="hidden" name="memberId" value={member.id} />
    <SubmitButton pendingLabel="Archiving…" disabled={pending}>Archive member</SubmitButton>
  </form>;

  if (!hydrated) {
    return <details className="mt-2" open={state.status === "error" && state.values?.memberId === String(member.id)}>
      <summary className="min-h-11 cursor-pointer py-3 text-sm underline-offset-4 hover:underline">Archive member {member.name}</summary>
      <p className="mb-4 text-sm text-text-secondary">{explanation} Close this section to cancel.</p>
      {form}
    </details>;
  }

  return <AlertDialog open={openedState !== null && openedState === state} onOpenChange={(open) => setOpenedState(open ? state : null)}>
    <AlertDialogTrigger render={<Button variant="ghost" />} disabled={pending} aria-label={`Archive member ${member.name}`}>
      Archive
    </AlertDialogTrigger>
    <AlertDialogContent initialFocus={cancelRef} finalFocus={() => state.status === "error" && openedState !== state ? feedbackRef.current : true}>
      <AlertDialogHeader>
        <AlertDialogTitle>Archive {member.name}?</AlertDialogTitle>
        <AlertDialogDescription>{explanation}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel ref={cancelRef}>Cancel</AlertDialogCancel>
        {form}
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
