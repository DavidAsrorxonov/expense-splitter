// The application intentionally shares these instances across module reloads.
// Tests must start with fresh request budgets instead of depending on order.
export function resetRateLimiters() {
  const shared = globalThis as unknown as {
    __expenseRateLimiters?: unknown;
  };
  delete shared.__expenseRateLimiters;
}
