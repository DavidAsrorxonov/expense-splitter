import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/db/connection";

let directory: string;
let filename: string;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "expense-seed-guard-"));
  filename = path.join(directory, "app.db");
});
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

function runSeed(nodeEnv: "development" | "production") {
  return spawnSync(process.execPath, ["--import", "tsx", "scripts/seed.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: nodeEnv, DATABASE_PATH: filename },
    encoding: "utf8",
    timeout: 15_000,
  });
}

describe("seed production guard", () => {
  it("exits non-zero and leaves an existing database and sidecars byte-for-byte unchanged", () => {
    const db = openDatabase(filename);
    db.exec("CREATE TABLE sentinel (value TEXT); INSERT INTO sentinel VALUES ('keep me')");
    db.close();
    // Sentinel sidecars detect any attempt to remove or open the target files.
    fs.writeFileSync(filename + "-wal", "preserve WAL");
    fs.writeFileSync(filename + "-shm", "preserve SHM");
    const files = [filename, filename + "-wal", filename + "-shm"];
    const before = files.map((file) => fs.readFileSync(file));

    const result = runSeed("production");

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Refusing to seed in production");
    files.forEach((file, index) => expect(fs.readFileSync(file)).toEqual(before[index]));
  });

  it("does not create a missing target in production", () => {
    const result = runSeed("production");
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Refusing to seed in production");
    expect(fs.readdirSync(directory)).toEqual([]);
  });

  it("still seeds an explicitly selected disposable database in development", () => {
    const result = runSeed("development");
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Seeded group:");
    const db = openDatabase(filename);
    try {
      expect(db.prepare("SELECT COUNT(*) AS count FROM expenses").get()).toEqual({ count: 3 });
      expect(db.prepare("SELECT COUNT(*) AS count FROM groups").get()).toEqual({ count: 1 });
    } finally {
      db.close();
    }
  });
});
