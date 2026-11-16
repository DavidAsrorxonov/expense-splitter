import { connection } from "next/server";
import { getClientIp } from "@/lib/client-ip";
import { getAppDb } from "@/lib/db";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit-policy";
import { groupIdSchema } from "@/lib/schemas";
import { NotFoundError } from "@/services/errors";
import { exportExpensesCsv } from "@/services/export-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  await connection();

  const ip = getClientIp(request.headers);
  const result = checkRateLimit("csv", ip);

  if (!result.allowed) {
    return new Response(rateLimitMessage(result.retryAfterSeconds), {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    });
  }

  const parsedId = groupIdSchema.safeParse((await params).groupId);

  if (!parsedId.success) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const includeArchived =
    new URL(request.url).searchParams.get("archived") === "1";

  try {
    const { filename, content } = exportExpensesCsv(getAppDb(), parsedId.data, {
      includeArchived,
    });

    return new Response(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return new Response("Not found", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }

    throw error;
  }
}
