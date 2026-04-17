import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export function hasSupabaseAuthCookie(
  cookiesToCheck: Array<{
    name: string;
  }>,
) {
  return cookiesToCheck.some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

export async function hasSupabaseAuthSessionCookie() {
  const cookieStore = await cookies();
  return hasSupabaseAuthCookie(cookieStore.getAll());
}

function getSupabaseConfig() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase Auth is not configured.");
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot always write cookies directly.
        }
      },
    },
  });
}
