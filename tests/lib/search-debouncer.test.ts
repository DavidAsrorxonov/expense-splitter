import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSearchDebouncer, reconcileSearchDraft } from "@/lib/search-debouncer";

describe("debounced search", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("waits one second after the latest keystroke and searches only the latest text", () => {
    const search = vi.fn();
    const debouncer = createSearchDebouncer(search);
    debouncer.schedule("cof");
    vi.advanceTimersByTime(800);
    debouncer.schedule("coffee");
    vi.advanceTimersByTime(999);
    expect(search).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(search).toHaveBeenCalledExactlyOnceWith("coffee");
  });

  it("submits immediately and cancels the pending automatic search", () => {
    const search = vi.fn();
    const debouncer = createSearchDebouncer(search);
    debouncer.schedule("cof");
    debouncer.submit("coffee beans");
    expect(search).toHaveBeenCalledExactlyOnceWith("coffee beans");
    vi.runAllTimers();
    expect(search).toHaveBeenCalledOnce();
  });

  it.each(["", " \t "])("clears immediately for %j, cancelling an older query", (value) => {
    const search = vi.fn();
    const debouncer = createSearchDebouncer(search);
    debouncer.schedule("coffee");
    debouncer.schedule(value);
    expect(search).toHaveBeenCalledExactlyOnceWith("");
    vi.runAllTimers();
    expect(search).toHaveBeenCalledOnce();
  });

  it("cancels scheduled work on navigation, unmount, or input composition", () => {
    const search = vi.fn();
    const debouncer = createSearchDebouncer(search);
    debouncer.schedule("co");
    debouncer.cancel();
    vi.runAllTimers();
    expect(search).not.toHaveBeenCalled();
    debouncer.schedule("食費");
    vi.advanceTimersByTime(1000);
    expect(search).toHaveBeenCalledExactlyOnceWith("食費");
  });

  it("normalizes automatic and explicit searches using the URL rules", () => {
    const search = vi.fn();
    const debouncer = createSearchDebouncer(search);
    debouncer.schedule(`  ${"a".repeat(101)}  `);
    vi.runAllTimers();
    expect(search).toHaveBeenLastCalledWith("a".repeat(100));
    debouncer.submit(" coffee beans ");
    expect(search).toHaveBeenLastCalledWith("coffee beans");
  });

  it("uses the latest navigation settings without restarting a pending timer", () => {
    const original = vi.fn();
    const updated = vi.fn();
    const debouncer = createSearchDebouncer(original);
    debouncer.schedule("coffee");
    vi.advanceTimersByTime(500);
    debouncer.setSearch(updated);
    vi.advanceTimersByTime(500);
    expect(original).not.toHaveBeenCalled();
    expect(updated).toHaveBeenCalledExactlyOnceWith("coffee");
  });
});

describe("search draft reconciliation", () => {
  it("keeps newer typing when an earlier request finishes", () => {
    expect(reconcileSearchDraft({ value: "coffee beans", serverQ: "", requestedQueries: ["coffee"] }, "coffee")).toEqual({
      value: "coffee beans", serverQ: "coffee", requestedQueries: ["coffee"],
    });
  });

  it("does not undo clearing when an older request finishes", () => {
    expect(reconcileSearchDraft({ value: "", serverQ: "", requestedQueries: ["coffee", ""] }, "coffee").value).toBe("");
  });

  it("preserves trailing spaces while the user continues a multiword query", () => {
    expect(reconcileSearchDraft({ value: "coffee ", serverQ: "", requestedQueries: ["coffee"] }, "coffee").value).toBe("coffee ");
  });

  it("synchronizes a query changed by external navigation", () => {
    expect(reconcileSearchDraft({ value: "coffee", serverQ: "coffee", requestedQueries: [] }, "rent").value).toBe("rent");
  });
});
