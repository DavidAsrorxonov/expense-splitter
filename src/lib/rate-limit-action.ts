import { headers } from "next/headers";
import { fail, type ActionState } from "@/lib/action-state";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit-policy";
import {
  readRateLimitedValues,
  type RateLimitedForm,
} from "@/lib/rate-limit-values";

export async function rateLimitAction(
  kind: RateLimitedForm,
  formData: FormData,
): Promise<ActionState | null> {
  const ip = getClientIp(await headers());
  const policy = kind === "createGroup" ? "createGroup" : "write";
  const result = checkRateLimit(policy, ip);

  if (result.allowed) return null;

  return fail(rateLimitMessage(result.retryAfterSeconds), {
    values: readRateLimitedValues(formData, kind),
  });
}
