import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ExpensesTable } from "@/components/group/expenses-table";
import { SearchForm } from "@/components/group/search-form";
import type { Expense } from "@/types";

const groupId = "Abc123_-xyZ9";

// Client navigation is unavailable in the standalone server-rendering harness.
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

describe("expense search form server output", () => {
  it("renders a native GET form with a labelled, named input", () => {
    const html = renderToStaticMarkup(
      createElement(SearchForm, { groupId, q: "", showArchived: false }),
    );

    expect(html).toContain(`action="/g/${groupId}#expenses-heading"`);
    expect(html).toContain('method="get"');
    expect(html).toContain('for="expense-search"');
    expect(html).toContain('id="expense-search"');
    expect(html).toContain('name="q"');
    expect(html).toContain('type="text"');
    expect(html).toContain('inputMode="search"');
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain('maxLength="100"');
    expect(html).toContain('type="submit"');
    expect(html).not.toContain('name="archived"');
    expect(html).not.toContain("Clear search");
  });

  it("preserves the archived setting on submission and clear-search navigation", () => {
    const html = renderToStaticMarkup(
      createElement(SearchForm, { groupId, q: "coffee", showArchived: true, resultCount: 1 }),
    );

    expect(html).toContain('type="hidden" name="archived" value="1"');
    expect(html).toContain(`href="/g/${groupId}?archived=1#expenses-heading"`);
    expect(html).toContain('value="coffee"');
    expect(html).toContain("Clear search");
  });

  it.each([
    ["coffee", 1, "1 expense matches “coffee”."],
    ["coffee", 2, "2 expenses match “coffee”."],
    ["rent", 0, "No expenses match “rent”."],
    ["+++", 0, "Type at least one letter or number to search."],
    ["coffee", 50, "Showing the first 50 matches for “coffee”."],
  ] as const)("announces the search state for %j with %i results", (q, resultCount, message) => {
    const html = renderToStaticMarkup(
      createElement(SearchForm, { groupId, q, showArchived: false, resultCount }),
    );

    expect(html).toContain('role="status"');
    expect(html).toContain(message);
  });
});

describe("expense search table server output", () => {
  function renderTable(q: string, expenses: Expense[] = []) {
    return renderToStaticMarkup(
      createElement(ExpensesTable, {
        groupId,
        expenses,
        members: [{ id: 1, groupId, name: "Alice", archivedAt: null }],
        currency: "JPY",
        archiveAction: async () => ({ status: "idle" as const }),
        view: { q, showArchived: false },
        searchForm: createElement(SearchForm, {
          groupId, q, showArchived: false, resultCount: expenses.length,
        }),
      }),
    );
  }

  it("shows the normal empty state only when no search is active", () => {
    expect(renderTable("")).toContain("No expenses yet.");
    const noMatches = renderTable("rent");
    expect(noMatches).toContain("No expenses match “rent”.");
    expect(noMatches).not.toContain("No expenses yet.");
    const invalid = renderTable("+++");
    expect(invalid).toContain("Type at least one letter or number to search.");
    expect(invalid).not.toContain("No expenses yet.");
  });

  it("keeps relevance order rather than sorting search results by date", () => {
    const base = {
      groupId, paidBy: 1, amountMinor: 100, createdAt: "2026-11-01T00:00:00Z", archivedAt: null,
    };
    const html = renderTable("coffee", [
      { ...base, id: 1, note: "Coffee best match", spentOn: "2026-10-01" },
      { ...base, id: 2, note: "Coffee weaker match", spentOn: "2026-11-01" },
    ]);

    expect(html.indexOf("Coffee best match")).toBeLessThan(html.indexOf("Coffee weaker match"));
    expect(html).toContain('aria-label="Archive expense Coffee best match"');
    expect(html).toContain('aria-label="Archive expense Coffee weaker match"');
    expect(html).toContain("2 expenses match “coffee”.");
  });
});
