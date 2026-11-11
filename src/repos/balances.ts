import type { Db } from "../db/connection";
import type { MemberBalance } from "../types";

/** Reads the member_balances view. Includes archived members; callers decide what to show. */
export function listBalances(db: Db, groupId: string): MemberBalance[] {
  const rows = db
    .prepare(
      `SELECT member_id, group_id, name, archived_at, balance_minor
       FROM member_balances WHERE group_id = ? ORDER BY member_id`,
    )
    .all(groupId) as {
    member_id: number;
    group_id: string;
    name: string;
    archived_at: string | null;
    balance_minor: number;
  }[];
  return rows.map((r) => ({
    memberId: r.member_id,
    groupId: r.group_id,
    name: r.name,
    archivedAt: r.archived_at,
    balanceMinor: r.balance_minor,
  }));
}
