import { describe, expect, it } from "vitest";
import { buildDemoDashboard } from "@/lib/demo-data";
import { DEMO_EMAIL, DEMO_USER_ID, DEMO_WORKSPACE_ID } from "@/lib/seed";

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
});
