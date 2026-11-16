import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGroupAction } from "@/app/actions";
import {
  addMemberAction, addExpenseAction, recordPaymentAction, recordManualPaymentAction,
  archiveExpenseAction, archiveMemberAction, restoreExpenseAction, restoreMemberAction,
} from "@/app/g/[groupId]/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import * as forms from "@/lib/forms";
import { checkRateLimit } from "@/lib/rate-limit-policy";
import { resetRateLimiters } from "../helpers/rate-limit";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(), getAppDb: vi.fn(), redirect: vi.fn(), revalidatePath: vi.fn(),
  createGroup: vi.fn(), getGroup: vi.fn(), addMember: vi.fn(), archiveMember: vi.fn(),
  addExpense: vi.fn(), archiveExpense: vi.fn(), recordSettlement: vi.fn(),
  restoreExpense: vi.fn(), restoreMember: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/db", () => ({ getAppDb: mocks.getAppDb }));
vi.mock("@/services/group-service", () => ({
  createGroup: mocks.createGroup, getGroup: mocks.getGroup,
  addMember: mocks.addMember, archiveMember: mocks.archiveMember,
}));
vi.mock("@/services/expense-service", () => ({ addExpense: mocks.addExpense, archiveExpense: mocks.archiveExpense }));
vi.mock("@/services/settle-service", () => ({ recordSettlement: mocks.recordSettlement }));
vi.mock("@/services/archive-service", () => ({ restoreExpense: mocks.restoreExpense, restoreMember: mocks.restoreMember }));

const ip = "192.0.2.1";
const groupId = "abc123_XYZ90";
const redirectSignal = new Error("NEXT_REDIRECT");
const db = {};
type GroupAction = (groupId: string, previous: ActionState, form: FormData) => Promise<ActionState>;
const cases: {
  name: string; action: GroupAction; values: Record<string, string | string[]>;
  service: typeof mocks.addMember;
}[] = [
  { name: "add member", action: addMemberAction, values: { name: " Alice " }, service: mocks.addMember },
  { name: "add expense", action: addExpenseAction, values: { paidBy: "1", amount: "100", spentOn: "2026-11-16", note: " Food ", participantIds: ["1", "2"] }, service: mocks.addExpense },
  { name: "suggested payment", action: recordPaymentAction, values: { fromMember: "1", toMember: "2", amountMinor: "100" }, service: mocks.recordSettlement },
  { name: "manual payment", action: recordManualPaymentAction, values: { fromMember: "1", toMember: "2", amount: "100" }, service: mocks.recordSettlement },
  { name: "archive expense", action: archiveExpenseAction, values: { expenseId: "123" }, service: mocks.archiveExpense },
  { name: "archive member", action: archiveMemberAction, values: { memberId: "456" }, service: mocks.archiveMember },
  { name: "restore expense", action: restoreExpenseAction, values: { expenseId: "123" }, service: mocks.restoreExpense },
  { name: "restore member", action: restoreMemberAction, values: { memberId: "456" }, service: mocks.restoreMember },
];
const parserNames = [
  "parseCreateGroupForm", "parseAddMemberForm", "parseAddExpenseForm",
  "parseRecordPaymentForm", "parseManualPaymentForm", "parseArchiveExpenseForm",
  "parseArchiveMemberForm", "parseRestoreExpenseForm", "parseRestoreMemberForm", "readFormValues",
] as const;

beforeEach(() => {
  vi.resetAllMocks();
  resetRateLimiters();
  vi.useFakeTimers();
  vi.setSystemTime(0);
  mocks.headers.mockResolvedValue(new Headers({ "x-real-ip": ip }));
  mocks.getAppDb.mockReturnValue(db);
  mocks.getGroup.mockReturnValue({ currency: "JPY" });
  mocks.createGroup.mockReturnValue({ id: groupId });
  mocks.redirect.mockImplementation(() => { throw redirectSignal; });
  for (const name of parserNames) vi.spyOn(forms, name);
});
afterEach(() => { resetRateLimiters(); vi.restoreAllMocks(); vi.useRealTimers(); });

function form(values: Record<string, string | string[]> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const entry of Array.isArray(value) ? value : [value]) data.append(key, entry);
  }
  return data;
}

function expectNoWork() {
  for (const [name, mock] of Object.entries(mocks)) {
    if (name !== "headers") expect(mock, name).not.toHaveBeenCalled();
  }
  for (const name of parserNames) expect(forms[name], name).not.toHaveBeenCalled();
}

describe.each(cases)("rate limiting: $name", ({ action, values, service }) => {
  it("blocks before validation/database work and preserves the draft or row ID", async () => {
    for (let i = 0; i < 60; i++) checkRateLimit("write", ip);
    const data = form(values);
    data.set("unexpected", "private data");
    // Deliberately invalid group link proves rejection wins over business validation.
    expect(await action("invalid", initialActionState, data)).toEqual({
      status: "error", message: "Too many requests. Try again in 60 seconds.", values,
    });
    expectNoWork();
  });

  it("continues through the existing service and revalidation when allowed", async () => {
    const result = await action(groupId, initialActionState, form(values));
    expect(result.status).toBe("success");
    expect(service).toHaveBeenCalledOnce();
    expect(mocks.getAppDb).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledExactlyOnceWith(`/g/${groupId}`);
  });
});

describe("request-level rate-limit integration", () => {
  it("shares the write allowance across actions and groups, then resets", async () => {
    for (let i = 0; i < 60; i++) {
      const { action } = cases[i % cases.length];
      const result = await action(i % 2 ? "invalid-one" : "invalid-two", initialActionState, new FormData());
      expect(result.message).toBe("Invalid group link.");
    }
    const blocked = await addMemberAction(groupId, initialActionState, form({ name: "Alice" }));
    expect(blocked.message).toBe("Too many requests. Try again in 60 seconds.");
    expect(mocks.getAppDb).not.toHaveBeenCalled();
    vi.setSystemTime(60_000);
    expect((await addMemberAction(groupId, initialActionState, form({ name: "Alice" }))).status).toBe("success");
  });

  it("allows five group attempts, then preserves bounded input without parsing or writing", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(createGroupAction(initialActionState, form({ name: "Trip", currency: "JPY" }))).rejects.toBe(redirectSignal);
    }
    expect(mocks.createGroup).toHaveBeenCalledTimes(5);
    vi.clearAllMocks();
    const data = form({ name: "x".repeat(5000), currency: "JPY", unexpected: "secret" });
    expect(await createGroupAction(initialActionState, data)).toEqual({
      status: "error", message: "Too many requests. Try again in 3600 seconds.",
      values: { name: "x".repeat(1024), currency: "JPY" },
    });
    expectNoWork();
  });

  it("enforces the global group cap through the action across different IPs", async () => {
    for (let i = 0; i < 60; i++) {
      mocks.headers.mockResolvedValue(new Headers({ "x-real-ip": `192.0.2.${i + 1}` }));
      await expect(createGroupAction(initialActionState, form({ name: "Trip", currency: "JPY" }))).rejects.toBe(redirectSignal);
    }
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers({ "x-real-ip": "198.51.100.1" }));
    expect(await createGroupAction(initialActionState, form({ name: "Other", currency: "USD" }))).toEqual({
      status: "error", message: "Too many requests. Try again in 3600 seconds.",
      values: { name: "Other", currency: "USD" },
    });
    expectNoWork();
  });

  it("counts invalid group forms and ignores spoofed X-Forwarded-For", async () => {
    for (let i = 0; i < 5; i++) {
      mocks.headers.mockResolvedValue(new Headers({ "x-real-ip": ip, "x-forwarded-for": `198.51.100.${i + 1}` }));
      expect((await createGroupAction(initialActionState, new FormData())).message).toBe("Check the fields below.");
    }
    expect((await createGroupAction(initialActionState, new FormData())).message).toContain("Too many requests.");
    expect(mocks.getAppDb).not.toHaveBeenCalled();
    mocks.headers.mockResolvedValue(new Headers({ "x-real-ip": "203.0.113.1" }));
    expect((await createGroupAction(initialActionState, new FormData())).message).toBe("Check the fields below.");
  });

  it("shares the unknown bucket for missing and malformed addresses", async () => {
    mocks.headers.mockResolvedValue(new Headers());
    for (let i = 0; i < 5; i++) await createGroupAction(initialActionState, new FormData());
    mocks.headers.mockResolvedValue(new Headers({ "x-real-ip": "invalid", "x-forwarded-for": "203.0.113.1" }));
    expect((await createGroupAction(initialActionState, new FormData())).message).toContain("Too many requests.");
    expect(mocks.getAppDb).not.toHaveBeenCalled();
  });

  it("bounds blocked expense drafts and ignores files before any business work", async () => {
    for (let i = 0; i < 60; i++) checkRateLimit("write", ip);
    const data = form({ paidBy: "1", amount: "x".repeat(5000), spentOn: "2026-11-16", unexpected: "secret" });
    data.set("note", new Blob(["file contents"]));
    data.append("participantIds", new Blob(["1"]));
    for (let i = 0; i < 100; i++) data.append("participantIds", "9".repeat(100));
    expect(await addExpenseAction(groupId, initialActionState, data)).toEqual({
      status: "error", message: "Too many requests. Try again in 60 seconds.",
      values: { paidBy: "1", amount: "x".repeat(1024), spentOn: "2026-11-16", note: "", participantIds: Array(50).fill("9".repeat(32)) },
    });
    expectNoWork();
  });

  it("awaits request headers and propagates request-context failures", async () => {
    let resolveHeaders!: (value: Headers) => void;
    mocks.headers.mockReturnValue(new Promise<Headers>((resolve) => { resolveHeaders = resolve; }));
    const pending = addMemberAction(groupId, initialActionState, form({ name: "Alice" }));
    expectNoWork();
    resolveHeaders(new Headers({ "x-real-ip": ip }));
    expect((await pending).status).toBe("success");
    vi.clearAllMocks();
    const error = new Error("Request context unavailable");
    mocks.headers.mockRejectedValue(error);
    await expect(createGroupAction(initialActionState, new FormData())).rejects.toBe(error);
    expectNoWork();
  });
});
