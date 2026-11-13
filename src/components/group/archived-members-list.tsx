"use client";

import type { FormAction } from "@/lib/action-state";
import type { GroupView } from "@/lib/group-view";
import type { Member } from "@/types";
import { RestoreFeedback } from "./restore-feedback";
import { RestoreMemberForm } from "./restore-member-form";
import { useRestoreAction } from "./use-restore-action";

export function ArchivedMembersList({ members, groupId, view, restoreAction }: {
  members: readonly Member[];
  groupId: string;
  view: GroupView;
  restoreAction: FormAction;
}) {
  const { state, formAction, pending, feedbackRef } = useRestoreAction(restoreAction, groupId, view, "archived-members");

  return (
    <section aria-labelledby="archived-members-heading" className="mt-8 min-w-0 space-y-4 border-t border-border pt-8">
      <h3 id="archived-members-heading" tabIndex={-1} className="text-lg font-medium">Archived members</h3>
      <RestoreFeedback state={state} feedbackRef={feedbackRef} />
      {members.length === 0 ? (
        <p className="text-text-secondary">No archived members.</p>
      ) : (
        <ul className="space-y-4">
          {members.map((member) => (
            <li key={member.id} className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 basis-32 wrap-anywhere">
                <p>{member.name}</p>
                <p className="text-sm text-text-secondary">Archived</p>
              </div>
              <div className="min-w-0 max-w-full sm:max-w-80">
                <RestoreMemberForm action={formAction} memberId={member.id} name={member.name} state={state} pending={pending} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
