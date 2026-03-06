import { MailCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";

export default function VerifyRequestPage() {
  return (
    <AppShell
      pathname="/verify-request"
      title="Check your inbox"
      subtitle="We sent a sign-in link to your email. Open it on the same browser to attach your workspace membership and continue."
    >
      <div className="mx-auto w-full max-w-2xl">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
            <MailCheck className="size-6" />
          </div>
          <p className="text-sm leading-7 text-slate-600">
            If the link does not arrive, confirm the email is invited and that the resend configuration is valid.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
