import { asc, desc, eq } from "drizzle-orm";
import { getAppSession } from "@/lib/auth-guards";
import { requireDb } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { appConfig } from "@/lib/env";
import { syncSourceById } from "@/lib/ingestion/sync";

const MAX_DUE_SOURCE_SYNC_PER_REQUEST = 6;

function isSourceDue(lastFetchedAt: Date | null, refreshMinutes: number, now: number) {
  if (!lastFetchedAt) {
    return true;
  }

  return now - lastFetchedAt.getTime() >= refreshMinutes * 60 * 1000;
}

export async function syncDueSourcesForCurrentOwner() {
  if (!appConfig.hasDatabase) {
    return { attempted: 0, completed: 0 };
  }

  const session = await getAppSession();
  const workspaceId = session?.user.defaultWorkspaceId;

  if (!workspaceId || session.user.role !== "owner") {
    return { attempted: 0, completed: 0 };
  }

  const db = requireDb();
  const activeSources = await db.query.sources.findMany({
    where: eq(sources.workspaceId, workspaceId),
    orderBy: [desc(sources.priority), asc(sources.name)],
  });

  const now = Date.now();
  const dueSources = activeSources
    .filter((source) => source.isActive)
    .filter((source) => isSourceDue(source.lastFetchedAt, source.refreshMinutes, now))
    .slice(0, MAX_DUE_SOURCE_SYNC_PER_REQUEST);

  if (dueSources.length === 0) {
    return { attempted: 0, completed: 0 };
  }

  const results = await Promise.allSettled(dueSources.map((source) => syncSourceById(source.id)));
  const completed = results.filter((result) => result.status === "fulfilled").length;

  return {
    attempted: dueSources.length,
    completed,
  };
}
