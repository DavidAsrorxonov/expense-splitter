import { decimalsFor, type CurrencyCode } from "./currency";

export function parseAmount(
  input: string,
  currency: CurrencyCode,
): number | null {
  const decimals = decimalsFor(currency);
  const cleaned = input.trim().replace(/,/g, "");
  const pattern =
    decimals === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
  if (!pattern.test(cleaned)) return null;

  const [whole, fraction = ""] = cleaned.split(".");

  const minor = Number(whole + fraction.padEnd(decimals, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}

export function formatAmount(
  minor: number,
  currency: CurrencyCode,
  locale = "en-US",
): string {
  const decimals = decimalsFor(currency);
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    minor / 10 ** decimals,
  );
}
