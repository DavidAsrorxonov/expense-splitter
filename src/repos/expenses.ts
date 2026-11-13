import type { Db } from "../db/connection";
import type { Share } from "../domain/splits";
import type { Expense, MonthlyTotal } from "../types";

type ExpenseRow = {
  id: number;
  group_id: string;
  paid_by: number;
  amount_minor: number;
  note: string;
  spent_on: string;
  created_at: string;
  archived_at: string | null;
};

const COLUMNS =
  "id, group_id, paid_by, amount_minor, note, spent_on, created_at, archived_at";

const toExpense = (r: ExpenseRow): Expense => ({
  id: r.id,
  groupId: r.group_id,
  paidBy: r.paid_by,
  amountMinor: r.amount_minor,
  note: r.note,
  spentOn: r.spent_on,
  createdAt: r.created_at,
  archivedAt: r.archived_at,
});

export function insertExpense(
  db: Db,
  input: {
    groupId: string;
    paidBy: number;
    amountMinor: number;
    note: string;
    spentOn: string;
  },
): number {
  const result = db
    .prepare(
      `INSERT INTO expenses (group_id, paid_by, amount_minor, note, spent_on)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      input.groupId,
      input.paidBy,
      input.amountMinor,
      input.note,
      input.spentOn,
    );
  return Number(result.lastInsertRowid);
}

export function insertSplits(db: Db, expenseId: number, shares: Share[]): void {
  const insert = db.prepare(
    "INSERT INTO splits (expense_id, member_id, share_minor) VALUES (?, ?, ?)",
  );
  for (const share of shares) {
    insert.run(expenseId, share.memberId, share.shareMinor);
  }
}

export function findExpense(db: Db, id: number): Expense | undefined {
  const row = db
    .prepare(`SELECT ${COLUMNS} FROM expenses WHERE id = ?`)
    .get(id) as ExpenseRow | undefined;
  return row && toExpense(row);
}

export function listExpenses(
  db: Db,
  groupId: string,
  includeArchived = false,
): Expense[] {
  const rows = db
    .prepare(
      `SELECT ${COLUMNS} FROM expenses
       WHERE group_id = ? AND (? = 1 OR archived_at IS NULL)
       ORDER BY spent_on DESC, id DESC`,
    )
    .all(groupId, includeArchived ? 1 : 0) as ExpenseRow[];
  return rows.map(toExpense);
}

export function listSplits(db: Db, expenseId: number): Share[] {
  const rows = db
    .prepare(
      `SELECT member_id, share_minor FROM splits
       WHERE expense_id = ? ORDER BY member_id`,
    )
    .all(expenseId) as { member_id: number; share_minor: number }[];
  return rows.map((r) => ({
    memberId: r.member_id,
    shareMinor: r.share_minor,
  }));
}

/** Returns true if an expense was archived, false if not found or already archived. */
export function archiveExpense(db: Db, id: number): boolean {
  const result = db
    .prepare(
      `UPDATE expenses SET archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? AND archived_at IS NULL`,
    )
    .run(id);
  return result.changes > 0;
}

export function monthlyTotals(db: Db, groupId: string): MonthlyTotal[] {
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', spent_on) AS month, SUM(amount_minor) AS total_minor
       FROM expenses
       WHERE group_id = ? AND archived_at IS NULL
       GROUP BY month
       ORDER BY month DESC`,
    )
    .all(groupId) as { month: string; total_minor: number }[];
  return rows.map((r) => ({ month: r.month, totalMinor: r.total_minor }));
}

/**
 * Full-text search over expense notes, best match first.
 * `ftsQuery` must come from buildSearchQuery (never raw user input).
 */
export function searchExpenses(
  db: Db,
  groupId: string,
  ftsQuery: string,
  options: { includeArchived?: boolean; limit?: number } = {},
): Expense[] {
  const rows = db
    .prepare(
      `SELECT e.id, e.group_id, e.paid_by, e.amount_minor, e.note,
              e.spent_on, e.created_at, e.archived_at
       FROM expenses_fts
       JOIN expenses e ON e.id = expenses_fts.rowid
       WHERE expenses_fts MATCH ?
         AND e.group_id = ?
         AND (? = 1 OR e.archived_at IS NULL)
       ORDER BY bm25(expenses_fts), e.spent_on DESC, e.id DESC
       LIMIT ?`,
    )
    .all(
      ftsQuery,
      groupId,
      options.includeArchived ? 1 : 0,
      options.limit ?? 50,
    ) as ExpenseRow[];

  return rows.map(toExpense);
}
