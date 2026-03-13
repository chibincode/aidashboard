import { describe, expect, it, vi } from "vitest";
import { memberships, users, workspaces } from "@/lib/db/schema";
import { ensurePersonalOwnerWorkspaceAccess } from "@/lib/personal-account";

function createDb({
  existingWorkspaceId = "ws_signal_deck",
  insertedWorkspaceId = null,
}: {
  existingWorkspaceId?: string | null;
  insertedWorkspaceId?: string | null;
}) {
  const findWorkspace = vi
    .fn()
    .mockResolvedValueOnce(existingWorkspaceId ? { id: existingWorkspaceId } : null)
    .mockResolvedValueOnce(insertedWorkspaceId ? { id: insertedWorkspaceId } : null);

  return {
    query: {
      workspaces: {
        findFirst: findWorkspace,
      },
    },
    insert: vi.fn((table) => {
      if (table === users) {
        return {
          values: vi.fn(() => ({
            onConflictDoUpdate: vi.fn(async () => undefined),
          })),
        };
      }

      if (table === workspaces) {
        return {
          values: vi.fn(() => ({
            onConflictDoNothing: vi.fn(() => ({
              returning: vi.fn(async () => (insertedWorkspaceId ? [{ id: insertedWorkspaceId }] : [])),
            })),
          })),
        };
      }

      if (table === memberships) {
        return {
          values: vi.fn(() => ({
            onConflictDoNothing: vi.fn(async () => undefined),
          })),
        };
      }

      throw new Error("Unexpected table");
    }),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
    })),
  };
}

describe("ensurePersonalOwnerWorkspaceAccess", () => {
  it("attaches the owner to the existing seeded workspace", async () => {
    const db = createDb({});

    const workspaceId = await ensurePersonalOwnerWorkspaceAccess({
      db: db as never,
      userId: "usr_owner",
      email: "owner@example.com",
      ownerEmail: "owner@example.com",
    });

    expect(workspaceId).toBe("ws_signal_deck");
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("creates the seeded workspace when it does not exist", async () => {
    const db = createDb({ existingWorkspaceId: null, insertedWorkspaceId: "ws_created" });

    const workspaceId = await ensurePersonalOwnerWorkspaceAccess({
      db: db as never,
      userId: "usr_owner",
      email: "owner@example.com",
      ownerEmail: "owner@example.com",
    });

    expect(workspaceId).toBe("ws_created");
    expect(db.insert).toHaveBeenCalledTimes(3);
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("does nothing for non-owner emails", async () => {
    const db = createDb({});

    const workspaceId = await ensurePersonalOwnerWorkspaceAccess({
      db: db as never,
      userId: "usr_viewer",
      email: "viewer@example.com",
      ownerEmail: "owner@example.com",
    });

    expect(workspaceId).toBeNull();
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
});
