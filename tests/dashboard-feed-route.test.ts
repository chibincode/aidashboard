import { describe, expect, it, vi } from "vitest";

const { getDashboardSnapshotMock } = vi.hoisted(() => ({
  getDashboardSnapshotMock: vi.fn(),
}));

vi.mock("@/lib/repositories/app-repository", () => ({
  getDashboardSnapshot: getDashboardSnapshotMock,
}));

import { POST as postFeed } from "@/app/api/dashboard/feed/route";

describe("dashboard feed route", () => {
  it("returns cumulative feed items for the requested page depth", async () => {
    getDashboardSnapshotMock.mockResolvedValueOnce({
      activeView: "category_website_inspiration",
      allItems: [
        {
          id: "item_1",
          title: "Website inspiration item",
          excerpt: "Evidence excerpt",
          canonicalUrl: "https://example.com/inspiration",
          contentType: "article",
          publishedAt: new Date("2026-03-31T12:00:00.000Z"),
          authorName: "Author",
          authorAvatarUrl: null,
          thumbnailUrl: null,
          mediaKind: null,
          mediaLabel: null,
          isNew: true,
          isRead: false,
          isSaved: false,
          sourceName: "Example",
          sourceHandle: null,
          sourceType: "website",
          socialMetrics: null,
          entityId: null,
          entityName: null,
          entityKind: null,
          tags: [],
        },
      ],
      feedItems: [
        {
          id: "item_1",
          title: "Website inspiration item",
          excerpt: "Evidence excerpt",
          canonicalUrl: "https://example.com/inspiration",
          contentType: "article",
          publishedAt: new Date("2026-03-31T12:00:00.000Z"),
          authorName: "Author",
          authorAvatarUrl: null,
          thumbnailUrl: null,
          mediaKind: null,
          mediaLabel: null,
          isNew: true,
          isRead: false,
          isSaved: false,
          sourceName: "Example",
          sourceHandle: null,
          sourceType: "website",
          socialMetrics: null,
          entityId: null,
          entityName: null,
          entityKind: null,
          tags: [],
        },
      ],
      pagination: {
        page: 2,
        pageSize: 50,
        totalItems: 221,
        hasMore: true,
      },
    });

    const response = await postFeed(
      new Request("http://localhost/api/dashboard/feed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filters: {
            view: "category_website_inspiration",
            unreadOnly: true,
          },
          page: 2,
        }),
      }),
    );

    expect(getDashboardSnapshotMock).toHaveBeenCalledWith(
      {
        view: "category_website_inspiration",
        entity: undefined,
        tag: undefined,
        sourceType: undefined,
        unreadOnly: true,
        savedOnly: false,
      },
      {
        page: 2,
        includeOverview: false,
      },
    );

    await expect(response.json()).resolves.toMatchObject({
      activeView: "category_website_inspiration",
      feedItems: [{ id: "item_1" }],
      pagination: {
        page: 2,
        totalItems: 221,
        hasMore: true,
      },
    });
  });
});
