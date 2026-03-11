import { z } from "zod";
import { splitCommaList } from "@/lib/utils";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  AUTH_EMAIL_FROM: z.string().optional(),
  INVITE_ALLOWLIST: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  X_BEARER_TOKEN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export const appConfig = {
  name: env.NEXT_PUBLIC_APP_NAME ?? "Signal Deck",
  url: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  hasDatabase: Boolean(env.DATABASE_URL),
  hasEmailAuth: Boolean(env.RESEND_API_KEY && env.AUTH_EMAIL_FROM && env.AUTH_SECRET),
  hasInngestKeys: Boolean(env.INNGEST_EVENT_KEY && env.INNGEST_SIGNING_KEY),
  inviteAllowlist: splitCommaList(env.INVITE_ALLOWLIST),
  isDemoMode: !env.DATABASE_URL,
};
