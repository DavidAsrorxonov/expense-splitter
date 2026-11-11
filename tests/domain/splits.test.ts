import { describe, it, expect } from "vitest";
import { splitEqually } from "@/domain/splits";

const sum = (shares: { shareMinor: number }[]) =>
  shares.reduce((total, s) => total + s.shareMinor, 0);

describe("splitEqually", () => {
  it("splits evenly when divisible", () => {
    expect(splitEqually(3000, [1, 2, 3]).map((s) => s.shareMinor)).toEqual([
      1000, 1000, 1000,
    ]);
  });

  it("gives leftover units to the lowest member IDs", () => {
    expect(splitEqually(1000, [3, 1, 2])).toEqual([
      { memberId: 1, shareMinor: 334 },
      { memberId: 2, shareMinor: 333 },
      { memberId: 3, shareMinor: 333 },
    ]);
  });

  it("handles an amount smaller than the number of participants", () => {
    const shares = splitEqually(2, [1, 2, 3, 4, 5]);
    expect(shares.map((s) => s.shareMinor)).toEqual([1, 1, 0, 0, 0]);
  });

  it("gives everything to a single participant", () => {
    expect(splitEqually(999, [7])).toEqual([{ memberId: 7, shareMinor: 999 }]);
  });

  it("rejects invalid input", () => {
    expect(() => splitEqually(0, [1])).toThrow();
    expect(() => splitEqually(-5, [1])).toThrow();
    expect(() => splitEqually(10.5, [1])).toThrow();
    expect(() => splitEqually(100, [])).toThrow();
    expect(() => splitEqually(100, [1, 1])).toThrow();
  });

  it("always sums exactly to the amount and never differs by more than 1", () => {
    let seed = 42;
    const next = () => (seed = (seed * 1664525 + 1013904223) % 4294967296);

    for (let i = 0; i < 500; i++) {
      const amount = (next() % 100000) + 1;
      const people = (next() % 10) + 1;
      const ids = Array.from({ length: people }, (_, k) => k + 1);

      const shares = splitEqually(amount, ids);
      const values = shares.map((s) => s.shareMinor);

      expect(sum(shares)).toBe(amount);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    }
  });
});
