import { describe, expect, it } from "vitest";
import { resolveDatabasePath } from "@/lib/db-path";

describe("resolveDatabasePath", () => {
  it.each([undefined, "development", "test"])("defaults outside production (%s)", (NODE_ENV) => {
    expect(resolveDatabasePath({ NODE_ENV })).toBe("data/app.db");
  });

  it.each([undefined, "", " \t\n "])("rejects missing production paths (%s)", (DATABASE_PATH) => {
    expect(() => resolveDatabasePath({ NODE_ENV: "production", DATABASE_PATH })).toThrow(
      "DATABASE_PATH must be set in production (point it at the mounted volume, for example /data/app.db)",
    );
  });

  it.each(["development", "production"])("uses a trimmed explicit path in %s", (NODE_ENV) => {
    expect(resolveDatabasePath({ NODE_ENV, DATABASE_PATH: " /data/app.db " })).toBe("/data/app.db");
  });

  it("uses the development default for whitespace-only paths", () => {
    expect(resolveDatabasePath({ NODE_ENV: "development", DATABASE_PATH: " \t " })).toBe("data/app.db");
  });
});
