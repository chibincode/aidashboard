import type { DefaultSession } from "next-auth";
import type { MembershipRole } from "@/lib/domain";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: MembershipRole;
      defaultWorkspaceId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    defaultWorkspaceId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    role?: MembershipRole;
    defaultWorkspaceId?: string | null;
  }
}
