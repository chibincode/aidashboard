import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategoriesSettingsPanel } from "@/components/settings/categories-settings-panel";
import { createCategoryMutationState, createEmptyCategoryFormValues, type CategoryMutationState } from "@/lib/category-forms";
import type { AdminSnapshot } from "@/lib/domain";
import { seedCategories } from "@/lib/seed";

function buildSnapshot(): AdminSnapshot {
  return {
    workspace: {
      id: "ws_1",
      name: "Workspace",
      slug: "workspace",
      description: "Test workspace",
    },
    sources: [],
    entities: [
      {
        id: "entity_aiux",
        workspaceId: "ws_1",
        name: "AI UX",
        slug: "ai-ux",
        kind: "topic",
        description: "AI UX",
        color: "#197d71",
      },
      {
        id: "entity_competitor",
        workspaceId: "ws_1",
        name: "Trucker Path",
        slug: "trucker-path",
        kind: "competitor",
        description: "Competitor",
        color: "#d97706",
      },
    ],
    tags: [
      {
        id: "tag_aiux",
        workspaceId: "ws_1",
        name: "AI UX/UI",
        slug: "ai-ux-ui",
        color: "#197d71",
        parentId: null,
        isActive: true,
      },
      {
        id: "tag_competitor",
        workspaceId: "ws_1",
        name: "Competitor",
        slug: "competitor",
        color: "#ea580c",
        parentId: null,
        isActive: true,
      },
    ],
    categories: [
      {
        ...seedCategories[0],
        workspaceId: "ws_1",
      },
      {
        ...seedCategories[2],
        workspaceId: "ws_1",
      },
    ],
    rules: [],
  };
}

const noopToggleAction = vi.fn(async () => {});
const noopDeleteAction = vi.fn(async () => {});

describe("CategoriesSettingsPanel", () => {
  it("renders existing business categories and selector summaries", () => {
    render(
      <CategoriesSettingsPanel
        snapshot={buildSnapshot()}
        canManageCategories
        createAction={vi.fn(async (state) => state)}
        updateAction={vi.fn(async (state) => state)}
        toggleAction={noopToggleAction}
        deleteAction={noopDeleteAction}
      />,
    );

    expect(screen.getByRole("button", { name: "Add category" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI UX/UI" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Competitor Watch" })).toBeInTheDocument();
    expect(screen.getAllByText("Sand").length).toBeGreaterThan(0);
    expect(screen.getByText("#AI UX/UI")).toBeInTheDocument();
    expect(screen.getAllByText("Competitor").length).toBeGreaterThan(0);
  });

  it("opens the add modal and loads a category into the edit modal", async () => {
    const user = userEvent.setup();
    const updateAction = vi.fn(async (state: CategoryMutationState, formData: FormData) =>
      createCategoryMutationState(
        {
          ...createEmptyCategoryFormValues(),
          id: String(formData.get("id") ?? ""),
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          tone: String(formData.get("tone") ?? "sand") as CategoryMutationState["values"]["tone"],
          position: String(formData.get("position") ?? "10"),
          isActive: formData.get("isActive") === "on",
          tagIds: formData.getAll("tagIds").map(String),
          entityIds: formData.getAll("entityIds").map(String),
          entityKinds: formData.getAll("entityKinds").map(String) as CategoryMutationState["values"]["entityKinds"],
        },
        {
          status: "success",
          message: "Category updated.",
          nonce: state.nonce + 1,
        },
      ),
    );

    render(
      <CategoriesSettingsPanel
        snapshot={buildSnapshot()}
        canManageCategories
        createAction={vi.fn(async (state) => state)}
        updateAction={updateAction}
        toggleAction={noopToggleAction}
        deleteAction={noopDeleteAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add category" }));

    const addDialog = screen.getByRole("dialog", { name: "Add category" });
    expect(addDialog).toBeInTheDocument();
    expect(within(addDialog).getByRole("button", { name: "Add category" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close Add category" }));

    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]);

    expect(screen.getByRole("dialog", { name: "Edit category" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Competitor Watch")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save category" }));

    expect(updateAction).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Edit category" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Add category" })).toBeInTheDocument();
  });
});
