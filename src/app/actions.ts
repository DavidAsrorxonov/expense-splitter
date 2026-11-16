"use server";

import { redirect } from "next/navigation";
import { fail, fromServiceError, type ActionState } from "@/lib/action-state";
import { getAppDb } from "@/lib/db";
import { parseCreateGroupForm } from "@/lib/forms";
import { createGroup } from "@/services/group-service";
import { DEFAULT_LIMITS } from "@/domain/limits";
import { rateLimitAction } from "@/lib/rate-limit-action";

export async function createGroupAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const limited = await rateLimitAction("createGroup", formData);
  if (limited) return limited;

  const parsed = parseCreateGroupForm(formData);
  if (!parsed.success) {
    return fail("Check the fields below.", {
      fieldErrors: parsed.fieldErrors,
      values: parsed.values,
    });
  }

  let groupId: string;
  try {
    const rawMaxGroups = process.env.MAX_GROUPS?.trim() ?? "";
    const requestedMaxGroups = /^\d+$/.test(rawMaxGroups)
      ? Number(rawMaxGroups)
      : Number.NaN;

    const maxGroups =
      Number.isSafeInteger(requestedMaxGroups) && requestedMaxGroups > 0
        ? requestedMaxGroups
        : DEFAULT_LIMITS.maxGroups;

    groupId = createGroup(getAppDb(), parsed.data, {
      ...DEFAULT_LIMITS,
      maxGroups,
    }).id;
  } catch (error) {
    return fromServiceError(error, parsed.values);
  }

  redirect(`/g/${groupId}`);
}
