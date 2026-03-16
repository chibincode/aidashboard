import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SourcesSettingsPanel } from "@/components/settings/sources-settings-panel";
import type { AdminSnapshot } from "@/lib/domain";
import { seedCategories } from "@/lib/seed";

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
    ],
    categories: seedCategories,
    rules: [],
  };
}

const noopSourceAction = vi.fn(async (state) => state);

describe("SourcesSettingsPanel row loading", () => {
  beforeEach(() => {
    routerRefresh.mockReset();
    noopSourceAction.mockClear();
  });

  it("shows row-level loading and disables sibling actions while toggling source state", async () => {
    const user = userEvent.setup();
    let resolveToggle: (() => void) | undefined;
    const toggleAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveToggle = resolve;
        }),
    );

    render(
      <SourcesSettingsPanel
        snapshot={buildSnapshot()}
        canManageSources
        isDemoMode={false}
        createAction={noopSourceAction}
        updateAction={noopSourceAction}
        toggleAction={toggleAction}
        deleteAction={vi.fn(async () => {})}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pause" }));

    expect(screen.getByRole("button", { name: "Pausing..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();

    if (resolveToggle) {
      resolveToggle();
    }

    await waitFor(() => {
      expect(routerRefresh).toHaveBeenCalled();
    });
  });
});
