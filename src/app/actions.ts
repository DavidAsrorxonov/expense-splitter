"use server";

import { redirect } from "next/navigation";
import { fail, fromServiceError, type ActionState } from "@/lib/action-state";
import { getAppDb } from "@/lib/db";
import { parseCreateGroupForm } from "@/lib/forms";
import { createGroup } from "@/services/group-service";

export async function createGroupAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseCreateGroupForm(formData);
  if (!parsed.success) {
    return fail("Check the fields below.", {
      fieldErrors: parsed.fieldErrors,
      values: parsed.values,
    });
  }

  let groupId: string;
  try {
    groupId = createGroup(getAppDb(), parsed.data).id;
  } catch (error) {
    return fromServiceError(error, parsed.values);
  }

  redirect(`/g/${groupId}`);
}
