import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { signIn } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appConfig } from "@/lib/env";

async function requestMagicLink(formData: FormData) {
  "use server";

  if (!appConfig.hasEmailAuth) {
    redirect("/");
  }

  const email = String(formData.get("email") ?? "");
  await signIn("resend", { email, redirectTo: "/" });
}

export default function LoginPage() {
  return (
    <AppShell
      title="Invite-only sign-in"
      subtitle="Use email login when you want this deck to run with database-backed workspaces and persistence. Demo mode remains available without setup."
    >
      <div className="mx-auto w-full max-w-2xl">
        <Card className="p-6 md:p-8">
          {appConfig.hasEmailAuth ? (
            <form action={requestMagicLink} className="grid gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Mail className="size-4" />
                Magic link sign-in
              </div>
              <Input type="email" name="email" placeholder="you@company.com" required />
              <Button type="submit">Send login link</Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ShieldCheck className="size-4" />
                Demo mode active
              </div>
              <p className="text-sm leading-7 text-slate-600">
                Configure `AUTH_SECRET`, `RESEND_API_KEY` and `AUTH_EMAIL_FROM` to enable invite-only email login.
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
