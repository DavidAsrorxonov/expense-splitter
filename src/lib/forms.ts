import { createGroupSchema, type CreateGroupInput } from "./schemas";

export type FormResult<T> =
  | { success: true; data: T; values: Record<string, string> }
  | {
      success: false;
      fieldErrors: Record<string, string>;
      values: Record<string, string>;
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
