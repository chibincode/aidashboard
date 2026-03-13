import { eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import {
  categories,
  entities,
  feedItems,
  feedItemSources,
  feedItemTags,
  sourceDefaultTags,
  sources,
  tags,
  workspaces,
} from "@/lib/db/schema";
import {
  defaultWorkspace,
  seedCategories,
  seedEntities,
  seedFeedItems,
  seedSources,
  seedTags,
} from "@/lib/seed";

async function main() {
  const db = requireDb();

  await db.insert(workspaces).values(defaultWorkspace).onConflictDoNothing();
  await db.insert(tags).values(seedTags).onConflictDoNothing();
  await db.insert(entities).values(seedEntities).onConflictDoNothing();
  await db.insert(categories).values(seedCategories).onConflictDoNothing();
  await db
    .insert(sources)
    .values(
      seedSources.map((source) => {
        const { defaultTagIds, ...rest } = source;
        void defaultTagIds;
        return rest;
      }),
    )
    .onConflictDoNothing();

  for (const source of seedSources) {
    for (const tagId of source.defaultTagIds) {
      await db
        .insert(sourceDefaultTags)
        .values({ sourceId: source.id, tagId })
        .onConflictDoNothing();
    }
  }

  await db
    .insert(feedItems)
    .values(
      seedFeedItems.map((item) => {
        const { sourceIds, tagIds, ...rest } = item;
        void sourceIds;
        void tagIds;
        return rest;
      }),
    )
    .onConflictDoNothing();

  for (const item of seedFeedItems) {
    for (const sourceId of item.sourceIds) {
      await db.insert(feedItemSources).values({ feedItemId: item.id, sourceId }).onConflictDoNothing();
    }

    for (const tagId of item.tagIds) {
      await db.insert(feedItemTags).values({ feedItemId: item.id, tagId }).onConflictDoNothing();
    }
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, defaultWorkspace.id),
  });

  console.log(`Seeded workspace ${workspace?.name ?? defaultWorkspace.name}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
