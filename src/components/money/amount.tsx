import type { CurrencyCode } from "@/domain/currency";
import { formatAmount } from "@/domain/money";
import { cn } from "@/lib/utils";

type AmountProps = { minor: number; currency: CurrencyCode; className?: string };

export function Amount({ minor, currency, className }: AmountProps) {
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {formatAmount(minor, currency).replace(/^-/, "−")}
    </span>
  );
}
