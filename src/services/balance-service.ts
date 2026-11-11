import type { Db } from "@/db/connection";
import { listBalances } from "../repos/balances";
import { findGroup } from "../repos/groups";
import type { MemberBalance } from "../types";
import { NotFoundError } from "./errors";

export function getGroupBalances(db: Db, groupId: string): MemberBalance[] {
  if (!findGroup(db, groupId)) throw new NotFoundError("Group not found");

  return listBalances(db, groupId).filter(
    (b) => b.archivedAt === null || b.balanceMinor !== 0,
  );
}
