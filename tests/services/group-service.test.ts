import { describe, it, expect, beforeEach } from "vitest";
import type { Db } from "@/db/connection";
import { findMember } from "@/repos/members";
import { NotFoundError, ValidationError } from "@/services/errors";
import {
  addMember,
  archiveMember,
  createGroup,
  getGroup,
} from "@/services/group-service";
import type { Group } from "@/types";
import { createTestDb } from "../helpers/db";
import { addExpense } from "@/services/expense-service";

let db: Db;
let group: Group;

beforeEach(() => {
  db = createTestDb();
  group = createGroup(db, { name: "Housemates", currency: "JPY" });
});

describe("createGroup", () => {
  it("creates a group with a generated id and trimmed name", () => {
    const created = createGroup(db, { name: "  Trip  ", currency: "USD" });
    expect(created.id).toHaveLength(12);
    expect(created.name).toBe("Trip");
    expect(created.currency).toBe("USD");
    expect(getGroup(db, created.id)).toEqual(created);
  });

  it("rejects a blank name", () => {
    expect(() => createGroup(db, { name: "   ", currency: "JPY" })).toThrow(
      ValidationError,
    );
  });

  it("rejects an unsupported currency", () => {
    expect(() => createGroup(db, { name: "Trip", currency: "XXX" })).toThrow(
      ValidationError,
    );
  });
});

describe("getGroup", () => {
  it("throws NotFoundError for an unknown group", () => {
    expect(() => getGroup(db, "nope")).toThrow(NotFoundError);
  });
});

describe("addMember", () => {
  it("adds a member with a trimmed name", () => {
    const member = addMember(db, group.id, "  Alice ");
    expect(member.name).toBe("Alice");
    expect(member.groupId).toBe(group.id);
    expect(member.archivedAt).toBeNull();
  });

  it("rejects a blank name", () => {
    expect(() => addMember(db, group.id, "  ")).toThrow(ValidationError);
  });

  it("rejects a duplicate name among active members", () => {
    addMember(db, group.id, "Alice");
    expect(() => addMember(db, group.id, "Alice")).toThrow(ValidationError);
  });

  it("allows the same name in another group or after archiving", () => {
    const first = addMember(db, group.id, "Alice");
    const other = createGroup(db, { name: "Other", currency: "JPY" });
    expect(() => addMember(db, other.id, "Alice")).not.toThrow();

    archiveMember(db, group.id, first.id);
    expect(() => addMember(db, group.id, "Alice")).not.toThrow();
  });

  it("throws NotFoundError for an unknown group", () => {
    expect(() => addMember(db, "nope", "Alice")).toThrow(NotFoundError);
  });
});

describe("archiveMember", () => {
  it("archives a member whose balance is zero", () => {
    const alice = addMember(db, group.id, "Alice");
    archiveMember(db, group.id, alice.id);
    expect(findMember(db, alice.id)?.archivedAt).not.toBeNull();
  });

  it("refuses to archive a member with a non-zero balance", () => {
    const alice = addMember(db, group.id, "Alice");
    const bob = addMember(db, group.id, "Bob");
    addExpense(db, {
      groupId: group.id,
      paidBy: alice.id,
      amountMinor: 1000,
      note: "",
      spentOn: "2026-11-05",
      participantIds: [alice.id, bob.id],
    });

    expect(() => archiveMember(db, group.id, bob.id)).toThrow(ValidationError);
    expect(findMember(db, bob.id)?.archivedAt).toBeNull();
  });

  it("throws NotFoundError when the member is not in the group", () => {
    const other = createGroup(db, { name: "Other", currency: "JPY" });
    const zed = addMember(db, other.id, "Zed");

    expect(() => archiveMember(db, group.id, zed.id)).toThrow(NotFoundError);
    expect(() => archiveMember(db, group.id, 999)).toThrow(NotFoundError);
  });
});
