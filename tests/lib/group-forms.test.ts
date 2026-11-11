import { describe, expect, it } from "vitest";
import { fieldValue } from "@/lib/action-state";
import {
  parseAddExpenseForm, parseAddMemberForm, parseArchiveExpenseForm,
  parseArchiveMemberForm, parseManualPaymentForm, parseRecordPaymentForm, readFormValues,
} from "@/lib/forms";

function form(values: Record<string, string | string[] | undefined>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    for (const entry of Array.isArray(value) ? value : [value]) data.append(key, entry);
  }
  return data;
}

const expense = { paidBy: "1", amount: "1500", spentOn: "2026-11-11", note: "Lunch", participantIds: ["1", "2"] };
const payment = { fromMember: "1", toMember: "2", amountMinor: "1500" };
const manual = { fromMember: "1", toMember: "2", amount: "12.50" };

function expectFieldError(result: { success: boolean; fieldErrors?: Record<string, string> }, field: string) {
  expect(result.success).toBe(false);
  expect(result.fieldErrors?.[field]).toBeTruthy();
}

describe("parseAddMemberForm", () => {
  it("trims names and preserves the submitted text", () => {
    expect(parseAddMemberForm(form({ name: " Alice " }))).toEqual({ success: true, data: { name: "Alice" }, values: { name: " Alice " } });
  });
  it.each([{}, { name: "" }, { name: "  " }, { name: ["Alice", "Bob"] }])("rejects missing, blank, or duplicate scalar values: %j", (values) => {
    expectFieldError(parseAddMemberForm(form(values)), "name");
  });
  it("rejects a file rather than treating its filename as a name", () => {
    const data = new FormData();
    data.set("name", new Blob(["Alice"]), "Alice");
    expectFieldError(parseAddMemberForm(data), "name");
  });
});

describe("parseAddExpenseForm", () => {
  it("produces integer amounts, trimmed notes, and numeric IDs", () => {
    const result = parseAddExpenseForm(form({ ...expense, note: " Lunch " }), "JPY");
    expect(result).toMatchObject({ success: true, data: {
      paidBy: 1, amountMinor: 1500, note: "Lunch", spentOn: "2026-11-11", participantIds: [1, 2],
    } });
  });
  it("converts USD at the edge and ignores a submitted currency", () => {
    expect(parseAddExpenseForm(form({ ...expense, amount: "12.50", currency: "JPY" }), "USD"))
      .toMatchObject({ success: true, data: { amountMinor: 1250 } });
    expectFieldError(parseAddExpenseForm(form({ ...expense, amount: "12.50", currency: "USD" }), "JPY"), "amount");
  });
  it.each(["abc", "0", "-1", "12.5", "1e3", "Infinity", "9007199254740992", ""])("rejects invalid JPY amounts: %s", (amount) => {
    const result = parseAddExpenseForm(form({ ...expense, amount }), "JPY");
    expectFieldError(result, "amount");
    if (!result.success) expect(result.fieldErrors.amount).toContain("whole number");
  });
  it.each(["12.345", "0.00", "-0.01", "90071992547409.92"])("rejects invalid USD amounts: %s", (amount) => {
    const result = parseAddExpenseForm(form({ ...expense, amount }), "USD");
    expectFieldError(result, "amount");
    if (!result.success) expect(result.fieldErrors.amount).toContain("12.50");
  });
  it.each(["0", "-1", "1.5", "1e2", "1x", "9007199254740992", "", "01"])("rejects invalid payer IDs: %s", (paidBy) => {
    expectFieldError(parseAddExpenseForm(form({ ...expense, paidBy }), "JPY"), "paidBy");
  });
  it.each([[], ["1", "1"], ["1", "abc"], ["1", "0"], ["9007199254740992"], ["1.5"], ["1e2"]])("rejects invalid participant lists: %j", (...ids) => {
    expectFieldError(parseAddExpenseForm(form({ ...expense, participantIds: ids }), "JPY"), "participantIds");
  });
  it("accepts a payer who is not a participant and does not reorder the selection", () => {
    expect(parseAddExpenseForm(form({ ...expense, paidBy: "3", participantIds: ["2", "1"] }), "JPY"))
      .toMatchObject({ success: true, data: { paidBy: 3, participantIds: [2, 1] } });
  });
  it.each(["", "2026-02-29", "2026-04-31", "2026-13-01", "2026-11-00", "11/11/2026", "2026-1-01", "2026-11-11T00:00:00Z"])("rejects invalid dates: %s", (spentOn) => {
    expectFieldError(parseAddExpenseForm(form({ ...expense, spentOn }), "JPY"), "spentOn");
  });
  it("accepts a real leap day", () => {
    expect(parseAddExpenseForm(form({ ...expense, spentOn: "2028-02-29" }), "JPY").success).toBe(true);
  });
  it("accepts an omitted note and a 200-character note, rejecting 201", () => {
    const data = form(expense);
    data.delete("note");
    expect(parseAddExpenseForm(data, "JPY")).toMatchObject({ success: true, data: { note: "" } });
    data.set("note", "a".repeat(200));
    expect(parseAddExpenseForm(data, "JPY").success).toBe(true);
    data.set("note", "a".repeat(201));
    expectFieldError(parseAddExpenseForm(data, "JPY"), "note");
  });
  it.each(["paidBy", "amount", "spentOn", "participantIds"])("rejects a missing required field: %s", (field) => {
    const data = form(expense);
    data.delete(field);
    expectFieldError(parseAddExpenseForm(data, "JPY"), field);
  });
  it.each(["paidBy", "amount", "spentOn", "note"])("rejects duplicate scalar field: %s", (field) => {
    const data = form(expense);
    data.append(field, String(data.get(field)));
    expectFieldError(parseAddExpenseForm(data, "JPY"), field);
  });
  it.each(["paidBy", "amount", "spentOn", "note", "participantIds"])("rejects file input: %s", (field) => {
    const data = form(expense);
    data.set(field, new Blob(["1"]), "1");
    expectFieldError(parseAddExpenseForm(data, "JPY"), field);
  });
  it("preserves raw values, including an intentionally empty participant selection", () => {
    const raw = { ...expense, amount: "bad", note: " Lunch ", participantIds: [] };
    expect(parseAddExpenseForm(form(raw), "JPY")).toMatchObject({ success: false, values: raw });
  });
});

describe("payment parsers", () => {
  it("parses suggested integer minor units without rescaling", () => {
    expect(parseRecordPaymentForm(form(payment))).toMatchObject({ success: true, data: { fromMember: 1, toMember: 2, amountMinor: 1500 } });
  });
  it("parses manual USD and JPY amounts using server currency", () => {
    expect(parseManualPaymentForm(form(manual), "USD")).toMatchObject({ success: true, data: { amountMinor: 1250 } });
    expect(parseManualPaymentForm(form({ ...manual, amount: "1500" }), "JPY")).toMatchObject({ success: true, data: { amountMinor: 1500 } });
    expectFieldError(parseManualPaymentForm(form(manual), "JPY"), "amount");
  });
  it.each(["0", "-1", "1.1", "1e3", "9007199254740992", "NaN", "", "01"])("rejects unsafe or malformed suggested amounts: %s", (amountMinor) => {
    expectFieldError(parseRecordPaymentForm(form({ ...payment, amountMinor })), "amountMinor");
  });
  it.each(["0", "-1", "abc", "12.345", "90071992547409.92", ""])("rejects invalid manual amounts: %s", (amount) => {
    expectFieldError(parseManualPaymentForm(form({ ...manual, amount }), "USD"), "amount");
  });
  it.each(["fromMember", "toMember"] as const)("rejects malformed %s in both modes", (field) => {
    for (const id of ["0", "-1", "1.5", "1e2", "1x", "", "9007199254740992"]) {
      expectFieldError(parseRecordPaymentForm(form({ ...payment, [field]: id })), field);
      expectFieldError(parseManualPaymentForm(form({ ...manual, [field]: id }), "USD"), field);
    }
  });
  it("rejects self-payments in both modes with an error on the recipient", () => {
    expectFieldError(parseRecordPaymentForm(form({ ...payment, toMember: "1" })), "toMember");
    expectFieldError(parseManualPaymentForm(form({ ...manual, toMember: "1" }), "USD"), "toMember");
  });
  it("does not cap manual payments at a current debt or require a suggestion", () => {
    expect(parseManualPaymentForm(form({ ...manual, amount: "999999.99" }), "USD"))
      .toMatchObject({ success: true, data: { amountMinor: 99999999 } });
  });
  it("accepts the safe-integer boundary without rounding", () => {
    expect(parseRecordPaymentForm(form({ ...payment, amountMinor: "9007199254740991" })))
      .toMatchObject({ success: true, data: { amountMinor: Number.MAX_SAFE_INTEGER } });
    expect(parseManualPaymentForm(form({ ...manual, amount: "90071992547409.91" }), "USD"))
      .toMatchObject({ success: true, data: { amountMinor: Number.MAX_SAFE_INTEGER } });
  });
  it("rejects missing, duplicate and file fields in both modes", () => {
    for (const [values, parse] of [
      [payment, parseRecordPaymentForm],
      [manual, (data: FormData) => parseManualPaymentForm(data, "USD")],
    ] as const) {
      for (const field of Object.keys(values)) {
        const data = form(values);
        data.delete(field);
        expectFieldError(parse(data), field);
        data.append(field, "1");
        data.append(field, "1");
        expectFieldError(parse(data), field);
        data.set(field, new Blob(["1"]), "1");
        expectFieldError(parse(data), field);
      }
    }
  });
  it("preserves all submitted values after an invalid manual payment", () => {
    const values = { ...manual, fromMember: "2", toMember: "2", amount: "bad" };
    expect(parseManualPaymentForm(form(values), "USD")).toMatchObject({ success: false, values });
  });
});

describe("archive parsers", () => {
  it.each([
    ["expenseId", parseArchiveExpenseForm], ["memberId", parseArchiveMemberForm],
  ] as const)("validates %s without accepting coerced or duplicate values", (field, parse) => {
    expect(parse(form({ [field]: "12" }))).toMatchObject({ success: true, data: { [field]: 12 } });
    for (const id of ["", "0", "-1", "1.5", "1e2", "1abc", "9007199254740992"]) {
      expectFieldError(parse(form({ [field]: id })), field);
    }
    expectFieldError(parse(new FormData()), field);
    expectFieldError(parse(form({ [field]: ["1", "2"] })), field);
    const data = new FormData();
    data.set(field, new Blob(["1"]), "1");
    expectFieldError(parse(data), field);
  });
});

describe("form redisplay helpers", () => {
  it("captures raw repeated text while excluding file contents", () => {
    const data = form({ amount: "bad", participantIds: ["2", "3"] });
    data.append("participantIds", new Blob(["private"]), "private");
    expect(readFormValues(data, ["amount", "note"], "participantIds")).toEqual({ amount: "bad", note: "", participantIds: ["2", "3"] });
  });
  it("reads only scalar values and preserves intentionally blank input", () => {
    expect(fieldValue({ status: "idle" }, "spentOn", "2026-11-11")).toBe("2026-11-11");
    expect(fieldValue({ status: "error", values: { name: " Alice " } }, "name")).toBe(" Alice ");
    expect(fieldValue({ status: "error", values: { name: "" } }, "name", "fallback")).toBe("");
    expect(fieldValue({ status: "error", values: { name: ["Alice"] } }, "name", "fallback")).toBe("fallback");
  });
});
