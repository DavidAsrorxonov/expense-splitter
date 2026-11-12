"use client";

import { useState } from "react";
import { Amount } from "@/components/money/amount";
import { Button } from "@/components/ui/button";
import type { CurrencyCode } from "@/domain/currency";
import { paginate } from "@/lib/pagination";
import { memberName } from "@/lib/presenters";
import type { Member, Settlement } from "@/types";

type SettlementHistoryProps = {
  settlements: readonly Settlement[];
  members: readonly Member[];
  currency: CurrencyCode;
};

export function SettlementHistory({ settlements, members, currency }: SettlementHistoryProps) {
  const [requestedPage, setRequestedPage] = useState(1);
  const { items, page, pageCount, total, first, last } = paginate(settlements, requestedPage);
  return (
    <section aria-labelledby="settlement-history-heading" className="min-w-0">
      <h2 id="settlement-history-heading" className="text-xl font-medium">Recorded payments</h2>
      <p className="mt-2 text-sm text-text-meta">To reverse an incorrect entry, record the same amount in the opposite direction.</p>
      {total === 0 ? (
        <p className="mt-6 text-sm text-text-secondary">No payments recorded yet.</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-border py-3">
            <p role="status" aria-live="polite" className="text-sm text-text-secondary">
              {first}–{last} of {total} payments · Page {page} of {pageCount}
            </p>
            {pageCount > 1 && (
              <nav aria-label="Payment history pages" className="flex gap-2">
                <Button variant="outline" disabled={page === 1} onClick={() => setRequestedPage(page - 1)} aria-label="Previous page of payments">Previous</Button>
                <Button variant="outline" disabled={page === pageCount} onClick={() => setRequestedPage(page + 1)} aria-label="Next page of payments">Next</Button>
              </nav>
            )}
          </div>
          <ol start={first} className="mt-4 divide-y divide-border">
            {items.map((settlement) => (
              <li key={settlement.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                <p className="text-sm">
                  {memberName(settlement.fromMember, members)} to {memberName(settlement.toMember, members)}
                  {" — "}<Amount minor={settlement.amountMinor} currency={currency} />
                </p>
                <time dateTime={settlement.createdAt} className="block font-mono text-xs text-text-meta">
                  {settlement.createdAt.slice(0, 10)} (UTC)
                </time>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
