import { createRateLimiter, type RateLimitResult } from "./rate-limit";

export const RATE_LIMIT_POLICY = {
  createGroupIp: {
    windowMs: 60 * 60 * 1000,
    max: 5,
  },
  createGroupGlobal: {
    windowMs: 60 * 60 * 1000,
    max: 60,
    maxKeys: 1,
  },
  write: {
    windowMs: 60 * 1000,
    max: 60,
  },
  csv: {
    windowMs: 60 * 1000,
    max: 10,
  },
} as const;

export type RateLimitKind = "createGroup" | "write" | "csv";

function createPolicyLimiters() {
  return {
    createGroupIp: createRateLimiter(RATE_LIMIT_POLICY.createGroupIp),
    createGroupGlobal: createRateLimiter(RATE_LIMIT_POLICY.createGroupGlobal),
    write: createRateLimiter(RATE_LIMIT_POLICY.write),
    csv: createRateLimiter(RATE_LIMIT_POLICY.csv),
  };
}

const globalForRateLimits = globalThis as unknown as {
  __expenseRateLimiters?: ReturnType<typeof createPolicyLimiters>;
};

function getRateLimiters() {
  globalForRateLimits.__expenseRateLimiters ??= createPolicyLimiters();
  return globalForRateLimits.__expenseRateLimiters;
}

export function checkRateLimit(
  kind: RateLimitKind,
  ip: string,
): RateLimitResult {
  const limiters = getRateLimiters();

  if (kind === "createGroup") {
    const perIp = limiters.createGroupIp.check(ip);

    if (!perIp.allowed) return perIp;

    return limiters.createGroupGlobal.check("global");
  }

  return limiters[kind].check(ip);
}

export function rateLimitMessage(retryAfterSeconds: number): string {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
  const unit = seconds === 1 ? "second" : "seconds";

  return `Too many requests. Try again in ${seconds} ${unit}.`;
}
