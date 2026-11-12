"use client";

import type { ReactNode } from "react";
import { Tabs } from "@base-ui/react/tabs";

const tabs = [
  { value: "expenses", label: "Expenses" },
  { value: "balances", label: "Balances" },
  { value: "payments", label: "Payments" },
  { value: "members", label: "Members" },
] as const;

type GroupTabsProps = Record<(typeof tabs)[number]["value"], ReactNode>;

export function GroupTabs(panels: GroupTabsProps) {
  return (
    <Tabs.Root defaultValue="expenses" className="min-w-0">
      <Tabs.List activateOnFocus aria-label="Group sections" className="grid grid-cols-4 border-b border-border">
        {tabs.map((tab) => (
          <Tabs.Tab key={tab.value} value={tab.value}
            className="min-h-11 min-w-0 border-b-2 border-transparent px-1 py-3 text-xs font-medium text-text-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-foreground focus-visible:-outline-offset-2 data-active:border-foreground data-active:text-foreground sm:px-4 sm:text-sm">
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Panel key={tab.value} value={tab.value} keepMounted className="min-w-0 pt-8 data-hidden:hidden">
          {panels[tab.value]}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
