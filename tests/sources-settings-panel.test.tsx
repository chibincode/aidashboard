import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SourcesSettingsPanel } from "@/components/settings/sources-settings-panel";
import type { AdminSnapshot } from "@/lib/domain";

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
        priority: 98,
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
        priority: 96,
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
        priority: 95,
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
    rules: [],
    feedItems: [],
  };
}

const noopSourceAction = vi.fn(async (state) => state);
const noopFormAction = vi.fn(async () => {});

describe("SourcesSettingsPanel", () => {
  it("shows the demo-mode lock reason and disables mutations", () => {
    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        hasDatabase={false}
        isDemoMode
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={noopFormAction}
        deleteAction={noopFormAction}
      />,
    );

    expect(screen.getByText(/connect/i)).toHaveTextContent("Demo mode is read-only. Connect DATABASE_URL to manage sources.");
    expect(screen.getByRole("button", { name: "Add source" })).toBeDisabled();
  });

  it("renders as a list by default and opens the create modal on demand", async () => {
    const user = userEvent.setup();

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        hasDatabase
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

    expect(screen.getByRole("dialog", { name: "Add source" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("NavPro release notes")).toBeInTheDocument();
  });

  it("prefills the edit modal with the selected source", async () => {
    const user = userEvent.setup();

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        hasDatabase
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
  });

  it("asks for confirmation before deleting a source", async () => {
    const user = userEvent.setup();

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        hasDatabase
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

  it("filters sources by keyword and type", async () => {
    const user = userEvent.setup();

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        hasDatabase
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
});
