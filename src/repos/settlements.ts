import type { Db } from "../db/connection";
import type { Settlement } from "../types";

type SettlementRow = {
  id: number;
  group_id: string;
  from_member: number;
  to_member: number;
  amount_minor: number;
  created_at: string;
};

export function insertSettlement(
  db: Db,
  input: {
    groupId: string;
    fromMember: number;
    toMember: number;
    amountMinor: number;
  },
): number {
  const result = db
    .prepare(
      `INSERT INTO settlements (group_id, from_member, to_member, amount_minor)
       VALUES (?, ?, ?, ?)`,
    )
    .run(input.groupId, input.fromMember, input.toMember, input.amountMinor);
  return Number(result.lastInsertRowid);
}

export function listSettlements(db: Db, groupId: string): Settlement[] {
  const rows = db
    .prepare(
      `SELECT id, group_id, from_member, to_member, amount_minor, created_at
       FROM settlements WHERE group_id = ?
       ORDER BY created_at DESC, id DESC`,
    )
    .all(groupId) as SettlementRow[];
  return rows.map((r) => ({
    id: r.id,
    groupId: r.group_id,
    fromMember: r.from_member,
    toMember: r.to_member,
    amountMinor: r.amount_minor,
    createdAt: r.created_at,
  }));
}
