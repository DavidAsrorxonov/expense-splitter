import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/connection";
import { GET } from "@/app/g/[groupId]/export/route";
import { addExpense, archiveExpense } from "@/services/expense-service";
import { addMember, createGroup } from "@/services/group-service";
import { createTestDb } from "../helpers/db";

const mocks = vi.hoisted(() => ({ getAppDb: vi.fn(), connection: vi.fn() }));
vi.mock("@/lib/db", () => ({ getAppDb: mocks.getAppDb }));
vi.mock("next/server", () => ({ connection: mocks.connection }));

let db: Db;
let groupId: string;

beforeEach(() => {
  vi.resetAllMocks();
  db = createTestDb();
  mocks.getAppDb.mockReturnValue(db);
  groupId = createGroup(db, { name: "My Trip!", currency: "USD" }).id;
  const alice = addMember(db, groupId, "Alice");
  const base = { groupId, paidBy: alice.id, spentOn: "2026-11-05", participantIds: [alice.id] };
  addExpense(db, { ...base, amountMinor: 1001, note: 'Café, "beans"\nand 食費' });
  const archived = addExpense(db, { ...base, amountMinor: 2000, note: "Archived dinner" });
  archiveExpense(db, groupId, archived.id);
});

afterEach(() => db.close());

function download(query = "", id = groupId) {
  return GET(new Request(`https://example.test/g/${id}/export${query}`), {
    params: Promise.resolve({ groupId: id }),
  });
}

describe("CSV download route", () => {
  it("returns a downloadable UTF-8 CSV with BOM, escaping, and no-store headers", async () => {
    const response = await download();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="my-trip-expenses.csv"');
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes)).toBe(
      '\uFEFFDate,Note,Paid by,Amount,Status,Alice\r\n' +
      '2026-11-05,"Café, ""beans""\nand 食費",Alice,10.01,active,10.01\r\n',
    );
    expect(mocks.connection).toHaveBeenCalledOnce();
  });

  it("includes archived rows only when requested", async () => {
    const response = await download("?archived=1");
    expect(await response.text()).toContain("Archived dinner,Alice,20.00,archived,20.00\r\n");
  });

  it.each(["?archived=0", "?archived=true", "?archived=01", "?archived=0&archived=1"])(
    "does not include archived rows for %s",
    async (query) => {
      expect(await (await download(query)).text()).not.toContain("Archived dinner");
    },
  );

  it("exports all active expenses even when the URL contains a search query", async () => {
    expect(await (await download("?q=unmatched")).text()).toContain("Café");
  });

  it("exports a header for an empty group with a safe filename", async () => {
    const empty = createGroup(db, { name: "食費", currency: "JPY" });
    const response = await download("", empty.id);
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="group-expenses.csv"');
    expect(await response.text()).toBe("Date,Note,Paid by,Amount,Status\r\n");
  });

  it.each(["short", "abcdefghijklmn", "abc123!_xyZ9"])("rejects malformed ID %s before reading the database", async (id) => {
    const response = await download("", id);
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.getAppDb).not.toHaveBeenCalled();
  });

  it("returns 404 for a valid but unknown group ID", async () => {
    const response = await download("", "missing12345");
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Disposition")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rethrows unexpected errors instead of returning a misleading download", async () => {
    const error = new Error("Database unavailable");
    mocks.getAppDb.mockImplementationOnce(() => { throw error; });
    await expect(download()).rejects.toBe(error);
  });
});
