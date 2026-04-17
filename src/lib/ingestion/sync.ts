import { and, eq, inArray, or } from "drizzle-orm";
import { appConfig } from "@/lib/env";
import { requireDb } from "@/lib/db";
import {
  feedItems,
  feedItemSources,
  feedItemTags,
  ingestionRuns,
  sources,
} from "@/lib/db/schema";
import { normalizeFeedItemUrl } from "@/lib/feed-item-identity";
import { ingestSource } from "@/lib/ingestion";
import { getAdminSnapshot } from "@/lib/repositories/app-repository";

export async function syncSourceById(sourceId: string) {
  const startedAt = new Date();
  const snapshot = await getAdminSnapshot();
  const source = snapshot.sources.find((entry) => entry.id === sourceId);

  if (!source) {
    return { skipped: true, sourceId };
  }

  const applicableRules = snapshot.rules.filter((rule) => !rule.sourceId || rule.sourceId === source.id);

  if (!appConfig.hasDatabase) {
    const result = await ingestSource(source, applicableRules);
    return {
      sourceId,
      skipped: false,
      fetchedCount: result.items.length,
      createdCount: 0,
      dedupedCount: 0,
      warnings: result.warnings,
    };
  }

  const db = requireDb();

  try {
    const result = await ingestSource(source, applicableRules);
    const fingerprints = [...new Set(result.items.map((item) => item.fingerprint!).filter(Boolean))];
    const canonicalUrls = [...new Set(result.items.map((item) => normalizeFeedItemUrl(item.canonicalUrl)).filter(Boolean))];
    const existingItems =
      fingerprints.length > 0 || canonicalUrls.length > 0
        ? await db.query.feedItems.findMany({
            where: and(
              eq(feedItems.workspaceId, source.workspaceId),
              or(
                fingerprints.length > 0 ? inArray(feedItems.fingerprint, fingerprints) : undefined,
                canonicalUrls.length > 0 ? inArray(feedItems.canonicalUrl, canonicalUrls) : undefined,
              ),
            ),
          })
        : [];

    const existingByFingerprint = new Map(existingItems.map((item) => [item.fingerprint, item]));
    const existingByCanonicalUrl = new Map(
      existingItems.map((item) => [normalizeFeedItemUrl(item.canonicalUrl), item]),
    );
    let createdCount = 0;
    let dedupedCount = 0;

    for (const item of result.items) {
      const fingerprint = item.fingerprint!;
      const canonicalUrl = normalizeFeedItemUrl(item.canonicalUrl);
      const existing = existingByFingerprint.get(fingerprint) ?? existingByCanonicalUrl.get(canonicalUrl);

      let feedItemId = existing?.id;

      if (!feedItemId) {
        const [inserted] = await db
          .insert(feedItems)
          .values({
            workspaceId: source.workspaceId,
            entityId: source.entityId,
            primarySourceId: source.id,
            title: item.title,
            excerpt: item.excerpt,
            canonicalUrl,
            contentType: item.contentType,
            publishedAt: item.publishedAt,
            ingestedAt: new Date(),
            fingerprint,
            authorName: item.authorName ?? null,
            authorAvatarUrl: item.authorAvatarUrl ?? null,
            thumbnailUrl: item.thumbnailUrl ?? null,
          })
          .returning();

        feedItemId = inserted.id;
        existingByFingerprint.set(fingerprint, inserted);
        existingByCanonicalUrl.set(canonicalUrl, inserted);
        createdCount += 1;
      } else {
        dedupedCount += 1;
      }

      await db
        .insert(feedItemSources)
        .values({
          feedItemId,
          sourceId: source.id,
        })
        .onConflictDoNothing();

      if ((item.tagIds ?? []).length > 0) {
        await db
          .insert(feedItemTags)
          .values(
            (item.tagIds ?? []).map((tagId) => ({
              feedItemId,
              tagId,
            })),
          )
          .onConflictDoNothing();
      }
    }

    await db
      .update(sources)
      .set({
        config:
          result.sourceAvatarUrl && source.type === "x"
            ? {
                ...source.config,
                avatarUrl: result.sourceAvatarUrl,
              }
            : source.config,
        lastFetchedAt: new Date(),
        healthStatus: result.warnings.length > 0 ? "degraded" : "healthy",
        lastErrorMessage: result.warnings.length > 0 ? result.warnings.join(" | ") : null,
        updatedAt: new Date(),
      })
      .where(eq(sources.id, source.id));

    await db.insert(ingestionRuns).values({
      workspaceId: source.workspaceId,
      sourceId: source.id,
      adapter: source.type,
      status: result.warnings.length > 0 ? "partial" : "success",
      fetchedCount: result.items.length,
      createdCount,
      dedupedCount,
      startedAt,
      finishedAt: new Date(),
      durationMs: Date.now() - startedAt.getTime(),
      logs: result.warnings,
    });

    return {
      sourceId,
      skipped: false,
      fetchedCount: result.items.length,
      createdCount,
      dedupedCount,
      warnings: result.warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";

    await db
      .update(sources)
      .set({
        healthStatus: "error",
        lastErrorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(sources.id, source.id));

    await db.insert(ingestionRuns).values({
      workspaceId: source.workspaceId,
      sourceId: source.id,
      adapter: source.type,
      status: "failed",
      fetchedCount: 0,
      createdCount: 0,
      dedupedCount: 0,
      startedAt,
      finishedAt: new Date(),
      durationMs: Date.now() - startedAt.getTime(),
      errorMessage: message,
      logs: [message],
    });

    throw error;
  }
}
