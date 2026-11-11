import type { Db } from "../db/connection";
import type { Transfer } from "../domain/minimze-transfers";
import { listExpenses, monthlyTotals } from "../repos/expenses";
import { listMembers } from "../repos/members";
import { listSettlements } from "../repos/settlements";
import type {
  Expense,
  Group,
  Member,
  MemberBalance,
  MonthlyTotal,
  Settlement,
} from "../types";
import { getGroupBalances } from "./balance-service";
import { getGroup } from "./group-service";
import { suggestSettlements } from "./settle-service";

export type GroupOverview = {
  group: Group;
  members: Member[];
  balances: MemberBalance[];
  expenses: Expense[];
  settlements: Settlement[];
  monthlyTotals: MonthlyTotal[];
  suggestedTransfers: Transfer[];
};

export function getGroupOverview(db: Db, groupId: string): GroupOverview {
  return db.transaction(
    (): GroupOverview => ({
      group: getGroup(db, groupId),
      members: listMembers(db, groupId, true),
      balances: getGroupBalances(db, groupId),
      expenses: listExpenses(db, groupId),
      settlements: listSettlements(db, groupId),
      monthlyTotals: monthlyTotals(db, groupId),
      suggestedTransfers: suggestSettlements(db, groupId),
    }),
  )();
}
