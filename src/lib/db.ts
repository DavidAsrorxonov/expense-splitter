import "server-only";

import { getDb } from "@/db/connection";
import { migrate } from "@/db/migrate";

const globalForAppDb = globalThis as unknown as {
  __expenseAppMigrated?: boolean;
};

export function getAppDb() {
  const db = getDb();
  if (!globalForAppDb.__expenseAppMigrated) {
    migrate(db);
    // A failed migration must remain retryable on the next request.
    globalForAppDb.__expenseAppMigrated = true;
  }
  return db;
}
