import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/connection";
import { checkHealth } from "@/services/health-service";
import { createTestDb } from "../helpers/db";

let db: Db;
beforeEach(() => { db = createTestDb(); });
afterEach(() => { if (db.open) db.close(); });

describe("checkHealth", () => {
  it("reports the highest applied migration for a migrated database", () => {
    const highestMigration = Math.max(...fs.readdirSync(path.join(process.cwd(), "src/db/migrations"))
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .map((file) => Number.parseInt(file, 10)));

    expect(checkHealth(db)).toEqual({ ok: true, schemaVersion: highestMigration });
  });

  it("returns an unhealthy result instead of throwing for a closed database", () => {
    db.close();
    expect(checkHealth(db)).toEqual({ ok: false });
  });
});
