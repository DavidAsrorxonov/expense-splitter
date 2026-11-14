import { parseGroupViewParams } from "./group-view";

type SearchDraft = { value: string; serverQ: string; requestedQueries: string[] };

export function reconcileSearchDraft(draft: SearchDraft, serverQ: string): SearchDraft {
  return {
    ...draft,
    serverQ,
    value: draft.requestedQueries.includes(serverQ) ? draft.value : serverQ,
  };
}

export function createSearchDebouncer(search: (query: string) => void, delay = 1000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let runSearch = search;

  function cancel() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  function submit(value: string) {
    cancel();
    runSearch(parseGroupViewParams({ q: value }).q);
  }

  function schedule(value: string) {
    cancel();
    const query = parseGroupViewParams({ q: value }).q;
    if (!query) {
      runSearch("");
      return;
    }
    timer = setTimeout(() => {
      timer = undefined;
      runSearch(query);
    }, delay);
  }

  function setSearch(nextSearch: (query: string) => void) {
    runSearch = nextSearch;
  }

  return { schedule, submit, cancel, setSearch };
}
