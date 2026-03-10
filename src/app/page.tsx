import { AppShell } from "@/components/app-shell";
import { DashboardFiltersBar } from "@/components/dashboard/filters-bar";
import { FeedCard } from "@/components/dashboard/feed-card";
import { DashboardViewTabs } from "@/components/dashboard/view-tabs";
import { LastVisitBeacon } from "@/components/dashboard/last-visit-beacon";
import { Card } from "@/components/ui/card";
import {
  EntitiesSettingsSection,
  RulesSettingsSection,
  SourcesSettingsSection,
  TagsSettingsSection,
} from "@/components/settings/settings-sections";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { getAdminSnapshot, getDashboardSnapshot } from "@/lib/repositories/app-repository";
import { parseDashboardFilters } from "@/lib/filters";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const viewCopy = {
  all: { label: "All" },
  "ai-ux-ui": { label: "AI UX/UI" },
  "competitor-watch": { label: "Competitor Watch" },
  "industry-signals": { label: "Industry Signals" },
  saved: { label: "Saved" },
} as const;

export default async function Home({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const filters = parseDashboardFilters(resolvedParams);
  const [snapshot, adminSnapshot] = await Promise.all([getDashboardSnapshot(filters), getAdminSnapshot()]);
  const activeView = viewCopy[snapshot.activeView];

  return (
    <AppShell
      title="boyce dashboard"
      headerActions={
        <SettingsDialog
          sourcesPanel={<SourcesSettingsSection snapshot={adminSnapshot} />}
          entitiesPanel={<EntitiesSettingsSection snapshot={adminSnapshot} />}
          tagsPanel={<TagsSettingsSection snapshot={adminSnapshot} />}
          rulesPanel={<RulesSettingsSection snapshot={adminSnapshot} />}
        />
      }
    >
      <LastVisitBeacon />

      <section className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:sticky lg:top-16 lg:self-start">
          <DashboardViewTabs activeView={snapshot.activeView} layout="sidebar" />
          <div className="mt-4">
            <DashboardFiltersBar filters={filters} tags={snapshot.tags} entities={snapshot.entities} layout="sidebar" />
          </div>
        </aside>

        <div className="min-w-0 lg:flex lg:justify-center">
          <div className="w-full lg:max-w-[700px]">
            <div className="mb-5 flex items-end justify-between border-b border-black/6 pb-3">
              <h2 className="font-display text-xl font-semibold tracking-tight text-slate-950 md:text-[1.55rem]">
                {activeView.label}
              </h2>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {snapshot.feedItems.length} items
              </p>
            </div>

            {snapshot.feedItems.length === 0 ? (
              <Card className="rounded-[24px] border border-dashed border-black/10 bg-black/[0.015] p-6 text-sm text-slate-500 shadow-none">
                No items match the current tab and filters.
              </Card>
            ) : (
              <div className="grid gap-4">
                {snapshot.feedItems.map((item) => (
                  <FeedCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
