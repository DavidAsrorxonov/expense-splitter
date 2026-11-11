import { NotFoundError, ValidationError } from "@/services/errors";

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | string[]>;
};

export const initialActionState: ActionState = { status: "idle" };

export function fail(
  message: string,
  options: Pick<ActionState, "fieldErrors" | "values"> = {},
): ActionState {
  return { status: "error", message, ...options };
}

export function ok(message: string): ActionState {
  return { status: "success", message };
}

export function fromServiceError(
  error: unknown,
  values?: ActionState["values"],
): ActionState {
  if (error instanceof ValidationError || error instanceof NotFoundError) {
    return fail(error.message, { values });
  }
  throw error;
}
