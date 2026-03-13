import { AppShell } from "@/components/app-shell";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LastVisitBeacon } from "@/components/dashboard/last-visit-beacon";
import { Button } from "@/components/ui/button";
import {
  EntitiesSettingsSection,
  RulesSettingsSection,
  SourcesSettingsSection,
  TagsSettingsSection,
} from "@/components/settings/settings-sections";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { appConfig } from "@/lib/env";
import { getAdminSnapshot, getDashboardSnapshot } from "@/lib/repositories/app-repository";
import { parseDashboardFilters } from "@/lib/filters";
import Link from "next/link";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const filters = parseDashboardFilters(resolvedParams);
  const snapshot = await getDashboardSnapshot(filters);
  const hasSettingsAccess = appConfig.hasDatabase && snapshot.viewer.isAuthenticated;
  const adminSnapshot = hasSettingsAccess ? await getAdminSnapshot() : null;

  return (
    <AppShell
      title="boyce dashboard"
      headerActions={
        hasSettingsAccess && adminSnapshot ? (
          <SettingsDialog
            sourcesPanel={<SourcesSettingsSection snapshot={adminSnapshot} />}
            entitiesPanel={<EntitiesSettingsSection snapshot={adminSnapshot} />}
            tagsPanel={<TagsSettingsSection snapshot={adminSnapshot} />}
            rulesPanel={<RulesSettingsSection snapshot={adminSnapshot} />}
          />
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
      <DashboardShell snapshot={snapshot} filters={filters} />
    </AppShell>
  );
}
