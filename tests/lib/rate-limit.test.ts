import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("fixed-window rate limiter", () => {
  it("allows exactly max requests and does not extend the window on rejection", () => {
    let time = 100;
    const limiter = createRateLimiter({ windowMs: 2500, max: 2, now: () => time });
    expect(limiter.check("a")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 3 });
    time = 1600;
    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 1 });
    time = 2599;
    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 1 });
    time = 2600;
    expect(limiter.check("a")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("keeps independent keys and independent limiter instances", () => {
    const options = { windowMs: 1000, max: 1, now: () => 0 };
    const first = createRateLimiter(options);
    const second = createRateLimiter(options);
    expect(first.check("a").allowed).toBe(true);
    expect(first.check("a").allowed).toBe(false);
    expect(first.check("b").allowed).toBe(true);
    expect(second.check("a").allowed).toBe(true);
  });

  it("evicts the oldest key at capacity, even if it was recently checked", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, maxKeys: 2, now: () => 0 });
    limiter.check("a");
    limiter.check("b");
    expect(limiter.check("a").allowed).toBe(false);
    limiter.check("c");
    expect(limiter.check("b").allowed).toBe(false);
    expect(limiter.check("c").allowed).toBe(false);
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("prunes expired keys before evicting a live key", () => {
    let time = 0;
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, maxKeys: 2, now: () => time });
    limiter.check("expired");
    time = 500;
    limiter.check("live");
    time = 1000;
    limiter.check("new");
    expect(limiter.check("live").allowed).toBe(false);
    expect(limiter.check("new").allowed).toBe(false);
  });

  it("keeps the newest keys under sustained churn, including an empty-string key", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, maxKeys: 2, now: () => 0 });
    limiter.check("");
    for (let i = 0; i < 100; i++) expect(limiter.check(String(i)).allowed).toBe(true);
    expect(limiter.check("98").allowed).toBe(false);
    expect(limiter.check("99").allowed).toBe(false);
    expect(limiter.check("").allowed).toBe(true);
  });

  it("defaults to a maximum of 10,000 keys", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => 0 });
    for (let i = 0; i <= 10_000; i++) limiter.check(String(i));
    expect(limiter.check("1").allowed).toBe(false);
    expect(limiter.check("10000").allowed).toBe(false);
    expect(limiter.check("0").allowed).toBe(true);
  });

  it.each(["windowMs", "max", "maxKeys"] as const)("rejects invalid %s configuration", (field) => {
    for (const invalid of [0, -1, 1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => createRateLimiter({ windowMs: 1000, max: 2, maxKeys: 3, [field]: invalid }))
        .toThrow(`${field} must be a positive safe integer.`);
    }
  });
});
