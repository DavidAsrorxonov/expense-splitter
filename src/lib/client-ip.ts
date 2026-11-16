import { isIP } from "node:net";

type HeaderReader = {
  get(name: string): string | null;
};

/**
 * Assumes requests arrive directly through Railway's public HTTP edge.
 * Revisit this trust boundary if another proxy or ingress is introduced.
 */
export function getClientIp(headers: HeaderReader): string {
  const value = headers.get("x-real-ip")?.trim();

  if (
    !value ||
    value.length > 45 ||
    value.includes(",") ||
    value.includes("%")
  ) {
    return "unknown";
  }

  const version = isIP(value);
  if (version === 4) return value;
  if (version === 6) {
    return new URL(`http://[${value}]/`).hostname.slice(1, -1);
  }

  return "unknown";
}
