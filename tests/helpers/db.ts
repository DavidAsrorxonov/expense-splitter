import { openDatabase, type Db } from "@/db/connection";
import { migrate } from "@/db/migrate";

export function createTestDb(): Db {
  const db = openDatabase(":memory:");
  migrate(db);
  return db;
}
