"use client";

import { useState, useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const subscribe = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

export function CopyLink({ groupId }: { groupId: string }) {
  const origin = useSyncExternalStore(subscribe, getOrigin, getServerOrigin);
  const link = `${origin}/g/${groupId}`;
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "failed">("idle");

  async function copyLink() {
    setStatus("copying");
    try {
      await navigator.clipboard.writeText(link);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="flex w-full min-w-0 max-w-2xl flex-col gap-2">
      <Label htmlFor="group-link">Group link</Label>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <input
          id="group-link"
          type="text"
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
          aria-describedby="group-link-help"
          className="min-h-11 min-w-0 flex-1 basis-48 border border-input bg-background px-3 py-3 font-mono text-base text-foreground"
        />
        {origin && (
          <Button type="button" variant="ghost" onClick={copyLink} disabled={status === "copying"}>
            {status === "copying" ? "Copying…" : "Copy link"}
          </Button>
        )}
      </div>
      <p id="group-link-help" className="text-sm text-text-meta">
        Anyone with this link can view and edit the group.
      </p>
      <p role="status" aria-live="polite" className="flex items-start gap-2 text-sm">
        {status === "copied" && <><Check className="mt-1 size-4 shrink-0" aria-hidden="true" />Link copied.</>}
        {status === "failed" && "Copy failed. Select the link and copy it manually."}
      </p>
    </div>
  );
}
