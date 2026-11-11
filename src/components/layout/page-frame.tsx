import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function PageFrame({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={cn("w-full px-6 sm:px-12 lg:px-20", className)} {...props}>
      <div className="mx-auto w-full min-w-0 max-w-6xl">{children}</div>
    </div>
  );
}
