import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BalancesPanel } from "@/components/group/balances-panel";
import { ExpensesTable } from "@/components/group/expenses-table";
import { GroupHeader } from "@/components/group/group-header";
import { MembersPanel } from "@/components/group/members-panel";
import { MonthlyTotals } from "@/components/group/monthly-totals";
import { SettleUpPanel } from "@/components/group/settle-up-panel";
import { getAppDb } from "@/lib/db";
import { groupIdSchema } from "@/lib/schemas";
import { NotFoundError } from "@/services/errors";
import { getGroup } from "@/services/group-service";
import { getGroupOverview } from "@/services/overview-service";

type GroupPageProps = { params: Promise<{ groupId: string }> };

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
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

export default async function GroupPage({ params }: GroupPageProps) {
  await connection();
  const parsedId = groupIdSchema.safeParse((await params).groupId);
  if (!parsedId.success) notFound();

  let overview;
  try {
    overview = getGroupOverview(getAppDb(), parsedId.data);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const { group, members, balances, expenses, settlements, monthlyTotals, suggestedTransfers } = overview;
  return (
    <div className="min-w-0 space-y-12">
      <GroupHeader group={group} />
      <div className="grid min-w-0 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:[grid-template-areas:'expenses_balances'_'expenses_settle'_'totals_members']">
        <BalancesPanel balances={balances} currency={group.currency} className="lg:[grid-area:balances]" />
        <SettleUpPanel transfers={suggestedTransfers} settlements={settlements} members={members} currency={group.currency} className="lg:[grid-area:settle]" />
        <ExpensesTable expenses={expenses} members={members} currency={group.currency} className="lg:[grid-area:expenses]" />
        <MonthlyTotals totals={monthlyTotals} currency={group.currency} className="lg:[grid-area:totals]" />
        <MembersPanel members={members} className="lg:[grid-area:members]" />
      </div>
    </div>
  );
}
