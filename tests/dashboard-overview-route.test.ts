import { describe, expect, it, vi } from "vitest";

const { getDashboardSnapshotMock } = vi.hoisted(() => ({
  getDashboardSnapshotMock: vi.fn(),
}));

vi.mock("@/lib/repositories/app-repository", () => ({
  getDashboardSnapshot: getDashboardSnapshotMock,
}));

import { POST as postOverview } from "@/app/api/dashboard/overview/route";
import { POST as postOverviewRetry } from "@/app/api/dashboard/overview/retry/route";

describe("dashboard overview routes", () => {
  it("returns the current overview payload for normal refreshes", async () => {
    getDashboardSnapshotMock.mockResolvedValueOnce({
      overview: {
        mode: "fallback",
        window: "last-24h",
        generatedAt: new Date("2026-03-19T12:00:00.000Z"),
        headline: "2 fresh signals landed in the last 24h.",
        insights: [
          { id: "overview-insight-1", summary: "One", sourceItemIds: [] },
          { id: "overview-insight-2", summary: "Two", sourceItemIds: [] },
          { id: "overview-insight-3", summary: "Three", sourceItemIds: [] },
        ],
        itemCount: 2,
        sourceCount: 1,
        topTags: [],
        model: null,
        statusText: "AI summary unavailable right now. Showing direct stats from the current slice.",
        canRetry: true,
      },
    });

    const response = await postOverview(
      new Request("http://localhost/api/dashboard/overview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filters: {
            view: "category_competitor_watch",
            unreadOnly: true,
          },
        }),
      }),
    );

    expect(getDashboardSnapshotMock).toHaveBeenCalledWith(
      {
        view: "category_competitor_watch",
        entity: undefined,
        tag: undefined,
        sourceType: undefined,
        unreadOnly: true,
        savedOnly: false,
      },
      {
        forceOverview: false,
      },
    );
    await expect(response.json()).resolves.toMatchObject({
      overview: {
        headline: "2 fresh signals landed in the last 24h.",
      },
    });
  });

  it("forces regeneration on retry", async () => {
    getDashboardSnapshotMock.mockResolvedValueOnce({
      overview: null,
    });

    await postOverviewRetry(
      new Request("http://localhost/api/dashboard/overview/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filters: {
            savedOnly: true,
          },
        }),
      }),
    );

    expect(getDashboardSnapshotMock).toHaveBeenCalledWith(
      {
        view: undefined,
        entity: undefined,
        tag: undefined,
        sourceType: undefined,
        unreadOnly: false,
        savedOnly: true,
      },
      {
        forceOverview: true,
      },
    );
  });
});
