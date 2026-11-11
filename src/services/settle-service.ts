import type { Db } from "../db/connection";
import { minimizeTransfers, type Transfer } from "../domain/minimze-transfers";
import { listBalances } from "../repos/balances";
import { findGroup } from "../repos/groups";
import { findMember } from "../repos/members";
import { findSettlement, insertSettlement } from "../repos/settlements";
import type { Settlement } from "../types";
import { NotFoundError, ValidationError } from "./errors";

export type RecordSettlementInput = {
  groupId: string;
  fromMember: number;
  toMember: number;
  amountMinor: number;
};

export function suggestSettlements(db: Db, groupId: string): Transfer[] {
  if (!findGroup(db, groupId)) throw new NotFoundError("Group not found");

  return minimizeTransfers(
    listBalances(db, groupId).map((b) => ({
      memberId: b.memberId,
      balanceMinor: b.balanceMinor,
    })),
  );
}

export function recordSettlement(
  db: Db,
  input: RecordSettlementInput,
): Settlement {
  return db.transaction((): Settlement => {
    if (!findGroup(db, input.groupId))
      throw new NotFoundError("Group not found");

    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new ValidationError("Amount must be a positive whole number");
    }
    if (input.fromMember === input.toMember) {
      throw new ValidationError("A member cannot pay themselves");
    }

    const from = findMember(db, input.fromMember);
    const to = findMember(db, input.toMember);
    if (
      !from ||
      !to ||
      from.groupId !== input.groupId ||
      to.groupId !== input.groupId
    ) {
      throw new ValidationError("Both members must belong to this group");
    }

    const id = insertSettlement(db, input);
    const settlement = findSettlement(db, id);
    if (!settlement) throw new Error("Settlement missing right after insert");
    return settlement;
  })();
}
