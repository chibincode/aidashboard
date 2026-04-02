import { AppShell } from "@/components/app-shell";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DueSourceRefreshBeacon } from "@/components/dashboard/due-source-refresh-beacon";
import { LastVisitBeacon } from "@/components/dashboard/last-visit-beacon";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/env";
import { getDashboardSnapshot } from "@/lib/repositories/app-repository";
import { parseDashboardFilters, parseDashboardPage } from "@/lib/filters";
import Link from "next/link";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const filters = parseDashboardFilters(resolvedParams);
  const page = parseDashboardPage(resolvedParams);
  const snapshot = await getDashboardSnapshot(filters, { page });
  const hasSettingsAccess = appConfig.hasDatabase && snapshot.viewer.isAuthenticated;

  return (
    <AppShell
      title="boyce dashboard"
      headerActions={
        hasSettingsAccess ? (
          <SettingsDialog isDemoMode={appConfig.isDemoMode} />
        ) : (
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Sign in
            </Button>
          </Link>
        )
      }
    >
      <LastVisitBeacon />
      {hasSettingsAccess ? <DueSourceRefreshBeacon /> : null}
      <DashboardShell snapshot={snapshot} filters={filters} />
    </AppShell>
  );
}
