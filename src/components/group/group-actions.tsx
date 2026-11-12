"use client";

import { useCallback, useState } from "react";
import { Check } from "lucide-react";
import { FormDialog } from "@/components/forms/form-dialog";
import type { CurrencyCode } from "@/domain/currency";
import type { FormAction } from "@/lib/action-state";
import type { Member } from "@/types";
import { AddExpenseForm } from "./add-expense-form";
import { AddMemberForm } from "./add-member-form";

type GroupActionsProps = {
  groupId: string;
  members: readonly Member[];
  currency: CurrencyCode;
  today: string;
  expenseAction: FormAction;
  memberAction: FormAction;
};

export function GroupActions({ groupId, members, currency, today, expenseAction, memberAction }: GroupActionsProps) {
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const expenseSaved = useCallback(() => {
    setExpenseOpen(false);
    setNotice("Expense added.");
  }, []);
  const memberSaved = useCallback(() => {
    setMemberOpen(false);
    setNotice("Member added.");
  }, []);

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap gap-3">
        <FormDialog title="Add expense" description="Record an expense and choose who shares it."
          primary open={expenseOpen} onOpenChange={(open) => { setExpenseOpen(open); if (open) setNotice(""); }}>
          <AddExpenseForm action={expenseAction} groupId={groupId} members={members} currency={currency} today={today} onSuccess={expenseSaved} />
        </FormDialog>
        <FormDialog title="Add member" description="Add someone to this group."
          open={memberOpen} onOpenChange={(open) => { setMemberOpen(open); if (open) setNotice(""); }}>
          <AddMemberForm action={memberAction} groupId={groupId} onSuccess={memberSaved} />
        </FormDialog>
      </div>
      <p role="status" aria-live="polite" className="flex items-start gap-2 text-sm">
        {notice && <><Check className="mt-1 size-4 shrink-0" aria-hidden="true" />{notice}</>}
      </p>
    </div>
  );
}
