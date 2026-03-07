import { AppShell } from "@/components/app-shell";
import { DashboardFiltersBar } from "@/components/dashboard/filters-bar";
import { FeedCard } from "@/components/dashboard/feed-card";
import { DashboardViewTabs } from "@/components/dashboard/view-tabs";
import { LastVisitBeacon } from "@/components/dashboard/last-visit-beacon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/repositories/app-repository";
import { parseDashboardFilters } from "@/lib/filters";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const viewCopy = {
  all: {
    label: "All",
    description: "Everything in one continuous feed, ordered for scanning.",
  },
  "ai-ux-ui": {
    label: "AI UX/UI",
    description: "Patterns, workflows, trust cues and onboarding signals.",
  },
  "competitor-watch": {
    label: "Competitor Watch",
    description: "Moves across Trucker Path, AI Loadboard, NavPro and adjacent products.",
  },
  "industry-signals": {
    label: "Industry Signals",
    description: "Category-level pricing, routing, navigation and loadboard signals.",
  },
  saved: {
    label: "Saved",
    description: "Pinned items for follow-up and synthesis.",
  },
} as const;

export default async function Home({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const filters = parseDashboardFilters(resolvedParams);
  const snapshot = await getDashboardSnapshot(filters);
  const activeView = viewCopy[snapshot.activeView];

  return (
    <AppShell
      pathname="/"
      title="Signal flow, not dashboard clutter."
      subtitle="Use tabs to jump categories, then scan one continuous stream instead of bouncing across multiple sections."
    >
      <LastVisitBeacon />

      <section>
        <DashboardViewTabs activeView={snapshot.activeView} />
        <DashboardFiltersBar filters={filters} tags={snapshot.tags} entities={snapshot.entities} />
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge tone={snapshot.feedItems.length > 0 ? "accent" : "muted"}>{snapshot.feedItems.length} items</Badge>
              <Badge tone="muted">{activeView.label}</Badge>
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              {activeView.label}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{activeView.description}</p>
          </div>
        </div>

        {snapshot.feedItems.length === 0 ? (
          <Card className="rounded-[24px] border border-dashed border-black/10 bg-black/[0.015] p-6 text-sm text-slate-500 shadow-none">
            No items match the current tab and filters.
          </Card>
        ) : (
          <div className="grid gap-3">
            {snapshot.feedItems.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
