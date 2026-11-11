import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getAppDb } from "@/lib/db";
import { groupIdSchema } from "@/lib/schemas";
import { NotFoundError } from "@/services/errors";
import { getGroup } from "@/services/group-service";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  await connection();
  const parsedId = groupIdSchema.safeParse((await params).groupId);
  if (!parsedId.success) notFound();

  let group;
  try {
    group = getGroup(getAppDb(), parsedId.data);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <h1 className="text-3xl leading-9 font-medium tracking-[-0.035em]">
      {group.name}
    </h1>
  );
}
