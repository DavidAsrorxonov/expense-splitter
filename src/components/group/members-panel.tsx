"use client";

import { useActionState, useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { FormErrorSummary } from "@/components/forms/form-error-summary";
import { initialActionState, type FormAction } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import type { Member } from "@/types";
import { ArchiveMemberDialog } from "./archive-member-dialog";

export function MembersPanel({ members, groupId, archiveAction, className }: {
  members: readonly Member[]; groupId: string; archiveAction: FormAction; className?: string;
}) {
  const [state, formAction, pending] = useActionState(archiveAction, initialActionState, `/g/${groupId}`);
  const activeMembers = members.filter((member) => member.archivedAt === null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "success") headingRef.current?.focus();
  }, [state]);
  return (
    <section aria-labelledby="members-heading" className={cn("min-w-0", className)}>
      <h2 ref={headingRef} tabIndex={-1} id="members-heading" className="mb-6 text-xl font-medium">Members</h2>
      <div ref={feedbackRef} tabIndex={-1}>
        <FormErrorSummary message={state.status === "error" ? state.message : undefined} />
        <p role="status" aria-live="polite" className="flex items-start gap-2 text-sm">
          {state.status === "success" && <><Check className="mt-1 size-4 shrink-0" aria-hidden="true" />{state.message}</>}
        </p>
      </div>
      {activeMembers.length === 0 ? (
        <p className="text-text-secondary">No active members yet. Use “Add member” above to add someone to the group.</p>
      ) : (
        <ul className="space-y-3">
          {activeMembers.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-x-4 [overflow-wrap:anywhere]">
              <span className="min-w-0 flex-1 basis-32">{member.name}</span>
              <ArchiveMemberDialog member={member} action={formAction} state={state} pending={pending} feedbackRef={feedbackRef} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
