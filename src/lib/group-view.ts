export type GroupViewParams = {
  q?: string | string[];
  archived?: string | string[];
};

export type GroupView = {
  q: string;
  showArchived: boolean;
};

const MAX_SEARCH_LENGTH = 100;

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseGroupViewParams(raw: GroupViewParams): GroupView {
  return {
    q: firstValue(raw.q).trim().slice(0, MAX_SEARCH_LENGTH),
    showArchived: firstValue(raw.archived) === "1",
  };
}

export function groupHref(
  groupId: string,
  view: Partial<GroupView>,
): string {
  const { q } = parseGroupViewParams({ q: view.q });
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (view.showArchived) params.set("archived", "1");

  const query = params.toString().replace(/\+/g, "%20");
  const pathname = `/g/${encodeURIComponent(groupId)}`;
  return query ? `${pathname}?${query}` : pathname;
}
