import { describe, it, expect, beforeEach } from "vitest";
import type { Db } from "@/db/connection";
import { NotFoundError } from "@/services/errors";
import { addExpense, archiveExpense } from "@/services/expense-service";
import { addMember, createGroup } from "@/services/group-service";
import { searchGroupExpenses } from "@/services/search-service";
import { createTestDb } from "../helpers/db";

let db: Db;
let groupId: string;
let alice: number;

beforeEach(() => {
  db = createTestDb();
  groupId = createGroup(db, { name: "Housemates", currency: "JPY" }).id;
  alice = addMember(db, groupId, "Alice").id;
});

function spend(note: string, gid = groupId, payer = alice) {
  return addExpense(db, {
    groupId: gid,
    paidBy: payer,
    amountMinor: 1000,
    note,
    spentOn: "2026-11-05",
    participantIds: [payer],
  });
}

const notes = (result: { note: string }[]) => result.map((e) => e.note);

describe("searchGroupExpenses", () => {
  it("finds expenses by word prefix across several words", () => {
    spend("coffee beans");
    spend("coffee filter");
    spend("rent");

    expect(notes(searchGroupExpenses(db, groupId, "cof"))).toHaveLength(2);
    expect(notes(searchGroupExpenses(db, groupId, "cof bea"))).toEqual([
      "coffee beans",
    ]);
  });

  it("only returns results from the requested group", () => {
    const other = createGroup(db, { name: "Other", currency: "JPY" }).id;
    const zed = addMember(db, other, "Zed").id;
    spend("shared pizza");
    spend("other pizza", other, zed);

    expect(notes(searchGroupExpenses(db, groupId, "pizza"))).toEqual([
      "shared pizza",
    ]);
  });

  it("hides archived expenses unless asked", () => {
    const keep = spend("pizza one");
    const gone = spend("pizza two");
    archiveExpense(db, groupId, gone.id);

    expect(searchGroupExpenses(db, groupId, "pizza").map((e) => e.id)).toEqual([
      keep.id,
    ]);
    expect(
      searchGroupExpenses(db, groupId, "pizza", { includeArchived: true })
        .map((e) => e.id)
        .sort(),
    ).toEqual([keep.id, gone.id].sort());
  });

  it("returns an empty list for blank or unsearchable text", () => {
    spend("pizza");
    for (const text of ["", "   ", "+++", '"']) {
      expect(searchGroupExpenses(db, groupId, text)).toEqual([]);
    }
  });

  it("never throws on FTS5 syntax characters", () => {
    spend("c++ book");
    for (const text of [
      '"unbalanced',
      "foo:bar",
      "AND",
      "OR NOT",
      "(",
      "a*b",
      "-x",
      "NEAR(a b)",
    ]) {
      expect(() => searchGroupExpenses(db, groupId, text)).not.toThrow();
    }
    expect(notes(searchGroupExpenses(db, groupId, "c++"))).toEqual([
      "c++ book",
    ]);
  });

  it("respects the limit", () => {
    for (let i = 0; i < 5; i++) spend(`pizza ${i}`);
    expect(
      searchGroupExpenses(db, groupId, "pizza", { limit: 3 }),
    ).toHaveLength(3);
  });

  it("throws NotFoundError for an unknown group", () => {
    expect(() => searchGroupExpenses(db, "nope", "pizza")).toThrow(
      NotFoundError,
    );
  });

  it("uses the default limit when the requested limit is NaN", () => {
    for (let i = 0; i < 51; i++) spend(`pizza ${i}`);

    expect(
      searchGroupExpenses(db, groupId, "pizza", { limit: NaN }),
    ).toHaveLength(50);
  });
});
