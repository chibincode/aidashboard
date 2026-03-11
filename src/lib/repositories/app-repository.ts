import { cookies } from "next/headers";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type {
  AdminSnapshot,
  DashboardFilters,
  SourceConfig,
  TagRuleCondition,
  UserItemStateRecord,
  ViewerContext,
} from "@/lib/domain";
import type { DashboardSnapshot, SourceRecord } from "@/lib/domain";
import { buildDemoAdminSnapshot, buildDemoDashboard, readDemoStatesFromCookie, serializeDemoStates, upsertDemoState } from "@/lib/demo-data";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import { auth } from "@/auth";
import { appConfig } from "@/lib/env";
import { requireDb } from "@/lib/db";
import {
  entities,
  feedItems,
  feedItemSources,
  feedItemTags,
  sourceDefaultTags,
  sources,
  tagRules,
  tags,
  userItemStates,
  workspaces,
} from "@/lib/db/schema";
import { DEMO_EMAIL, DEMO_USER_ID, DEMO_WORKSPACE_ID, defaultWorkspace } from "@/lib/seed";
import { shouldAutoApplyWebsiteInspirationTag, WEBSITE_INSPIRATION_TAG_SLUG } from "@/lib/source-normalization";
import { slugify } from "@/lib/utils";

const ITEM_STATE_COOKIE = "signal-deck-item-states";
const LAST_VISIT_COOKIE = "signal-deck-last-visit";

function getLastVisitCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const value = cookieStore.get(LAST_VISIT_COOKIE)?.value;
  return value ? new Date(value) : new Date(Date.now() - 1000 * 60 * 60 * 18);
}

export async function getViewerContext(): Promise<ViewerContext> {
  const cookieStore = await cookies();
  const lastVisitAt = getLastVisitCookie(cookieStore);

  if (!appConfig.hasDatabase) {
    return {
      workspaceId: DEMO_WORKSPACE_ID,
      userId: DEMO_USER_ID,
      email: DEMO_EMAIL,
      isAuthenticated: false,
      lastVisitAt,
    };
  }

  const session = await auth();
  const userId = session?.user?.id;
  const workspaceId = session?.user?.defaultWorkspaceId;

  if (!userId || !workspaceId || !session.user.email) {
    return {
      workspaceId: DEMO_WORKSPACE_ID,
      userId: DEMO_USER_ID,
      email: DEMO_EMAIL,
      isAuthenticated: false,
      lastVisitAt,
    };
  }

  return {
    workspaceId,
    userId,
    email: session.user.email,
    isAuthenticated: true,
    lastVisitAt,
  };
}

async function loadDemoStates() {
  const cookieStore = await cookies();
  return readDemoStatesFromCookie(cookieStore.get(ITEM_STATE_COOKIE)?.value);
}

function toSourceRecord(
  source: typeof sources.$inferSelect,
  defaultTagIds: string[],
): SourceRecord {
  return {
    ...source,
    config: (source.config as Record<string, unknown>) ?? {},
    defaultTagIds,
  };
}

export async function getDashboardSnapshot(filters: DashboardFilters): Promise<DashboardSnapshot> {
  const viewer = await getViewerContext();

  if (!appConfig.hasDatabase) {
    return buildDemoDashboard(viewer, await loadDemoStates(), filters);
  }

  const db = requireDb();

  const [workspace, sourceRows, entityRows, tagRows, itemRows, stateRows] = await Promise.all([
    db.query.workspaces.findFirst({
      where: eq(workspaces.id, viewer.workspaceId),
    }),
    db.query.sources.findMany({
      where: eq(sources.workspaceId, viewer.workspaceId),
      orderBy: [desc(sources.priority), asc(sources.name)],
    }),
    db.query.entities.findMany({
      where: eq(entities.workspaceId, viewer.workspaceId),
      orderBy: [asc(entities.name)],
    }),
    db.query.tags.findMany({
      where: eq(tags.workspaceId, viewer.workspaceId),
      orderBy: [asc(tags.name)],
    }),
    db.query.feedItems.findMany({
      where: eq(feedItems.workspaceId, viewer.workspaceId),
      orderBy: [desc(feedItems.publishedAt)],
      limit: 50,
    }),
    db
      .select()
      .from(userItemStates)
      .where(and(eq(userItemStates.workspaceId, viewer.workspaceId), eq(userItemStates.userId, viewer.userId))),
  ]);

  const sourceIds = sourceRows.map((source) => source.id);
  const itemIds = itemRows.map((item) => item.id);

  const [sourceTagRows, itemTagRows, itemSourceRows] = await Promise.all([
    sourceIds.length > 0
      ? db.select().from(sourceDefaultTags).where(inArray(sourceDefaultTags.sourceId, sourceIds))
      : Promise.resolve([]),
    itemIds.length > 0
      ? db.select().from(feedItemTags).where(inArray(feedItemTags.feedItemId, itemIds))
      : Promise.resolve([]),
    itemIds.length > 0
      ? db.select().from(feedItemSources).where(inArray(feedItemSources.feedItemId, itemIds))
      : Promise.resolve([]),
  ]);

  const sourceDefaultTagMap = new Map<string, string[]>();
  for (const row of sourceTagRows) {
    const current = sourceDefaultTagMap.get(row.sourceId) ?? [];
    sourceDefaultTagMap.set(row.sourceId, [...current, row.tagId]);
  }

  const itemTagMap = new Map<string, string[]>();
  for (const row of itemTagRows) {
    const current = itemTagMap.get(row.feedItemId) ?? [];
    itemTagMap.set(row.feedItemId, [...current, row.tagId]);
  }

  const itemSourceMap = new Map<string, string[]>();
  for (const row of itemSourceRows) {
    const current = itemSourceMap.get(row.feedItemId) ?? [];
    itemSourceMap.set(row.feedItemId, [...current, row.sourceId]);
  }

  return buildDashboardSnapshot({
    workspace: workspace ?? defaultWorkspace,
    sources: sourceRows.map((source) => toSourceRecord(source, sourceDefaultTagMap.get(source.id) ?? [])),
    entities: entityRows,
    tags: tagRows,
    feedItems: itemRows.map((item) => ({
      ...item,
      sourceIds: itemSourceMap.get(item.id) ?? [item.primarySourceId],
      tagIds: itemTagMap.get(item.id) ?? [],
    })),
    userStates: stateRows.map((entry) => ({
      userId: entry.userId,
      workspaceId: entry.workspaceId,
      feedItemId: entry.feedItemId,
      isRead: entry.isRead,
      isSaved: entry.isSaved,
      lastViewedAt: entry.lastViewedAt,
    })),
    viewer,
    filters,
  });
}

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  if (!appConfig.hasDatabase) {
    return buildDemoAdminSnapshot();
  }

  const viewer = await getViewerContext();
  const db = requireDb();

  const [workspace, sourceRows, entityRows, tagRows, ruleRows, itemRows, sourceTagRows] = await Promise.all([
    db.query.workspaces.findFirst({ where: eq(workspaces.id, viewer.workspaceId) }),
    db.query.sources.findMany({ where: eq(sources.workspaceId, viewer.workspaceId), orderBy: [desc(sources.priority)] }),
    db.query.entities.findMany({ where: eq(entities.workspaceId, viewer.workspaceId), orderBy: [asc(entities.name)] }),
    db.query.tags.findMany({ where: eq(tags.workspaceId, viewer.workspaceId), orderBy: [asc(tags.name)] }),
    db.query.tagRules.findMany({ where: eq(tagRules.workspaceId, viewer.workspaceId), orderBy: [desc(tagRules.priority)] }),
    db.query.feedItems.findMany({ where: eq(feedItems.workspaceId, viewer.workspaceId), orderBy: [desc(feedItems.publishedAt)] }),
    db.select().from(sourceDefaultTags),
  ]);

  const tagMap = new Map<string, string[]>();
  for (const row of sourceTagRows) {
    const current = tagMap.get(row.sourceId) ?? [];
    tagMap.set(row.sourceId, [...current, row.tagId]);
  }

  return {
    workspace: workspace ?? defaultWorkspace,
    sources: sourceRows.map((row) => toSourceRecord(row, tagMap.get(row.id) ?? [])),
    entities: entityRows,
    tags: tagRows,
    rules: ruleRows.map((row) => ({
      ...row,
      conditions: row.conditions as TagRuleCondition,
      actions: row.actions as { tagIds: string[] },
    })),
    feedItems: itemRows.map((row) => ({
      ...row,
      sourceIds: [],
      tagIds: [],
    })),
  };
}

export async function getSourceRecordById(id: string): Promise<SourceRecord | null> {
  if (!appConfig.hasDatabase) {
    return buildDemoAdminSnapshot().sources.find((source) => source.id === id) ?? null;
  }

  const viewer = await getViewerContext();
  const db = requireDb();

  const [sourceRow, sourceTagRows] = await Promise.all([
    db.query.sources.findFirst({
      where: and(eq(sources.id, id), eq(sources.workspaceId, viewer.workspaceId)),
    }),
    db
      .select()
      .from(sourceDefaultTags)
      .where(eq(sourceDefaultTags.sourceId, id)),
  ]);

  if (!sourceRow) {
    return null;
  }

  return toSourceRecord(
    sourceRow,
    sourceTagRows.map((row) => row.tagId),
  );
}

export async function setLastVisitTimestamp() {
  const cookieStore = await cookies();
  cookieStore.set(LAST_VISIT_COOKIE, new Date().toISOString(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function upsertItemState(
  feedItemId: string,
  patch: Partial<Pick<UserItemStateRecord, "isRead" | "isSaved" | "lastViewedAt">>,
) {
  const viewer = await getViewerContext();

  if (!appConfig.hasDatabase) {
    const cookieStore = await cookies();
    const currentStates = readDemoStatesFromCookie(cookieStore.get(ITEM_STATE_COOKIE)?.value);
    const existing = currentStates.find((entry) => entry.feedItemId === feedItemId);

    const next = upsertDemoState(currentStates, {
      userId: viewer.userId,
      workspaceId: viewer.workspaceId,
      feedItemId,
      isRead: patch.isRead ?? existing?.isRead ?? false,
      isSaved: patch.isSaved ?? existing?.isSaved ?? false,
      lastViewedAt: patch.lastViewedAt ?? existing?.lastViewedAt ?? new Date(),
    });

    cookieStore.set(ITEM_STATE_COOKIE, serializeDemoStates(next), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return;
  }

  const db = requireDb();
  await db
    .insert(userItemStates)
    .values({
      userId: viewer.userId,
      workspaceId: viewer.workspaceId,
      feedItemId,
      isRead: patch.isRead ?? false,
      isSaved: patch.isSaved ?? false,
      lastViewedAt: patch.lastViewedAt ?? null,
    })
    .onConflictDoUpdate({
      target: [userItemStates.userId, userItemStates.feedItemId],
      set: {
        isRead: patch.isRead ?? false,
        isSaved: patch.isSaved ?? false,
        lastViewedAt: patch.lastViewedAt ?? new Date(),
        updatedAt: new Date(),
      },
    });
}

async function assertWorkspace() {
  const viewer = await getViewerContext();

  if (!appConfig.hasDatabase) {
    throw new Error("Admin mutations require DATABASE_URL.");
  }

  return viewer.workspaceId;
}

export async function createEntityRecord(input: {
  name: string;
  kind: "topic" | "competitor" | "product";
  description: string;
  color: string;
}) {
  const workspaceId = await assertWorkspace();
  const db = requireDb();

  await db.insert(entities).values({
    workspaceId,
    name: input.name,
    slug: slugify(input.name),
    kind: input.kind as "topic" | "competitor" | "product",
    description: input.description,
    color: input.color,
  });
}

export async function deleteEntityRecord(id: string) {
  const workspaceId = await assertWorkspace();
  const db = requireDb();
  await db.delete(entities).where(and(eq(entities.id, id), eq(entities.workspaceId, workspaceId)));
}

export async function createTagRecord(input: {
  name: string;
  color: string;
  parentId: string | null;
  isActive: boolean;
}) {
  const workspaceId = await assertWorkspace();
  const db = requireDb();

  await db.insert(tags).values({
    workspaceId,
    name: input.name,
    slug: slugify(input.name),
    color: input.color,
    parentId: input.parentId,
    isActive: input.isActive,
  });
}

export async function toggleTagRecord(id: string, isActive: boolean) {
  const workspaceId = await assertWorkspace();
  const db = requireDb();

  await db
    .update(tags)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(tags.id, id), eq(tags.workspaceId, workspaceId)));
}

export async function deleteTagRecord(id: string) {
  const workspaceId = await assertWorkspace();
  const db = requireDb();
  await db.delete(tags).where(and(eq(tags.id, id), eq(tags.workspaceId, workspaceId)));
}

export async function createSourceRecord(input: {
  name: string;
  type: SourceRecord["type"];
  url: string;
  config: SourceConfig;
  entityId: string | null;
  priority: number;
  refreshMinutes: number;
  isActive: boolean;
  defaultTagIds: string[];
}) {
  const workspaceId = await assertWorkspace();
  const db = requireDb();
  const defaultTagIds = await resolveSourceDefaultTagIds(workspaceId, input.type, input.config, input.defaultTagIds);

  const [inserted] = await db
    .insert(sources)
    .values({
      workspaceId,
      name: input.name,
      slug: slugify(input.name),
      type: input.type,
      url: input.url,
      entityId: input.entityId,
      priority: input.priority,
      refreshMinutes: input.refreshMinutes,
      isActive: input.isActive,
      healthStatus: "stale",
      config: input.config,
    })
    .returning();

  if (defaultTagIds.length > 0 && inserted) {
    await db.insert(sourceDefaultTags).values(
      defaultTagIds.map((tagId) => ({
        sourceId: inserted.id,
        tagId,
      })),
    );
  }

  return inserted?.id ?? null;
}

async function replaceSourceDefaultTags(sourceId: string, tagIds: string[]) {
  const db = requireDb();

  await db.delete(sourceDefaultTags).where(eq(sourceDefaultTags.sourceId, sourceId));

  if (tagIds.length > 0) {
    await db.insert(sourceDefaultTags).values(
      tagIds.map((tagId) => ({
        sourceId,
        tagId,
      })),
    );
  }
}

async function resolveSourceDefaultTagIds(
  workspaceId: string,
  type: SourceRecord["type"],
  config: SourceConfig,
  tagIds: string[],
) {
  const resolvedTagIds = new Set(tagIds);

  if (!shouldAutoApplyWebsiteInspirationTag({ type, config })) {
    return [...resolvedTagIds];
  }

  const db = requireDb();
  const websiteInspirationTag = await db.query.tags.findFirst({
    where: and(eq(tags.workspaceId, workspaceId), eq(tags.slug, WEBSITE_INSPIRATION_TAG_SLUG)),
    columns: { id: true },
  });

  if (websiteInspirationTag?.id) {
    resolvedTagIds.add(websiteInspirationTag.id);
  }

  return [...resolvedTagIds];
}

export async function toggleSourceRecord(id: string, isActive: boolean) {
  const workspaceId = await assertWorkspace();
  const db = requireDb();

  await db
    .update(sources)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(sources.id, id), eq(sources.workspaceId, workspaceId)));
}

export async function updateSourceRecord(input: {
  id: string;
  name: string;
  type: SourceRecord["type"];
  url: string;
  config: SourceConfig;
  entityId: string | null;
  priority: number;
  refreshMinutes: number;
  isActive: boolean;
  defaultTagIds: string[];
}) {
  const workspaceId = await assertWorkspace();
  const db = requireDb();
  const defaultTagIds = await resolveSourceDefaultTagIds(workspaceId, input.type, input.config, input.defaultTagIds);

  const [updated] = await db
    .update(sources)
    .set({
      name: input.name,
      slug: slugify(input.name),
      type: input.type,
      url: input.url,
      config: input.config,
      entityId: input.entityId,
      priority: input.priority,
      refreshMinutes: input.refreshMinutes,
      isActive: input.isActive,
      healthStatus: "stale",
      lastErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(and(eq(sources.id, input.id), eq(sources.workspaceId, workspaceId)))
    .returning({ id: sources.id });

  if (!updated) {
    throw new Error("Source not found.");
  }

  await replaceSourceDefaultTags(updated.id, defaultTagIds);

  return updated.id;
}

export async function deleteSourceRecord(id: string) {
  const workspaceId = await assertWorkspace();
  const db = requireDb();
  await db.delete(sources).where(and(eq(sources.id, id), eq(sources.workspaceId, workspaceId)));
}

export async function createRuleRecord(input: {
  name: string;
  sourceId: string | null;
  priority: number;
  isActive: boolean;
  keywords: string[];
  urlContains: string[];
  tagIds: string[];
}) {
  const workspaceId = await assertWorkspace();
  const db = requireDb();

  await db.insert(tagRules).values({
    workspaceId,
    name: input.name,
    sourceId: input.sourceId,
    priority: input.priority,
    isActive: input.isActive,
    conditions: {
      keywords: input.keywords,
      urlContains: input.urlContains,
    },
    actions: {
      tagIds: input.tagIds,
    },
  });
}

export async function toggleRuleRecord(id: string, isActive: boolean) {
  const workspaceId = await assertWorkspace();
  const db = requireDb();

  await db
    .update(tagRules)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(tagRules.id, id), eq(tagRules.workspaceId, workspaceId)));
}

export async function deleteRuleRecord(id: string) {
  const workspaceId = await assertWorkspace();
  const db = requireDb();
  await db.delete(tagRules).where(and(eq(tagRules.id, id), eq(tagRules.workspaceId, workspaceId)));
}

export async function listActiveSourcesForIngestion() {
  if (!appConfig.hasDatabase) {
    return buildDemoAdminSnapshot().sources.filter((source) => source.isActive);
  }

  const db = requireDb();
  const activeSources = await db.query.sources.findMany({
    where: eq(sources.isActive, true),
    orderBy: [desc(sources.priority)],
  });

  const activeSourceIds = activeSources.map((source) => source.id);
  const tagLinks =
    activeSourceIds.length > 0
      ? await db
          .select()
          .from(sourceDefaultTags)
          .where(inArray(sourceDefaultTags.sourceId, activeSourceIds))
      : [];

  const tagMap = new Map<string, string[]>();
  for (const link of tagLinks) {
    const current = tagMap.get(link.sourceId) ?? [];
    tagMap.set(link.sourceId, [...current, link.tagId]);
  }

  return activeSources.map((source) => ({
    ...toSourceRecord(source, tagMap.get(source.id) ?? []),
  }));
}
