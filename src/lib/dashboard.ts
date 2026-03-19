import type {
  CategoryRecord,
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
import { normalizeFeedItemUrl } from "@/lib/feed-item-identity";

const NEW_SINCE_LAST_VISIT_SECTION: DashboardSection = {
  id: "new-since-last-visit",
  title: "New Since Last Visit",
  description: "Everything that landed after your previous check-in.",
  tone: "mint",
  items: [],
};

const SAVED_SECTION: DashboardSection = {
  id: "saved",
  title: "Saved",
  description: "Your pinned items for later review and cross-team synthesis.",
  tone: "mint",
  items: [],
};

function mergeDashboardItems(existing: DashboardItem, incoming: DashboardItem): DashboardItem {
  const tagMap = new Map(existing.tags.map((tag) => [tag.id, tag]));
  for (const tag of incoming.tags) {
    tagMap.set(tag.id, tag);
  }

  const existingMetricCount = Object.values(existing.socialMetrics ?? {}).filter((value) => value !== undefined).length;
  const incomingMetricCount = Object.values(incoming.socialMetrics ?? {}).filter((value) => value !== undefined).length;

  return {
    ...existing,
    title: existing.title.length >= incoming.title.length ? existing.title : incoming.title,
    excerpt: existing.excerpt.length >= incoming.excerpt.length ? existing.excerpt : incoming.excerpt,
    publishedAt: existing.publishedAt > incoming.publishedAt ? existing.publishedAt : incoming.publishedAt,
    authorName: existing.authorName ?? incoming.authorName,
    authorAvatarUrl: existing.authorAvatarUrl ?? incoming.authorAvatarUrl ?? null,
    thumbnailUrl: existing.thumbnailUrl ?? incoming.thumbnailUrl,
    mediaKind: existing.mediaKind ?? incoming.mediaKind ?? null,
    mediaLabel: existing.mediaLabel ?? incoming.mediaLabel ?? null,
    isNew: existing.isNew || incoming.isNew,
    isRead: existing.isRead || incoming.isRead,
    isSaved: existing.isSaved || incoming.isSaved,
    sourceName: existing.sourceName !== "Unknown source" ? existing.sourceName : incoming.sourceName,
    sourceHandle: existing.sourceHandle ?? incoming.sourceHandle,
    socialMetrics: existingMetricCount >= incomingMetricCount ? existing.socialMetrics : incoming.socialMetrics,
    entityId: existing.entityId ?? incoming.entityId,
    entityName: existing.entityName ?? incoming.entityName,
    entityKind: existing.entityKind ?? incoming.entityKind,
    tags: [...tagMap.values()],
  };
}

function dedupeDashboardItems(items: DashboardItem[]) {
  const deduped = new Map<string, DashboardItem>();

  for (const item of items) {
    const key = normalizeFeedItemUrl(item.canonicalUrl);
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, item);
      continue;
    }

    deduped.set(key, mergeDashboardItems(existing, item));
  }

  return [...deduped.values()].sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime());
}

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
    authorAvatarUrl:
      item.authorAvatarUrl ?? (typeof source?.config.avatarUrl === "string" ? source.config.avatarUrl : null),
    thumbnailUrl: item.thumbnailUrl,
    mediaKind: item.mediaKind ?? null,
    mediaLabel: item.mediaLabel,
    isNew: item.publishedAt > viewer.lastVisitAt,
    isRead: state?.isRead ?? false,
    isSaved: state?.isSaved ?? false,
    sourceName: source?.name ?? "Unknown source",
    sourceHandle: typeof source?.config.handle === "string" ? source.config.handle : null,
    sourceType: source?.type ?? "website",
    socialMetrics: item.socialMetrics ?? null,
    entityId: entity?.id ?? null,
    entityName: entity?.name ?? null,
    entityKind: entity?.kind ?? null,
    tags: item.tagIds.map((tagId) => tagMap.get(tagId)).filter(Boolean) as TagRecord[],
  };
}

export function filterDashboardItems(items: DashboardItem[], filters: DashboardFilters) {
  return items.filter((item) => {
    if (filters.entity && item.entityId !== filters.entity) {
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

function sortCategories(categories: CategoryRecord[]) {
  return [...categories].sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }

    return left.name.localeCompare(right.name);
  });
}

function itemMatchesCategory(item: DashboardItem, category: CategoryRecord) {
  const hasTagMatch = category.tagIds.some((tagId) => item.tags.some((tag) => tag.id === tagId));
  const hasEntityMatch = item.entityId ? category.entityIds.includes(item.entityId) : false;
  const hasEntityKindMatch = item.entityKind ? category.entityKinds.includes(item.entityKind) : false;

  return hasTagMatch || hasEntityMatch || hasEntityKindMatch;
}

export function getActiveDashboardCategories(categories: CategoryRecord[]) {
  return sortCategories(categories.filter((category) => category.isActive));
}

export function buildDashboardSections(items: DashboardItem[], categories: CategoryRecord[]): DashboardSection[] {
  const dynamicSections = categories.map<DashboardSection>((category) => ({
    id: category.id,
    title: category.name,
    description: category.description,
    tone: category.tone,
    items: items.filter((item) => itemMatchesCategory(item, category)),
  }));

  return [
    {
      ...NEW_SINCE_LAST_VISIT_SECTION,
      items: items.filter((item) => item.isNew),
    },
    ...dynamicSections,
    {
      ...SAVED_SECTION,
      items: items.filter((item) => item.isSaved),
    },
  ];
}

export function resolveActiveDashboardView(view: DashboardView | undefined, categories: CategoryRecord[]) {
  if (!view || view === "all" || view === "saved") {
    return view ?? "all";
  }

  return categories.some((category) => category.id === view) ? view : "all";
}

export function getDashboardFeedItemsForView(view: DashboardView, sections: DashboardSection[], items: DashboardItem[]) {
  if (view === "all") {
    return items;
  }

  return sections.find((section) => section.id === view)?.items ?? [];
}

export function projectDashboardState(args: {
  allItems: DashboardItem[];
  categories: CategoryRecord[];
  filters: DashboardFilters;
}) {
  const filtered = filterDashboardItems(args.allItems, args.filters);
  const activeCategories = getActiveDashboardCategories(args.categories);
  const sections = buildDashboardSections(filtered, activeCategories);
  const activeView = resolveActiveDashboardView(args.filters.view, activeCategories);

  return {
    activeView,
    categories: activeCategories,
    sections,
    feedItems: getDashboardFeedItemsForView(activeView, sections, filtered),
  };
}

export function buildDashboardSnapshot(args: {
  workspace: WorkspaceRecord;
  sources: SourceRecord[];
  entities: EntityRecord[];
  tags: TagRecord[];
  categories: CategoryRecord[];
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
  const uniqueItems = dedupeDashboardItems(dashboardItems);
  const projected = projectDashboardState({
    allItems: uniqueItems,
    categories: args.categories,
    filters: args.filters,
  });

  return {
    renderId: `${Date.now()}`,
    workspace: args.workspace,
    viewer: args.viewer,
    activeView: projected.activeView,
    overview: null,
    allItems: uniqueItems,
    feedItems: projected.feedItems,
    sections: projected.sections,
    categories: projected.categories,
    tags: args.tags,
    entities: args.entities,
    sources: args.sources,
    counts: {
      newItems: uniqueItems.filter((item) => item.isNew).length,
      unreadItems: uniqueItems.filter((item) => !item.isRead).length,
      savedItems: uniqueItems.filter((item) => item.isSaved).length,
      healthySources: args.sources.filter((source) => source.healthStatus === "healthy").length,
    },
  };
}
