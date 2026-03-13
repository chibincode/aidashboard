import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { DashboardFilters, DashboardSnapshot } from "@/lib/domain";

const push = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

const snapshot: DashboardSnapshot = {
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
  feedItems: [],
  sections: [],
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
    currentSearch = "";
    push.mockReset();
  });

  it("switches tabs immediately and shows the next tab skeleton while navigation is pending", async () => {
    const user = userEvent.setup();

    render(<DashboardShell snapshot={snapshot} filters={filters} />);

    await user.click(screen.getByRole("button", { name: "Competitor Watch" }));

    expect(screen.getByRole("button", { name: "Competitor Watch" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Competitor Watch" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading Competitor Watch...");
    expect(push).toHaveBeenCalledWith("/?view=competitor-watch");
  });
});
