import { eq } from "drizzle-orm";
import type { db } from "@/lib/db";
import { memberships, users, workspaces } from "@/lib/db/schema";
import { defaultWorkspace } from "@/lib/seed";

type DbClient = NonNullable<typeof db>;

export async function ensurePersonalOwnerWorkspaceAccess({
  db,
  userId,
  email,
  ownerEmail,
  name,
}: {
  db: DbClient;
  userId: string;
  email: string;
  ownerEmail: string | null;
  name?: string | null;
}) {
  if (!ownerEmail || email.toLowerCase() !== ownerEmail) {
    return null;
  }

  await db
    .insert(users)
    .values({
      id: userId,
      email,
      name: name ?? null,
      emailVerified: new Date(),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        name: name ?? null,
        emailVerified: new Date(),
      },
    });

  let workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, defaultWorkspace.slug),
    columns: { id: true },
  });

  if (!workspace) {
    const [insertedWorkspace] = await db
      .insert(workspaces)
      .values(defaultWorkspace)
      .onConflictDoNothing()
      .returning({ id: workspaces.id });

    workspace =
      insertedWorkspace ??
      (await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, defaultWorkspace.slug),
        columns: { id: true },
      }));
  }

  if (!workspace) {
    throw new Error("Could not initialize the personal workspace.");
  }

  await db
    .insert(memberships)
    .values({
      workspaceId: workspace.id,
      userId,
      role: "owner",
    })
    .onConflictDoNothing();

  await db
    .update(users)
    .set({ defaultWorkspaceId: workspace.id })
    .where(eq(users.id, userId));

  return workspace.id;
}
