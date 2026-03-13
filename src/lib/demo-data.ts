import type { AdminSnapshot, DashboardFilters, DashboardSnapshot, FeedItemRecord, SourceRecord, UserItemStateRecord, ViewerContext } from "@/lib/domain";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import { fingerprintForFeedItem, normalizeFeedItemUrl } from "@/lib/feed-item-identity";
import { ingestSource } from "@/lib/ingestion";
import {
  defaultWorkspace,
  seedCategories,
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

async function getLiveDemoFeedItems(sources: SourceRecord[]) {
  if (process.env.NODE_ENV === "test") {
    return [];
  }

  const liveSources = sources.filter(isLiveDemoSource);
  if (liveSources.length === 0) {
    return [];
  }

  const existingUrls = new Set(seedFeedItems.map((item) => normalizeFeedItemUrl(item.canonicalUrl)));
  const existingFingerprints = new Set(seedFeedItems.map((item) => item.fingerprint));
  const seenLiveUrls = new Set<string>();
  const seenLiveFingerprints = new Set<string>();

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
          .map<FeedItemRecord>((item) => {
            const canonicalUrl = normalizeFeedItemUrl(item.canonicalUrl);
            const fingerprint = item.fingerprint ?? fingerprintForFeedItem({ canonicalUrl, title: item.title });

            return {
              id: buildLiveDemoItemId(source.id, canonicalUrl, item.title),
              workspaceId: source.workspaceId,
              entityId: source.entityId,
              primarySourceId: source.id,
              sourceIds: [source.id],
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
              mediaKind: item.mediaKind ?? null,
              socialMetrics: item.socialMetrics,
              tagIds: item.tagIds ?? source.defaultTagIds,
            };
          })
          .filter((item) => {
            if (existingUrls.has(item.canonicalUrl) || existingFingerprints.has(item.fingerprint)) {
              return false;
            }

            if (seenLiveUrls.has(item.canonicalUrl) || seenLiveFingerprints.has(item.fingerprint)) {
              return false;
            }

            seenLiveUrls.add(item.canonicalUrl);
            seenLiveFingerprints.add(item.fingerprint);
            return true;
          });
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
  sources: SourceRecord[] = seedSources,
): Promise<DashboardSnapshot> {
  const liveFeedItems = await getLiveDemoFeedItems(sources);

  return buildDashboardSnapshot({
    workspace: defaultWorkspace,
    sources,
    entities: seedEntities,
    tags: seedTags,
    categories: seedCategories,
    feedItems: [...liveFeedItems, ...seedFeedItems],
    userStates,
    viewer,
    filters,
  });
}

export function buildDemoAdminSnapshot(sources: SourceRecord[] = seedSources): AdminSnapshot {
  return {
    workspace: defaultWorkspace,
    sources,
    entities: seedEntities,
    tags: seedTags,
    categories: seedCategories,
    rules: seedRules,
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
