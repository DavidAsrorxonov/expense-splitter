"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="flex max-w-2xl flex-col items-start gap-6">
      <h1 className="text-3xl leading-9 font-medium tracking-[-0.035em]">
        Something went wrong.
      </h1>
      <Button type="button" variant="outline" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
