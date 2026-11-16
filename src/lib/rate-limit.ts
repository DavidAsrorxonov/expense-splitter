export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export type RateLimiterOptions = {
  windowMs: number;
  max: number;
  maxKeys?: number;
  now?: () => number;
};

type Entry = {
  count: number;
  expiresAt: number;
};

export function createRateLimiter({
  windowMs,
  max,
  maxKeys = 10_000,
  now = Date.now,
}: RateLimiterOptions): {
  check(key: string): RateLimitResult;
} {
  for (const [name, value] of Object.entries({
    windowMs,
    max,
    maxKeys,
  })) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`${name} must be a positive safe integer.`);
    }
  }

  const entries = new Map<string, Entry>();

  return {
    check(key) {
      const timestamp = now();

      for (const [entryKey, entry] of entries) {
        if (entry.expiresAt <= timestamp) {
          entries.delete(entryKey);
        }
      }

      const existing = entries.get(key);

      if (existing) {
        if (existing.count >= max) {
          return {
            allowed: false,
            retryAfterSeconds: Math.max(
              1,
              Math.ceil((existing.expiresAt - timestamp) / 1000),
            ),
          };
        }

        existing.count += 1;
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (entries.size >= maxKeys) {
        const oldestKey = entries.keys().next().value;

        if (oldestKey !== undefined) {
          entries.delete(oldestKey);
        }
      }

      entries.set(key, {
        count: 1,
        expiresAt: timestamp + windowMs,
      });

      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
