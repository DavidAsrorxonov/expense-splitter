import { memberName } from "@/lib/presenters";
import { cn } from "@/lib/utils";
import type { Member } from "@/types";

export function MembersPanel({
  members,
  className,
}: {
  members: readonly Member[];
  className?: string;
}) {
  const activeMembers = members.filter((member) => member.archivedAt === null);
  return (
    <section
      aria-labelledby="members-heading"
      className={cn("min-w-0 border-t border-border pt-6", className)}
    >
      <h2 id="members-heading" className="mb-6 text-xl font-medium">
        Members
      </h2>
      {activeMembers.length === 0 ? (
        <p className="text-text-secondary">No active members yet.</p>
      ) : (
        <ul className="space-y-3">
          {activeMembers.map((member) => (
            <li key={member.id} className="wrap-anywhere">
              {memberName(member.id, activeMembers)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
