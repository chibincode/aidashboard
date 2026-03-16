import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { DashboardFilters, DashboardSnapshot } from "@/lib/domain";
import { seedCategories } from "@/lib/seed";

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

describe("DashboardShell", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("switches tabs immediately and updates the shareable URL without a route navigation", async () => {
    const user = userEvent.setup();

    render(<DashboardShell snapshot={snapshot} filters={filters} />);

    await user.click(screen.getByRole("button", { name: "Competitor Watch" }));

    expect(screen.getByRole("button", { name: "Competitor Watch" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Competitor Watch" })).toBeInTheDocument();
    expect(window.location.search).toBe("?view=category_competitor_watch");
  });
});
