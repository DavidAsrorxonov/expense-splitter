import {
  Balance,
  minimizeTransfers,
  Transfer,
} from "@/domain/minimze-transfers";
import { describe, it, expect } from "vitest";

/** Applies transfers the same way the member_balances view does. */
function applyTransfers(balances: Balance[], transfers: Transfer[]): number[] {
  const map = new Map(balances.map((b) => [b.memberId, b.balanceMinor]));
  for (const t of transfers) {
    map.set(t.from, map.get(t.from)! + t.amountMinor); // payer owes less
    map.set(t.to, map.get(t.to)! - t.amountMinor); // receiver is owed less
  }
  return [...map.values()];
}

describe("minimizeTransfers", () => {
  it("returns no transfers when everyone is settled", () => {
    expect(minimizeTransfers([])).toEqual([]);
    expect(
      minimizeTransfers([
        { memberId: 1, balanceMinor: 0 },
        { memberId: 2, balanceMinor: 0 },
      ]),
    ).toEqual([]);
  });

  it("settles two people with one transfer", () => {
    expect(
      minimizeTransfers([
        { memberId: 1, balanceMinor: 500 },
        { memberId: 2, balanceMinor: -500 },
      ]),
    ).toEqual([{ from: 2, to: 1, amountMinor: 500 }]);
  });

  it("matches the seeded Housemates example", () => {
    expect(
      minimizeTransfers([
        { memberId: 1, balanceMinor: -34 },
        { memberId: 2, balanceMinor: 3067 },
        { memberId: 3, balanceMinor: -3033 },
      ]),
    ).toEqual([
      { from: 3, to: 2, amountMinor: 3033 },
      { from: 1, to: 2, amountMinor: 34 },
    ]);
  });

  it("handles many debtors and one creditor", () => {
    expect(
      minimizeTransfers([
        { memberId: 1, balanceMinor: 3000 },
        { memberId: 2, balanceMinor: -1000 },
        { memberId: 3, balanceMinor: -1200 },
        { memberId: 4, balanceMinor: -800 },
      ]),
    ).toEqual([
      { from: 3, to: 1, amountMinor: 1200 },
      { from: 2, to: 1, amountMinor: 1000 },
      { from: 4, to: 1, amountMinor: 800 },
    ]);
  });

  it("handles one debtor and many creditors", () => {
    expect(
      minimizeTransfers([
        { memberId: 1, balanceMinor: -3000 },
        { memberId: 2, balanceMinor: 1000 },
        { memberId: 3, balanceMinor: 2000 },
      ]),
    ).toEqual([
      { from: 1, to: 3, amountMinor: 2000 },
      { from: 1, to: 2, amountMinor: 1000 },
    ]);
  });

  it("rejects invalid input", () => {
    expect(() =>
      minimizeTransfers([
        { memberId: 1, balanceMinor: 100 },
        { memberId: 2, balanceMinor: -50 },
      ]),
    ).toThrow(/sum to zero/);
    expect(() =>
      minimizeTransfers([
        { memberId: 1, balanceMinor: 10.5 },
        { memberId: 2, balanceMinor: -10.5 },
      ]),
    ).toThrow(/integers/);
    expect(() =>
      minimizeTransfers([
        { memberId: 1, balanceMinor: 100 },
        { memberId: 1, balanceMinor: -100 },
      ]),
    ).toThrow(/unique/);
  });

  it("always settles everyone with positive transfers and at most n-1 payments", () => {
    let seed = 7;
    const next = () => (seed = (seed * 1664525 + 1013904223) % 4294967296);

    for (let i = 0; i < 500; i++) {
      const people = (next() % 7) + 2;
      const values = Array.from(
        { length: people - 1 },
        () => (next() % 10001) - 5000,
      );
      values.push(-values.reduce((a, b) => a + b, 0));
      const balances = values.map((balanceMinor, k) => ({
        memberId: k + 1,
        balanceMinor,
      }));

      const transfers = minimizeTransfers(balances);
      const nonZero = balances.filter((b) => b.balanceMinor !== 0).length;

      expect(applyTransfers(balances, transfers).every((v) => v === 0)).toBe(
        true,
      );
      expect(transfers.every((t) => t.amountMinor > 0 && t.from !== t.to)).toBe(
        true,
      );
      expect(transfers.length).toBeLessThanOrEqual(Math.max(nonZero - 1, 0));
    }
  });
});
