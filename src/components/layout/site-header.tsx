import Link from "next/link";
import { PageFrame } from "./page-frame";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="border-b border-border py-6">
      <PageFrame>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-lg font-medium underline-offset-4 hover:underline"
          >
            Expense Splitter
          </Link>
          <ThemeToggle />
        </div>
      </PageFrame>
    </header>
  );
}
