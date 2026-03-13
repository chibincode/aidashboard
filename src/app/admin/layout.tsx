import { AppShell } from "@/components/app-shell";
import { requireOwnerSession } from "@/lib/auth-guards";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireOwnerSession();

  return (
    <AppShell title="boyce dashboard">{children}</AppShell>
  );
}
