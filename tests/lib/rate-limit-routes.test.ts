import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as download } from "@/app/g/[groupId]/export/route";
import { GET as health } from "@/app/api/health/route";
import { checkRateLimit } from "@/lib/rate-limit-policy";
import { resetRateLimiters } from "../helpers/rate-limit";

const mocks = vi.hoisted(() => ({
  getAppDb: vi.fn(), connection: vi.fn(), exportExpensesCsv: vi.fn(), checkHealth: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getAppDb: mocks.getAppDb }));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("@/services/export-service", () => ({ exportExpensesCsv: mocks.exportExpensesCsv }));
vi.mock("@/services/health-service", () => ({ checkHealth: mocks.checkHealth }));

const ip = "192.0.2.1";
const db = {};
beforeEach(() => {
  resetRateLimiters();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(0);
  mocks.connection.mockResolvedValue(undefined);
  mocks.getAppDb.mockReturnValue(db);
  mocks.exportExpensesCsv.mockReturnValue({ filename: "trip-expenses.csv", content: "Date,Note\r\n" });
  mocks.checkHealth.mockReturnValue({ ok: true, schemaVersion: 2 });
});
afterEach(() => { resetRateLimiters(); vi.useRealTimers(); });

function request(id = "abc123_XYZ90", address: string | null = ip, forwarded = "203.0.113.1") {
  const headers = new Headers({ "x-forwarded-for": forwarded });
  if (address !== null) headers.set("x-real-ip", address);
  return download(new Request(`https://example.test/g/${id}/export?archived=1`, { headers }), {
    params: Promise.resolve({ groupId: id }),
  });
}

async function expectBlocked(response: Response, seconds: number) {
  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe(String(seconds));
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Content-Disposition")).toBeNull();
  expect(await response.text()).toBe(
    `Too many requests. Try again in ${seconds} ${seconds === 1 ? "second" : "seconds"}.`,
  );
  expect(mocks.getAppDb).not.toHaveBeenCalled();
  expect(mocks.exportExpensesCsv).not.toHaveBeenCalled();
}

describe("rate limiting at route boundaries", () => {
  it("allows ten downloads across groups, rejects the next before validation/DB access, and resets", async () => {
    for (let i = 0; i < 10; i++) {
      const id = i % 2 ? "abc123_XYZ90" : "def456_UVW78";
      expect((await request(id)).status).toBe(200);
      expect(mocks.exportExpensesCsv).toHaveBeenLastCalledWith(db, id, { includeArchived: true });
    }
    expect(mocks.exportExpensesCsv).toHaveBeenCalledTimes(10);
    vi.clearAllMocks();
    await expectBlocked(await request("invalid"), 60);
    vi.setSystemTime(59_999);
    await expectBlocked(await request(), 1);
    vi.setSystemTime(60_000);
    expect((await request()).status).toBe(200);
    expect(mocks.exportExpensesCsv).toHaveBeenCalledOnce();
  });

  it("uses X-Real-IP, ignores spoofed forwarding headers, and isolates different clients", async () => {
    for (let i = 0; i < 10; i++) expect((await request(undefined, ip, `198.51.100.${i + 1}`)).status).toBe(200);
    vi.clearAllMocks();
    await expectBlocked(await request(undefined, ip, "198.51.100.100"), 60);
    expect((await request(undefined, "192.0.2.2")).status).toBe(200);
  });

  it("shares one CSV budget for missing or malformed IPs", async () => {
    for (let i = 0; i < 10; i++) await request(undefined, null);
    vi.clearAllMocks();
    await expectBlocked(await request(undefined, "bad-ip"), 60);
  });

  it("waits for connection before consuming a budget or opening the database", async () => {
    let connect!: () => void;
    mocks.connection.mockReturnValue(new Promise<void>((resolve) => { connect = resolve; }));
    const pending = request();
    expect(Object.hasOwn(globalThis, "__expenseRateLimiters")).toBe(false);
    expect(mocks.getAppDb).not.toHaveBeenCalled();
    connect();
    expect((await pending).status).toBe(200);
  });

  it("propagates request-time control flow before rate limiting or database access", async () => {
    const signal = new Error("Next.js request-time control flow");
    mocks.connection.mockRejectedValue(signal);
    await expect(request()).rejects.toBe(signal);
    expect(Object.hasOwn(globalThis, "__expenseRateLimiters")).toBe(false);
    expect(mocks.getAppDb).not.toHaveBeenCalled();
    expect(mocks.exportExpensesCsv).not.toHaveBeenCalled();
  });

  it("keeps health checks available when all request budgets are exhausted", async () => {
    for (let i = 0; i < 60; i++) checkRateLimit("createGroup", `client-${i}`);
    for (let i = 0; i < 60; i++) checkRateLimit("write", "unknown");
    for (let i = 0; i < 10; i++) checkRateLimit("csv", "unknown");
    for (let i = 0; i < 70; i++) {
      const response = await health();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "ok", schemaVersion: 2 });
    }
    expect(mocks.checkHealth).toHaveBeenCalledTimes(70);
    expect(mocks.exportExpensesCsv).not.toHaveBeenCalled();
  });
});
