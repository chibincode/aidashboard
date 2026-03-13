import { loadLocalEnvFiles } from "@/lib/env-file";
import { z } from "zod";
import { splitCommaList } from "@/lib/utils";

loadLocalEnvFiles();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  INVITE_ALLOWLIST: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  X_BEARER_TOKEN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().optional(),
});

export const env = envSchema.parse(process.env);

const inviteAllowlist = splitCommaList(env.INVITE_ALLOWLIST);

export const appConfig = {
  name: env.NEXT_PUBLIC_APP_NAME ?? "Signal Deck",
  url: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  hasDatabase: Boolean(env.DATABASE_URL),
  hasSupabaseAuth: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  hasInngestKeys: Boolean(env.INNGEST_EVENT_KEY && env.INNGEST_SIGNING_KEY),
  inviteAllowlist,
  personalOwnerEmail: inviteAllowlist.length === 1 ? inviteAllowlist[0].toLowerCase() : null,
  isDemoMode: !env.DATABASE_URL,
};
