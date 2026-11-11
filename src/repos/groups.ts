import { Db } from "@/db/connection";
import { Group } from "@/types";

type GroupRow = {
  id: string;
  name: string;
  currency: Group["currency"];
  created_at: string;
};

const toGroup = (r: GroupRow): Group => ({
  id: r.id,
  name: r.name,
  currency: r.currency,
  createdAt: r.created_at,
});

export function insertGroup(
  db: Db,
  input: { id: string; name: string; currency: Group["currency"] },
): void {
  db.prepare("INSERT INTO groups (id, name, currency) VALUES (?, ?, ?)").run(
    input.id,
    input.name,
    input.currency,
  );
}

export function findGroup(db: Db, id: string): Group | undefined {
  const row = db
    .prepare("SELECT id, name, currency, created_at FROM groups WHERE id = ?")
    .get(id) as GroupRow | undefined;
  return row && toGroup(row);
}
