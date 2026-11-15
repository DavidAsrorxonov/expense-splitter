import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DatePickerInput } from "@/components/forms/date-picker-input";

function renderPicker(defaultValue: string, defaultToToday: boolean) {
  return renderToStaticMarkup(createElement(DatePickerInput, {
    id: "expense-date", name: "spentOn", today: "2026-11-14",
    defaultValue, defaultToToday, resetKey: {},
  }));
}

describe("expense date hydration markup", () => {
  it("renders the server date initially for an untouched form", () => {
    const html = renderPicker("2026-11-01", true);
    expect(html).toContain('value="November 14, 2026"');
    expect(html).toContain('name="spentOn" value="2026-11-14"');
  });

  it("renders a returned date instead of replacing it with today", () => {
    const html = renderPicker("2026-10-31", false);
    expect(html).toContain('value="October 31, 2026"');
    expect(html).toContain('name="spentOn" value="2026-10-31"');
  });

  it("retains invalid submitted text for correction", () => {
    const html = renderPicker("November 31, 2026", false);
    expect(html).toContain('value="November 31, 2026"');
    expect(html).toContain('name="spentOn" value="November 31, 2026"');
  });
});
