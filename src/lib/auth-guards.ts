import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { requireDb } from "@/lib/db";
import { appConfig } from "@/lib/env";
import { ensurePersonalOwnerWorkspaceAccess } from "@/lib/personal-account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppSession = {
  user: {
    id: string;
    email: string;
    role: "owner" | null;
    defaultWorkspaceId: string | null;
    name: string | null;
  };
};

function getUserDisplayName(user: User) {
  const candidateName = user.user_metadata.name ?? user.user_metadata.full_name;
  return typeof candidateName === "string" ? candidateName : null;
}

export async function getAppSession(): Promise<AppSession | null> {
  if (!appConfig.hasDatabase || !appConfig.hasSupabaseAuth) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    return null;
  }

  const workspaceId = await ensurePersonalOwnerWorkspaceAccess({
    db: requireDb(),
    userId: user.id,
    email: user.email,
    ownerEmail: appConfig.personalOwnerEmail,
    name: getUserDisplayName(user),
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: workspaceId ? "owner" : null,
      defaultWorkspaceId: workspaceId,
      name: getUserDisplayName(user),
    },
  };
}

export async function getOwnerSession() {
  const session = await getAppSession();

  if (!session?.user.id || !session.user.email || session.user.role !== "owner" || !session.user.defaultWorkspaceId) {
    return null;
  }

  return session;
}

export async function requireOwnerSession() {
  const session = await getOwnerSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireOwnerActionSession() {
  const session = await getOwnerSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}
