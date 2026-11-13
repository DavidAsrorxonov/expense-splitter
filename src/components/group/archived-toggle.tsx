import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { groupHref, type GroupView } from "@/lib/group-view";

export function ArchivedToggle({ groupId, view, section }: {
  groupId: string;
  view: GroupView;
  section: "expenses" | "members";
}) {
  return (
    <Link
      href={`${groupHref(groupId, { ...view, showArchived: !view.showArchived })}#${section}-heading`}
      className={buttonVariants({ variant: "link" })}
    >
      {view.showArchived ? "Hide archived" : "Show archived"}
    </Link>
  );
}
