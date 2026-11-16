import { describe, expect, it } from "vitest";
import { readRateLimitedValues, type RateLimitedForm } from "@/lib/rate-limit-values";

const cases: { kind: RateLimitedForm; values: Record<string, string | string[]> }[] = [
  { kind: "createGroup", values: { name: " Trip ", currency: "JPY" } },
  { kind: "addMember", values: { name: " Alice " } },
  { kind: "addExpense", values: { paidBy: "1", amount: "12.50", spentOn: "2026-11-16", note: " 食費 ", participantIds: ["1", "2"] } },
  { kind: "recordPayment", values: { fromMember: "1", toMember: "2", amountMinor: "1250" } },
  { kind: "recordManualPayment", values: { fromMember: "1", toMember: "2", amount: "12.50" } },
  { kind: "archiveExpense", values: { expenseId: "123" } },
  { kind: "archiveMember", values: { memberId: "456" } },
  { kind: "restoreExpense", values: { expenseId: "123" } },
  { kind: "restoreMember", values: { memberId: "456" } },
];

describe("bounded rate-limit feedback", () => {
  it.each(cases)("preserves the $kind draft and ignores unrelated fields", ({ kind, values }) => {
    const form = new FormData();
    for (const [name, value] of Object.entries(values)) {
      for (const entry of Array.isArray(value) ? value : [value]) form.append(name, entry);
    }
    for (const name of ["unexpected", "__proto__", "constructor", "$ACTION_ID_fake"]) {
      form.append(name, "must not be returned");
    }
    expect(readRateLimitedValues(form, kind)).toEqual(values);
  });

  it("returns empty fields for missing input and ignores uploaded files", () => {
    const form = new FormData();
    form.set("note", new Blob(["private file contents"]));
    form.append("participantIds", new Blob(["1"]));
    form.append("participantIds", "2");
    expect(readRateLimitedValues(form, "addExpense")).toEqual({
      paidBy: "", amount: "", spentOn: "", note: "", participantIds: ["2"],
    });
    expect(readRateLimitedValues(new FormData(), "addExpense").participantIds).toEqual([]);
  });

  it("bounds every scalar field and takes only the first duplicate value", () => {
    for (const { kind, values } of cases) {
      const form = new FormData();
      const fields = Object.keys(values).filter((field) => field !== "participantIds");
      for (const field of fields) {
        form.append(field, "x".repeat(5000));
        form.append(field, "duplicate");
      }
      const result = readRateLimitedValues(form, kind);
      for (const field of fields) expect(result[field]).toBe("x".repeat(1024));
    }
  });

  it("caps participant count and individual ID length", () => {
    const form = new FormData();
    for (let i = 0; i < 100; i++) form.append("participantIds", `${i}:` + "x".repeat(100));
    const result = readRateLimitedValues(form, "addExpense");
    expect(result.participantIds).toEqual(
      Array.from({ length: 50 }, (_, i) => (`${i}:` + "x".repeat(100)).slice(0, 32)),
    );
  });
});
