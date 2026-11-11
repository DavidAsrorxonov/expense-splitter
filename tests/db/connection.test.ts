import { describe, it, expect } from "vitest";
import { openDatabase } from "@/db/connection";

describe("openDatabase", () => {
  it("turns foreign keys on", () => {
    const db = openDatabase(":memory:");
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
  });

  it("sets the busy timeout", () => {
    const db = openDatabase(":memory:");
    expect(db.pragma("busy_timeout", { simple: true })).toBe(5000);
  });

  it("rejects rows that break a foreign key", () => {
    const db = openDatabase(":memory:");
    db.exec(`
      CREATE TABLE parent (id INTEGER PRIMARY KEY);
      CREATE TABLE child (
        id INTEGER PRIMARY KEY,
        parent_id INTEGER NOT NULL REFERENCES parent(id)
      );
    `);
    expect(() =>
      db.prepare("INSERT INTO child (parent_id) VALUES (?)").run(999),
    ).toThrow(/FOREIGN KEY/);
  });
});
