import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpensesTable } from "@/components/group/expenses-table";

const groupId = "Abc123_-xyZ9";

describe("CSV download link", () => {
  it.each([false, true])("renders the correct native download link when showArchived=%s", (showArchived) => {
    const html = renderToStaticMarkup(createElement(ExpensesTable, {
      groupId, expenses: [], members: [], currency: "JPY",
      archiveAction: async () => ({ status: "idle" as const }),
      view: { q: "coffee", showArchived }, searchForm: null,
    }));
    const href = `/g/${groupId}/export${showArchived ? "?archived=1" : ""}`;
    const label = showArchived ? "Export CSV (including archived)" : "Export CSV";
    expect(html).toContain(`href="${href}"`);
    expect(html).toContain(`>${label}</a>`);
    expect(html).toContain("regardless of your search");
    expect(html).toContain('aria-describedby="expense-export-help"');
  });
});
