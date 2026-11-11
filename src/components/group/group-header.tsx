import type { Group } from "@/types";
import { CopyLink } from "./copy-link";

export function GroupHeader({ group }: { group: Group }) {
  return (
    <header className="flex min-w-0 flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl leading-9 font-medium tracking-[-0.035em]">
          {group.name}
        </h1>
        <p className="text-sm text-text-secondary">
          Currency: {group.currency}
        </p>
      </div>
      <CopyLink key={group.id} groupId={group.id} />
    </header>
  );
}
