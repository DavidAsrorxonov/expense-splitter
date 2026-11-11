import { describe, it, expect, beforeEach } from "vitest";
import type { Db } from "@/db/connection";
import { listSettlements } from "@/repos/settlements";
import { getGroupBalances } from "@/services/balance-service";
import { NotFoundError, ValidationError } from "@/services/errors";
import { addExpense } from "@/services/expense-service";
import { addMember, createGroup } from "@/services/group-service";
import {
  recordSettlement,
  suggestSettlements,
} from "@/services/settle-service";
import type { Group, Member } from "@/types";
import { createTestDb } from "../helpers/db";
import { setupArchivedLeftover } from "../helpers/scenarios";

let db: Db;
let group: Group;
let alice: Member;
let bob: Member;
let carol: Member;

beforeEach(() => {
  db = createTestDb();
  group = createGroup(db, { name: "Housemates", currency: "JPY" });
  alice = addMember(db, group.id, "Alice");
  bob = addMember(db, group.id, "Bob");
  carol = addMember(db, group.id, "Carol");
});

function spend(paidBy: Member, amountMinor: number, participants: Member[]) {
  addExpense(db, {
    groupId: group.id,
    paidBy: paidBy.id,
    amountMinor,
    note: "",
    spentOn: "2026-11-05",
    participantIds: participants.map((p) => p.id),
  });
}

const balanceValues = () =>
  getGroupBalances(db, group.id).map((b) => b.balanceMinor);

describe("suggestSettlements", () => {
  it("suggests the payments that settle the group", () => {
    spend(alice, 3000, [alice, bob, carol]);

    expect(suggestSettlements(db, group.id)).toEqual([
      { from: bob.id, to: alice.id, amountMinor: 1000 },
      { from: carol.id, to: alice.id, amountMinor: 1000 },
    ]);
  });

  it("suggests nothing when nobody owes anything", () => {
    expect(suggestSettlements(db, group.id)).toEqual([]);
  });

  it("throws NotFoundError for an unknown group", () => {
    expect(() => suggestSettlements(db, "nope")).toThrow(NotFoundError);
  });
});

describe("recordSettlement", () => {
  it("stores the settlement and moves balances toward zero", () => {
    spend(alice, 3000, [alice, bob, carol]);

    const settlement = recordSettlement(db, {
      groupId: group.id,
      fromMember: bob.id,
      toMember: alice.id,
      amountMinor: 1000,
    });

    expect(settlement).toEqual({
      id: expect.any(Number),
      groupId: group.id,
      fromMember: bob.id,
      toMember: alice.id,
      amountMinor: 1000,
      createdAt: expect.any(String),
    });
    expect(balanceValues()).toEqual([1000, 0, -1000]);
  });

  it("rejects invalid amounts and writes nothing", () => {
    for (const amountMinor of [0, -5, 10.5, NaN]) {
      expect(() =>
        recordSettlement(db, {
          groupId: group.id,
          fromMember: bob.id,
          toMember: alice.id,
          amountMinor,
        }),
      ).toThrow(ValidationError);
    }
    expect(listSettlements(db, group.id)).toEqual([]);
  });

  it("rejects a member paying themselves", () => {
    expect(() =>
      recordSettlement(db, {
        groupId: group.id,
        fromMember: bob.id,
        toMember: bob.id,
        amountMinor: 100,
      }),
    ).toThrow(ValidationError);
  });

  it("rejects members that do not belong to the group", () => {
    const other = createGroup(db, { name: "Other", currency: "JPY" });
    const zed = addMember(db, other.id, "Zed");

    for (const stranger of [zed.id, 999]) {
      expect(() =>
        recordSettlement(db, {
          groupId: group.id,
          fromMember: stranger,
          toMember: alice.id,
          amountMinor: 100,
        }),
      ).toThrow(ValidationError);
    }
    expect(listSettlements(db, group.id)).toEqual([]);
  });

  it("throws NotFoundError for an unknown group", () => {
    expect(() =>
      recordSettlement(db, {
        groupId: "nope",
        fromMember: bob.id,
        toMember: alice.id,
        amountMinor: 100,
      }),
    ).toThrow(NotFoundError);
  });
});

describe("settling up end to end", () => {
  it("drives every balance to zero when all suggested payments are recorded", () => {
    spend(alice, 3000, [alice, bob, carol]);
    spend(bob, 9100, [alice, bob, carol]);

    const transfers = suggestSettlements(db, group.id);
    expect(transfers.length).toBeLessThanOrEqual(2);

    for (const t of transfers) {
      recordSettlement(db, {
        groupId: group.id,
        fromMember: t.from,
        toMember: t.to,
        amountMinor: t.amountMinor,
      });
    }

    expect(balanceValues()).toEqual([0, 0, 0]);
    expect(suggestSettlements(db, group.id)).toEqual([]);
  });

  it("can settle a leftover balance with an archived member", () => {
    const s = setupArchivedLeftover(db);

    expect(suggestSettlements(db, s.group.id)).toEqual([
      { from: s.alice.id, to: s.bob.id, amountMinor: 500 },
    ]);

    recordSettlement(db, {
      groupId: s.group.id,
      fromMember: s.alice.id,
      toMember: s.bob.id,
      amountMinor: 500,
    });

    expect(
      getGroupBalances(db, s.group.id).map((b) => [b.name, b.balanceMinor]),
    ).toEqual([["Alice", 0]]);
  });
});
