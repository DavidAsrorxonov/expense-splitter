import { describe, it, expect } from "vitest";
import { parseAmount, formatAmount } from "@/domain/money";

describe("parseAmount", () => {
  it("converts decimal input to minor units", () => {
    expect(parseAmount("12.50", "USD")).toBe(1250);
    expect(parseAmount("12.5", "USD")).toBe(1250);
    expect(parseAmount("12", "USD")).toBe(1200);
    expect(parseAmount("0.05", "USD")).toBe(5);
  });

  it("handles currencies without decimals", () => {
    expect(parseAmount("1000", "JPY")).toBe(1000);
    expect(parseAmount("1,000", "JPY")).toBe(1000);
    expect(parseAmount("1000.5", "JPY")).toBeNull();
  });

  it("rejects invalid input", () => {
    for (const bad of ["", "abc", "-5", "12.345", ".5", "1.2.3"]) {
      expect(parseAmount(bad, "USD")).toBeNull();
    }
  });
});

describe("formatAmount", () => {
  it("formats using each currency's decimals", () => {
    expect(formatAmount(1250, "USD")).toBe("$12.50");
    expect(formatAmount(-1250, "USD")).toBe("-$12.50");
    expect(formatAmount(1000, "JPY")).toBe("¥1,000");
  });
});
