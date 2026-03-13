import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appConfig } from "@/lib/env";
import { getAppSession } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginErrorCopy = {
  invalid_email: "Only the allowlisted owner email can sign in to this workspace.",
  request_failed: "Could not send the magic link. Check your Supabase Auth email settings and try again.",
  invalid_link: "This magic link is invalid or has expired. Request a fresh one.",
} as const;

async function requestMagicLink(formData: FormData) {
  "use server";

  if (!appConfig.hasDatabase || !appConfig.hasSupabaseAuth || !appConfig.personalOwnerEmail) {
    redirect("/login");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email !== appConfig.personalOwnerEmail) {
    redirect("/login?error=invalid_email");
  }

  const supabase = await createSupabaseServerClient();
  const confirmUrl = new URL("/auth/confirm", appConfig.url);
  confirmUrl.searchParams.set("next", "/");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: confirmUrl.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect("/login?error=request_failed");
  }

  redirect("/verify-request");
}

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getAppSession();
  if (session?.user.role === "owner" && session.user.defaultWorkspaceId) {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;
  const errorKey = typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
  const errorMessage =
    errorKey && errorKey in loginErrorCopy ? loginErrorCopy[errorKey as keyof typeof loginErrorCopy] : null;
  const canUsePersonalAccountLogin =
    appConfig.hasDatabase && appConfig.hasSupabaseAuth && Boolean(appConfig.personalOwnerEmail);

  return (
    <AppShell
      title="Personal account sign-in"
      subtitle="Sign in with your owner email to sync this deck across devices while keeping the public preview open."
    >
      <div className="mx-auto w-full max-w-2xl">
        <Card className="p-6 md:p-8">
          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}
          {canUsePersonalAccountLogin ? (
            <form action={requestMagicLink} className="grid gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Mail className="size-4" />
                Magic link sign-in
              </div>
              <p className="text-sm leading-7 text-slate-600">
                Use your allowlisted owner email to open the database-backed workspace on any device.
              </p>
              <Input type="email" name="email" placeholder="you@company.com" required />
              <Button type="submit">Send login link</Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ShieldCheck className="size-4" />
                Login is not fully configured
              </div>
              <p className="text-sm leading-7 text-slate-600">
                Configure `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and a
                single email in `INVITE_ALLOWLIST` to enable the personal owner account flow.
              </p>
              <Link href="/">
                <Button>Back to dashboard</Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
