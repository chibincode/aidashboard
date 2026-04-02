export const sourceTypes = ["rss", "website", "youtube", "x"] as const;
export type SourceType = (typeof sourceTypes)[number];

export const sourceHealthStates = ["healthy", "stale", "degraded", "error"] as const;
export type SourceHealthState = (typeof sourceHealthStates)[number];

export const entityKinds = ["topic", "competitor", "product"] as const;
export type EntityKind = (typeof entityKinds)[number];

export const feedItemTypes = ["article", "video", "post", "update"] as const;
export type FeedItemType = (typeof feedItemTypes)[number];

export const membershipRoles = ["owner", "editor", "viewer"] as const;
export type MembershipRole = (typeof membershipRoles)[number];

export const systemDashboardViews = ["all", "saved"] as const;
export type SystemDashboardView = (typeof systemDashboardViews)[number];
export type DashboardView = string;
export type SectionKey = string;

export const settingsTabIds = ["sources", "entities", "tags", "categories", "rules"] as const;
export type SettingsTabId = (typeof settingsTabIds)[number];

export const settingsTabs: ReadonlyArray<{
  id: SettingsTabId;
  label: string;
  href: `/admin/${SettingsTabId}`;
}> = [
  { id: "sources", label: "Sources", href: "/admin/sources" },
  { id: "entities", label: "Entities", href: "/admin/entities" },
  { id: "tags", label: "Tags", href: "/admin/tags" },
  { id: "categories", label: "Categories", href: "/admin/categories" },
  { id: "rules", label: "Rules", href: "/admin/rules" },
] as const;

export type ThemeTone = "mint" | "sand" | "ink" | "amber";

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface EntityRecord {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  kind: EntityKind;
  description: string;
  color: string;
}

export interface TagRecord {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  color: string;
  parentId: string | null;
  isActive: boolean;
}

export interface CategoryRecord {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string;
  tone: ThemeTone;
  position: number;
  isActive: boolean;
  tagIds: string[];
  entityIds: string[];
  entityKinds: EntityKind[];
}

export const sourceExtractorProfiles = [
  "generic-rss",
  "gallery-rss",
  "a1-gallery-home",
] as const;
export type SourceExtractorProfile = (typeof sourceExtractorProfiles)[number];

export interface GenericSourceConfig extends Record<string, unknown> {
  extractorProfile?: SourceExtractorProfile;
  itemType?: FeedItemType;
  listSelector?: string;
  avatarUrl?: string;
  handle?: string;
}

export interface YouTubeSourceConfig extends Record<string, unknown> {
  feedUrl: string;
  channelId?: string;
  channelUrl?: string;
  inputUrl?: string;
  handleUrl?: string;
  itemType?: "video";
}

export interface XSourceConfig extends GenericSourceConfig {
  handle: string;
  rssUrl: string;
  inputUrl?: string;
  handleUrl?: string;
  itemType?: "post";
}

export interface GallerySourceConfig extends GenericSourceConfig {
  extractorProfile: "gallery-rss" | "a1-gallery-home";
  itemType?: "article";
}

export type SourceConfig = GenericSourceConfig | GallerySourceConfig | YouTubeSourceConfig | XSourceConfig;

export interface SourceRecord {
  id: string;
  workspaceId: string;
  entityId: string | null;
  name: string;
  slug: string;
  type: SourceType;
  url: string;
  refreshMinutes: number;
  priority: number;
  isActive: boolean;
  healthStatus: SourceHealthState;
  config: SourceConfig;
  defaultTagIds: string[];
  lastFetchedAt: Date | null;
  lastErrorMessage: string | null;
}

export interface TagRuleCondition {
  keywords?: string[];
  urlContains?: string[];
  sourceTypes?: SourceType[];
  contentTypes?: FeedItemType[];
}

export interface TagRuleAction {
  tagIds: string[];
}

export interface TagRuleRecord {
  id: string;
  workspaceId: string;
  name: string;
  isActive: boolean;
  priority: number;
  sourceId: string | null;
  conditions: TagRuleCondition;
  actions: TagRuleAction;
}

export interface FeedItemRecord {
  id: string;
  workspaceId: string;
  entityId: string | null;
  primarySourceId: string;
  sourceIds: string[];
  title: string;
  excerpt: string;
  canonicalUrl: string;
  contentType: FeedItemType;
  publishedAt: Date;
  ingestedAt: Date;
  fingerprint: string;
  authorName: string | null;
  authorAvatarUrl?: string | null;
  thumbnailUrl: string | null;
  mediaKind?: "image" | "video" | null;
  mediaLabel?: string | null;
  socialMetrics?: SocialMetrics | null;
  tagIds: string[];
}

export interface UserItemStateRecord {
  userId: string;
  workspaceId: string;
  feedItemId: string;
  isRead: boolean;
  isSaved: boolean;
  lastViewedAt: Date | null;
}

export interface ViewerContext {
  workspaceId: string;
  userId: string;
  email: string;
  isAuthenticated: boolean;
  lastVisitAt: Date;
}

export interface DashboardFilters {
  view?: DashboardView;
  entity?: string;
  tag?: string;
  sourceType?: SourceType;
  unreadOnly?: boolean;
  savedOnly?: boolean;
}

export interface DashboardItem {
  id: string;
  title: string;
  excerpt: string;
  canonicalUrl: string;
  contentType: FeedItemType;
  publishedAt: Date;
  authorName: string | null;
  authorAvatarUrl?: string | null;
  thumbnailUrl: string | null;
  mediaKind?: "image" | "video" | null;
  mediaLabel?: string | null;
  isNew: boolean;
  isRead: boolean;
  isSaved: boolean;
  sourceName: string;
  sourceHandle: string | null;
  sourceType: SourceType;
  socialMetrics?: SocialMetrics | null;
  entityId: string | null;
  entityName: string | null;
  entityKind: EntityKind | null;
  tags: TagRecord[];
}

export interface SocialMetrics {
  replies?: number;
  reposts?: number;
  likes?: number;
  views?: number;
  bookmarks?: number;
}

export interface DashboardSection {
  id: SectionKey;
  title: string;
  description: string;
  tone: ThemeTone;
  items: DashboardItem[];
}

export interface DashboardOverviewTag {
  id: string;
  name: string;
  color: string;
}

export interface DashboardOverviewInsight {
  id: string;
  summary: string;
  sourceItemIds: string[];
}

export interface DashboardOverview {
  mode: "ai" | "fallback";
  window: "last-24h";
  generatedAt: Date | null;
  stale?: boolean;
  failureReason?: string | null;
  headline: string;
  insights: DashboardOverviewInsight[];
  itemCount: number;
  sourceCount: number;
  topTags: DashboardOverviewTag[];
  model: string | null;
  statusText: string;
  canRetry: boolean;
}

export interface DashboardPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  hasMore: boolean;
}

export interface AdminSnapshot {
  workspace: WorkspaceRecord;
  sources: SourceRecord[];
  entities: EntityRecord[];
  tags: TagRecord[];
  categories: CategoryRecord[];
  rules: TagRuleRecord[];
}

export interface DashboardSnapshot {
  renderId: string;
  workspace: WorkspaceRecord;
  viewer: ViewerContext;
  activeView: DashboardView;
  overview: DashboardOverview | null;
  allItems: DashboardItem[];
  feedItems: DashboardItem[];
  pagination: DashboardPagination;
  sections: DashboardSection[];
  categories: CategoryRecord[];
  tags: TagRecord[];
  entities: EntityRecord[];
  sources: SourceRecord[];
  counts: {
    newItems: number;
    unreadItems: number;
    savedItems: number;
    healthySources: number;
  };
}
