import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { dateInputValue, datePickerValue, localDateString } from "@/lib/date-input";

describe("browser-local expense date", () => {
  it("formats local calendar fields with padded month and day", () => {
    expect(localDateString(new Date(2026, 0, 3, 12))).toBe("2026-01-03");
  });

  it("uses different dates in UTC and Tokyo at the same instant near midnight", () => {
    const code = `const { localDateString } = require('./src/lib/date-input.ts');
      console.log(localDateString(new Date('2026-11-14T15:30:00Z')));`;
    const dateInZone = (TZ: string) => execFileSync(process.execPath,
      ["--import", "tsx", "-e", code],
      { env: { ...process.env, TZ }, encoding: "utf8", timeout: 15_000 },
    ).trim();
    expect(dateInZone("UTC")).toBe("2026-11-14");
    expect(dateInZone("Asia/Tokyo")).toBe("2026-11-15");
  });

  it("updates an untouched default from server date to browser date", () => {
    const resetKey = {};
    const selection = { resetKey, value: null };
    expect(datePickerValue(selection, resetKey, "2026-11-14")).toBe("November 14, 2026");
    expect(datePickerValue(selection, resetKey, "2026-11-15")).toBe("November 15, 2026");
  });

  it.each(["November 03, 2026", "2026-10-31", "", "not a date"])(
    "preserves an edited draft (%s) across local-date updates and dialog rerenders", (value) => {
      const resetKey = {};
      const selection = { resetKey, value };
      expect(datePickerValue(selection, resetKey, "2026-11-15")).toBe(value);
      expect(datePickerValue(selection, resetKey, "2026-11-16")).toBe(value);
    },
  );

  it("resets to the latest local date after each successful action", () => {
    const firstSuccess = {};
    const selection = { resetKey: {}, value: "November 03, 2026" };
    expect(dateInputValue(datePickerValue(selection, firstSuccess, "2026-11-15"))).toBe("2026-11-15");
    const nextDraft = { resetKey: firstSuccess, value: "November 10, 2026" };
    expect(dateInputValue(datePickerValue(nextDraft, {}, "2026-11-16"))).toBe("2026-11-16");
  });

  it.each(["2026-11-03", "", "November 31, 2026"])(
    "preserves submitted values on a failed action (%s)", (submitted) => {
      const errorState = {};
      const selection = { resetKey: {}, value: "old draft" };
      expect(dateInputValue(datePickerValue(selection, errorState, submitted))).toBe(submitted);
      // The fieldset can also remount when error values change.
      expect(dateInputValue(datePickerValue({ resetKey: errorState, value: null }, errorState, submitted))).toBe(submitted);
    },
  );
});
