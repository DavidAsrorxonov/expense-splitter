import { format, isValid, parse } from "date-fns";
import { enUS } from "date-fns/locale";

// Parse calendar dates in local time, never as UTC timestamps or permissive Date strings.
export function parseDateInput(value: string): Date | undefined {
  const text = value.trim();
  const pattern = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? "yyyy-MM-dd"
    : /^[A-Za-z]+ \d{1,2}, \d{4}$/.test(text)
      ? "MMMM d, yyyy"
      : undefined;
  if (!pattern) return undefined;
  const date = parse(text, pattern, new Date(2000, 0, 1), { locale: enUS });
  return isValid(date) ? date : undefined;
}

export function formatDateInput(date: Date): string {
  return format(date, "MMMM dd, yyyy", { locale: enUS });
}

export function dateInputValue(value: string): string {
  const date = parseDateInput(value);
  // Preserve invalid text so the existing server validator can reject and redisplay it.
  return date ? format(date, "yyyy-MM-dd") : value;
}
