import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {(hint || error) && (
        <div id={`${id}-description`} className="space-y-1 text-sm">
          {hint && <p className="text-text-meta">{hint}</p>}
          {error && <p className="text-destructive">Error: {error}</p>}
        </div>
      )}
    </div>
  );
}
