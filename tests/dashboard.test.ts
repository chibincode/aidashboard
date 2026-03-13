import { describe, expect, it } from "vitest";
import { buildDashboardSnapshot } from "@/lib/dashboard";
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
});
