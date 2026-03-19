import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { DashboardFilters, DashboardSnapshot } from "@/lib/domain";
import { seedCategories } from "@/lib/seed";

const { routerRefresh, setItemReadAction, toggleSavedAction } = vi.hoisted(() => ({
  routerRefresh: vi.fn(),
  setItemReadAction: vi.fn(async () => {}),
  toggleSavedAction: vi.fn(async () => {}),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
  }),
}));

vi.mock("@/actions/item-state", () => ({
  setItemReadAction,
  toggleSavedAction,
}));

const snapshot: DashboardSnapshot = {
  renderId: "render_1",
  workspace: {
    id: "workspace_1",
    name: "Boyce Dashboard",
    slug: "boyce-dashboard",
    description: "Workspace",
  },
  viewer: {
    workspaceId: "workspace_1",
    userId: "user_1",
    email: "boyce@example.com",
    isAuthenticated: true,
    lastVisitAt: new Date("2026-03-12T12:00:00.000Z"),
  },
  activeView: "all",
  overview: {
    mode: "fallback",
    window: "last-24h",
    generatedAt: new Date("2026-03-12T12:10:00.000Z"),
    headline: "2 fresh signals landed in the last 24h.",
    bullets: ["One", "Two", "Three"],
    itemCount: 2,
    sourceCount: 2,
    topTags: [],
    model: null,
    statusText: "AI summary unavailable right now. Showing direct stats from the current slice.",
    canRetry: true,
  },
  allItems: [],
  feedItems: [],
  sections: [],
  categories: seedCategories,
  tags: [],
  entities: [],
  sources: [],
  counts: {
    newItems: 0,
    unreadItems: 0,
    savedItems: 0,
    healthySources: 0,
  },
};

const filters: DashboardFilters = {};

function buildDashboardItem(overrides: Partial<DashboardSnapshot["allItems"][number]> = {}) {
  return {
    id: "item_1",
    title: "Example item",
    excerpt: "Item excerpt",
    canonicalUrl: "https://example.com/item",
    contentType: "article" as const,
    publishedAt: new Date("2026-03-18T10:00:00.000Z"),
    authorName: "Author",
    authorAvatarUrl: null,
    thumbnailUrl: null,
    mediaKind: null,
    mediaLabel: null,
    isNew: true,
    isRead: false,
    isSaved: false,
    sourceName: "Example source",
    sourceHandle: null,
    sourceType: "website" as const,
    socialMetrics: null,
    entityId: null,
    entityName: null,
    entityKind: null,
    tags: [],
    ...overrides,
  };
}

describe("DashboardShell", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    routerRefresh.mockReset();
    setItemReadAction.mockClear();
    toggleSavedAction.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          overview: {
            mode: "fallback",
            window: "last-24h",
            generatedAt: "2026-03-12T12:10:00.000Z",
            headline: "Updated slice overview.",
            bullets: ["A", "B", "C"],
            itemCount: 1,
            sourceCount: 1,
            topTags: [],
            model: null,
            statusText: "AI summary unavailable right now. Showing direct stats from the current slice.",
            canRetry: true,
          },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("switches tabs immediately and updates the shareable URL without a route navigation", async () => {
    const user = userEvent.setup();

    render(<DashboardShell snapshot={snapshot} filters={filters} />);

    await user.click(screen.getByRole("button", { name: "Competitor Watch" }));

    expect(screen.getByRole("button", { name: "Competitor Watch" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Competitor Watch" })).toBeInTheDocument();
    expect(window.location.search).toBe("?view=category_competitor_watch");
  });

  it("renders the overview block when an overview is available", () => {
    render(<DashboardShell snapshot={snapshot} filters={filters} />);

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("2 fresh signals landed in the last 24h.")).toBeInTheDocument();
    expect(screen.getByText("Stats Only")).toBeInTheDocument();
    expect(screen.getByText("AI summary unavailable right now. Showing direct stats from the current slice.")).toBeInTheDocument();
  });

  it("hides the overview block when no overview is available", () => {
    render(
      <DashboardShell
        snapshot={{
          ...snapshot,
          overview: null,
        }}
        filters={filters}
      />,
    );

    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });

  it("requests a new overview when the active view changes", async () => {
    const user = userEvent.setup();

    render(<DashboardShell snapshot={snapshot} filters={filters} />);

    await user.click(screen.getByRole("button", { name: "Competitor Watch" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/dashboard/overview",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          filters: {
            view: "category_competitor_watch",
            unreadOnly: false,
            savedOnly: false,
          },
        }),
      }),
    );
  });

  it("sync-refreshes saved-state changes only when the saved filter is active", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/?saved=1");
    const savedSnapshot: DashboardSnapshot = {
      ...snapshot,
      allItems: [
        buildDashboardItem({
          id: "item_saved",
          title: "Saved item",
          canonicalUrl: "https://example.com/saved-item",
          isSaved: true,
        }),
      ],
      feedItems: [],
      sections: [],
    };

    render(<DashboardShell snapshot={savedSnapshot} filters={{ savedOnly: true }} />);

    const savedHeading = screen.getByRole("heading", { name: "Saved item" });
    const savedCard = savedHeading.closest(".group");
    expect(savedHeading).toBeInTheDocument();
    expect(savedCard).not.toBeNull();

    await user.click(within(savedCard as HTMLElement).getByRole("button", { name: "Saved" }));

    expect(screen.queryByRole("heading", { name: "Saved item" })).not.toBeInTheDocument();
    expect(toggleSavedAction).toHaveBeenCalledWith("item_saved", false);
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });

  it("removes items immediately when they are marked read while unread-only is active", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/?unread=1");
    const unreadSnapshot: DashboardSnapshot = {
      ...snapshot,
      allItems: [
        buildDashboardItem({
          id: "item_unread",
          title: "Unread item",
          canonicalUrl: "https://example.com/unread-item",
          isRead: false,
        }),
      ],
      feedItems: [],
      sections: [],
    };

    render(<DashboardShell snapshot={unreadSnapshot} filters={{ unreadOnly: true }} />);

    const unreadHeading = screen.getByRole("heading", { name: "Unread item" });
    const unreadCard = unreadHeading.closest(".group");
    expect(unreadHeading).toBeInTheDocument();
    expect(unreadCard).not.toBeNull();

    await user.click(within(unreadCard as HTMLElement).getByRole("button", { name: "Read" }));

    expect(screen.queryByRole("heading", { name: "Unread item" })).not.toBeInTheDocument();
    expect(setItemReadAction).toHaveBeenCalledWith("item_unread", true);
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });
});
