import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { appConfig, env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>> | null;
type DbClient = ReturnType<typeof postgres> | null;

declare global {
  var __signalDeckDb__: DbInstance | undefined;
  var __signalDeckDbClient__: DbClient | undefined;
  var __signalDeckDbClientSignature__: string | undefined;
}

function getDbClientSignature(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return "no-db";
  }

  const shouldForceSingleConnection =
    env.NODE_ENV === "development" ||
    databaseUrl.includes("pooler.supabase.com") ||
    databaseUrl.includes("pgbouncer=true");

  return `${shouldForceSingleConnection ? 1 : 10}:${databaseUrl}`;
}

function createDbClient(databaseUrl: string | undefined) {
  if (!appConfig.hasDatabase || !env.DATABASE_URL) {
    return null;
  }

  const shouldForceSingleConnection =
    env.NODE_ENV === "development" ||
    databaseUrl?.includes("pooler.supabase.com") ||
    databaseUrl?.includes("pgbouncer=true");

  return postgres(env.DATABASE_URL, {
    prepare: false,
    max: shouldForceSingleConnection ? 1 : 10,
  });
}

function createDb(client: DbClient) {
  if (!client) {
    return null;
  }

  return drizzle(client, {
    schema,
  });
}

const dbClientSignature = getDbClientSignature(env.DATABASE_URL);

if (
  globalThis.__signalDeckDbClient__ &&
  globalThis.__signalDeckDbClientSignature__ !== dbClientSignature
) {
  void globalThis.__signalDeckDbClient__.end({ timeout: 0 });
  globalThis.__signalDeckDbClient__ = undefined;
}

const dbClient = globalThis.__signalDeckDbClient__ ?? createDbClient(env.DATABASE_URL);

// Keep the Postgres client stable in dev, but recreate the Drizzle wrapper so
// schema additions during HMR don't leave db.query missing newly added tables.
export const db =
  env.NODE_ENV === "production"
    ? globalThis.__signalDeckDb__ ?? createDb(dbClient)
    : createDb(dbClient);

if (env.NODE_ENV !== "production") {
  globalThis.__signalDeckDbClient__ = dbClient;
  globalThis.__signalDeckDbClientSignature__ = dbClientSignature;
} else {
  globalThis.__signalDeckDb__ = db;
}

export function requireDb() {
  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return db;
}
