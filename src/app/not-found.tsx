import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex max-w-2xl flex-col items-start gap-4">
      <h1 className="text-3xl leading-9 font-medium tracking-[-0.035em]">
        Group not found
      </h1>
      <p className="text-text-secondary">
        This group doesn&apos;t exist or the link is wrong.
      </p>
      <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">
        Return to Expense Splitter
      </Link>
    </div>
  );
}
