import { describe, it, expect } from "vitest";
import { buildSearchQuery } from "@/domain/search-query";

describe("buildSearchQuery", () => {
  it("quotes each word and makes it a prefix match", () => {
    expect(buildSearchQuery("coffee")).toBe('"coffee"*');
    expect(buildSearchQuery("  coffee   beans ")).toBe('"coffee"* "beans"*');
  });

  it("treats FTS5 operators and punctuation as plain text", () => {
    expect(buildSearchQuery("AND OR NOT")).toBe('"AND"* "OR"* "NOT"*');
    expect(buildSearchQuery("foo:bar")).toBe('"foo:bar"*');
    expect(buildSearchQuery("c++")).toBe('"c++"*');
  });

  it("removes double quotes so they cannot break the query", () => {
    expect(buildSearchQuery('say "hi"')).toBe('"say"* "hi"*');
    expect(buildSearchQuery('"')).toBeNull();
  });

  it("returns null when nothing is searchable", () => {
    expect(buildSearchQuery("")).toBeNull();
    expect(buildSearchQuery("   ")).toBeNull();
    expect(buildSearchQuery("+++ ---")).toBeNull();
  });

  it("keeps non-Latin words", () => {
    expect(buildSearchQuery("食費")).toBe('"食費"*');
  });

  it("limits the number and length of terms", () => {
    const many = Array.from({ length: 12 }, (_, i) => `w${i}`).join(" ");
    expect(buildSearchQuery(many)!.split(" ")).toHaveLength(8);

    const long = "a".repeat(200);
    expect(buildSearchQuery(long)).toBe(`"${"a".repeat(50)}"*`);
  });
});
