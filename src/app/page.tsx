import { BladeAccent } from "@/components/brand/blade-accent";

export default function Home() {
  return (
    <div className="flex max-w-2xl flex-col items-start gap-8">
      <BladeAccent />
      <h1 className="text-[clamp(2.25rem,6vw,3.75rem)] leading-none font-medium tracking-[-0.045em]">
        Shared expenses,
        <br />
        settled simply.
      </h1>
      <p className="max-w-[62ch] text-base text-text-secondary">
        Keep track of shared expenses and see who owes whom.
      </p>
    </div>
  );
}
