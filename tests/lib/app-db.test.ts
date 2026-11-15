import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), migrate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/connection", () => ({ getDb: mocks.getDb }));
vi.mock("@/db/migrate", () => ({ migrate: mocks.migrate }));

const appGlobals = globalThis as unknown as {
  __expenseAppMigrated?: boolean;
  __expenseAppDbLogged?: boolean;
};

function clearAppGlobals() {
  delete appGlobals.__expenseAppMigrated;
  delete appGlobals.__expenseAppDbLogged;
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  clearAppGlobals();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DATABASE_PATH", undefined);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  clearAppGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getAppDb safeguards", () => {
  it("can be imported without a production path, but rejects first access before opening a database", async () => {
    const { getAppDb } = await import("@/lib/db");
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.migrate).not.toHaveBeenCalled();
    expect(() => getAppDb()).toThrow("DATABASE_PATH must be set in production");
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it("passes the resolved path and logs/migrates once across module reloads", async () => {
    vi.stubEnv("DATABASE_PATH", " /data/app.db ");
    const db = { name: "/data/app.db" };
    mocks.getDb.mockReturnValue(db);
    const { getAppDb } = await import("@/lib/db");
    expect(getAppDb()).toBe(db);
    expect(getAppDb()).toBe(db);
    vi.resetModules();
    expect((await import("@/lib/db")).getAppDb()).toBe(db);
    expect(mocks.getDb).toHaveBeenCalledWith("/data/app.db");
    expect(mocks.migrate).toHaveBeenCalledExactlyOnceWith(db);
    expect(console.log).toHaveBeenCalledExactlyOnceWith("[db] using /data/app.db");
  });

  it("leaves a failed migration retryable without repeating the path log", async () => {
    vi.stubEnv("DATABASE_PATH", "/data/app.db");
    mocks.getDb.mockReturnValue({ name: "/data/app.db" });
    mocks.migrate.mockImplementationOnce(() => { throw new Error("Migration failed"); });
    const { getAppDb } = await import("@/lib/db");
    expect(() => getAppDb()).toThrow("Migration failed");
    expect(() => getAppDb()).not.toThrow();
    expect(mocks.migrate).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenCalledTimes(1);
  });
});
