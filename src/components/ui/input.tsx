import type { ComponentProps } from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "min-h-11 w-full min-w-0 border border-input bg-background px-3 py-3 text-base text-foreground placeholder:text-text-meta focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-foreground focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-text-meta aria-invalid:border-destructive file:border-0 file:bg-transparent file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
