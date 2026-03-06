import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { appConfig, env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>> | null;

declare global {
  var __signalDeckDb__: DbInstance | undefined;
}

function createDb() {
  if (!appConfig.hasDatabase || !env.DATABASE_URL) {
    return null;
  }

  const client = postgres(env.DATABASE_URL, {
    prepare: false,
  });

  return drizzle(client, {
    schema,
  });
}

export const db = globalThis.__signalDeckDb__ ?? createDb();

if (env.NODE_ENV !== "production") {
  globalThis.__signalDeckDb__ = db;
}

export function requireDb() {
  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return db;
}
