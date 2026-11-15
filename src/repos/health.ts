import type { Db } from "@/db/connection";

export function pingDatabase(db: Db): { schemaVersion: number } {
  db.prepare("SELECT 1").get();
  return {
    schemaVersion: db.pragma("user_version", { simple: true }) as number,
  };
}
