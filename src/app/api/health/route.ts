import { connection } from "next/server";
import { getAppDb } from "@/lib/db";
import { checkHealth } from "@/services/health-service";

export async function GET() {
  // Keep Next.js request-time control flow outside database error handling.
  await connection();

  try {
    const health = checkHealth(getAppDb());
    if (health.ok) {
      return Response.json(
        { status: "ok", schemaVersion: health.schemaVersion },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch (error) {
    console.error("[health] Database initialization or check failed", error);
  }

  return Response.json(
    { status: "error" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
