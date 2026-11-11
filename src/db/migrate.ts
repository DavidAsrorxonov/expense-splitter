import fs from "node:fs";
import path from "node:path";
import type { Db } from "./connection";

const DEFAULT_DIR = path.join(process.cwd(), "src/db/migrations");

export function migrate(db: Db, dir: string = DEFAULT_DIR): number {
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .map((file) => ({ file, version: parseInt(file, 10) }))
    .sort((a, b) => a.version - b.version);

  const unique = new Set(files.map((f) => f.version));
  if (unique.size !== files.length) {
    throw new Error("Duplicate migration version numbers");
  }

  const current = db.pragma("user_version", { simple: true }) as number;

  for (const { file, version } of files) {
    if (version <= current) continue;

    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${version}`);
    })();
  }

  return db.pragma("user_version", { simple: true }) as number;
}
