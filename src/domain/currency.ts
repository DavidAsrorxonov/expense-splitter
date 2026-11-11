export const CURRENCIES = {
  JPY: { decimals: 0 },
  USD: { decimals: 2 },
  EUR: { decimals: 2 },
  UZS: { decimals: 2 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export function isCurrencyCode(value: string): value is CurrencyCode {
  return value in CURRENCIES;
}

export function decimalsFor(currency: CurrencyCode) {
  return CURRENCIES[currency].decimals;
}
