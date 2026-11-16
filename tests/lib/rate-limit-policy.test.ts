import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, RATE_LIMIT_POLICY, rateLimitMessage } from "@/lib/rate-limit-policy";
import { resetRateLimiters } from "../helpers/rate-limit";

beforeEach(() => {
  resetRateLimiters();
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => { resetRateLimiters(); vi.useRealTimers(); });

describe("rate-limit policy", () => {
  it("uses the agreed production budgets", () => {
    expect(RATE_LIMIT_POLICY).toEqual({
      createGroupIp: { windowMs: 3_600_000, max: 5 },
      createGroupGlobal: { windowMs: 3_600_000, max: 60, maxKeys: 1 },
      write: { windowMs: 60_000, max: 60 },
      csv: { windowMs: 60_000, max: 10 },
    });
  });

  it("limits each IP to five group attempts and resets at one hour", () => {
    for (let i = 0; i < 5; i++) expect(checkRateLimit("createGroup", "a").allowed).toBe(true);
    expect(checkRateLimit("createGroup", "a")).toEqual({ allowed: false, retryAfterSeconds: 3600 });
    expect(checkRateLimit("createGroup", "b").allowed).toBe(true);
    vi.setSystemTime(3_599_999);
    expect(checkRateLimit("createGroup", "a").retryAfterSeconds).toBe(1);
    vi.setSystemTime(3_600_000);
    expect(checkRateLimit("createGroup", "a").allowed).toBe(true);
  });

  it("enforces the global group budget across different IPs", () => {
    for (let i = 0; i < 60; i++) expect(checkRateLimit("createGroup", String(i)).allowed).toBe(true);
    expect(checkRateLimit("createGroup", "new-ip")).toEqual({ allowed: false, retryAfterSeconds: 3600 });
    vi.setSystemTime(3_600_000);
    expect(checkRateLimit("createGroup", "new-ip").allowed).toBe(true);
  });

  it("does not let an already-blocked IP drain the global group allowance", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("createGroup", "blocked");
    for (let i = 0; i < 100; i++) expect(checkRateLimit("createGroup", "blocked").allowed).toBe(false);
    for (let i = 0; i < 55; i++) expect(checkRateLimit("createGroup", `other-${i}`).allowed).toBe(true);
    expect(checkRateLimit("createGroup", "one-more").allowed).toBe(false);
  });

  it("keeps writes and CSV separate, with their own minute windows", () => {
    for (let i = 0; i < 60; i++) expect(checkRateLimit("write", "a").allowed).toBe(true);
    expect(checkRateLimit("write", "a")).toEqual({ allowed: false, retryAfterSeconds: 60 });
    for (let i = 0; i < 10; i++) expect(checkRateLimit("csv", "a").allowed).toBe(true);
    expect(checkRateLimit("csv", "a").allowed).toBe(false);
    expect(checkRateLimit("createGroup", "a").allowed).toBe(true);
    expect(checkRateLimit("write", "b").allowed).toBe(true);
    vi.setSystemTime(60_000);
    expect(checkRateLimit("write", "a").allowed).toBe(true);
    expect(checkRateLimit("csv", "a").allowed).toBe(true);
  });

  it("shares state across module reloads", async () => {
    for (let i = 0; i < 5; i++) checkRateLimit("createGroup", "a");
    vi.resetModules();
    const reloaded = await import("@/lib/rate-limit-policy");
    expect(reloaded.checkRateLimit("createGroup", "a").allowed).toBe(false);
  });

  it("does not initialize limiter state just by importing the module", async () => {
    vi.resetModules();
    await import("@/lib/rate-limit-policy");
    expect(Object.hasOwn(globalThis, "__expenseRateLimiters")).toBe(false);
  });

  it.each([
    [0, "1 second"], [1, "1 second"], [1.1, "2 seconds"], [60, "60 seconds"],
  ])("formats the retry interval %s", (seconds, interval) => {
    expect(rateLimitMessage(seconds)).toBe(`Too many requests. Try again in ${interval}.`);
  });
});
