import { DEFAULT_LIMITS } from "@/domain/limits";
import type { ActionState } from "@/lib/action-state";

const FORM_FIELDS = {
  createGroup: ["name", "currency"],
  addMember: ["name"],
  addExpense: ["paidBy", "amount", "spentOn", "note"],
  recordPayment: ["fromMember", "toMember", "amountMinor"],
  recordManualPayment: ["fromMember", "toMember", "amount"],
  archiveExpense: ["expenseId"],
  archiveMember: ["memberId"],
  restoreExpense: ["expenseId"],
  restoreMember: ["memberId"],
} as const;

export type RateLimitedForm = keyof typeof FORM_FIELDS;

const MAX_FIELD_LENGTH = 1024;
const MAX_PARTICIPANT_ID_LENGTH = 32;

export function readRateLimitedValues(
  formData: FormData,
  kind: RateLimitedForm,
): NonNullable<ActionState["values"]> {
  const values: NonNullable<ActionState["values"]> = {};

  for (const field of FORM_FIELDS[kind]) {
    const entry = formData.get(field);

    values[field] =
      typeof entry === "string" ? entry.slice(0, MAX_FIELD_LENGTH) : "";
  }

  if (kind === "addExpense") {
    const participantIds: string[] = [];

    for (const [field, entry] of formData.entries()) {
      if (field !== "participantIds" || typeof entry !== "string") {
        continue;
      }

      participantIds.push(entry.slice(0, MAX_PARTICIPANT_ID_LENGTH));

      if (participantIds.length >= DEFAULT_LIMITS.maxMembersPerGroup) {
        break;
      }
    }

    values.participantIds = participantIds;
  }

  return values;
}
