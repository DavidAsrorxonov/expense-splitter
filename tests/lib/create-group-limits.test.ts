import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/connection";
import { DEFAULT_LIMITS } from "@/domain/limits";
import { createGroupAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import { countGroups } from "@/repos/groups";
import { createGroup } from "@/services/group-service";
import { createTestDb } from "../helpers/db";
import { resetRateLimiters } from "../helpers/rate-limit";

const mocks = vi.hoisted(() => ({ getAppDb: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/db", () => ({ getAppDb: mocks.getAppDb }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-real-ip": "192.0.2.1" }),
}));
vi.mock("@/services/group-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/group-service")>();
  return { ...actual, createGroup: vi.fn(actual.createGroup) };
});

let db: Db;
const redirectSignal = new Error("NEXT_REDIRECT");
beforeEach(() => {
  resetRateLimiters();
  vi.clearAllMocks();
  vi.stubEnv("MAX_GROUPS", undefined);
  db = createTestDb();
  mocks.getAppDb.mockReturnValue(db);
  mocks.redirect.mockImplementation(() => { throw redirectSignal; });
});
afterEach(() => { db.close(); vi.unstubAllEnvs(); resetRateLimiters(); });

function form(name = "Trip"): FormData {
  const data = new FormData();
  data.set("name", name);
  data.set("currency", "JPY");
  return data;
}

async function expectCreated() {
  await expect(createGroupAction(initialActionState, form())).rejects.toBe(redirectSignal);
  expect(mocks.redirect).toHaveBeenLastCalledWith(expect.stringMatching(/^\/g\/[A-Za-z0-9_-]{12}$/));
}

describe("MAX_GROUPS in the create-group action", () => {
  it.each(["2", " 2 ", "002"])("honors the positive integer %s and preserves form input at the cap", async (value) => {
    vi.stubEnv("MAX_GROUPS", value);
    await expectCreated();
    await expectCreated();
    expect(createGroup).toHaveBeenLastCalledWith(db, { name: "Trip", currency: "JPY" }, {
      ...DEFAULT_LIMITS, maxGroups: 2,
    });
    mocks.redirect.mockClear();
    const result = await createGroupAction(initialActionState, form("Third group"));
    expect(result).toMatchObject({
      status: "error", message: "New groups can't be created right now.",
      values: { name: "Third group", currency: "JPY" },
    });
    expect(countGroups(db)).toBe(2);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each([undefined, "", "   ", "0", "-1", "1.5", "2abc", "1e3", "0x10", "Infinity", "NaN", "9007199254740992"])(
    "falls back to default limits for invalid MAX_GROUPS=%s", async (value) => {
      vi.stubEnv("MAX_GROUPS", value);
      await expectCreated();
      expect(createGroup).toHaveBeenCalledExactlyOnceWith(db, { name: "Trip", currency: "JPY" }, DEFAULT_LIMITS);
      expect(countGroups(db)).toBe(1);
    },
  );

  it("reads the environment for each action rather than at module import", async () => {
    vi.stubEnv("MAX_GROUPS", "1");
    await expectCreated();
    expect(await createGroupAction(initialActionState, form())).toMatchObject({ status: "error" });
    vi.stubEnv("MAX_GROUPS", "2");
    await expectCreated();
    expect(countGroups(db)).toBe(2);
  });

  it("rejects invalid form data before accessing the database", async () => {
    const result = await createGroupAction(initialActionState, form(""));
    expect(result.status).toBe("error");
    expect(mocks.getAppDb).not.toHaveBeenCalled();
    expect(createGroup).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
