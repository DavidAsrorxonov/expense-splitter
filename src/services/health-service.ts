import type { Db } from "@/db/connection";
import { pingDatabase } from "@/repos/health";

export function checkHealth(
  db: Db,
): { ok: true; schemaVersion: number } | { ok: false } {
  try {
    return { ok: true, ...pingDatabase(db) };
  } catch {
    return { ok: false };
  }
}
