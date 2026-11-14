"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildSearchQuery } from "@/domain/search-query";
import {
  groupHref,
  parseGroupViewParams,
  type GroupView,
} from "@/lib/group-view";
import {
  createSearchDebouncer,
  reconcileSearchDraft,
} from "@/lib/search-debouncer";

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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const [debouncer] = useState(() => createSearchDebouncer(() => {}));
  const [draft, setDraft] = useState({
    value: q,
    serverQ: q,
    requestedQueries: [] as string[],
  });

  // A response to our own navigation must not overwrite newer typing. External
  // query changes still update the input, without remounting it or losing focus.
  if (draft.serverQ !== q) {
    setDraft(reconcileSearchDraft(draft, q));
  }

  useLayoutEffect(() => {
    debouncer.setSearch((query) => {
      setDraft((current) => ({
        ...current,
        requestedQueries: current.requestedQueries.includes(query)
          ? current.requestedQueries
          : [...current.requestedQueries, query],
      }));
      startTransition(() => {
        router.replace(
          `${groupHref(groupId, { q: query, showArchived })}#expenses-heading`,
          { scroll: false },
        );
      });
    });
  }, [debouncer, groupId, showArchived, router, startTransition]);

  useEffect(() => {
    const onPopState = () => {
      debouncer.cancel();
      composing.current = false;
      const query = parseGroupViewParams({
        q: new URL(window.location.href).searchParams.get("q") ?? "",
      }).q;
      setDraft((current) => ({
        ...current,
        value: query,
        requestedQueries: [],
      }));
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      debouncer.cancel();
      window.removeEventListener("popstate", onPopState);
    };
  }, [debouncer]);

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
        aria-busy={pending}
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!composing.current)
            debouncer.submit(inputRef.current?.value ?? draft.value);
        }}
      >
        <Label htmlFor="expense-search">Search notes</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            ref={inputRef}
            id="expense-search"
            name="q"
            type="text"
            inputMode="search"
            autoComplete="off"
            maxLength={100}
            value={draft.value}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDraft((current) => ({ ...current, value }));
              if (!composing.current) debouncer.schedule(value);
            }}
            onCompositionStart={() => {
              composing.current = true;
              debouncer.cancel();
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              const value = event.currentTarget.value;
              setDraft((current) => ({ ...current, value }));
              debouncer.schedule(value);
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                (event.nativeEvent.isComposing || composing.current)
              )
                event.preventDefault();
            }}
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
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                event.preventDefault();
                composing.current = false;
                setDraft((current) => ({ ...current, value: "" }));
                debouncer.submit("");
                inputRef.current?.focus();
              }}
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
        {pending ? "Searching…" : message}
      </p>
    </div>
  );
}
