import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EntitiesSettingsPanel,
  RulesSettingsPanel,
  TagsSettingsPanel,
} from "@/components/settings/basic-settings-panels";
import type { AdminSnapshot } from "@/lib/domain";

const { routerRefresh } = vi.hoisted(() => ({
  routerRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
  }),
}));

function buildSnapshot(): AdminSnapshot {
  return {
    workspace: {
      id: "ws_1",
      name: "Workspace",
      slug: "workspace",
      description: "Test workspace",
    },
    sources: [
      {
        id: "source_openai",
        workspaceId: "ws_1",
        entityId: "entity_aiux",
        name: "OpenAI YouTube",
        slug: "openai-youtube",
        type: "youtube",
        url: "https://www.youtube.com/@OpenAI",
        refreshMinutes: 30,
        priority: 70,
        isActive: true,
        healthStatus: "healthy",
        config: {
          itemType: "video",
        },
        defaultTagIds: ["tag_aiux"],
        lastFetchedAt: new Date("2026-03-07T09:00:00.000Z"),
        lastErrorMessage: null,
      },
    ],
    entities: [
      {
        id: "entity_aiux",
        workspaceId: "ws_1",
        name: "AI UX Signals",
        slug: "ai-ux-signals",
        kind: "topic",
        description: "Interaction patterns and AI-native workflows.",
        color: "#197d71",
      },
      {
        id: "entity_competitor",
        workspaceId: "ws_1",
        name: "AI Loadboard",
        slug: "ai-loadboard",
        kind: "competitor",
        description: "Marketplace and pricing strategy movements.",
        color: "#c2410c",
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
        id: "tag_research",
        workspaceId: "ws_1",
        name: "Research",
        slug: "research",
        color: "#7c3aed",
        parentId: "tag_aiux",
        isActive: false,
      },
    ],
    categories: [],
    rules: [
      {
        id: "rule_pricing",
        workspaceId: "ws_1",
        name: "Pricing motion",
        isActive: true,
        priority: 50,
        sourceId: "source_openai",
        conditions: {
          keywords: ["pricing", "subscription"],
          urlContains: ["/pricing"],
        },
        actions: {
          tagIds: ["tag_aiux", "tag_research"],
        },
      },
    ],
  };
}

const noopFormAction = vi.fn(async () => {});

describe("basic settings panels delete confirmation", () => {
  beforeEach(() => {
    routerRefresh.mockReset();
    noopFormAction.mockClear();
  });

  it("asks for confirmation before deleting an entity and only deletes on confirm", async () => {
    const user = userEvent.setup();
    const deleteAction = vi.fn(async () => {});

    render(
      <EntitiesSettingsPanel
        snapshot={buildSnapshot()}
        canManageEntities
        createAction={noopFormAction}
        updateAction={noopFormAction}
        deleteAction={deleteAction}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    const dialog = screen.getByRole("dialog", { name: "Delete entity" });
    expect(dialog).toBeInTheDocument();
    expect(deleteAction).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Delete AI UX Signals?")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Delete entity" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Delete entity" })).not.toBeInTheDocument();
    });

    expect(deleteAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("AI UX Signals")).not.toBeInTheDocument();
    expect(screen.getByText("Entity deleted: AI UX Signals.")).toBeInTheDocument();
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the tag delete modal open when deletion fails", async () => {
    const user = userEvent.setup();
    const deleteAction = vi.fn(async () => {
      throw new Error("Delete failed.");
    });

    render(
      <TagsSettingsPanel
        snapshot={buildSnapshot()}
        canManageTags
        createAction={noopFormAction}
        updateAction={noopFormAction}
        toggleAction={noopFormAction}
        deleteAction={deleteAction}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Delete tag" });

    await user.click(within(dialog).getByRole("button", { name: "Delete tag" }));

    await waitFor(() => {
      expect(screen.getByText("Delete failed.")).toBeInTheDocument();
    });

    expect(screen.getByRole("dialog", { name: "Delete tag" })).toBeInTheDocument();
    expect(screen.getAllByText("AI UX/UI")).toHaveLength(2);
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it("closes the rule delete modal on escape without deleting", async () => {
    const user = userEvent.setup();
    const deleteAction = vi.fn(async () => {});

    render(
      <RulesSettingsPanel
        snapshot={buildSnapshot()}
        canManageRules
        createAction={noopFormAction}
        toggleAction={noopFormAction}
        deleteAction={deleteAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog", { name: "Delete rule" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Delete rule" })).not.toBeInTheDocument();
    });

    expect(deleteAction).not.toHaveBeenCalled();
    expect(screen.getByText("Pricing motion")).toBeInTheDocument();
  });

  it("opens entity add and edit modals instead of rendering an inline form", async () => {
    const user = userEvent.setup();
    const createAction = vi.fn(async () => {});
    const updateAction = vi.fn(async () => {});

    render(
      <EntitiesSettingsPanel
        snapshot={buildSnapshot()}
        canManageEntities
        createAction={createAction}
        updateAction={updateAction}
        deleteAction={noopFormAction}
      />,
    );

    expect(screen.queryByPlaceholderText("Company or topic name")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add entity" }));
    expect(screen.getByRole("dialog", { name: "Add entity" })).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Name" }), "New entity");
    await user.click(screen.getByRole("button", { name: "Add entity" }));

    await waitFor(() => {
      expect(createAction).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole("dialog", { name: "Add entity" })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(screen.getByRole("dialog", { name: "Edit entity" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("AI UX Signals")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save entity" }));

    await waitFor(() => {
      expect(updateAction).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole("dialog", { name: "Edit entity" })).not.toBeInTheDocument();
  });

  it("opens tag add and edit modals instead of rendering an inline form", async () => {
    const user = userEvent.setup();
    const createAction = vi.fn(async () => {});
    const updateAction = vi.fn(async () => {});

    render(
      <TagsSettingsPanel
        snapshot={buildSnapshot()}
        canManageTags
        createAction={createAction}
        updateAction={updateAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    expect(screen.queryByPlaceholderText("Feature launch")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add tag" }));
    expect(screen.getByRole("dialog", { name: "Add tag" })).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Name" }), "New tag");
    await user.click(screen.getByRole("button", { name: "Add tag" }));

    await waitFor(() => {
      expect(createAction).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole("dialog", { name: "Add tag" })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(screen.getByRole("dialog", { name: "Edit tag" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("AI UX/UI")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save tag" }));

    await waitFor(() => {
      expect(updateAction).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole("dialog", { name: "Edit tag" })).not.toBeInTheDocument();
  });
});
