import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDatabase } from "@/db/connection";
import { migrate } from "@/db/migrate";

function makeMigrationsDir(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "migrations-"));
  for (const [name, sql] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), sql);
  }
  return dir;
}

function tableExists(db: ReturnType<typeof openDatabase>, name: string) {
  return (
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name) !== undefined
  );
}

describe("migrate", () => {
  it("applies migrations in order and records the version", () => {
    const dir = makeMigrationsDir({
      "002_add_b.sql": "CREATE TABLE b (id INTEGER PRIMARY KEY);",
      "001_add_a.sql": "CREATE TABLE a (id INTEGER PRIMARY KEY);",
    });
    const db = openDatabase(":memory:");

    expect(migrate(db, dir)).toBe(2);
    expect(tableExists(db, "a")).toBe(true);
    expect(tableExists(db, "b")).toBe(true);
  });

  it("does not re-run migrations that already ran", () => {
    const dir = makeMigrationsDir({
      "001_add_a.sql": "CREATE TABLE a (id INTEGER PRIMARY KEY);",
    });
    const db = openDatabase(":memory:");

    migrate(db, dir);
    expect(() => migrate(db, dir)).not.toThrow();
    expect(db.pragma("user_version", { simple: true })).toBe(1);
  });

  it("rolls back a failing migration completely", () => {
    const dir = makeMigrationsDir({
      "001_add_a.sql": "CREATE TABLE a (id INTEGER PRIMARY KEY);",
      "002_broken.sql": `
        CREATE TABLE b (id INTEGER PRIMARY KEY);
        THIS IS NOT VALID SQL;
      `,
    });
    const db = openDatabase(":memory:");

    expect(() => migrate(db, dir)).toThrow();
    expect(db.pragma("user_version", { simple: true })).toBe(1);
    expect(tableExists(db, "a")).toBe(true);
    expect(tableExists(db, "b")).toBe(false);
  });
});
