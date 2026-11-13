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

export function toDecimalString(minor: number, currency: CurrencyCode): string {
  if (!Number.isSafeInteger(minor)) {
    throw new RangeError("Amount must be a safe integer");
  }

  const decimals = decimalsFor(currency);
  const sign = minor < 0 ? "-" : "";
  const digits = String(Math.abs(minor));

  if (decimals === 0) return sign + digits;

  const padded = digits.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals);

  return `${sign}${whole}.${fraction}`;
}
