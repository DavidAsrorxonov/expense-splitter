export function paginate<T>(items: readonly T[], requestedPage: number, pageSize = 10) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new RangeError("Page size must be a positive integer.");
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1));
  const offset = (page - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    page,
    pageCount,
    total: items.length,
    first: items.length === 0 ? 0 : offset + 1,
    last: Math.min(offset + pageSize, items.length),
  };
}
