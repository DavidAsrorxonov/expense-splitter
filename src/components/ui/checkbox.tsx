"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-5 shrink-0 items-center justify-center border border-input bg-background text-foreground after:absolute after:-inset-3 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-foreground focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:text-text-meta data-checked:border-brand-accent data-checked:bg-brand-accent data-checked:text-brand-accent-foreground data-disabled:border-input data-disabled:bg-muted data-disabled:text-text-meta aria-invalid:border-destructive",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-content-center text-current">
        <CheckIcon className="size-4" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
