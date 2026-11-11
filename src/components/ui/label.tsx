import * as React from "react"
import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-relaxed font-medium text-foreground group-data-[disabled=true]:text-text-meta peer-disabled:cursor-not-allowed peer-disabled:text-text-meta",
        className
      )}
      {...props}
    />
  )
}

export { Label }
