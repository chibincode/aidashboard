import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import type { AdminSnapshot } from "@/lib/domain";

const {
  getAdminSnapshotAction,
  createCategoryAction,
  createEntityAction,
  createRuleAction,
  createSourceAction,
  createTagAction,
  deleteCategoryAction,
  deleteEntityAction,
  deleteRuleAction,
  deleteSourceAction,
  deleteTagAction,
  toggleCategoryAction,
  toggleRuleAction,
  toggleSourceAction,
  toggleTagAction,
  updateCategoryAction,
  updateEntityAction,
  updateSourceAction,
  updateTagAction,
} = vi.hoisted(() => ({
  getAdminSnapshotAction: vi.fn(),
  createCategoryAction: vi.fn(),
  createEntityAction: vi.fn(),
  createRuleAction: vi.fn(),
  createSourceAction: vi.fn(),
  createTagAction: vi.fn(),
  deleteCategoryAction: vi.fn(),
  deleteEntityAction: vi.fn(),
  deleteRuleAction: vi.fn(),
  deleteSourceAction: vi.fn(),
  deleteTagAction: vi.fn(),
  toggleCategoryAction: vi.fn(),
  toggleRuleAction: vi.fn(),
  toggleSourceAction: vi.fn(),
  toggleTagAction: vi.fn(),
  updateCategoryAction: vi.fn(),
  updateEntityAction: vi.fn(),
  updateSourceAction: vi.fn(),
  updateTagAction: vi.fn(),
}));

vi.mock("@/actions/admin", () => ({
  getAdminSnapshotAction,
  createCategoryAction,
  createEntityAction,
  createRuleAction,
  createSourceAction,
  createTagAction,
  deleteCategoryAction,
  deleteEntityAction,
  deleteRuleAction,
  deleteSourceAction,
  deleteTagAction,
  toggleCategoryAction,
  toggleRuleAction,
  toggleSourceAction,
  toggleTagAction,
  updateCategoryAction,
  updateEntityAction,
  updateSourceAction,
  updateTagAction,
}));

vi.mock("@/components/settings/sources-settings-panel", () => ({
  SourcesSettingsPanel: ({ onDataChange }: { onDataChange?: () => void | Promise<void> }) => (
    <div>
      <p>Sources panel</p>
      <button type="button" onClick={() => void onDataChange?.()}>
        Refresh settings
      </button>
    </div>
  ),
}));

vi.mock("@/components/settings/categories-settings-panel", () => ({
  CategoriesSettingsPanel: () => <p>Categories panel</p>,
}));

vi.mock("@/components/settings/basic-settings-panels", () => ({
  EntitiesSettingsPanel: () => <p>Entities panel</p>,
  TagsSettingsPanel: () => <p>Tags panel</p>,
  RulesSettingsPanel: () => <p>Rules panel</p>,
}));

function buildSnapshot(): AdminSnapshot {
  return {
    workspace: {
      id: "ws_1",
      name: "Workspace",
      slug: "workspace",
      description: "Test workspace",
    },
    sources: [],
    entities: [],
    tags: [],
    categories: [],
    rules: [],
  };
}

describe("SettingsDialog", () => {
  beforeEach(() => {
    getAdminSnapshotAction.mockReset();
    getAdminSnapshotAction.mockResolvedValue(buildSnapshot());
  });

  it("loads admin settings lazily on first open and reuses the cached snapshot", async () => {
    const user = userEvent.setup();

    render(<SettingsDialog />);

    expect(getAdminSnapshotAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Settings" }));

    await waitFor(() => {
      expect(screen.getByText("Sources panel")).toBeInTheDocument();
    });

    expect(getAdminSnapshotAction).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Close settings" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));

    await waitFor(() => {
      expect(screen.getByText("Sources panel")).toBeInTheDocument();
    });

    expect(getAdminSnapshotAction).toHaveBeenCalledTimes(1);
  });

  it("refreshes only the dialog snapshot after panel mutations", async () => {
    const user = userEvent.setup();

    render(<SettingsDialog />);

    await user.click(screen.getByRole("button", { name: "Settings" }));

    await waitFor(() => {
      expect(screen.getByText("Sources panel")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Refresh settings" }));

    await waitFor(() => {
      expect(getAdminSnapshotAction).toHaveBeenCalledTimes(2);
    });
  });
});
