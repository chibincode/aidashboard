import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SourcesSettingsPanel } from "@/components/settings/sources-settings-panel";
import type { AdminSnapshot } from "@/lib/domain";
import { seedCategories } from "@/lib/seed";
import { createEmptySourceFormValues, createSourceMutationState } from "@/lib/source-forms";

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
          feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCXZCJLdBC09xxGZ6gcdrc6A",
          channelId: "UCXZCJLdBC09xxGZ6gcdrc6A",
          channelUrl: "https://www.youtube.com/channel/UCXZCJLdBC09xxGZ6gcdrc6A",
          handleUrl: "https://www.youtube.com/@OpenAI",
          inputUrl: "https://www.youtube.com/@OpenAI",
          itemType: "video",
        },
        defaultTagIds: ["tag_aiux"],
        lastFetchedAt: new Date("2026-03-07T09:00:00.000Z"),
        lastErrorMessage: null,
      },
      {
        id: "source_andy",
        workspaceId: "ws_1",
        entityId: "entity_aiux",
        name: "Andy Hooke X",
        slug: "andy-hooke-x",
        type: "x",
        url: "https://x.com/andy_hooke",
        refreshMinutes: 30,
        priority: 90,
        isActive: true,
        healthStatus: "healthy",
        config: {
          handle: "@andy_hooke",
        },
        defaultTagIds: ["tag_design"],
        lastFetchedAt: new Date("2026-03-08T09:00:00.000Z"),
        lastErrorMessage: null,
      },
      {
        id: "source_trucker",
        workspaceId: "ws_1",
        entityId: "entity_competitor",
        name: "Trucker Path Blog",
        slug: "trucker-path-blog",
        type: "website",
        url: "https://truckerpath.com/blog/",
        refreshMinutes: 60,
        priority: 30,
        isActive: true,
        healthStatus: "healthy",
        config: {},
        defaultTagIds: ["tag_competitor"],
        lastFetchedAt: new Date("2026-03-08T09:00:00.000Z"),
        lastErrorMessage: null,
      },
    ],
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
        name: "Competitor Watch",
        slug: "competitor-watch",
        kind: "competitor",
        description: "Competitor Watch",
        color: "#d97706",
      },
    ],
    tags: [
      {
        id: "tag_aiux",
        workspaceId: "ws_1",
        name: "AI UX",
        slug: "ai-ux",
        color: "#197d71",
        parentId: null,
        isActive: true,
      },
      {
        id: "tag_design",
        workspaceId: "ws_1",
        name: "Design Pattern",
        slug: "design-pattern",
        color: "#7c3aed",
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
    categories: seedCategories,
    rules: [],
  };
}

const noopSourceAction = vi.fn(async (state) => state);
const noopFormAction = vi.fn(async () => {});

describe("SourcesSettingsPanel", () => {
  beforeEach(() => {
    routerRefresh.mockReset();
    noopSourceAction.mockClear();
    noopFormAction.mockClear();
  });

  it("shows the demo-mode lock reason and disables mutations", () => {
    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources={false}
        isDemoMode
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    expect(screen.getByText(/read-only until/i)).toHaveTextContent(
      "Source management is read-only until DATABASE_URL is configured.",
    );
    expect(screen.getByRole("button", { name: "Add source" })).toBeDisabled();
  });

  it("renders as a list by default and opens the create modal on demand", async () => {
    const user = userEvent.setup();

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    expect(screen.queryByPlaceholderText("NavPro release notes")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Sources" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add source" }));

    const dialog = screen.getByRole("dialog", { name: "Add source" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByPlaceholderText("NavPro release notes")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "URL" })).toBeInTheDocument();

    const textboxes = within(dialog).getAllByRole("textbox");
    expect(textboxes[0]).toHaveAttribute("name", "url");
    expect(textboxes[1]).toHaveAttribute("name", "name");
    expect(within(dialog).getByRole("combobox", { name: "Priority" })).toHaveValue("medium");
  });

  it("prefills the edit modal with the selected source", async () => {
    const user = userEvent.setup();

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    expect(screen.getByRole("dialog", { name: "Edit source" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("OpenAI YouTube")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://www.youtube.com/@OpenAI")).toBeInTheDocument();
    expect(screen.getByText(/Accepts YouTube feed URLs/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Priority" })).toHaveValue("medium");
  });

  it("asks for confirmation before deleting a source", async () => {
    const user = userEvent.setup();

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(screen.getByRole("dialog", { name: "Delete source" })).toBeInTheDocument();
    expect(screen.getByText("Delete OpenAI YouTube?")).toBeInTheDocument();
  });

  it("closes the delete modal immediately, removes the source locally, and refreshes in the background", async () => {
    const user = userEvent.setup();
    const deleteAction = vi.fn(async () => {});

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={deleteAction}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Delete source" });
    await user.click(within(dialog).getByRole("button", { name: "Delete source" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Delete source" })).not.toBeInTheDocument();
    });

    expect(deleteAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("OpenAI YouTube")).not.toBeInTheDocument();
    expect(screen.getByText("Source deleted: OpenAI YouTube.")).toBeInTheDocument();
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the delete modal open when deletion fails and does not remove the source", async () => {
    const user = userEvent.setup();
    const deleteAction = vi.fn(async () => {
      throw new Error("Delete failed.");
    });

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={deleteAction}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Delete source" });
    await user.click(within(dialog).getByRole("button", { name: "Delete source" }));

    await waitFor(() => {
      expect(screen.getByText("Delete failed.")).toBeInTheDocument();
    });

    expect(screen.getByRole("dialog", { name: "Delete source" })).toBeInTheDocument();
    expect(screen.getAllByText("OpenAI YouTube")).toHaveLength(2);
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it("filters sources by keyword and type", async () => {
    const user = userEvent.setup();

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    expect(screen.getByText("3 of 3 sources")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Search sources" }), "andy");

    expect(screen.getByText("1 of 3 sources")).toBeInTheDocument();
    expect(screen.getByText("Andy Hooke X")).toBeInTheDocument();
    expect(screen.queryByText("OpenAI YouTube")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Search sources" }));
    await user.click(screen.getByRole("button", { name: "Website" }));

    expect(screen.getByText("1 of 3 sources")).toBeInTheDocument();
    expect(screen.getByText("Trucker Path Blog")).toBeInTheDocument();
    expect(screen.queryByText("Andy Hooke X")).not.toBeInTheDocument();
  });

  it("auto-detects X and YouTube URLs and locks the type field", async () => {
    const user = userEvent.setup();

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add source" }));

    const urlInput = screen.getByRole("textbox", { name: "URL" });
    const nameInput = screen.getByRole("textbox", { name: "Name" });
    const typeSelect = screen.getByRole("combobox", { name: "Type" });

    await user.type(urlInput, "https://x.com/andy_hooke");

    expect(nameInput).toHaveValue("Andy Hooke");
    expect(typeSelect).toHaveValue("x");
    expect(typeSelect).toBeDisabled();
    expect(screen.getByText("Detected from URL")).toBeInTheDocument();

    await user.clear(urlInput);
    await user.type(urlInput, "https://www.youtube.com/@OpenAI");

    expect(nameInput).toHaveValue("OpenAI");
    expect(typeSelect).toHaveValue("youtube");
    expect(typeSelect).toBeDisabled();
  });

  it("unlocks type and updates extractor behavior when the URL is generic", async () => {
    const user = userEvent.setup();

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add source" }));

    const urlInput = screen.getByRole("textbox", { name: "URL" });
    const typeSelect = screen.getByRole("combobox", { name: "Type" });

    await user.type(urlInput, "https://x.com/andy_hooke");
    expect(typeSelect).toBeDisabled();

    await user.clear(urlInput);
    await user.type(urlInput, "https://example.com/feed");

    expect(typeSelect).not.toBeDisabled();
    expect(typeSelect).toHaveValue("x");

    await user.selectOptions(typeSelect, "rss");

    expect(screen.getByRole("combobox", { name: "Extractor" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Extractor" })).toHaveValue("generic-rss");

    await user.clear(urlInput);
    await user.type(urlInput, "https://www.youtube.com/@Framer");

    expect(screen.queryByRole("combobox", { name: "Extractor" })).not.toBeInTheDocument();
    expect(typeSelect).toHaveValue("youtube");
    expect(typeSelect).toBeDisabled();
  });

  it("shows priority labels in the source list instead of raw numbers", () => {
    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    expect(screen.getByText(/Priority Medium/)).toBeInTheDocument();
    expect(screen.getByText(/Priority High/)).toBeInTheDocument();
    expect(screen.getByText(/Priority Low/)).toBeInTheDocument();
    expect(screen.queryByText(/Priority 70/)).not.toBeInTheDocument();
  });

  it("keeps updating the auto-filled name until the user customizes it", async () => {
    const user = userEvent.setup();

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add source" }));

    const urlInput = screen.getByRole("textbox", { name: "URL" });
    const nameInput = screen.getByRole("textbox", { name: "Name" });

    await user.type(urlInput, "https://x.com/SuperDesignDev");
    expect(nameInput).toHaveValue("Super Design Dev");

    await user.clear(urlInput);
    await user.type(urlInput, "https://onepagelove.com/feed");
    expect(nameInput).toHaveValue("One Page Love");

    await user.clear(nameInput);
    await user.type(nameInput, "Custom Brand");
    await user.clear(urlInput);
    await user.type(urlInput, "https://www.youtube.com/@Framer");

    expect(nameInput).toHaveValue("Custom Brand");
  });

  it("does not auto-rewrite an existing saved source name in edit mode", async () => {
    const user = userEvent.setup();

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    const urlInput = screen.getByRole("textbox", { name: "URL" });
    const nameInput = screen.getByRole("textbox", { name: "Name" });

    expect(nameInput).toHaveValue("OpenAI YouTube");

    await user.clear(urlInput);
    await user.type(urlInput, "https://www.youtube.com/@Framer");

    expect(nameInput).toHaveValue("OpenAI YouTube");
  });

  it("resumes auto-fill after the user clears a customized name and changes the URL again", async () => {
    const user = userEvent.setup();

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add source" }));

    const urlInput = screen.getByRole("textbox", { name: "URL" });
    const nameInput = screen.getByRole("textbox", { name: "Name" });

    await user.type(urlInput, "https://x.com/SuperDesignDev");
    expect(nameInput).toHaveValue("Super Design Dev");

    await user.clear(nameInput);
    await user.type(nameInput, "My Manual Name");
    await user.clear(nameInput);

    await user.clear(urlInput);
    await user.type(urlInput, "https://www.youtube.com/@Framer");

    expect(nameInput).toHaveValue("Framer");
  });

  it("closes the modal immediately, shows a local success message, and refreshes in the background", async () => {
    const user = userEvent.setup();
    const createAction = vi.fn(async () =>
      createSourceMutationState(createEmptySourceFormValues(), {
        status: "success",
        message: "Source created. Background validation started.",
      }),
    );

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={createAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add source" }));
    const dialog = screen.getByRole("dialog", { name: "Add source" });
    await user.type(within(dialog).getByRole("textbox", { name: "URL" }), "https://example.com/feed");
    await user.type(within(dialog).getByRole("textbox", { name: "Name" }), "Example Feed");
    await user.click(within(dialog).getByRole("button", { name: "Add source" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Add source" })).not.toBeInTheDocument();
    });

    expect(screen.getByText("Source created. Background validation started.")).toBeInTheDocument();
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });
});
