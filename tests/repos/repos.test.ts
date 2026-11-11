import { describe, it, expect, beforeEach } from "vitest";
import type { Db } from "@/db/connection";
import { createTestDb } from "../helpers/db";
import { insertGroup, findGroup } from "@/repos/groups";
import {
  insertMember,
  findMember,
  listMembers,
  archiveMember,
} from "@/repos/members";
import {
  insertExpense,
  insertSplits,
  findExpense,
  listExpenses,
  listSplits,
  archiveExpense,
  monthlyTotals,
} from "@/repos/expenses";
import { insertSettlement, listSettlements } from "@/repos/settlements";
import { listBalances } from "@/repos/balances";

let db: Db;

beforeEach(() => {
  db = createTestDb();
  insertGroup(db, { id: "g1", name: "Test group", currency: "JPY" });
});

function addExpense(paidBy: number, amountMinor: number, spentOn: string) {
  return insertExpense(db, {
    groupId: "g1",
    paidBy,
    amountMinor,
    note: "test",
    spentOn,
  });
}

describe("groups repo", () => {
  it("inserts and finds a group with camelCase fields", () => {
    expect(findGroup(db, "g1")).toEqual({
      id: "g1",
      name: "Test group",
      currency: "JPY",
      createdAt: expect.any(String),
    });
  });

  it("returns undefined for an unknown group", () => {
    expect(findGroup(db, "nope")).toBeUndefined();
  });
});

describe("members repo", () => {
  it("inserts, finds, and lists members in id order", () => {
    const alice = insertMember(db, "g1", "Alice");
    const bob = insertMember(db, "g1", "Bob");

    expect(findMember(db, alice)).toEqual({
      id: alice,
      groupId: "g1",
      name: "Alice",
      archivedAt: null,
    });
    expect(listMembers(db, "g1").map((m) => m.id)).toEqual([alice, bob]);
    expect(findMember(db, 999)).toBeUndefined();
  });

  it("hides archived members unless asked, and archives only once", () => {
    const alice = insertMember(db, "g1", "Alice");
    const bob = insertMember(db, "g1", "Bob");

    expect(archiveMember(db, alice)).toBe(true);
    expect(archiveMember(db, alice)).toBe(false);

    expect(listMembers(db, "g1").map((m) => m.id)).toEqual([bob]);
    expect(listMembers(db, "g1", true).map((m) => m.id)).toEqual([alice, bob]);
  });
});

describe("expenses repo", () => {
  it("stores an expense with its splits and reads them back", () => {
    const alice = insertMember(db, "g1", "Alice");
    const bob = insertMember(db, "g1", "Bob");
    const id = addExpense(alice, 1001, "2026-11-05");
    insertSplits(db, id, [
      { memberId: bob, shareMinor: 500 },
      { memberId: alice, shareMinor: 501 },
    ]);

    expect(findExpense(db, id)).toEqual({
      id,
      groupId: "g1",
      paidBy: alice,
      amountMinor: 1001,
      note: "test",
      spentOn: "2026-11-05",
      createdAt: expect.any(String),
      archivedAt: null,
    });
    expect(listSplits(db, id)).toEqual([
      { memberId: alice, shareMinor: 501 },
      { memberId: bob, shareMinor: 500 },
    ]);
  });

  it("lists newest first and hides archived expenses unless asked", () => {
    const alice = insertMember(db, "g1", "Alice");
    const oldest = addExpense(alice, 100, "2026-11-01");
    const newest = addExpense(alice, 100, "2026-11-09");
    const archived = addExpense(alice, 100, "2026-11-05");

    expect(archiveExpense(db, archived)).toBe(true);
    expect(archiveExpense(db, archived)).toBe(false);

    expect(listExpenses(db, "g1").map((e) => e.id)).toEqual([newest, oldest]);
    expect(listExpenses(db, "g1", true).map((e) => e.id)).toEqual([
      newest,
      archived,
      oldest,
    ]);
  });

  it("totals active expenses per month, newest month first", () => {
    const alice = insertMember(db, "g1", "Alice");
    addExpense(alice, 1000, "2026-10-15");
    addExpense(alice, 2000, "2026-11-02");
    addExpense(alice, 500, "2026-11-20");
    const archived = addExpense(alice, 9999, "2026-11-25");
    archiveExpense(db, archived);

    expect(monthlyTotals(db, "g1")).toEqual([
      { month: "2026-11", totalMinor: 2500 },
      { month: "2026-10", totalMinor: 1000 },
    ]);
  });
});

describe("settlements repo", () => {
  it("lists settlements newest first", () => {
    const alice = insertMember(db, "g1", "Alice");
    const bob = insertMember(db, "g1", "Bob");
    const first = insertSettlement(db, {
      groupId: "g1",
      fromMember: bob,
      toMember: alice,
      amountMinor: 300,
    });
    const second = insertSettlement(db, {
      groupId: "g1",
      fromMember: bob,
      toMember: alice,
      amountMinor: 200,
    });

    const list = listSettlements(db, "g1");
    expect(list.map((s) => s.id)).toEqual([second, first]);
    expect(list[0]).toEqual({
      id: second,
      groupId: "g1",
      fromMember: bob,
      toMember: alice,
      amountMinor: 200,
      createdAt: expect.any(String),
    });
  });
});

describe("balances repo", () => {
  it("reads the member_balances view as camelCase objects", () => {
    const alice = insertMember(db, "g1", "Alice");
    const bob = insertMember(db, "g1", "Bob");
    const id = addExpense(alice, 1000, "2026-11-05");
    insertSplits(db, id, [
      { memberId: alice, shareMinor: 500 },
      { memberId: bob, shareMinor: 500 },
    ]);

    expect(listBalances(db, "g1")).toEqual([
      {
        memberId: alice,
        groupId: "g1",
        name: "Alice",
        archivedAt: null,
        balanceMinor: 500,
      },
      {
        memberId: bob,
        groupId: "g1",
        name: "Bob",
        archivedAt: null,
        balanceMinor: -500,
      },
    ]);
  });
});
