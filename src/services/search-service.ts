import { Db } from "@/db/connection";
import { findGroup } from "@/repos/groups";
import { Expense } from "@/types";
import { NotFoundError } from "./errors";
import { buildSearchQuery } from "@/domain/search-query";
import { searchExpenses as searchExpenseRows } from "@/repos/expenses";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Searches expense notes in one group, best match first.
 * Returns [] when the text has nothing searchable; the UI shows the normal
 * list when the search box is empty.
 */
export function searchGroupExpenses(
  db: Db,
  groupId: string,
  text: string,
  options: { includeArchived?: boolean; limit?: number } = {},
): Expense[] {
  if (!findGroup(db, groupId)) throw new NotFoundError("Group not found");

  const query = buildSearchQuery(text);
  if (!query) return [];

  const requestedLimit = options.limit ?? DEFAULT_LIMIT;
  const limit = Number.isNaN(requestedLimit)
    ? DEFAULT_LIMIT
    : Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_LIMIT);

  return searchExpenseRows(db, groupId, query, {
    includeArchived: options.includeArchived,
    limit,
  });
}
