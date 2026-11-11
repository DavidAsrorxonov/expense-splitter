import { describe, expect, it } from "vitest";
import { parseCreateGroupForm } from "@/lib/forms";

function form(name = "  Housemates  ", currency = "JPY") {
  const data = new FormData();
  data.set("name", name);
  data.set("currency", currency);
  return data;
}

describe("parseCreateGroupForm", () => {
  it("returns normalized service input while preserving the exact submitted text", () => {
    expect(parseCreateGroupForm(form())).toEqual({
      success: true,
      data: { name: "Housemates", currency: "JPY" },
      values: { name: "  Housemates  ", currency: "JPY" },
    });
  });

  it("reports all missing fields without defaulting the currency", () => {
    expect(parseCreateGroupForm(new FormData())).toEqual({
      success: false,
      fieldErrors: { name: "Enter a group name.", currency: "Choose a supported currency." },
      values: { name: "", currency: "" },
    });
  });

  it("keeps both the invalid name and selected currency for error recovery", () => {
    expect(parseCreateGroupForm(form("   ", "EUR"))).toEqual({
      success: false,
      fieldErrors: { name: "Enter a group name." },
      values: { name: "   ", currency: "EUR" },
    });
  });

  it("keeps overlong text so the user can correct it", () => {
    const name = "a".repeat(81);
    const result = parseCreateGroupForm(form(name, "USD"));
    expect(result.success).toBe(false);
    expect(result.values).toEqual({ name, currency: "USD" });
    if (!result.success) expect(result.fieldErrors.name).toMatch(/80/);
  });

  it("rejects unsupported currencies", () => {
    const result = parseCreateGroupForm(form("Trip", "constructor"));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors.currency).toBe("Choose a supported currency.");
  });

  it.each(["name", "currency"])("rejects a file in the %s field", (field) => {
    const data = form();
    data.set(field, new Blob(["JPY"], { type: "text/plain" }), "input.txt");
    const result = parseCreateGroupForm(data);
    expect(result.success).toBe(false);
    expect(result.values[field]).toBe("");
    if (!result.success) expect(result.fieldErrors[field]).toBeTruthy();
  });

  it.each(["name", "currency"])("rejects duplicate scalar fields: %s", (field) => {
    const data = form();
    data.append(field, field === "name" ? "Other" : "USD");
    const result = parseCreateGroupForm(data);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors[field]).toBeTruthy();
  });

  it("ignores action metadata and unrelated fields", () => {
    const data = form();
    data.append("$ACTION_ID_test", "");
    data.append("groupId", "attacker-id");
    expect(parseCreateGroupForm(data)).toEqual(parseCreateGroupForm(form()));
  });
});
