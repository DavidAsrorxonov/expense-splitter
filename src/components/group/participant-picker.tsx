"use client";

import { useRef, useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Member } from "@/types";

const subscribe = () => () => {};

export function ParticipantPicker({ members, selectedIds, error }: {
  members: readonly Member[];
  selectedIds?: string[];
  error?: string;
}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  function selectParticipants(checked: boolean) {
    fieldsetRef.current?.querySelectorAll<HTMLInputElement>('input[name="participantIds"]').forEach((input) => {
      input.checked = checked;
    });
  }
  return (
    <fieldset ref={fieldsetRef} className="min-w-0 space-y-2" aria-describedby={error ? "participants-error" : undefined}>
      <legend className="text-sm font-medium">Participants</legend>
      {hydrated && <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={() => selectParticipants(true)}>Select all</Button>
        <Button type="button" variant="ghost" onClick={() => selectParticipants(false)}>Clear</Button>
      </div>}
      <div className="space-y-2">
        {members.map((member) => (
          <label key={member.id} className="flex min-h-11 cursor-pointer items-center gap-3 [overflow-wrap:anywhere]">
            <span className="relative flex size-5 shrink-0 items-center justify-center">
              <input type="checkbox" name="participantIds" value={member.id}
                defaultChecked={selectedIds ? selectedIds.includes(String(member.id)) : true}
                aria-invalid={Boolean(error)} aria-describedby={error ? "participants-error" : undefined}
                className="peer size-5 appearance-none border border-input bg-background checked:border-brand-accent checked:bg-brand-accent aria-invalid:border-destructive disabled:cursor-not-allowed" />
              <Check className="pointer-events-none absolute size-4 text-brand-accent-foreground opacity-0 peer-checked:opacity-100" aria-hidden="true" />
            </span>
            {member.name}
          </label>
        ))}
      </div>
      {error && <p id="participants-error" className="text-sm text-destructive">Error: {error}</p>}
    </fieldset>
  );
}
