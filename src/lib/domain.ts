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

export const sectionKeys = [
  "new-since-last-visit",
  "ai-ux-ui",
  "competitor-watch",
  "industry-signals",
  "saved",
] as const;
export type SectionKey = (typeof sectionKeys)[number];

export const dashboardViews = [
  "all",
  "ai-ux-ui",
  "competitor-watch",
  "industry-signals",
  "saved",
] as const;
export type DashboardView = (typeof dashboardViews)[number];

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
  config: Record<string, unknown>;
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
  thumbnailUrl: string | null;
  mediaLabel?: string | null;
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
  thumbnailUrl: string | null;
  mediaLabel?: string | null;
  isNew: boolean;
  isRead: boolean;
  isSaved: boolean;
  sourceName: string;
  sourceHandle: string | null;
  sourceType: SourceType;
  entityName: string | null;
  tags: TagRecord[];
}

export interface DashboardSection {
  id: SectionKey;
  title: string;
  description: string;
  tone: ThemeTone;
  items: DashboardItem[];
}

export interface AdminSnapshot {
  workspace: WorkspaceRecord;
  sources: SourceRecord[];
  entities: EntityRecord[];
  tags: TagRecord[];
  rules: TagRuleRecord[];
  feedItems: FeedItemRecord[];
}

export interface DashboardSnapshot {
  workspace: WorkspaceRecord;
  activeView: DashboardView;
  feedItems: DashboardItem[];
  sections: DashboardSection[];
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
