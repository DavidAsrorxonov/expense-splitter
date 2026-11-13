import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildSearchQuery } from "@/domain/search-query";
import { groupHref, type GroupView } from "@/lib/group-view";

type SearchFormProps = GroupView & {
  groupId: string;
  resultCount?: number;
};

export function SearchForm({
  groupId,
  q,
  showArchived,
  resultCount = 0,
}: SearchFormProps) {
  let message = "";
  if (q) {
    if (buildSearchQuery(q) === null) {
      message = "Type at least one letter or number to search.";
    } else if (resultCount === 0) {
      message = `No expenses match “${q}”.`;
    } else if (resultCount >= 50) {
      message = `Showing the first 50 matches for “${q}”. Narrow your search to see more specific results.`;
    } else {
      message = `${resultCount} ${resultCount === 1 ? "expense matches" : "expenses match"} “${q}”.`;
    }
  }

  return (
    <div className="mb-6 space-y-4">
      <form
        action={`${groupHref(groupId, {})}#expenses-heading`}
        method="get"
        role="search"
        aria-label="Search expense notes"
        className="space-y-2"
      >
        <Label htmlFor="expense-search">Search notes</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            key={q}
            id="expense-search"
            name="q"
            type="text"
            inputMode="search"
            autoComplete="off"
            maxLength={100}
            defaultValue={q}
            className="basis-full sm:flex-1 sm:basis-64"
            aria-describedby="expense-search-help expense-search-status"
            placeholder="Type a keyword to search..."
          />
          {showArchived && <input type="hidden" name="archived" value="1" />}
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {q && (
            <a
              href={`${groupHref(groupId, { showArchived })}#expenses-heading`}
              className={buttonVariants({ variant: "link" })}
            >
              Clear search
            </a>
          )}
        </div>
        <p id="expense-search-help" className="text-sm text-text-secondary">
          Search active expense notes. Charts show all active spending.
        </p>
      </form>
      <p
        id="expense-search-status"
        role="status"
        aria-live="polite"
        className="text-sm wrap-anywhere"
      >
        {message}
      </p>
    </div>
  );
}
