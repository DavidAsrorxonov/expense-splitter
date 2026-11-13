import { describe, expect, it } from "vitest";
import { neutralizeFormula, toCsv } from "@/domain/csv";

describe("toCsv", () => {
  it("joins fields with commas and ends every row with CRLF", () => {
    expect(
      toCsv([
        ["Name", "Amount"],
        ["Alice", "12.50"],
      ]),
    ).toBe("Name,Amount\r\nAlice,12.50\r\n");
  });

  it("quotes commas and doubles embedded quotes", () => {
    expect(toCsv([["Coffee, beans", 'Alice said "hello"']])).toBe(
      '"Coffee, beans","Alice said ""hello"""\r\n',
    );
  });

  it("quotes fields containing LF, CR, or CRLF", () => {
    expect(toCsv([["first\nsecond", "first\rsecond", "first\r\nsecond"]])).toBe(
      '"first\nsecond","first\rsecond","first\r\nsecond"\r\n',
    );
  });

  it("preserves empty cells", () => {
    expect(toCsv([["", "Alice", ""]])).toBe(",Alice,\r\n");
  });

  it("preserves Unicode text", () => {
    expect(toCsv([["Café", "食費"]])).toBe("Café,食費\r\n");
  });

  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });
});

describe("neutralizeFormula", () => {
  it.each([
    "=SUM(A1:A2)",
    "+1+2",
    "-1+2",
    "@SUM(A1:A2)",
    "\tformula",
    "\rformula",
  ])("prefixes potentially executable text: %j", (text) => {
    expect(neutralizeFormula(text)).toBe("'" + text);
  });

  it.each(["", "Alice", "Café", "食費", "Lunch = dinner", "'=SUM(A1:A2)"])(
    "preserves safe text: %j",
    (text) => {
      expect(neutralizeFormula(text)).toBe(text);
    },
  );
});
