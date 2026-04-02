import { describe, expect, it } from "vitest";
import { buildDashboardData, buildDashboardSnapshot, buildDashboardSnapshotFromData } from "@/lib/dashboard";
import { buildDemoDashboard } from "@/lib/demo-data";
import { DEMO_EMAIL, DEMO_USER_ID, DEMO_WORKSPACE_ID, defaultWorkspace, seedCategories, seedEntities, seedFeedItems, seedSources, seedTags } from "@/lib/seed";

describe("dashboard projection", () => {
  it("marks new items based on last visit and splits saved items into dedicated section", async () => {
    const snapshot = await buildDemoDashboard(
      {
        workspaceId: DEMO_WORKSPACE_ID,
        userId: DEMO_USER_ID,
        email: DEMO_EMAIL,
        isAuthenticated: false,
        lastVisitAt: new Date("2026-03-05T20:00:00.000Z"),
      },
      [
        {
          userId: DEMO_USER_ID,
          workspaceId: DEMO_WORKSPACE_ID,
          feedItemId: "item_nav_1",
          isRead: false,
          isSaved: true,
          lastViewedAt: new Date("2026-03-06T09:00:00.000Z"),
        },
      ],
      {},
    );

    const newSection = snapshot.sections.find((section) => section.id === "new-since-last-visit");
    const savedSection = snapshot.sections.find((section) => section.id === "saved");

    expect(newSection?.items.length).toBeGreaterThan(0);
    expect(savedSection?.items.map((item) => item.id)).toContain("item_nav_1");
  });

  it("filters by tag and unread state", async () => {
    const snapshot = await buildDemoDashboard(
      {
        workspaceId: DEMO_WORKSPACE_ID,
        userId: DEMO_USER_ID,
        email: DEMO_EMAIL,
        isAuthenticated: false,
        lastVisitAt: new Date("2026-03-04T00:00:00.000Z"),
      },
      [
        {
          userId: DEMO_USER_ID,
          workspaceId: DEMO_WORKSPACE_ID,
          feedItemId: "item_tp_1",
          isRead: true,
          isSaved: false,
          lastViewedAt: new Date("2026-03-06T09:00:00.000Z"),
        },
      ],
      { tag: "tag_navigation", unreadOnly: true },
    );

    const allItems = snapshot.sections.flatMap((section) => section.items);
    expect(allItems.every((item) => item.tags.some((tag) => tag.id === "tag_navigation"))).toBe(true);
    expect(allItems.every((item) => !item.isRead)).toBe(true);
  });

  it("deduplicates repeated posts with different record ids before rendering", () => {
    const baseItem = seedFeedItems.find((item) => item.id === "item_al_1");
    expect(baseItem).toBeDefined();

    const duplicate = {
      ...baseItem!,
      id: "item_al_1_duplicate",
      canonicalUrl: "https://x.com/ailoadboard/status/1001",
      fingerprint: "source_duplicate:1001",
      tagIds: [...baseItem!.tagIds, "tag_aiux"],
    };

    const snapshot = buildDashboardSnapshot({
      workspace: defaultWorkspace,
      sources: seedSources,
      entities: seedEntities,
      tags: seedTags,
      categories: seedCategories,
      feedItems: [baseItem!, duplicate],
      userStates: [
        {
          userId: DEMO_USER_ID,
          workspaceId: DEMO_WORKSPACE_ID,
          feedItemId: duplicate.id,
          isRead: true,
          isSaved: true,
          lastViewedAt: new Date("2026-03-06T09:00:00.000Z"),
        },
      ],
      viewer: {
        workspaceId: DEMO_WORKSPACE_ID,
        userId: DEMO_USER_ID,
        email: DEMO_EMAIL,
        isAuthenticated: false,
        lastVisitAt: new Date("2026-03-04T00:00:00.000Z"),
      },
      filters: {},
    });

    expect(snapshot.feedItems).toHaveLength(1);
    expect(snapshot.feedItems[0]?.isRead).toBe(true);
    expect(snapshot.feedItems[0]?.isSaved).toBe(true);
    expect(snapshot.feedItems[0]?.tags.map((tag) => tag.id)).toContain("tag_aiux");
  });

  it("builds competitor watch from entity kinds instead of hardcoded entity names", () => {
    const snapshot = buildDashboardSnapshot({
      workspace: defaultWorkspace,
      sources: seedSources,
      entities: seedEntities,
      tags: seedTags,
      categories: seedCategories,
      feedItems: seedFeedItems,
      userStates: [],
      viewer: {
        workspaceId: DEMO_WORKSPACE_ID,
        userId: DEMO_USER_ID,
        email: DEMO_EMAIL,
        isAuthenticated: false,
        lastVisitAt: new Date("2026-03-04T00:00:00.000Z"),
      },
      filters: { view: "category_competitor_watch" },
    });

    expect(snapshot.activeView).toBe("category_competitor_watch");
    expect(snapshot.feedItems.length).toBeGreaterThan(0);
    expect(snapshot.feedItems.every((item) => item.entityKind === "competitor")).toBe(true);
  });

  it("matches categories when any selected tag, entity, or entity kind applies", () => {
    const snapshot = buildDashboardSnapshot({
      workspace: defaultWorkspace,
      sources: seedSources,
      entities: seedEntities,
      tags: seedTags,
      categories: [
        {
          id: "category_custom",
          workspaceId: DEMO_WORKSPACE_ID,
          name: "Custom",
          slug: "custom",
          description: "Mixed selectors",
          tone: "mint",
          position: 10,
          isActive: true,
          tagIds: ["tag_navigation"],
          entityIds: ["entity_aiux"],
          entityKinds: [],
        },
      ],
      feedItems: seedFeedItems,
      userStates: [],
      viewer: {
        workspaceId: DEMO_WORKSPACE_ID,
        userId: DEMO_USER_ID,
        email: DEMO_EMAIL,
        isAuthenticated: false,
        lastVisitAt: new Date("2026-03-04T00:00:00.000Z"),
      },
      filters: { view: "category_custom" },
    });

    expect(snapshot.feedItems.some((item) => item.entityId === "entity_aiux")).toBe(true);
    expect(snapshot.feedItems.some((item) => item.tags.some((tag) => tag.id === "tag_navigation"))).toBe(true);
  });

  it("falls back to all when the requested category is inactive or unknown", () => {
    const snapshot = buildDashboardSnapshot({
      workspace: defaultWorkspace,
      sources: seedSources,
      entities: seedEntities,
      tags: seedTags,
      categories: [
        {
          ...seedCategories[0],
          id: "category_hidden",
          isActive: false,
        },
      ],
      feedItems: seedFeedItems,
      userStates: [],
      viewer: {
        workspaceId: DEMO_WORKSPACE_ID,
        userId: DEMO_USER_ID,
        email: DEMO_EMAIL,
        isAuthenticated: false,
        lastVisitAt: new Date("2026-03-04T00:00:00.000Z"),
      },
      filters: { view: "category_hidden" },
    });

    expect(snapshot.activeView).toBe("all");
    expect(snapshot.categories).toHaveLength(0);
    expect(snapshot.feedItems.length).toBeGreaterThan(0);
  });

  it("keeps category results on page 1 even when newer global items would push them past the old 50-item window", () => {
    const websiteCategory = seedCategories.find((category) => category.id === "category_website_inspiration");
    const websiteTagId = websiteCategory?.tagIds[0];
    expect(websiteCategory).toBeDefined();
    expect(websiteTagId).toBeDefined();

    const newerNonWebsiteItems = Array.from({ length: 51 }, (_, index) => ({
      ...seedFeedItems[0]!,
      id: `item_newer_${index}`,
      title: `Newer non-website item ${index}`,
      canonicalUrl: `https://example.com/newer-${index}`,
      fingerprint: `newer:${index}`,
      publishedAt: new Date(Date.UTC(2026, 2, 31, 15, 45, index)),
      tagIds: seedFeedItems[0]!.tagIds.filter((tagId) => tagId !== websiteTagId),
    }));
    const olderWebsiteItem = {
      ...seedFeedItems[1]!,
      id: "item_website_1",
      title: "Website Inspiration item",
      canonicalUrl: "https://example.com/website-inspiration",
      fingerprint: "website:1",
      publishedAt: new Date("2026-03-31T14:43:22.000Z"),
      tagIds: [...new Set([...(seedFeedItems[1]!.tagIds ?? []), websiteTagId!])],
    };

    const snapshot = buildDashboardSnapshot({
      workspace: defaultWorkspace,
      sources: seedSources,
      entities: seedEntities,
      tags: seedTags,
      categories: seedCategories,
      feedItems: [...newerNonWebsiteItems, olderWebsiteItem],
      userStates: [],
      viewer: {
        workspaceId: DEMO_WORKSPACE_ID,
        userId: DEMO_USER_ID,
        email: DEMO_EMAIL,
        isAuthenticated: false,
        lastVisitAt: new Date("2026-03-04T00:00:00.000Z"),
      },
      filters: { view: "category_website_inspiration" },
    });

    expect(snapshot.feedItems.map((item) => item.id)).toContain("item_website_1");
    expect(snapshot.pagination.totalItems).toBe(1);
  });

  it("paginates each filtered slice cumulatively", () => {
    const websiteCategory = seedCategories.find((category) => category.id === "category_website_inspiration");
    const websiteTagId = websiteCategory?.tagIds[0];
    expect(websiteTagId).toBeDefined();

    const websiteItems = Array.from({ length: 120 }, (_, index) => ({
      ...seedFeedItems[index % seedFeedItems.length]!,
      id: `item_website_${index}`,
      title: `Website item ${index}`,
      canonicalUrl: `https://example.com/website-${index}`,
      fingerprint: `website:${index}`,
      publishedAt: new Date(Date.UTC(2026, 2, 31, 23, 59 - index, 0)),
      tagIds: [...new Set([...(seedFeedItems[index % seedFeedItems.length]!.tagIds ?? []), websiteTagId!])],
    }));
    const data = buildDashboardData({
      workspace: defaultWorkspace,
      sources: seedSources,
      entities: seedEntities,
      tags: seedTags,
      categories: seedCategories,
      feedItems: websiteItems,
      userStates: [],
      viewer: {
        workspaceId: DEMO_WORKSPACE_ID,
        userId: DEMO_USER_ID,
        email: DEMO_EMAIL,
        isAuthenticated: false,
        lastVisitAt: new Date("2026-03-04T00:00:00.000Z"),
      },
      filters: { view: "category_website_inspiration" },
    });

    const pageOne = buildDashboardSnapshotFromData({
      workspace: defaultWorkspace,
      sources: seedSources,
      entities: seedEntities,
      tags: seedTags,
      categories: seedCategories,
      viewer: {
        workspaceId: DEMO_WORKSPACE_ID,
        userId: DEMO_USER_ID,
        email: DEMO_EMAIL,
        isAuthenticated: false,
        lastVisitAt: new Date("2026-03-04T00:00:00.000Z"),
      },
      data,
      page: 1,
    });
    const pageTwo = buildDashboardSnapshotFromData({
      workspace: defaultWorkspace,
      sources: seedSources,
      entities: seedEntities,
      tags: seedTags,
      categories: seedCategories,
      viewer: {
        workspaceId: DEMO_WORKSPACE_ID,
        userId: DEMO_USER_ID,
        email: DEMO_EMAIL,
        isAuthenticated: false,
        lastVisitAt: new Date("2026-03-04T00:00:00.000Z"),
      },
      data,
      page: 2,
    });

    expect(pageOne.feedItems).toHaveLength(50);
    expect(pageOne.pagination).toMatchObject({
      page: 1,
      totalItems: 120,
      hasMore: true,
    });
    expect(pageTwo.feedItems).toHaveLength(100);
    expect(pageTwo.pagination).toMatchObject({
      page: 2,
      totalItems: 120,
      hasMore: true,
    });
  });
});
