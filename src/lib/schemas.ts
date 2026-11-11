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
