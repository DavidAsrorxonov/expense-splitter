import { describe, expect, it } from "vitest";
import { CURRENCIES } from "@/domain/currency";
import { createGroupSchema, groupIdSchema } from "@/lib/schemas";

describe("createGroupSchema", () => {
  it.each(Object.keys(CURRENCIES))("accepts %s and trims the group name", (currency) => {
    expect(createGroupSchema.parse({ name: "  Housemates  ", currency })).toEqual({
      name: "Housemates",
      currency,
    });
  });

  it.each(["", "  \t\n", undefined, null, 42])("rejects invalid names: %j", (name) => {
    const result = createGroupSchema.safeParse({ name, currency: "JPY" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["name"]);
  });

  it("enforces the name length after trimming", () => {
    expect(createGroupSchema.safeParse({ name: `  ${"a".repeat(80)}  `, currency: "USD" }).success).toBe(true);
    expect(createGroupSchema.safeParse({ name: "a".repeat(81), currency: "USD" }).success).toBe(false);
  });

  it.each(["XXX", "usd", " USD ", "", "constructor", "toString", "__proto__", undefined])(
    "rejects unsupported currency %j, including inherited object properties",
    (currency) => {
      const result = createGroupSchema.safeParse({ name: "Trip", currency });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0].path).toEqual(["currency"]);
    },
  );
});

describe("groupIdSchema", () => {
  it.each(["abcdefghijkl", "ABCdef012_-9"])("accepts a valid group ID: %s", (id) => {
    expect(groupIdSchema.safeParse(id).success).toBe(true);
  });

  it.each(["", "short", "not-a-real-id", "a".repeat(13), "abcdefghijk!", "abcdefghijkl\n", "abcdef ghijk", "../abcdefghi"])(
    "rejects malformed IDs: %j",
    (id) => {
      expect(groupIdSchema.safeParse(id).success).toBe(false);
    },
  );
});
