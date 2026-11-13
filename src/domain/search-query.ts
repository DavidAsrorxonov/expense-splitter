const MAX_TERMS = 8;
const MAX_TERM_LENGTH = 50;

export function buildSearchQuery(input: string): string | null {
  const terms = input
    .split(/\s+/)
    .map((term) => term.replace(/"/g, "").slice(0, MAX_TERM_LENGTH))
    .filter((term) => /[\p{L}\p{N}]/u.test(term))
    .slice(0, MAX_TERMS);

  if (terms.length === 0) return null;
  return terms.map((term) => `"${term}"*`).join(" ");
}
