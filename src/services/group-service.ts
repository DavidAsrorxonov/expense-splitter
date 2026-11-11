import { nanoid } from "nanoid";
import type { Db } from "../db/connection";
import { isCurrencyCode } from "../domain/currency";
import { listBalances } from "../repos/balances";
import { findGroup, insertGroup } from "../repos/groups";
import {
  archiveMember as archiveMemberRow,
  findMember,
  insertMember,
  listMembers,
} from "../repos/members";
import type { Group, Member } from "../types";
import { NotFoundError, ValidationError } from "./errors";

export function createGroup(
  db: Db,
  input: { name: string; currency: string },
): Group {
  const name = input.name.trim();
  if (!name) throw new ValidationError("Group name is required");
  if (!isCurrencyCode(input.currency)) {
    throw new ValidationError("Unsupported currency");
  }

  const id = nanoid(12);
  insertGroup(db, { id, name, currency: input.currency });
  return getGroup(db, id);
}

export function getGroup(db: Db, id: string): Group {
  const group = findGroup(db, id);
  if (!group) throw new NotFoundError("Group not found");
  return group;
}

export function addMember(db: Db, groupId: string, name: string): Member {
  return db.transaction((): Member => {
    getGroup(db, groupId);

    const trimmed = name.trim();
    if (!trimmed) throw new ValidationError("Member name is required");
    if (listMembers(db, groupId).some((m) => m.name === trimmed)) {
      throw new ValidationError(`"${trimmed}" is already in this group`);
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
