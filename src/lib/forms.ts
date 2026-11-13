import { z } from "zod";
import { decimalsFor, type CurrencyCode } from "@/domain/currency";
import { parseAmount } from "@/domain/money";
import {
  createGroupSchema, expenseDateSchema, memberNameSchema, minorAmountSchema,
  participantIdsSchema, paymentMembersSchema, positiveIdSchema, type CreateGroupInput,
} from "./schemas";

export type FormResult<T, V = Record<string, string>> =
  | { success: true; data: T; values: V }
  | {
      success: false;
      fieldErrors: Record<string, string>;
      values: V;
    };

export function parseCreateGroupForm(
  formData: FormData,
): FormResult<CreateGroupInput> {
  const fields = ["name", "currency"] as const;
  const input: Record<string, unknown> = {};
  const values: Record<string, string> = {};

  for (const field of fields) {
    const entries = formData.getAll(field);
    const first = entries[0];
    values[field] = typeof first === "string" ? first : "";
    // A scalar field must be present exactly once and contain text, not a file.
    input[field] = entries.length === 1 ? first : undefined;
  }

  const result = createGroupSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data, values };
  }

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    fieldErrors[field] ??= issue.message;
  }
  return { success: false, fieldErrors, values };
}

export type FormValues = Record<string, string | string[]>;

// Preserve text for redisplay, while keeping duplicate/file entries invalid for parsing.
export function readFormValues(formData: FormData, fields: readonly string[], repeated?: string): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    const entry = formData.get(field);
    values[field] = typeof entry === "string" ? entry : "";
  }
  if (repeated) values[repeated] = formData.getAll(repeated).filter((value): value is string => typeof value === "string");
  return values;
}

function parseFields<T>(formData: FormData, schema: z.ZodType<T>, fields: readonly string[], repeated?: string): FormResult<T, FormValues> {
  const input: Record<string, unknown> = {};
  const values = readFormValues(formData, fields, repeated);
  for (const field of fields) {
    const entries = formData.getAll(field);
    input[field] = entries.length === 1 ? entries[0] : undefined;
    if (field === "note" && entries.length === 0) input[field] = "";
  }
  if (repeated) input[repeated] = formData.getAll(repeated);
  const result = schema.safeParse(input);
  if (result.success) return { success: true, data: result.data, values };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { success: false, fieldErrors, values };
}

function displayAmountSchema(currency: CurrencyCode) {
  const example = decimalsFor(currency) === 0 ? "a whole number, e.g. 1500" : "a number with up to two decimal places, e.g. 12.50";
  return z.string({ error: `Enter ${example}.` }).transform((value, context) => {
    const minor = parseAmount(value, currency);
    if (minor === null || minor <= 0) {
      context.addIssue({ code: "custom", message: `Enter a positive amount as ${example}.` });
      return z.NEVER;
    }
    return minor;
  });
}

export function parseAddMemberForm(formData: FormData) {
  return parseFields(formData, memberNameSchema, ["name"]);
}

export function parseAddExpenseForm(formData: FormData, currency: CurrencyCode) {
  const schema = z.object({
    paidBy: positiveIdSchema,
    amount: displayAmountSchema(currency),
    spentOn: expenseDateSchema,
    note: z.string({ error: "Enter a text note." }).trim().max(200, "Use 200 characters or fewer for the note."),
    participantIds: participantIdsSchema,
  }).transform(({ amount, ...input }) => ({ ...input, amountMinor: amount }));
  return parseFields(formData, schema, ["paidBy", "amount", "spentOn", "note"], "participantIds");
}

export function parseRecordPaymentForm(formData: FormData) {
  const schema = paymentMembersSchema.extend({ amountMinor: minorAmountSchema })
    .refine((input) => input.fromMember !== input.toMember, {
      path: ["toMember"], message: "Choose a recipient different from the sender.",
    });
  return parseFields(formData, schema, ["fromMember", "toMember", "amountMinor"]);
}

export function parseManualPaymentForm(formData: FormData, currency: CurrencyCode) {
  const schema = paymentMembersSchema.extend({ amount: displayAmountSchema(currency) })
    .refine((input) => input.fromMember !== input.toMember, {
      path: ["toMember"], message: "Choose a recipient different from the sender.",
    }).transform(({ amount, ...input }) => ({ ...input, amountMinor: amount }));
  return parseFields(formData, schema, ["fromMember", "toMember", "amount"]);
}

export function parseArchiveExpenseForm(formData: FormData) {
  return parseFields(formData, z.object({ expenseId: positiveIdSchema }), ["expenseId"]);
}

export function parseArchiveMemberForm(formData: FormData) {
  return parseFields(formData, z.object({ memberId: positiveIdSchema }), ["memberId"]);
}

export function parseRestoreExpenseForm(formData: FormData) {
  return parseFields(formData, z.object({ expenseId: positiveIdSchema }), ["expenseId"]);
}

export function parseRestoreMemberForm(formData: FormData) {
  return parseFields(formData, z.object({ memberId: positiveIdSchema }), ["memberId"]);
}
