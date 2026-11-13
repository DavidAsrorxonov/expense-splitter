import { describe, expect, it } from "vitest";
import { groupHref, parseGroupViewParams } from "@/lib/group-view";

const GROUP_ID = "Abc123_-xyZ9";
const GROUP_PATH = `/g/${GROUP_ID}`;

describe("parseGroupViewParams", () => {
  it("defaults to an empty search and hidden archived items", () => {
    expect(parseGroupViewParams({})).toEqual({ q: "", showArchived: false });
    expect(parseGroupViewParams({ q: [], archived: [] })).toEqual({
      q: "",
      showArchived: false,
    });
  });

  it("trims search text while preserving spaces between words", () => {
    expect(parseGroupViewParams({ q: " \tcoffee  beans\n" })).toEqual({
      q: "coffee  beans",
      showArchived: false,
    });
    expect(parseGroupViewParams({ q: " \n\t " }).q).toBe("");
  });

  it("uses only the first value of repeated parameters", () => {
    expect(
      parseGroupViewParams({ q: [" coffee ", "rent"], archived: ["1", "0"] }),
    ).toEqual({ q: "coffee", showArchived: true });
    expect(
      parseGroupViewParams({ q: ["", "rent"], archived: ["0", "1"] }),
    ).toEqual({ q: "", showArchived: false });
  });

  it("limits search text to 100 characters after trimming", () => {
    expect(parseGroupViewParams({ q: `  ${"a".repeat(101)}  ` }).q).toBe(
      "a".repeat(100),
    );
  });

  it("shows archived items only for the exact value 1", () => {
    expect(parseGroupViewParams({ archived: "1" }).showArchived).toBe(true);
  });

  it.each(["", "0", "true", "01", " 1", "1 ", "yes"])(
    "keeps archived items hidden for %j",
    (archived) => {
      expect(parseGroupViewParams({ archived }).showArchived).toBe(false);
    },
  );
});

describe("groupHref", () => {
  it("omits default values and the trailing question mark", () => {
    expect(groupHref(GROUP_ID, {})).toBe(GROUP_PATH);
    expect(groupHref(GROUP_ID, { q: "", showArchived: false })).toBe(GROUP_PATH);
    expect(groupHref(GROUP_ID, { q: " \t " })).toBe(GROUP_PATH);
  });

  it("builds search-only and archived-only links", () => {
    expect(groupHref(GROUP_ID, { q: "coffee beans" })).toBe(
      `${GROUP_PATH}?q=coffee%20beans`,
    );
    expect(groupHref(GROUP_ID, { showArchived: true })).toBe(
      `${GROUP_PATH}?archived=1`,
    );
  });

  it("preserves both view settings in a link", () => {
    expect(groupHref(GROUP_ID, { q: "coffee beans", showArchived: true })).toBe(
      `${GROUP_PATH}?q=coffee%20beans&archived=1`,
    );
  });

  it("normalizes search text using the same rules as incoming parameters", () => {
    expect(groupHref(GROUP_ID, { q: `  ${"a".repeat(101)}  ` })).toBe(
      `${GROUP_PATH}?q=${"a".repeat(100)}`,
    );
  });

  it("encodes Unicode and punctuation without creating extra parameters", () => {
    const q = "Café 食費 + &archived=1 #50%";
    const url = new URL(groupHref(GROUP_ID, { q }), "https://example.test");

    expect(url.pathname).toBe(GROUP_PATH);
    expect(url.hash).toBe("");
    expect([...url.searchParams]).toEqual([["q", q]]);
  });

  it("lets clear-search and archived-toggle links preserve the other setting", () => {
    const view = parseGroupViewParams({ q: "coffee", archived: "1" });

    expect(groupHref(GROUP_ID, { ...view, q: "" })).toBe(
      `${GROUP_PATH}?archived=1`,
    );
    expect(groupHref(GROUP_ID, { ...view, showArchived: false })).toBe(
      `${GROUP_PATH}?q=coffee`,
    );
  });
});
