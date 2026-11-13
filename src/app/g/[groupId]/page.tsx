import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BalancesPanel } from "@/components/group/balances-panel";
import { ExpensesTable } from "@/components/group/expenses-table";
import { GroupActions } from "@/components/group/group-actions";
import { GroupTabs } from "@/components/group/group-tabs";
import { RecordPaymentForm } from "@/components/group/record-payment-form";
import { SettlementHistory } from "@/components/group/settlement-history";
import { GroupHeader } from "@/components/group/group-header";
import { MembersPanel } from "@/components/group/members-panel";
import { ExpenseOverview } from "@/components/group/expense-overview";
import { SettleUpPanel } from "@/components/group/settle-up-panel";
import { SearchForm } from "@/components/group/search-form";
import { ArchivedExpensesTable } from "@/components/group/archived-expenses-table";
import { ArchivedMembersList } from "@/components/group/archived-members-list";
import { getAppDb } from "@/lib/db";
import { parseGroupViewParams, type GroupViewParams } from "@/lib/group-view";
import { groupIdSchema } from "@/lib/schemas";
import { NotFoundError } from "@/services/errors";
import { getGroup } from "@/services/group-service";
import { getGroupOverview } from "@/services/overview-service";
import { searchGroupExpenses } from "@/services/search-service";
import { getArchivedItems } from "@/services/archive-service";
import type { Expense } from "@/types";

import {
  addExpenseAction,
  addMemberAction,
  archiveExpenseAction,
  archiveMemberAction,
  recordManualPaymentAction,
  recordPaymentAction,
  restoreExpenseAction,
  restoreMemberAction,
} from "./actions";

type GroupPageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<GroupViewParams>;
};

export async function generateMetadata({
  params,
}: GroupPageProps): Promise<Metadata> {
  await connection();
  const parsedId = groupIdSchema.safeParse((await params).groupId);
  const fallback: Metadata = { title: { absolute: "Expense Splitter" } };
  if (!parsedId.success) return fallback;

  try {
    return { title: getGroup(getAppDb(), parsedId.data).name };
  } catch (error) {
    if (error instanceof NotFoundError) return fallback;
    throw error;
  }
}

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  await connection();
  const parsedId = groupIdSchema.safeParse((await params).groupId);
  if (!parsedId.success) notFound();
  const view = parseGroupViewParams(await searchParams);

  let overview;
  let searchResults: Expense[] | undefined;
  let archived: ReturnType<typeof getArchivedItems> | undefined;
  try {
    const db = getAppDb();
    overview = getGroupOverview(db, parsedId.data);
    if (view.q) searchResults = searchGroupExpenses(db, parsedId.data, view.q);
    if (view.showArchived) archived = getArchivedItems(db, parsedId.data);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const {
    group,
    members,
    balances,
    expenses,
    settlements,
    monthlyTotals,
    suggestedTransfers,
  } = overview;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return (
    <div className="min-w-0 space-y-8">
      <GroupHeader
        group={group}
        actions={
          <GroupActions
            key={group.id}
            groupId={group.id}
            members={members}
            currency={group.currency}
            today={today}
            expenseAction={addExpenseAction.bind(null, group.id)}
            memberAction={addMemberAction.bind(null, group.id)}
          />
        }
      />
      <GroupTabs
        key={group.id}
        expenses={
          <div className="min-w-0 space-y-12">
            <ExpenseOverview
              expenses={expenses}
              members={members}
              monthlyTotals={monthlyTotals}
              currency={group.currency}
            />
            <ExpensesTable
              expenses={searchResults ?? expenses}
              members={members}
              currency={group.currency}
              groupId={group.id}
              archiveAction={archiveExpenseAction.bind(null, group.id)}
              view={view}
              searchForm={
                <SearchForm
                  groupId={group.id}
                  {...view}
                  resultCount={searchResults?.length}
                />
              }
            />
            {archived && (
              <ArchivedExpensesTable
                expenses={archived.expenses}
                members={members}
                currency={group.currency}
                groupId={group.id}
                view={view}
                restoreAction={restoreExpenseAction.bind(null, group.id)}
              />
            )}
          </div>
        }
        balances={
          <div className="grid min-w-0 items-start gap-6 md:grid-cols-2">
            <BalancesPanel balances={balances} currency={group.currency} />
            <SettleUpPanel
              transfers={suggestedTransfers}
              members={members}
              currency={group.currency}
              groupId={group.id}
              suggestedAction={recordPaymentAction.bind(null, group.id)}
            />
          </div>
        }
        payments={
          <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[24rem_minmax(0,1fr)]">
            <RecordPaymentForm
              mode="manual"
              action={recordManualPaymentAction.bind(null, group.id)}
              groupId={group.id}
              members={members}
              currency={group.currency}
            />
            <SettlementHistory
              key={settlements[0]?.id ?? "empty"}
              settlements={settlements}
              members={members}
              currency={group.currency}
            />
          </div>
        }
        members={
          <MembersPanel
            members={members}
            groupId={group.id}
            archiveAction={archiveMemberAction.bind(null, group.id)}
            className="max-w-2xl"
            view={view}
            archivedMembers={archived && (
              <ArchivedMembersList
                members={archived.members}
                groupId={group.id}
                view={view}
                restoreAction={restoreMemberAction.bind(null, group.id)}
              />
            )}
          />
        }
      />
    </div>
  );
}
