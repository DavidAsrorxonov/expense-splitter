import { describe, it, expect, beforeEach } from "vitest";
import type { Db } from "@/db/connection";
import { getGroupBalances } from "@/services/balance-service";
import { NotFoundError } from "@/services/errors";
import { addExpense } from "@/services/expense-service";
import {
  addMember,
  archiveMember,
  createGroup,
} from "@/services/group-service";
import { recordSettlement } from "@/services/settle-service";
import { createTestDb } from "../helpers/db";
import { setupArchivedLeftover } from "../helpers/scenarios";

let db: Db;

beforeEach(() => {
  db = createTestDb();
});

describe("getGroupBalances", () => {
  it("returns every active member and the balances sum to zero", () => {
    const group = createGroup(db, { name: "Housemates", currency: "JPY" });
    const alice = addMember(db, group.id, "Alice");
    const bob = addMember(db, group.id, "Bob");
    addMember(db, group.id, "Carol");
    addExpense(db, {
      groupId: group.id,
      paidBy: alice.id,
      amountMinor: 1000,
      note: "",
      spentOn: "2026-11-05",
      participantIds: [alice.id, bob.id],
    });

    const balances = getGroupBalances(db, group.id);
    expect(balances.map((b) => [b.name, b.balanceMinor])).toEqual([
      ["Alice", 500],
      ["Bob", -500],
      ["Carol", 0],
    ]);
    expect(balances.reduce((total, b) => total + b.balanceMinor, 0)).toBe(0);
  });

  it("hides archived members whose balance is zero", () => {
    const group = createGroup(db, { name: "Housemates", currency: "JPY" });
    addMember(db, group.id, "Alice");
    const bob = addMember(db, group.id, "Bob");
    archiveMember(db, group.id, bob.id);

    expect(getGroupBalances(db, group.id).map((b) => b.name)).toEqual([
      "Alice",
    ]);
  });

  it("keeps an archived member who still has a balance", () => {
    const s = setupArchivedLeftover(db);

    const balances = getGroupBalances(db, s.group.id);
    expect(balances.map((b) => [b.name, b.balanceMinor])).toEqual([
      ["Alice", -500],
      ["Bob", 500],
    ]);

    recordSettlement(db, {
      groupId: s.group.id,
      fromMember: s.alice.id,
      toMember: s.bob.id,
      amountMinor: 500,
    });
    expect(getGroupBalances(db, s.group.id).map((b) => b.name)).toEqual([
      "Alice",
    ]);
  });

  it("throws NotFoundError for an unknown group", () => {
    expect(() => getGroupBalances(db, "nope")).toThrow(NotFoundError);
  });
});
