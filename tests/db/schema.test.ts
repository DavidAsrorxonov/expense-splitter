import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import type { Db } from "@/db/connection";

let db: Db;

beforeEach(() => {
  db = createTestDb();
  addGroup("g1");
});

function addGroup(id: string, currency = "USD") {
  db.prepare("INSERT INTO groups (id, name, currency) VALUES (?, ?, ?)").run(
    id,
    "Test group",
    currency,
  );
}

function addMember(groupId: string, name: string): number {
  const res = db
    .prepare("INSERT INTO members (group_id, name) VALUES (?, ?)")
    .run(groupId, name);
  return Number(res.lastInsertRowid);
}

function addExpense(
  groupId: string,
  paidBy: number,
  amount: number,
  shares: Record<number, number>,
): number {
  const res = db
    .prepare(
      `INSERT INTO expenses (group_id, paid_by, amount_minor, note, spent_on)
       VALUES (?, ?, ?, 'test', '2026-11-01')`,
    )
    .run(groupId, paidBy, amount);
  const id = Number(res.lastInsertRowid);
  const insert = db.prepare(
    "INSERT INTO splits (expense_id, member_id, share_minor) VALUES (?, ?, ?)",
  );
  for (const [memberId, share] of Object.entries(shares)) {
    insert.run(id, Number(memberId), share);
  }
  return id;
}

function addSettlement(
  groupId: string,
  from: number,
  to: number,
  amount: number,
) {
  db.prepare(
    "INSERT INTO settlements (group_id, from_member, to_member, amount_minor) VALUES (?, ?, ?, ?)",
  ).run(groupId, from, to, amount);
}

function balances(groupId = "g1"): Record<string, number> {
  const rows = db
    .prepare(
      "SELECT name, balance_minor FROM member_balances WHERE group_id = ?",
    )
    .all(groupId) as { name: string; balance_minor: number }[];
  return Object.fromEntries(rows.map((r) => [r.name, r.balance_minor]));
}

describe("constraints", () => {
  it("rejects zero or negative expense amounts", () => {
    const alice = addMember("g1", "Alice");
    const insert = db.prepare(
      `INSERT INTO expenses (group_id, paid_by, amount_minor, spent_on)
       VALUES ('g1', ?, ?, '2026-11-01')`,
    );
    expect(() => insert.run(alice, 0)).toThrow(/CHECK/);
    expect(() => insert.run(alice, -500)).toThrow(/CHECK/);
  });

  it("rejects a settlement from a member to themselves", () => {
    const alice = addMember("g1", "Alice");
    expect(() => addSettlement("g1", alice, alice, 100)).toThrow(/CHECK/);
  });

  it("rejects negative split shares", () => {
    const alice = addMember("g1", "Alice");
    expect(() => addExpense("g1", alice, 100, { [alice]: -1 })).toThrow(
      /CHECK/,
    );
  });

  it("rejects an expense paid by a member that does not exist", () => {
    expect(() => addExpense("g1", 999, 100, {})).toThrow(/FOREIGN KEY/);
  });

  it("rejects impossible dates", () => {
    const alice = addMember("g1", "Alice");
    const insert = db.prepare(
      `INSERT INTO expenses (group_id, paid_by, amount_minor, spent_on)
       VALUES ('g1', ?, 100, ?)`,
    );
    expect(() => insert.run(alice, "2026-13-45")).toThrow(/CHECK/);
    expect(() => insert.run(alice, "not a date")).toThrow(/CHECK/);
  });

  it("keeps member names unique only among active members of a group", () => {
    const first = addMember("g1", "Alice");
    expect(() => addMember("g1", "Alice")).toThrow(/UNIQUE/);

    addGroup("g2");
    expect(() => addMember("g2", "Alice")).not.toThrow();

    db.prepare(
      "UPDATE members SET archived_at = datetime('now') WHERE id = ?",
    ).run(first);
    expect(() => addMember("g1", "Alice")).not.toThrow();
  });

  it("rejects unsupported or missing currencies", () => {
    expect(() => addGroup("g3", "XXX")).toThrow(/CHECK/);
    expect(() =>
      db
        .prepare("INSERT INTO groups (id, name) VALUES ('g4', 'No currency')")
        .run(),
    ).toThrow(/NOT NULL/);
    expect(() => addGroup("g5", "JPY")).not.toThrow();
  });
});

describe("member_balances view", () => {
  it("computes balances for an equal split", () => {
    const alice = addMember("g1", "Alice");
    const bob = addMember("g1", "Bob");
    const carol = addMember("g1", "Carol");
    addExpense("g1", alice, 3000, {
      [alice]: 1000,
      [bob]: 1000,
      [carol]: 1000,
    });

    expect(balances()).toEqual({ Alice: 2000, Bob: -1000, Carol: -1000 });
  });

  it("moves balances toward zero when a settlement is recorded", () => {
    const alice = addMember("g1", "Alice");
    const bob = addMember("g1", "Bob");
    const carol = addMember("g1", "Carol");
    addExpense("g1", alice, 3000, {
      [alice]: 1000,
      [bob]: 1000,
      [carol]: 1000,
    });
    addSettlement("g1", bob, alice, 1000);

    expect(balances()).toEqual({ Alice: 1000, Bob: 0, Carol: -1000 });
  });

  it("ignores archived expenses", () => {
    const alice = addMember("g1", "Alice");
    const bob = addMember("g1", "Bob");
    const id = addExpense("g1", alice, 2000, { [alice]: 1000, [bob]: 1000 });
    db.prepare(
      "UPDATE expenses SET archived_at = datetime('now') WHERE id = ?",
    ).run(id);

    expect(balances()).toEqual({ Alice: 0, Bob: 0 });
  });

  it("gives a member with no activity a balance of 0", () => {
    const alice = addMember("g1", "Alice");
    const bob = addMember("g1", "Bob");
    addMember("g1", "Dave");
    addExpense("g1", alice, 1000, { [alice]: 500, [bob]: 500 });

    expect(balances().Dave).toBe(0);
  });

  it("always sums to zero across a group", () => {
    const alice = addMember("g1", "Alice");
    const bob = addMember("g1", "Bob");
    const carol = addMember("g1", "Carol");
    addExpense("g1", alice, 3000, {
      [alice]: 1000,
      [bob]: 1000,
      [carol]: 1000,
    });
    addExpense("g1", bob, 100, { [alice]: 34, [bob]: 33, [carol]: 33 });
    addSettlement("g1", carol, alice, 500);

    const total = Object.values(balances()).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });
});
