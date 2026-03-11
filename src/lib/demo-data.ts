import type {
  AdminSnapshot,
  DashboardFilters,
  DashboardSnapshot,
  FeedItemRecord,
  SourceRecord,
  UserItemStateRecord,
  ViewerContext,
} from "@/lib/domain";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import { ingestSource } from "@/lib/ingestion";
import {
  defaultWorkspace,
  seedEntities,
  seedFeedItems,
  seedRules,
  seedSources,
  seedTags,
} from "@/lib/seed";
import { slugify } from "@/lib/utils";

const LIVE_DEMO_TIMEOUT_MS = 2_000;

function isLiveDemoSource(source: SourceRecord) {
  return source.isActive && source.config.liveDemo === true;
}

function buildLiveDemoItemId(sourceId: string, canonicalUrl: string, title: string) {
  const statusId = canonicalUrl.match(/status\/(\d+)/)?.[1];
  return statusId ? `live_${sourceId}_${statusId}` : `live_${sourceId}_${slugify(title).slice(0, 48)}`;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T) {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);

    void promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

async function getLiveDemoFeedItems() {
  if (process.env.NODE_ENV === "test") {
    return [];
  }

  const liveSources = seedSources.filter(isLiveDemoSource);
  if (liveSources.length === 0) {
    return [];
  }

  const existingUrls = new Set(seedFeedItems.map((item) => item.canonicalUrl));
  const existingFingerprints = new Set(seedFeedItems.map((item) => item.fingerprint));

  const results = await Promise.all(
    liveSources.map(async (source) => {
      try {
        const result = await withTimeout(
          ingestSource(
            source,
            seedRules.filter((rule) => !rule.sourceId || rule.sourceId === source.id),
          ),
          LIVE_DEMO_TIMEOUT_MS,
          { adapter: source.type, warnings: ["Live demo fetch timed out."], items: [] },
        );

        return result.items
          .map<FeedItemRecord>((item) => ({
            id: buildLiveDemoItemId(source.id, item.canonicalUrl, item.title),
            workspaceId: source.workspaceId,
            entityId: source.entityId,
            primarySourceId: source.id,
            sourceIds: [source.id],
            title: item.title,
            excerpt: item.excerpt,
            canonicalUrl: item.canonicalUrl,
            contentType: item.contentType,
            publishedAt: item.publishedAt,
            ingestedAt: new Date(),
            fingerprint: item.fingerprint ?? `${source.id}:${item.canonicalUrl}`,
            authorName: item.authorName ?? null,
            authorAvatarUrl: item.authorAvatarUrl ?? null,
            thumbnailUrl: item.thumbnailUrl ?? null,
            mediaKind: item.mediaKind ?? null,
            socialMetrics: item.socialMetrics,
            tagIds: item.tagIds ?? source.defaultTagIds,
          }))
          .filter((item) => !existingUrls.has(item.canonicalUrl) && !existingFingerprints.has(item.fingerprint));
      } catch {
        return [];
      }
    }),
  );

  return results.flat().sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export async function buildDemoDashboard(
  viewer: ViewerContext,
  userStates: UserItemStateRecord[],
  filters: DashboardFilters,
): Promise<DashboardSnapshot> {
  const liveFeedItems = await getLiveDemoFeedItems();

  return buildDashboardSnapshot({
    workspace: defaultWorkspace,
    sources: seedSources,
    entities: seedEntities,
    tags: seedTags,
    feedItems: [...liveFeedItems, ...seedFeedItems],
    userStates,
    viewer,
    filters,
  });
}

export function buildDemoAdminSnapshot(): AdminSnapshot {
  return {
    workspace: defaultWorkspace,
    sources: seedSources,
    entities: seedEntities,
    tags: seedTags,
    rules: seedRules,
    feedItems: seedFeedItems,
  };
}

export function readDemoStatesFromCookie(value: string | undefined): UserItemStateRecord[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as UserItemStateRecord[];
    return parsed.map((entry) => ({
      ...entry,
      lastViewedAt: entry.lastViewedAt ? new Date(entry.lastViewedAt) : null,
    }));
  } catch {
    return [];
  }
}

export function serializeDemoStates(states: UserItemStateRecord[]) {
  return JSON.stringify(states);
}

export function upsertDemoState(
  states: UserItemStateRecord[],
  state: UserItemStateRecord,
) {
  const existingIndex = states.findIndex((entry) => entry.feedItemId === state.feedItemId);

  if (existingIndex === -1) {
    return [...states, state];
  }

  return states.map((entry, index) => (index === existingIndex ? state : entry));
}
