import { describe, expect, it } from "vitest";
import { parseAmount, toDecimalString } from "@/domain/money";

describe("toDecimalString", () => {
  it("formats amounts using the currency's decimal places", () => {
    expect(toDecimalString(1250, "USD")).toBe("12.50");
    expect(toDecimalString(5, "USD")).toBe("0.05");
    expect(toDecimalString(0, "USD")).toBe("0.00");
    expect(toDecimalString(1500, "JPY")).toBe("1500");
    expect(toDecimalString(0, "JPY")).toBe("0");
    expect(toDecimalString(1001, "EUR")).toBe("10.01");
    expect(toDecimalString(1001, "UZS")).toBe("10.01");
  });

  it("preserves negative amounts", () => {
    expect(toDecimalString(-1250, "USD")).toBe("-12.50");
    expect(toDecimalString(-5, "USD")).toBe("-0.05");
    expect(toDecimalString(-1500, "JPY")).toBe("-1500");
  });

  it("formats the safe integer boundaries exactly", () => {
    expect(toDecimalString(Number.MAX_SAFE_INTEGER, "USD")).toBe(
      "90071992547409.91",
    );
    expect(toDecimalString(Number.MIN_SAFE_INTEGER, "USD")).toBe(
      "-90071992547409.91",
    );
  });

  it.each(["JPY", "USD", "EUR", "UZS"] as const)(
    "round-trips non-negative amounts for %s",
    (currency) => {
      for (const minor of [
        0,
        1,
        5,
        99,
        100,
        1001,
        1250,
        Number.MAX_SAFE_INTEGER,
      ]) {
        expect(parseAmount(toDecimalString(minor, currency), currency)).toBe(
          minor,
        );
      }
    },
  );

  it("rejects amounts that cannot be represented as safe integers", () => {
    for (const minor of [
      NaN,
      Infinity,
      -Infinity,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() => toDecimalString(minor, "USD")).toThrow(RangeError);
    }
  });
});
