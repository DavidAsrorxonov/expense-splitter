import { describe, expect, it } from "vitest";
import {
  balanceSentence,
  memberName,
  monthBarPercents,
  sortBalances,
  transferSentence,
} from "@/lib/presenters";
import type { Member, MemberBalance, MonthlyTotal } from "@/types";

function balance(memberId: number, name: string, balanceMinor: number): MemberBalance {
  return { memberId, name, balanceMinor, groupId: "group", archivedAt: null };
}

describe("sortBalances", () => {
  it("orders owed first, largest debts next, and settled members last", () => {
    const balances = [
      balance(1, "Alice", -34),
      balance(2, "Bob", 3067),
      balance(3, "Carol", -3033),
      balance(4, "Dave", 0),
      balance(5, "Eve", 200),
    ];
    expect(sortBalances(balances).map((b) => b.name)).toEqual([
      "Bob", "Eve", "Carol", "Alice", "Dave",
    ]);
  });

  it("breaks amount ties by name in all three groups", () => {
    const balances = [
      balance(1, "Zoe", 100), balance(2, "Amy", 100),
      balance(3, "Zed", -100), balance(4, "Alice", -100),
      balance(5, "Will", 0), balance(6, "Bob", 0),
    ];
    expect(sortBalances(balances).map((b) => b.name)).toEqual([
      "Amy", "Zoe", "Alice", "Zed", "Bob", "Will",
    ]);
  });

  it("does not mutate the source array or discard archived balances", () => {
    const archived = Object.freeze({ ...balance(2, "Former member", 50), archivedAt: "2026-11-01" });
    const balances = Object.freeze([Object.freeze(balance(1, "Alice", -50)), archived]);
    expect(sortBalances(balances)).toEqual([archived, balances[0]]);
    expect(balances.map((b) => b.memberId)).toEqual([1, 2]);
  });

  it("uses member IDs for otherwise identical names and amounts", () => {
    expect(sortBalances([balance(2, "Alice", 0), balance(1, "Alice", 0)]).map((b) => b.memberId)).toEqual([1, 2]);
  });

  it("handles no balances", () => {
    expect(sortBalances([])).toEqual([]);
  });
});

describe("balanceSentence", () => {
  it("matches the seeded group's balance wording", () => {
    expect(balanceSentence("Bob", 3067, "JPY", false)).toBe("Bob is owed ¥3,067");
    expect(balanceSentence("Carol", -3033, "JPY", false)).toBe("Carol owes ¥3,033");
    expect(balanceSentence("Alice", -34, "JPY", false)).toBe("Alice owes ¥34");
  });

  it("uses absolute amounts and the currency's decimals", () => {
    expect(balanceSentence("Alice", -1250, "USD", false)).toBe("Alice owes $12.50");
    expect(balanceSentence("Bob", 1, "EUR", false)).toBe("Bob is owed €0.01");
  });

  it("describes zero without a currency figure", () => {
    expect(balanceSentence("Bob", 0, "USD", false)).toBe("Bob is settled up");
    expect(balanceSentence("Bob", -0, "JPY", false)).toBe("Bob is settled up");
  });

  it("marks archived members for every balance direction", () => {
    expect(balanceSentence("Bob", 100, "JPY", true)).toBe("Bob (archived) is owed ¥100");
    expect(balanceSentence("Bob", -100, "JPY", true)).toBe("Bob (archived) owes ¥100");
    expect(balanceSentence("Bob", 0, "JPY", true)).toBe("Bob (archived) is settled up");
  });
});

describe("transferSentence", () => {
  it("matches the seeded suggestions", () => {
    expect(transferSentence("Carol", "Bob", 3033, "JPY")).toBe("Carol pays Bob ¥3,033");
    expect(transferSentence("Alice", "Bob", 34, "JPY")).toBe("Alice pays Bob ¥34");
  });

  it("preserves member labels and decimal currency precision", () => {
    expect(transferSentence("Alice", "Bob (archived)", 5, "USD")).toBe("Alice pays Bob (archived) $0.05");
  });
});

describe("monthBarPercents", () => {
  it("scales each row against the largest total, preserving row order", () => {
    const totals: MonthlyTotal[] = [
      { month: "2026-11", totalMinor: 11100 },
      { month: "2026-10", totalMinor: 3000 },
    ];
    expect(monthBarPercents(totals)[0]).toBe(100);
    expect(monthBarPercents(totals)[1]).toBeCloseTo(27.027);
    expect(totals[0].month).toBe("2026-11");
  });

  it("keeps a tiny non-zero total visible without drawing a bar for zero", () => {
    expect(monthBarPercents([
      { month: "2026-11", totalMinor: 10000 },
      { month: "2026-10", totalMinor: 1 },
      { month: "2026-09", totalMinor: 0 },
    ])).toEqual([100, 2, 0]);
  });

  it("handles empty and all-zero data without NaN or Infinity", () => {
    expect(monthBarPercents([])).toEqual([]);
    expect(monthBarPercents([{ month: "2026-11", totalMinor: 0 }])).toEqual([0]);
  });

  it("gives equal totals equal widths and leaves frozen input untouched", () => {
    const totals = Object.freeze([
      Object.freeze({ month: "2026-11", totalMinor: 50 }),
      Object.freeze({ month: "2026-10", totalMinor: 50 }),
    ]);
    expect(monthBarPercents(totals)).toEqual([100, 100]);
  });
});

describe("memberName", () => {
  const members: Member[] = [
    { id: 1, groupId: "group", name: "Alice", archivedAt: null },
    { id: 2, groupId: "group", name: "Bob", archivedAt: "2026-11-01" },
  ];

  it("resolves active and archived members by ID", () => {
    expect(memberName(1, members)).toBe("Alice");
    expect(memberName(2, members)).toBe("Bob (archived)");
  });

  it("does not confuse members with the same name", () => {
    const repeatedNames = [...members, { id: 3, groupId: "group", name: "Bob", archivedAt: null }];
    expect(memberName(2, repeatedNames)).toBe("Bob (archived)");
    expect(memberName(3, repeatedNames)).toBe("Bob");
  });

  it("labels a missing reference rather than assigning another member's name", () => {
    expect(memberName(999, members)).toBe("Unknown member");
    expect(memberName(1, [])).toBe("Unknown member");
  });
});
