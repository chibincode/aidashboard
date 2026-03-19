import { describe, expect, it, vi } from "vitest";
import type { DashboardItem } from "@/lib/domain";
import type { DashboardOverviewCacheStore } from "@/lib/dashboard-overview";
import {
  buildDashboardOverview,
  buildOverviewItemHash,
  createDbDashboardOverviewCacheStore,
  getOverviewCandidates,
} from "@/lib/dashboard-overview";
import { seedTags } from "@/lib/seed";

function createItem(overrides: Partial<DashboardItem> = {}): DashboardItem {
  return {
    id: overrides.id ?? "item_1",
    title: overrides.title ?? "Signal",
    excerpt: overrides.excerpt ?? "Useful product change.",
    canonicalUrl: overrides.canonicalUrl ?? `https://example.com/${overrides.id ?? "item_1"}`,
    contentType: overrides.contentType ?? "article",
    publishedAt: overrides.publishedAt ?? new Date("2026-03-19T10:00:00.000Z"),
    authorName: overrides.authorName ?? null,
    authorAvatarUrl: overrides.authorAvatarUrl ?? null,
    thumbnailUrl: overrides.thumbnailUrl ?? null,
    mediaKind: overrides.mediaKind ?? null,
    mediaLabel: overrides.mediaLabel ?? null,
    isNew: overrides.isNew ?? true,
    isRead: overrides.isRead ?? false,
    isSaved: overrides.isSaved ?? false,
    sourceName: overrides.sourceName ?? "Product Hunt",
    sourceHandle: overrides.sourceHandle ?? null,
    sourceType: overrides.sourceType ?? "website",
    socialMetrics: overrides.socialMetrics ?? null,
    entityId: overrides.entityId ?? null,
    entityName: overrides.entityName ?? null,
    entityKind: overrides.entityKind ?? null,
    tags: overrides.tags ?? [seedTags[0]],
  };
}

function createMemoryCacheStore(): DashboardOverviewCacheStore {
  const store = new Map<string, { itemHash: string; generatedAt: Date | null; payload: unknown }>();
  return {
    get: vi.fn(async ({ workspaceId, userId, filterKey, windowKey }) => {
      return (store.get(`${workspaceId}:${userId}:${windowKey}:${filterKey}`) ?? null) as Awaited<
        ReturnType<DashboardOverviewCacheStore["get"]>
      >;
    }),
    save: vi.fn(async ({ workspaceId, userId, filterKey, windowKey, itemHash, generatedAt, payload }) => {
      store.set(`${workspaceId}:${userId}:${windowKey}:${filterKey}`, {
        itemHash,
        generatedAt,
        payload,
      });
    }),
  } as DashboardOverviewCacheStore;
}

describe("dashboard overview", () => {
  it("keeps only items from the last 24 hours and includes the exact cutoff", () => {
    const now = new Date("2026-03-19T12:00:00.000Z");
    const items = [
      createItem({ id: "older", publishedAt: new Date("2026-03-18T11:59:59.000Z") }),
      createItem({ id: "cutoff", publishedAt: new Date("2026-03-18T12:00:00.000Z") }),
      createItem({ id: "fresh", publishedAt: new Date("2026-03-19T11:00:00.000Z") }),
    ];

    expect(getOverviewCandidates(items, now).map((item) => item.id)).toEqual(["fresh", "cutoff"]);
  });

  it("reuses cache for the same filters and invalidates when filters change", async () => {
    const now = new Date("2026-03-19T12:00:00.000Z");
    const items = [createItem({ id: "fresh" })];
    const cacheStore = createMemoryCacheStore();
    const generateAiOverview = vi.fn(async () => ({
      mode: "ai" as const,
      headline: "One strong product move surfaced.",
      bullets: ["Bullet one", "Bullet two", "Bullet three"],
      itemCount: 1,
      sourceCount: 1,
      topTags: [],
      model: "minimax/minimax-m2.5-20260211",
      statusText: "AI summary generated with minimax/minimax-m2.5-20260211.",
    }));

    await buildDashboardOverview({
      items,
      filters: {},
      workspaceId: "workspace_1",
      userId: "user_1",
      now,
      cacheStore,
      generateAiOverview,
    });
    await buildDashboardOverview({
      items,
      filters: {},
      workspaceId: "workspace_1",
      userId: "user_1",
      now: new Date("2026-03-19T12:05:00.000Z"),
      cacheStore,
      generateAiOverview,
    });
    await buildDashboardOverview({
      items,
      filters: { savedOnly: true },
      workspaceId: "workspace_1",
      userId: "user_1",
      now,
      cacheStore,
      generateAiOverview,
    });

    expect(generateAiOverview).toHaveBeenCalledTimes(2);
  });

  it("invalidates cache when the candidate item hash changes", async () => {
    const now = new Date("2026-03-19T12:00:00.000Z");
    const originalItems = [createItem({ id: "fresh" })];
    const changedItems = [createItem({ id: "fresh", title: "Updated signal title" })];
    const cacheStore = createMemoryCacheStore();
    const generateAiOverview = vi.fn(async () => ({
      mode: "ai" as const,
      headline: "Signal changed.",
      bullets: ["Bullet one", "Bullet two", "Bullet three"],
      itemCount: 1,
      sourceCount: 1,
      topTags: [],
      model: "minimax/minimax-m2.5-20260211",
      statusText: "AI summary generated with minimax/minimax-m2.5-20260211.",
    }));

    expect(buildOverviewItemHash(originalItems)).not.toBe(buildOverviewItemHash(changedItems));

    await buildDashboardOverview({
      items: originalItems,
      filters: {},
      workspaceId: "workspace_1",
      userId: "user_1",
      now,
      cacheStore,
      generateAiOverview,
    });
    await buildDashboardOverview({
      items: changedItems,
      filters: {},
      workspaceId: "workspace_1",
      userId: "user_1",
      now,
      cacheStore,
      generateAiOverview,
    });

    expect(generateAiOverview).toHaveBeenCalledTimes(2);
  });

  it("returns fallback stats when AI generation fails and keeps retry available", async () => {
    const overview = await buildDashboardOverview({
      items: [
        createItem({ id: "fresh_1", isRead: false, tags: [seedTags[0], seedTags[1]] }),
        createItem({ id: "fresh_2", sourceName: "OpenAI", tags: [seedTags[1]] }),
      ],
      filters: {},
      workspaceId: "workspace_1",
      userId: "user_1",
      now: new Date("2026-03-19T12:00:00.000Z"),
      generateAiOverview: vi.fn().mockResolvedValue(null),
    });

    expect(overview).not.toBeNull();
    expect(overview?.mode).toBe("fallback");
    expect(overview?.canRetry).toBe(true);
    expect(overview?.bullets).toHaveLength(3);
    expect(overview?.itemCount).toBe(2);
    expect(overview?.statusText).toContain("AI summary unavailable");
  });

  it("ignores dashboard overview cache read errors", async () => {
    const cacheStore = createDbDashboardOverviewCacheStore({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              throw new Error('insert into "dashboard_overviews" violates foreign key constraint');
            },
          }),
        }),
      }),
    } as never);

    await expect(
      cacheStore.get({
        workspaceId: "workspace_1",
        userId: "user_1",
        filterKey: "all",
        windowKey: "last-24h",
      }),
    ).resolves.toBeNull();
  });

  it("ignores dashboard overview cache write errors", async () => {
    const cacheStore = createDbDashboardOverviewCacheStore({
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: async () => {
            throw new Error('insert into "dashboard_overviews" violates foreign key constraint');
          },
        }),
      }),
    } as never);

    await expect(
      cacheStore.save({
        workspaceId: "workspace_1",
        userId: "user_1",
        filterKey: "all",
        windowKey: "last-24h",
        itemHash: "hash",
        generatedAt: new Date("2026-03-19T12:00:00.000Z"),
        payload: {
          mode: "fallback",
          headline: "Fallback headline",
          bullets: ["Bullet one", "Bullet two", "Bullet three"],
          itemCount: 3,
          sourceCount: 2,
          topTags: [],
          model: null,
          statusText: "AI summary unavailable right now. Showing direct stats from the current slice.",
        },
      }),
    ).resolves.toBeUndefined();
  });
});
