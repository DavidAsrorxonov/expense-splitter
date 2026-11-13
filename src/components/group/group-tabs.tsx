"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { GroupPanelVisibilityContext } from "./group-panel-visibility";

const tabs = [
  { value: "expenses", label: "Expenses" },
  { value: "balances", label: "Balances" },
  { value: "payments", label: "Payments" },
  { value: "members", label: "Members" },
] as const;

type GroupTabsProps = Record<(typeof tabs)[number]["value"], ReactNode>;
type GroupTab = (typeof tabs)[number]["value"];

const subscribeHydration = () => () => {};
const readHash = () => window.location.hash;
const serverHash = () => "";
function subscribeHash(notify: () => void) {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
}

function tabForHash(hash: string): GroupTab {
  return tabs.find(({ value }) => [
    `#group-section-${value}`, `#${value}-heading`, `#archived-${value}-heading`,
  ].includes(hash))?.value ?? "expenses";
}

export function GroupTabs(panels: GroupTabsProps) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const hash = useSyncExternalStore(subscribeHash, readHash, serverHash);
  const [selection, setSelection] = useState<{ hash: string; value: GroupTab } | null>(null);
  const activeTab = selection?.hash === hash ? selection.value : tabForHash(hash);

  return (
    <Tabs.Root value={activeTab} onValueChange={(value) => {
      const tab = tabs.find((tab) => tab.value === value);
      if (tab) setSelection({ hash, value: tab.value });
    }} className="min-w-0">
      {!hydrated && (
        <nav aria-label="Group sections" className="flex flex-wrap gap-4 border-b border-border">
          {tabs.map((tab) => (
            <a key={tab.value} id={`group-section-link-${tab.value}`} href={`#group-section-${tab.value}`}
              className="min-h-11 py-3 text-sm underline underline-offset-4">
              {tab.label}
            </a>
          ))}
        </nav>
      )}
      <Tabs.List activateOnFocus aria-label="Group sections" hidden={!hydrated}
        className={hydrated ? "grid grid-cols-4 border-b border-border" : "hidden"}>
        {tabs.map((tab) => (
          <Tabs.Tab key={tab.value} value={tab.value}
            className="min-h-11 min-w-0 border-b-2 border-transparent px-1 py-3 text-xs font-medium text-text-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-foreground focus-visible:-outline-offset-2 data-active:border-foreground data-active:text-foreground sm:px-4 sm:text-sm">
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Panel key={tab.value} value={tab.value} keepMounted
          className={`min-w-0 pt-8${hydrated ? " data-hidden:hidden" : ""}`}
          render={(props, state) => (
            <div {...props}>
              <GroupPanelVisibilityContext.Provider value={!hydrated || (activeTab === tab.value && !state.hidden)}>
                {props.children}
              </GroupPanelVisibilityContext.Provider>
            </div>
          )}
          {...(!hydrated ? {
            hidden: false, inert: false, role: "region", tabIndex: -1,
            "aria-labelledby": `group-section-link-${tab.value}`,
          } : {})}>
          <div id={`group-section-${tab.value}`} className="min-w-0">
            {panels[tab.value]}
          </div>
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
