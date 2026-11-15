export function resolveDatabasePath(env: {
  NODE_ENV?: string;
  DATABASE_PATH?: string;
}): string {
  const filename = env.DATABASE_PATH?.trim();
  if (filename) return filename;

  if (env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_PATH must be set in production (point it at the mounted volume, for example /data/app.db)",
    );
  }

  return "data/app.db";
}
