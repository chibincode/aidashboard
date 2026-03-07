import type {
  DashboardFilters,
  DashboardItem,
  DashboardSection,
  DashboardSnapshot,
  DashboardView,
  EntityRecord,
  FeedItemRecord,
  SourceRecord,
  TagRecord,
  UserItemStateRecord,
  ViewerContext,
  WorkspaceRecord,
} from "@/lib/domain";

function toDashboardItem(args: {
  item: FeedItemRecord;
  viewer: ViewerContext;
  userStates: UserItemStateRecord[];
  sourceMap: Map<string, SourceRecord>;
  entityMap: Map<string, EntityRecord>;
  tagMap: Map<string, TagRecord>;
}): DashboardItem {
  const { item, viewer, userStates, sourceMap, entityMap, tagMap } = args;
  const state = userStates.find((entry) => entry.feedItemId === item.id);
  const source = sourceMap.get(item.primarySourceId);
  const entity = item.entityId ? entityMap.get(item.entityId) : null;

  return {
    id: item.id,
    title: item.title,
    excerpt: item.excerpt,
    canonicalUrl: item.canonicalUrl,
    contentType: item.contentType,
    publishedAt: item.publishedAt,
    authorName: item.authorName,
    thumbnailUrl: item.thumbnailUrl,
    mediaLabel: item.mediaLabel,
    isNew: item.publishedAt > viewer.lastVisitAt,
    isRead: state?.isRead ?? false,
    isSaved: state?.isSaved ?? false,
    sourceName: source?.name ?? "Unknown source",
    sourceHandle: typeof source?.config.handle === "string" ? source.config.handle : null,
    sourceType: source?.type ?? "website",
    entityName: entity?.name ?? null,
    tags: item.tagIds.map((tagId) => tagMap.get(tagId)).filter(Boolean) as TagRecord[],
  };
}

function filterDashboardItems(items: DashboardItem[], entities: EntityRecord[], filters: DashboardFilters) {
  const entity = filters.entity ? entities.find((entry) => entry.id === filters.entity) : undefined;

  return items.filter((item) => {
    if (entity && item.entityName !== entity.name) {
      return false;
    }

    if (filters.tag && !item.tags.some((tag) => tag.id === filters.tag)) {
      return false;
    }

    if (filters.sourceType && item.sourceType !== filters.sourceType) {
      return false;
    }

    if (filters.unreadOnly && item.isRead) {
      return false;
    }

    if (filters.savedOnly && !item.isSaved) {
      return false;
    }

    return true;
  });
}

function buildSections(items: DashboardItem[]): DashboardSection[] {
  return [
    {
      id: "new-since-last-visit",
      title: "New Since Last Visit",
      description: "Everything that landed after your previous check-in.",
      tone: "mint",
      items: items.filter((item) => item.isNew),
    },
    {
      id: "ai-ux-ui",
      title: "AI UX/UI",
      description: "Interaction patterns, onboarding models, trust cues and AI-native workflows.",
      tone: "sand",
      items: items.filter((item) => item.tags.some((tag) => tag.slug === "ai-ux-ui")),
    },
    {
      id: "competitor-watch",
      title: "Competitor Watch",
      description: "Signals across Trucker Path, AI Loadboard, NavPro and adjacent movers.",
      tone: "amber",
      items: items.filter(
        (item) =>
          item.tags.some((tag) => tag.slug === "competitor") ||
          ["Trucker Path", "AI Loadboard", "NavPro Web"].includes(item.entityName ?? ""),
      ),
    },
    {
      id: "industry-signals",
      title: "Industry Signals",
      description: "Navigation, pricing, routing and loadboard signals across the category.",
      tone: "ink",
      items: items.filter((item) =>
        item.tags.some((tag) => ["navigation", "loadboard", "pricing"].includes(tag.slug)),
      ),
    },
    {
      id: "saved",
      title: "Saved",
      description: "Your pinned items for later review and cross-team synthesis.",
      tone: "mint",
      items: items.filter((item) => item.isSaved),
    },
  ];
}

function getFeedItemsForView(view: DashboardView, sections: DashboardSection[], items: DashboardItem[]) {
  if (view === "all") {
    return items;
  }

  return sections.find((section) => section.id === view)?.items ?? [];
}

export function buildDashboardSnapshot(args: {
  workspace: WorkspaceRecord;
  sources: SourceRecord[];
  entities: EntityRecord[];
  tags: TagRecord[];
  feedItems: FeedItemRecord[];
  userStates: UserItemStateRecord[];
  viewer: ViewerContext;
  filters: DashboardFilters;
}): DashboardSnapshot {
  const sourceMap = new Map(args.sources.map((source) => [source.id, source]));
  const entityMap = new Map(args.entities.map((entity) => [entity.id, entity]));
  const tagMap = new Map(args.tags.map((tag) => [tag.id, tag]));

  const dashboardItems = args.feedItems.map((item) =>
    toDashboardItem({
      item,
      viewer: args.viewer,
      userStates: args.userStates,
      sourceMap,
      entityMap,
      tagMap,
    }),
  );

  const filtered = filterDashboardItems(dashboardItems, args.entities, args.filters);
  const sections = buildSections(filtered);
  const activeView = args.filters.view ?? "all";

  return {
    workspace: args.workspace,
    activeView,
    feedItems: getFeedItemsForView(activeView, sections, filtered),
    sections,
    tags: args.tags,
    entities: args.entities,
    sources: args.sources,
    counts: {
      newItems: dashboardItems.filter((item) => item.isNew).length,
      unreadItems: dashboardItems.filter((item) => !item.isRead).length,
      savedItems: dashboardItems.filter((item) => item.isSaved).length,
      healthySources: args.sources.filter((source) => source.healthStatus === "healthy").length,
    },
  };
}
