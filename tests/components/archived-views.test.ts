import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArchivedToggle } from "@/components/group/archived-toggle";
import { ArchivedExpensesTable } from "@/components/group/archived-expenses-table";
import { ArchivedMembersList } from "@/components/group/archived-members-list";
import { GroupTabs } from "@/components/group/group-tabs";
import type { FormAction } from "@/lib/action-state";
import type { Expense, Member } from "@/types";

const groupId = "Abc123_-xyZ9";
const view = { q: "coffee beans", showArchived: true };
const members: Member[] = [{ id: 1, groupId, name: "Alice", archivedAt: "2026-11-01T00:00:00Z" }];
const expenses: Expense[] = [{
  id: 2, groupId, paidBy: 1, amountMinor: 1001, note: "Groceries", spentOn: "2026-11-01",
  createdAt: "2026-11-01T00:00:00Z", archivedAt: "2026-11-02T00:00:00Z",
}];

// Simulate React's server-reference metadata so SSR exercises native form actions
// and useActionState's permalink instead of the client-only replay placeholder.
function serverAction(): FormAction {
  const action: FormAction = async () => ({ status: "idle" });
  return Object.assign(action, {
    $$FORM_ACTION: () => ({
      name: "$ACTION_ID_restore", action: "/unused", method: "POST",
      encType: "multipart/form-data", data: new FormData(),
    }),
    bind: () => serverAction(),
  });
}

function expenseList(rows = expenses) {
  return createElement(ArchivedExpensesTable, {
    expenses: rows, members, currency: "USD", groupId, view, restoreAction: serverAction(),
  });
}

function memberList(rows = members) {
  return createElement(ArchivedMembersList, {
    members: rows, groupId, view, restoreAction: serverAction(),
  });
}

describe("archived toggle", () => {
  it("shows archived items while preserving search and the originating section", () => {
    const html = renderToStaticMarkup(createElement(ArchivedToggle, {
      groupId, view: { ...view, showArchived: false }, section: "members",
    }));
    expect(html).toContain(`href="/g/${groupId}?q=coffee%20beans&amp;archived=1#members-heading"`);
    expect(html).toContain("Show archived");
  });

  it("hides archived items without clearing search", () => {
    const html = renderToStaticMarkup(createElement(ArchivedToggle, { groupId, view, section: "expenses" }));
    expect(html).toContain(`href="/g/${groupId}?q=coffee%20beans#expenses-heading"`);
    expect(html).toContain("Hide archived");
  });
});

describe("archived expenses", () => {
  it("renders expense details, archived labels, and accessible restore controls", () => {
    const html = renderToStaticMarkup(expenseList());
    expect(html).toContain("Groceries");
    expect(html).toContain("Alice (archived)");
    expect(html).toContain("$10.01");
    expect(html).toContain(">Archived</td>");
    expect(html).toContain('aria-label="Restore expense Groceries"');
    expect(html).toContain('aria-label="Archived expenses — scroll to see all columns"');
    expect(html).toContain("regardless of your search");
  });

  it("uses the date to name restore controls when the note is empty", () => {
    const html = renderToStaticMarkup(expenseList([{ ...expenses[0], note: "" }]));
    expect(html).toContain(">—</td>");
    expect(html).toContain('aria-label="Restore expense 2026-11-01"');
  });

  it("retains search and archived state in native POST submissions", () => {
    const html = renderToStaticMarkup(expenseList());
    expect(html).toContain('method="POST"');
    expect(html).toContain(`action="/g/${groupId}?q=coffee%20beans&amp;archived=1#archived-expenses-heading"`);
    expect(html).toContain('name="expenseId" value="2"');
  });

  it("keeps the feedback region when the last archived expense is gone", () => {
    const html = renderToStaticMarkup(expenseList([]));
    expect(html).toContain("No archived expenses.");
    expect(html).toContain('role="status"');
    expect(html).not.toContain("<table");
  });
});

describe("archived members", () => {
  it("renders names and native restore forms with the correct destination", () => {
    const html = renderToStaticMarkup(memberList());
    expect(html).toContain('aria-label="Restore member Alice"');
    expect(html).toContain('name="memberId" value="1"');
    expect(html).toContain('method="POST"');
    expect(html).toContain(`action="/g/${groupId}?q=coffee%20beans&amp;archived=1#archived-members-heading"`);
  });

  it("keeps the feedback region when the last archived member is gone", () => {
    const html = renderToStaticMarkup(memberList([]));
    expect(html).toContain("No archived members.");
    expect(html).toContain('role="status"');
    expect(html).not.toContain("<form");
  });
});

describe("group sections without JavaScript", () => {
  it("renders all panels as accessible regions with native navigation links", () => {
    const html = renderToStaticMarkup(createElement(GroupTabs, {
      expenses: expenseList(), balances: "Balances content", payments: "Payments content", members: memberList(),
    }));
    const regions = html.match(/<div\b[^>]*role="region"[^>]*>/g) ?? [];
    // Four panels plus the table's own scrolling region.
    expect(regions).toHaveLength(5);
    for (const region of regions) {
      expect(region).not.toMatch(/\s(?:hidden|inert)(?:=|\s|>)/);
      expect(region).not.toContain("data-hidden:hidden");
    }
    for (const section of ["expenses", "balances", "payments", "members"]) {
      expect(html).toContain(`href="#group-section-${section}"`);
      expect(html).toContain(`id="group-section-${section}"`);
    }
    expect(html).toContain('aria-label="Restore member Alice"');
    expect(html).toContain('aria-label="Restore expense Groceries"');
  });
});
