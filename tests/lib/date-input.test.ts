import { describe, expect, it } from "vitest";
import { dateInputValue, formatDateInput, parseDateInput } from "@/lib/date-input";
import { parseAddExpenseForm } from "@/lib/forms";

describe("date picker input", () => {
  it("formats a stored calendar date without a UTC day shift", () => {
    const date = parseDateInput("2026-11-12")!;
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 10, 12, 0]);
    expect(formatDateInput(date)).toBe("November 12, 2026");
    expect(dateInputValue(formatDateInput(date))).toBe("2026-11-12");
  });

  it.each(["June 01, 2025", "June 1, 2025", " june 1, 2025 ", "2025-06-01"])("normalizes typed date %s", (value) => {
    expect(dateInputValue(value)).toBe("2025-06-01");
  });

  it.each(["2026-02-29", "February 30, 2026", "April 31, 2026", "2026-13-01", "2026-11-00", "11/12/2026", "2026-1-1", "2026-11-12T00:00:00Z", "not a date", ""])("keeps invalid text for validation: %s", (value) => {
    expect(parseDateInput(value)).toBeUndefined();
    expect(dateInputValue(value)).toBe(value);
  });

  it("accepts leap days and keeps dates stable across year and daylight-saving boundaries", () => {
    for (const value of ["2028-02-29", "2026-01-01", "2026-12-31", "2026-03-08", "2026-11-01"]) {
      expect(dateInputValue(formatDateInput(parseDateInput(value)!))).toBe(value);
    }
  });

  it("submits the normalized date to the existing expense parser and rejects invalid edits", () => {
    const form = new FormData();
    form.set("paidBy", "1");
    form.set("amount", "1500");
    form.set("participantIds", "1");
    form.set("spentOn", dateInputValue("November 12, 2026"));
    expect(parseAddExpenseForm(form, "JPY")).toMatchObject({ success: true, data: { spentOn: "2026-11-12" } });
    form.set("spentOn", dateInputValue("November 31, 2026"));
    const result = parseAddExpenseForm(form, "JPY");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.spentOn).toBeTruthy();
      expect(result.values.spentOn).toBe("November 31, 2026");
    }
  });
});
