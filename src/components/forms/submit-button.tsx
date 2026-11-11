"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  children: string;
  pendingLabel?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  disabled?: boolean;
  "aria-label"?: string;
};

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant,
  disabled = false,
  "aria-label": ariaLabel,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending || disabled} aria-disabled={pending || disabled} aria-label={pending ? pendingLabel : ariaLabel}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
