"use server";

import { revalidatePath } from "next/cache";
import { fail, fromServiceError, ok, type ActionState } from "@/lib/action-state";
import { getAppDb } from "@/lib/db";
import {
  parseAddExpenseForm, parseAddMemberForm, parseArchiveExpenseForm,
  parseArchiveMemberForm, parseManualPaymentForm, parseRecordPaymentForm,
  readFormValues,
} from "@/lib/forms";
import { groupIdSchema } from "@/lib/schemas";
import { ValidationError } from "@/services/errors";
import { addExpense, archiveExpense } from "@/services/expense-service";
import { addMember, archiveMember, getGroup } from "@/services/group-service";
import { recordSettlement } from "@/services/settle-service";

export async function addMemberAction(groupId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseAddMemberForm(formData);
  if (!groupIdSchema.safeParse(groupId).success) return fail("Invalid group link.", { values: parsed.values });
  if (!parsed.success) return fail("Check the name below.", { fieldErrors: parsed.fieldErrors, values: parsed.values });
  try {
    addMember(getAppDb(), groupId, parsed.data.name);
  } catch (error) {
    const state = fromServiceError(error, parsed.values);
    if (error instanceof ValidationError) state.fieldErrors = { name: error.message };
    return state;
  }
  revalidatePath(`/g/${groupId}`);
  return ok("Member added.");
}

export async function addExpenseAction(groupId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const values = readFormValues(formData, ["paidBy", "amount", "spentOn", "note"], "participantIds");
  if (!groupIdSchema.safeParse(groupId).success) return fail("Invalid group link.", { values });
  try {
    const db = getAppDb();
    const group = getGroup(db, groupId);
    const parsed = parseAddExpenseForm(formData, group.currency);
    if (!parsed.success) return fail("Check the fields below.", { fieldErrors: parsed.fieldErrors, values: parsed.values });
    addExpense(db, { groupId, ...parsed.data });
  } catch (error) {
    return fromServiceError(error, values);
  }
  revalidatePath(`/g/${groupId}`);
  return ok("Expense added.");
}

export async function recordPaymentAction(groupId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseRecordPaymentForm(formData);
  if (!groupIdSchema.safeParse(groupId).success) return fail("Invalid group link.", { values: parsed.values });
  if (!parsed.success) return fail(Object.values(parsed.fieldErrors).join(" "), { fieldErrors: parsed.fieldErrors, values: parsed.values });
  try {
    recordSettlement(getAppDb(), { groupId, ...parsed.data });
  } catch (error) {
    return fromServiceError(error, parsed.values);
  }
  revalidatePath(`/g/${groupId}`);
  return ok("Payment recorded.");
}

export async function recordManualPaymentAction(groupId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const values = readFormValues(formData, ["fromMember", "toMember", "amount"]);
  if (!groupIdSchema.safeParse(groupId).success) return fail("Invalid group link.", { values });
  try {
    const db = getAppDb();
    const group = getGroup(db, groupId);
    const parsed = parseManualPaymentForm(formData, group.currency);
    if (!parsed.success) return fail("Check the fields below.", { fieldErrors: parsed.fieldErrors, values: parsed.values });
    recordSettlement(db, { groupId, ...parsed.data });
  } catch (error) {
    return fromServiceError(error, values);
  }
  revalidatePath(`/g/${groupId}`);
  return ok("Payment recorded.");
}

export async function archiveExpenseAction(groupId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseArchiveExpenseForm(formData);
  if (!groupIdSchema.safeParse(groupId).success) return fail("Invalid group link.", { values: parsed.values });
  if (!parsed.success) return fail("Choose a valid expense to archive.", { fieldErrors: parsed.fieldErrors, values: parsed.values });
  try {
    archiveExpense(getAppDb(), groupId, parsed.data.expenseId);
  } catch (error) {
    return fromServiceError(error, parsed.values);
  }
  revalidatePath(`/g/${groupId}`);
  return ok("Expense archived.");
}

export async function archiveMemberAction(groupId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseArchiveMemberForm(formData);
  if (!groupIdSchema.safeParse(groupId).success) return fail("Invalid group link.", { values: parsed.values });
  if (!parsed.success) return fail("Choose a valid member to archive.", { fieldErrors: parsed.fieldErrors, values: parsed.values });
  try {
    archiveMember(getAppDb(), groupId, parsed.data.memberId);
  } catch (error) {
    return fromServiceError(error, parsed.values);
  }
  revalidatePath(`/g/${groupId}`);
  return ok("Member archived.");
}
