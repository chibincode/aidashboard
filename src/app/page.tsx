import { Activity, Bookmark, Radar, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DashboardFiltersBar } from "@/components/dashboard/filters-bar";
import { FeedCard } from "@/components/dashboard/feed-card";
import { LastVisitBeacon } from "@/components/dashboard/last-visit-beacon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/repositories/app-repository";
import { parseDashboardFilters } from "@/lib/filters";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const statConfig = [
  { key: "newItems", label: "New since last visit", icon: Radar },
  { key: "unreadItems", label: "Unread", icon: Activity },
  { key: "savedItems", label: "Saved", icon: Bookmark },
  { key: "healthySources", label: "Healthy sources", icon: ShieldCheck },
] as const;

export default async function Home({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const filters = parseDashboardFilters(resolvedParams);
  const snapshot = await getDashboardSnapshot(filters);

  return (
    <AppShell
      pathname="/"
      title="AI + logistics intelligence, arranged for scanning speed."
      subtitle="Track AI UX/UI signals, Trucker Path, AI Loadboard, NavPro and adjacent competitors in one fast-reading deck. Sections stay stable while filters tighten the view."
    >
      <LastVisitBeacon />

      <section className="grid gap-4 lg:grid-cols-4">
        {statConfig.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-slate-950">
                    {snapshot.counts[stat.key]}
                  </p>
                </div>
                <div className="rounded-2xl bg-[color:var(--accent-soft)] p-3 text-[color:var(--accent-strong)]">
                  <Icon className="size-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <div className="mt-6">
        <DashboardFiltersBar filters={filters} tags={snapshot.tags} entities={snapshot.entities} />
      </div>

      <section className="grid gap-6">
        {snapshot.sections.map((section) => (
          <Card key={section.id} className="overflow-hidden p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone={section.items.length > 0 ? "accent" : "muted"}>{section.items.length} items</Badge>
                  <Badge tone="muted">{section.id.replaceAll("-", " ")}</Badge>
                </div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">{section.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{section.description}</p>
              </div>
            </div>

            {section.items.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-black/10 bg-black/[0.015] p-6 text-sm text-slate-500">
                No items match the current filters in this section.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {section.items.map((item) => (
                  <FeedCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
