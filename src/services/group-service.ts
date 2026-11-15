import { nanoid } from "nanoid";
import type { Db } from "../db/connection";
import { isCurrencyCode } from "../domain/currency";
import { listBalances } from "../repos/balances";
import { findGroup, insertGroup, countGroups } from "../repos/groups";
import {
  archiveMember as archiveMemberRow,
  countMembers,
  findMember,
  insertMember,
  listMembers,
} from "../repos/members";
import type { Group, Member } from "../types";
import { NotFoundError, ValidationError } from "./errors";
import { DEFAULT_LIMITS, type Limits } from "../domain/limits";

export function createGroup(
  db: Db,
  input: { name: string; currency: string },
  limits: Limits = DEFAULT_LIMITS,
): Group {
  return db.transaction((): Group => {
    const name = input.name.trim();

    if (!name) {
      throw new ValidationError("Group name is required");
    }

    if (name.length > limits.maxNameLength) {
      throw new ValidationError(
        `Group name must be ${limits.maxNameLength} characters or fewer.`,
      );
    }

    if (!isCurrencyCode(input.currency)) {
      throw new ValidationError("Unsupported currency");
    }

    if (countGroups(db) >= limits.maxGroups) {
      throw new ValidationError("New groups can't be created right now.");
    }

    const id = nanoid(12);
    insertGroup(db, { id, name, currency: input.currency });
    return getGroup(db, id);
  })();
}

export function getGroup(db: Db, id: string): Group {
  const group = findGroup(db, id);
  if (!group) throw new NotFoundError("Group not found");
  return group;
}

export function addMember(
  db: Db,
  groupId: string,
  name: string,
  limits: Limits = DEFAULT_LIMITS,
): Member {
  return db.transaction((): Member => {
    getGroup(db, groupId);

    const trimmed = name.trim();
    if (!trimmed) throw new ValidationError("Member name is required");

    if (trimmed.length > limits.maxNameLength) {
      throw new ValidationError(
        `Member name must be ${limits.maxNameLength} characters or fewer.`,
      );
    }

    if (listMembers(db, groupId).some((m) => m.name === trimmed)) {
      throw new ValidationError(`"${trimmed}" is already in this group`);
    }

    if (countMembers(db, groupId) >= limits.maxMembersPerGroup) {
      throw new ValidationError(
        `This group has reached the limit of ${limits.maxMembersPerGroup} members.`,
      );
    }

    const member = findMember(db, insertMember(db, groupId, trimmed));
    if (!member) throw new Error("Member missing right after insert");
    return member;
  })();
}

export function archiveMember(db: Db, groupId: string, memberId: number): void {
  db.transaction(() => {
    const member = findMember(db, memberId);
    if (!member || member.groupId !== groupId) {
      throw new NotFoundError("Member not found");
    }

    const balance = listBalances(db, groupId).find(
      (b) => b.memberId === memberId,
    );
    if (balance && balance.balanceMinor !== 0) {
      throw new ValidationError(
        "Settle this member's balance before archiving them",
      );
    }

    if (!archiveMemberRow(db, memberId)) {
      throw new ValidationError("Member is already archived");
    }
  })();
}
