import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedCard } from "@/components/dashboard/feed-card";
import { FeedDetailModal } from "@/components/dashboard/feed-detail-modal";
import { resolveXDisplayText } from "@/components/dashboard/x-copy";
import type { DashboardItem } from "@/lib/domain";

const { routerRefresh } = vi.hoisted(() => ({
  routerRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
  }),
}));

vi.mock("@/actions/item-state", () => ({
  setItemReadAction: vi.fn(),
  toggleSavedAction: vi.fn(),
}));

function buildDashboardItem(overrides: Partial<DashboardItem> = {}): DashboardItem {
  return {
    id: "item_x_1",
    title: "刚知道 Macbook Neo 的自定义色彩主题在其他 Mac 电脑上也可以用了...",
    excerpt:
      "刚知道 Macbook Neo 的自定义色彩主题在其他 Mac 电脑上也可以用了，系统需要升级到最新版，然后终端里运行：defaults write -g NSColor...",
    canonicalUrl: "https://x.com/dingyi/status/1",
    contentType: "post",
    publishedAt: new Date("2026-03-14T12:00:00.000Z"),
    authorName: "Ding",
    authorAvatarUrl: null,
    thumbnailUrl: null,
    mediaKind: null,
    mediaLabel: null,
    isNew: true,
    isRead: false,
    isSaved: false,
    sourceName: "Ding X",
    sourceHandle: "@dingyi",
    sourceType: "x",
    socialMetrics: {
      replies: 11,
      reposts: 7,
      likes: 271,
      views: 5600,
      bookmarks: 262,
    },
    entityId: "entity_aiux",
    entityName: "AI UX/UI Signals",
    entityKind: "product",
    tags: [
      {
        id: "tag_aiux",
        workspaceId: "workspace_1",
        name: "AI UX/UI",
        slug: "ai-ux-ui",
        color: "#198f7a",
        parentId: null,
        isActive: true,
      },
    ],
    ...overrides,
  };
}

describe("X content presentation", () => {
  it("collapses legacy duplicated X text into a single primary block", () => {
    const item = buildDashboardItem();

    expect(resolveXDisplayText(item)).toEqual({
      primaryText:
        "刚知道 Macbook Neo 的自定义色彩主题在其他 Mac 电脑上也可以用了，系统需要升级到最新版，然后终端里运行：defaults write -g NSColor...",
      secondaryText: "",
    });
  });

  it("renders X feed cards with the full post text only once", () => {
    const item = buildDashboardItem();

    render(<FeedCard item={item} />);

    expect(
      screen.getByText(
        "刚知道 Macbook Neo 的自定义色彩主题在其他 Mac 电脑上也可以用了，系统需要升级到最新版，然后终端里运行：defaults write -g NSColor...",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("刚知道 Macbook Neo 的自定义色彩主题在其他 Mac 电脑上也可以用了...")).not.toBeInTheDocument();
  });

  it("renders X detail modals with a single body copy for legacy items", () => {
    const item = buildDashboardItem();

    render(
      <FeedDetailModal
        open
        onClose={() => {}}
        item={item}
        sourceName="Ding"
        sourceHandle="dingyi"
        socialCounts={item.socialMetrics ?? null}
        isShortVideo={false}
        isXVideo={false}
        actionButtons={<div>actions</div>}
      />,
    );

    expect(
      screen.getByText(
        "刚知道 Macbook Neo 的自定义色彩主题在其他 Mac 电脑上也可以用了，系统需要升级到最新版，然后终端里运行：defaults write -g NSColor...",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("刚知道 Macbook Neo 的自定义色彩主题在其他 Mac 电脑上也可以用了...")).not.toBeInTheDocument();
  });

  it("keeps non-X cards on the existing title and excerpt layout", () => {
    const item = buildDashboardItem({
      id: "item_web_1",
      title: "AI agent handoff patterns",
      excerpt: "A practical review of how teams keep agents oriented across tabs and tools.",
      canonicalUrl: "https://example.com/handoff",
      contentType: "article",
      sourceName: "Example Website",
      sourceHandle: null,
      sourceType: "website",
      socialMetrics: null,
      entityName: null,
      entityKind: null,
    });

    render(<FeedCard item={item} />);

    expect(screen.getByText("AI agent handoff patterns")).toBeInTheDocument();
    expect(
      screen.getByText("A practical review of how teams keep agents oriented across tabs and tools."),
    ).toBeInTheDocument();
  });
});
