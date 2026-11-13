import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDatabase, type Db } from "@/db/connection";
import { migrate } from "@/db/migrate";
import { createTestDb } from "../helpers/db";

const MIGRATIONS = path.join(process.cwd(), "src/db/migrations");

let db: Db;

function addExpense(note: string, spentOn = "2026-11-01"): number {
  const result = db
    .prepare(
      `INSERT INTO expenses (group_id, paid_by, amount_minor, note, spent_on)
       VALUES ('g1', 1, 100, ?, ?)`,
    )
    .run(note, spentOn);
  return Number(result.lastInsertRowid);
}

function setup(target: Db) {
  target
    .prepare(
      "INSERT INTO groups (id, name, currency) VALUES ('g1', 'G', 'JPY')",
    )
    .run();
  target
    .prepare("INSERT INTO members (group_id, name) VALUES ('g1', 'Alice')")
    .run();
}

function match(query: string): number[] {
  const rows = db
    .prepare(
      "SELECT rowid FROM expenses_fts WHERE expenses_fts MATCH ? ORDER BY rowid",
    )
    .all(query) as { rowid: number }[];
  return rows.map((r) => r.rowid);
}

beforeEach(() => {
  db = createTestDb();
  setup(db);
});

describe("expenses_fts sync triggers", () => {
  it("indexes a note when an expense is inserted", () => {
    const id = addExpense("weekly groceries");
    expect(match("groceries")).toEqual([id]);
  });

  it("matches word prefixes and ignores case and accents", () => {
    const id = addExpense("Café latte");
    expect(match('"gro"*')).toEqual([]);
    expect(match('"caf"*')).toEqual([id]);
    expect(match("CAFE")).toEqual([id]);
  });

  it("updates the index when a note changes", () => {
    const id = addExpense("pizza night");
    db.prepare("UPDATE expenses SET note = 'sushi night' WHERE id = ?").run(id);

    expect(match("pizza")).toEqual([]);
    expect(match("sushi")).toEqual([id]);
  });

  it("does not touch the index when another column changes", () => {
    const id = addExpense("pizza night");
    db.prepare(
      "UPDATE expenses SET archived_at = datetime('now') WHERE id = ?",
    ).run(id);
    expect(match("pizza")).toEqual([id]);
  });

  it("removes the note from the index when an expense row is deleted", () => {
    const id = addExpense("pizza night");
    db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
    expect(match("pizza")).toEqual([]);
  });

  it("stays consistent: the integrity check passes after all of the above", () => {
    const a = addExpense("one two three");
    addExpense("four five six");
    db.prepare("UPDATE expenses SET note = 'seven' WHERE id = ?").run(a);
    expect(() =>
      db
        .prepare(
          "INSERT INTO expenses_fts(expenses_fts) VALUES ('integrity-check')",
        )
        .run(),
    ).not.toThrow();
  });
});

describe("ranking", () => {
  it("ranks shorter, closer matches first", () => {
    const long = addExpense(
      "coffee beans and a few other things from the market",
    );
    const short = addExpense("coffee");
    addExpense("rent");
    addExpense("electricity");
    addExpense("train pass");
    addExpense("internet bill");

    const rows = db
      .prepare(
        `SELECT rowid FROM expenses_fts WHERE expenses_fts MATCH 'coffee' ORDER BY bm25(expenses_fts)`,
      )
      .all() as { rowid: number }[];
    expect(rows.map((r) => r.rowid)).toEqual([short, long]);
  });
});

describe("migration 002 on a database that already has data", () => {
  it("indexes existing expenses when the migration is applied", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "migrations-"));
    fs.copyFileSync(
      path.join(MIGRATIONS, "001_init.sql"),
      path.join(dir, "001_init.sql"),
    );

    const old = openDatabase(":memory:");
    expect(migrate(old, dir)).toBe(1);
    setup(old);
    old
      .prepare(
        `INSERT INTO expenses (group_id, paid_by, amount_minor, note, spent_on)
         VALUES ('g1', 1, 100, 'old groceries', '2026-10-01')`,
      )
      .run();

    fs.copyFileSync(
      path.join(MIGRATIONS, "002_expenses_fts.sql"),
      path.join(dir, "002_expenses_fts.sql"),
    );
    expect(migrate(old, dir)).toBe(2);

    const rows = old
      .prepare(
        "SELECT rowid FROM expenses_fts WHERE expenses_fts MATCH 'groceries'",
      )
      .all();
    expect(rows).toHaveLength(1);
  });
});
