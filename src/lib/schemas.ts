import { z } from "zod";
import { CURRENCIES, type CurrencyCode } from "@/domain/currency";

export const currencyCodes = Object.keys(CURRENCIES) as CurrencyCode[];

export const createGroupSchema = z.object({
  name: z
    .string({ error: "Enter a group name." })
    .trim()
    .min(1, "Enter a group name.")
    .max(80, "Use 80 characters or fewer for the group name."),
  currency: z.enum(currencyCodes, { error: "Choose a supported currency." }),
});

export const groupIdSchema = z
  .string()
  .length(12)
  .regex(/^[A-Za-z0-9_-]+$/);

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const memberNameSchema = z.object({
  name: z.string({ error: "Enter a member name." }).trim().min(1, "Enter a member name."),
});

export const positiveIdSchema = z.string({ error: "Choose a member." })
  .regex(/^[1-9]\d*$/, "Choose a valid member.")
  .transform(Number)
  .refine(Number.isSafeInteger, "Choose a valid member.");

export const expenseDateSchema = z.string({ error: "Enter a date." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a real date in YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a real date in YYYY-MM-DD format.");

export const participantIdsSchema = z.array(positiveIdSchema)
  .min(1, "Choose at least one participant.")
  .refine((ids) => new Set(ids).size === ids.length, "Choose each participant only once.");

export const paymentMembersSchema = z.object({
  fromMember: positiveIdSchema,
  toMember: positiveIdSchema,
});

export const minorAmountSchema = z.string({ error: "Enter a positive whole-number amount." })
  .regex(/^[1-9]\d*$/, "Enter a positive whole-number amount.")
  .transform(Number)
  .refine(Number.isSafeInteger, "Amount is too large.");
