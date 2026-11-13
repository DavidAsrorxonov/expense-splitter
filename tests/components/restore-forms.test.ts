import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RestoreExpenseForm } from "@/components/group/restore-expense-form";
import { RestoreMemberForm } from "@/components/group/restore-member-form";
import { RestoreFeedback } from "@/components/group/restore-feedback";
import { initialActionState, type ActionState } from "@/lib/action-state";

const action = () => {};
const forms = [
  {
    kind: "expense", field: "expenseId", label: "Restore expense Groceries",
    render: (state: ActionState, pending = false) => createElement(RestoreExpenseForm, {
      action, expenseId: 7, label: "Groceries", state, pending,
    }),
  },
  {
    kind: "member", field: "memberId", label: "Restore member Alice",
    render: (state: ActionState, pending = false) => createElement(RestoreMemberForm, {
      action, memberId: 7, name: "Alice", state, pending,
    }),
  },
];

describe.each(forms)("restore $kind form", ({ kind, field, label, render }) => {
  it("renders a named hidden ID and accessible submit button", () => {
    const html = renderToStaticMarkup(render(initialActionState));

    expect(html).toContain(`type="hidden" name="${field}" value="7"`);
    expect(html).toContain('type="submit"');
    expect(html).toContain(`aria-label="${label}"`);
    expect(html).not.toContain('role="alert"');
  });

  it("shows an inline alert for this row and associates it with the form", () => {
    const state: ActionState = { status: "error", message: "Cannot restore this item.", values: { [field]: "7" } };
    const html = renderToStaticMarkup(render(state));

    expect(html).toContain('role="alert"');
    expect(html).toContain("Error: Cannot restore this item.");
    expect(html).toContain(`aria-describedby="restore-${kind}-7-error"`);
  });

  it("does not repeat another row's error", () => {
    const html = renderToStaticMarkup(render({
      status: "error", message: "Another row failed.", values: { [field]: "8" },
    }));

    expect(html).not.toContain("Another row failed.");
    expect(html).not.toContain('role="alert"');
  });

  it("disables submissions while the list action is pending", () => {
    const html = renderToStaticMarkup(render(initialActionState, true));
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-disabled="true"');
  });
});

describe("restore feedback outside the rows", () => {
  it("renders the success announcement independently of any restore form", () => {
    const html = renderToStaticMarkup(createElement(RestoreFeedback, {
      state: { status: "success", message: "Expense restored." }, feedbackRef: null,
    }));

    expect(html).toContain("Expense restored.");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('tabindex="-1"');
    expect(html).not.toContain("<form");
  });

  it("keeps the live region mounted before a successful submission", () => {
    const html = renderToStaticMarkup(createElement(RestoreFeedback, {
      state: initialActionState, feedbackRef: null,
    }));
    expect(html).toContain('role="status"');
    expect(html).not.toContain("restored");
  });
});
