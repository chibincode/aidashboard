import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accounts,
  invites,
  memberships,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { appConfig, env } from "@/lib/env";
import { DEMO_EMAIL, DEMO_USER_ID, DEMO_WORKSPACE_ID } from "@/lib/seed";

async function isAllowedEmail(email: string) {
  const normalized = email.toLowerCase();

  if (appConfig.inviteAllowlist.length > 0) {
    return appConfig.inviteAllowlist.includes(normalized);
  }

  if (!db) {
    return normalized === DEMO_EMAIL;
  }

  const activeInvite = await db.query.invites.findFirst({
    where: and(
      eq(invites.email, normalized),
      gt(invites.expiresAt, new Date()),
    ),
  });

  return Boolean(activeInvite);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: db
    ? (DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      }) as Adapter)
    : undefined,
  session: {
    strategy: db ? "database" : "jwt",
  },
  trustHost: true,
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
  },
  providers: appConfig.hasEmailAuth
    ? [Resend({ apiKey: env.RESEND_API_KEY, from: env.AUTH_EMAIL_FROM })]
    : [],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      return isAllowedEmail(user.email);
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? token.email;
        token.defaultWorkspaceId = user.defaultWorkspaceId ?? null;
      }

      if (db && token.email && typeof token.id === "string") {
        const membership = await db.query.memberships.findFirst({
          where: eq(memberships.userId, token.id),
        });

        token.role = membership?.role ?? "viewer";
      } else {
        token.role = "owner";
        token.id = DEMO_USER_ID;
        token.email = DEMO_EMAIL;
        token.defaultWorkspaceId = DEMO_WORKSPACE_ID;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const role =
          token.role === "owner" || token.role === "editor" || token.role === "viewer"
            ? token.role
            : "owner";

        session.user.id = typeof token.id === "string" ? token.id : DEMO_USER_ID;
        session.user.email = typeof token.email === "string" ? token.email : DEMO_EMAIL;
        session.user.role = role;
        session.user.defaultWorkspaceId =
          typeof token.defaultWorkspaceId === "string"
            ? token.defaultWorkspaceId
            : DEMO_WORKSPACE_ID;
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!db || !user.email) {
        return;
      }

      const invite = await db.query.invites.findFirst({
        where: and(eq(invites.email, user.email.toLowerCase()), gt(invites.expiresAt, new Date())),
      });

      if (!invite) {
        return;
      }

      await db
        .insert(memberships)
        .values({
          workspaceId: invite.workspaceId,
          userId: user.id!,
          role: invite.role,
        })
        .onConflictDoNothing();

      await db
        .update(invites)
        .set({ acceptedAt: new Date() })
        .where(eq(invites.id, invite.id));

      await db
        .update(users)
        .set({ defaultWorkspaceId: invite.workspaceId })
        .where(eq(users.id, user.id!));
    },
  },
});
