import { describe, expect, it } from "vitest";
import { paginate } from "@/lib/pagination";

describe("payment history pagination", () => {
  const records = Object.freeze(Array.from({ length: 23 }, (_, index) => ({ id: 23 - index })));

  it("shows ten newest records on the first page without changing their order", () => {
    expect(paginate(records, 1)).toEqual({
      items: records.slice(0, 10), page: 1, pageCount: 3, total: 23, first: 1, last: 10,
    });
  });

  it("shows distinct pages and the remaining records on the last page", () => {
    expect(paginate(records, 2)).toMatchObject({ items: records.slice(10, 20), first: 11, last: 20 });
    expect(paginate(records, 3)).toMatchObject({ items: records.slice(20), first: 21, last: 23 });
    expect([1, 2, 3].flatMap((page) => paginate(records, page).items)).toEqual(records);
  });

  it("handles empty history and exact page boundaries", () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pageCount: 1, total: 0, first: 0, last: 0 });
    expect(paginate(records.slice(0, 20), 2)).toMatchObject({ page: 2, pageCount: 2, first: 11, last: 20 });
  });

  it("clamps stale page selections when the available history changes", () => {
    expect(paginate(records.slice(0, 5), 3)).toMatchObject({ page: 1, pageCount: 1, first: 1, last: 5 });
    expect(paginate(records, 100).page).toBe(3);
  });

  it.each([0, -1, NaN, Infinity])("falls back to the first page for %s", (page) => {
    expect(paginate(records, page).page).toBe(1);
  });

  it("handles fractional page numbers and a different page size", () => {
    expect(paginate(records, 2.9, 5)).toMatchObject({ page: 2, pageCount: 5, first: 6, last: 10 });
  });

  it.each([0, -1, 1.5, Infinity])("rejects invalid page sizes: %s", (pageSize) => {
    expect(() => paginate(records, 1, pageSize)).toThrow(RangeError);
  });
});
