import "server-only";

import { getDb } from "@/db/connection";
import { migrate } from "@/db/migrate";
import { resolveDatabasePath } from "./db-path";

const globalForAppDb = globalThis as unknown as {
  __expenseAppMigrated?: boolean;
  __expenseAppDbLogged?: boolean;
};

export function getAppDb() {
  const db = getDb(resolveDatabasePath(process.env));
  if (!globalForAppDb.__expenseAppDbLogged) {
    console.log(`[db] using ${db.name}`);
    globalForAppDb.__expenseAppDbLogged = true;
  }
  if (!globalForAppDb.__expenseAppMigrated) {
    migrate(db);
    // A failed migration must remain retryable on the next request.
    globalForAppDb.__expenseAppMigrated = true;
  }
  return db;
}
