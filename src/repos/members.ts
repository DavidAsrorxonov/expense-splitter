import type { Db } from "../db/connection";
import type { Member } from "../types";

type MemberRow = {
  id: number;
  group_id: string;
  name: string;
  archived_at: string | null;
};

const toMember = (r: MemberRow): Member => ({
  id: r.id,
  groupId: r.group_id,
  name: r.name,
  archivedAt: r.archived_at,
});

export function insertMember(db: Db, groupId: string, name: string): number {
  const result = db
    .prepare("INSERT INTO members (group_id, name) VALUES (?, ?)")
    .run(groupId, name);
  return Number(result.lastInsertRowid);
}

export function findMember(db: Db, id: number): Member | undefined {
  const row = db
    .prepare("SELECT id, group_id, name, archived_at FROM members WHERE id = ?")
    .get(id) as MemberRow | undefined;
  return row && toMember(row);
}

export function listMembers(
  db: Db,
  groupId: string,
  includeArchived = false,
): Member[] {
  const rows = db
    .prepare(
      `SELECT id, group_id, name, archived_at FROM members
       WHERE group_id = ? AND (? = 1 OR archived_at IS NULL)
       ORDER BY id`,
    )
    .all(groupId, includeArchived ? 1 : 0) as MemberRow[];
  return rows.map(toMember);
}

/** Returns true if a member was archived, false if not found or already archived. */
export function archiveMember(db: Db, id: number): boolean {
  const result = db
    .prepare(
      `UPDATE members SET archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? AND archived_at IS NULL`,
    )
    .run(id);
  return result.changes > 0;
}

/** Returns true only when an archived member was restored. */
export function restoreMember(db: Db, id: number): boolean {
  const result = db
    .prepare(
      `UPDATE members SET archived_at = NULL WHERE id = ? AND archived_at IS NOT NULL`,
    )
    .run(id);

  return result.changes > 0;
}

export function listArchivedMembers(db: Db, groupId: string): Member[] {
  const rows = db
    .prepare(
      `SELECT id, group_id, name, archived_at FROM members
     WHERE group_id = ? AND archived_at IS NOT NULL ORDER BY id`,
    )
    .all(groupId) as MemberRow[];

  return rows.map(toMember);
}
