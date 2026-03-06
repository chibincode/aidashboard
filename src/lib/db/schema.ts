import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createId = () => crypto.randomUUID();

export const membershipRoleEnum = pgEnum("membership_role", ["owner", "editor", "viewer"]);
export const entityKindEnum = pgEnum("entity_kind", ["topic", "competitor", "product"]);
export const sourceTypeEnum = pgEnum("source_type", ["rss", "website", "youtube", "x"]);
export const sourceHealthEnum = pgEnum("source_health", ["healthy", "stale", "degraded", "error"]);
export const feedItemTypeEnum = pgEnum("feed_item_type", ["article", "video", "post", "update"]);
export const ingestionStatusEnum = pgEnum("ingestion_status", ["success", "partial", "failed"]);

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  defaultWorkspaceId: text("default_workspace_id").references(() => workspaces.id, {
    onDelete: "set null",
  }),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull().default("viewer"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("membership_unique").on(table.workspaceId, table.userId)],
);

export const invites = pgTable("invites", {
  id: text("id").primaryKey().$defaultFn(createId),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: membershipRoleEnum("role").notNull().default("viewer"),
  token: text("token").notNull().unique(),
  invitedByUserId: text("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const entities = pgTable("entities", {
  id: text("id").primaryKey().$defaultFn(createId),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  kind: entityKindEnum("kind").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("#197d71"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: text("id").primaryKey().$defaultFn(createId),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  color: text("color").notNull().default("#197d71"),
  parentId: text("parent_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sources = pgTable("sources", {
  id: text("id").primaryKey().$defaultFn(createId),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  entityId: text("entity_id").references(() => entities.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  type: sourceTypeEnum("type").notNull(),
  url: text("url").notNull(),
  refreshMinutes: integer("refresh_minutes").notNull().default(30),
  priority: integer("priority").notNull().default(50),
  isActive: boolean("is_active").notNull().default(true),
  healthStatus: sourceHealthEnum("health_status").notNull().default("stale"),
  config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  lastErrorMessage: text("last_error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sourceDefaultTags = pgTable(
  "source_default_tags",
  {
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.sourceId, table.tagId] })],
);

export const tagRules = pgTable("tag_rules", {
  id: text("id").primaryKey().$defaultFn(createId),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  sourceId: text("source_id").references(() => sources.id, { onDelete: "set null" }),
  conditions: jsonb("conditions").notNull().default(sql`'{}'::jsonb`),
  actions: jsonb("actions").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedItems = pgTable("feed_items", {
  id: text("id").primaryKey().$defaultFn(createId),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  entityId: text("entity_id").references(() => entities.id, { onDelete: "set null" }),
  primarySourceId: text("primary_source_id")
    .notNull()
    .references(() => sources.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  canonicalUrl: text("canonical_url").notNull(),
  contentType: feedItemTypeEnum("content_type").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
  fingerprint: text("fingerprint").notNull().unique(),
  authorName: text("author_name"),
  thumbnailUrl: text("thumbnail_url"),
});

export const feedItemTags = pgTable(
  "feed_item_tags",
  {
    feedItemId: text("feed_item_id")
      .notNull()
      .references(() => feedItems.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.feedItemId, table.tagId] })],
);

export const feedItemSources = pgTable(
  "feed_item_sources",
  {
    feedItemId: text("feed_item_id")
      .notNull()
      .references(() => feedItems.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.feedItemId, table.sourceId] })],
);

export const userItemStates = pgTable(
  "user_item_states",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    feedItemId: text("feed_item_id")
      .notNull()
      .references(() => feedItems.id, { onDelete: "cascade" }),
    isRead: boolean("is_read").notNull().default(false),
    isSaved: boolean("is_saved").notNull().default(false),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.feedItemId] })],
);

export const ingestionRuns = pgTable("ingestion_runs", {
  id: text("id").primaryKey().$defaultFn(createId),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  sourceId: text("source_id")
    .notNull()
    .references(() => sources.id, { onDelete: "cascade" }),
  adapter: text("adapter").notNull(),
  status: ingestionStatusEnum("status").notNull(),
  fetchedCount: integer("fetched_count").notNull().default(0),
  createdCount: integer("created_count").notNull().default(0),
  dedupedCount: integer("deduped_count").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
  logs: jsonb("logs").notNull().default(sql`'[]'::jsonb`),
});

export type DbWorkspace = typeof workspaces.$inferSelect;
export type DbUser = typeof users.$inferSelect;
