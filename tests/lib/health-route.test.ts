import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/connection";
import { GET } from "@/app/api/health/route";
import { createTestDb } from "../helpers/db";

const mocks = vi.hoisted(() => ({ getAppDb: vi.fn(), connection: vi.fn() }));
vi.mock("@/lib/db", () => ({ getAppDb: mocks.getAppDb }));
vi.mock("next/server", () => ({ connection: mocks.connection }));

let db: Db;
beforeEach(() => {
  vi.resetAllMocks();
  db = createTestDb();
  mocks.getAppDb.mockReturnValue(db);
  mocks.connection.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  if (db.open) db.close();
  vi.restoreAllMocks();
});

async function expectUnavailable(response: Response) {
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Content-Type")).toContain("application/json");
  expect(await response.json()).toEqual({ status: "error" });
}

describe("GET /api/health", () => {
  it("returns uncached JSON with the current schema version", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(await response.json()).toEqual({
      status: "ok", schemaVersion: db.pragma("user_version", { simple: true }),
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("returns 503 when the database health check fails", async () => {
    db.close();
    await expectUnavailable(await GET());
  });

  it.each([
    "DATABASE_PATH must be set in production (point it at the mounted volume, for example /data/app.db)",
    "SQLITE_CANTOPEN: unable to open /private/database.db",
    "Migration 003 failed: internal SQL details",
  ])("returns generic 503 and logs initialization failure: %s", async (message) => {
    const error = new Error(message);
    mocks.getAppDb.mockImplementation(() => { throw error; });
    await expectUnavailable(await GET());
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      "[health] Database initialization or check failed", error,
    );
  });

  it("waits for request-time connection before opening the database", async () => {
    let connect!: () => void;
    mocks.connection.mockReturnValue(new Promise<void>((resolve) => { connect = resolve; }));
    const response = GET();
    expect(mocks.getAppDb).not.toHaveBeenCalled();
    connect();
    expect((await response).status).toBe(200);
    expect(mocks.getAppDb).toHaveBeenCalledTimes(1);
  });

  it("does not turn Next.js connection control flow into a database error", async () => {
    const controlFlow = new Error("Next.js request-time control flow");
    mocks.connection.mockRejectedValue(controlFlow);
    await expect(GET()).rejects.toBe(controlFlow);
    expect(mocks.getAppDb).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});
