import { describe, expect, it } from "vitest";
import { fail, fromServiceError, initialActionState, ok } from "@/lib/action-state";
import { NotFoundError, ValidationError } from "@/services/errors";

describe("action state", () => {
  it("starts idle without messages or returned input", () => {
    expect(initialActionState).toEqual({ status: "idle" });
  });

  it("returns field errors and values without modifying them", () => {
    const options = {
      fieldErrors: { name: "Enter a group name." },
      values: { name: "  ", participantIds: ["1", "2"] },
    };
    expect(fail("Check the fields below.", options)).toEqual({
      status: "error",
      message: "Check the fields below.",
      ...options,
    });
    expect(options.values.name).toBe("  ");
    expect(fail("Please try again.")).toEqual({ status: "error", message: "Please try again." });
  });

  it("returns success without stale errors or values", () => {
    expect(ok("Saved.")).toEqual({ status: "success", message: "Saved." });
    expect(ok("Saved.")).not.toHaveProperty("values");
    expect(initialActionState).toEqual({ status: "idle" });
  });

  it.each([new ValidationError("Name is required"), new NotFoundError("Group not found")])(
    "converts expected service errors and retains submitted values",
    (error) => {
      const values = { name: "  Trip  ", currency: "USD" };
      expect(fromServiceError(error, values)).toEqual({
        status: "error",
        message: error.message,
        values,
      });
    },
  );

  it.each([new Error("database detail"), new TypeError("bug"), "unexpected", null])(
    "rethrows the original unexpected value without exposing it in form state",
    (error) => {
      let caught: unknown = Symbol("not thrown");
      try {
        fromServiceError(error);
      } catch (value) {
        caught = value;
      }
      expect(caught).toBe(error);
    },
  );

  it("does not trust an arbitrary error with a matching name", () => {
    const error = new Error("internal failure");
    error.name = "ValidationError";
    expect(() => fromServiceError(error)).toThrow(error);
  });
});
