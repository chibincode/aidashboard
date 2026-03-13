"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DashboardFiltersBar } from "@/components/dashboard/filters-bar";
import { FeedCard } from "@/components/dashboard/feed-card";
import { DashboardViewTabs } from "@/components/dashboard/view-tabs";
import { getDashboardViewLabel } from "@/components/dashboard/view-meta";
import { Card } from "@/components/ui/card";
import type { DashboardFilters, DashboardSnapshot, DashboardView } from "@/lib/domain";

function DashboardFeedSkeleton({
  view,
  categories,
}: {
  view: DashboardView;
  categories: DashboardSnapshot["categories"];
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" role="status">
        Loading {getDashboardViewLabel(view, categories)}...
      </p>
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card
            key={`${view}-skeleton-${index}`}
            className="overflow-hidden rounded-[24px] border-black/6 bg-white/85 p-5 shadow-[0_12px_30px_-28px_rgba(11,31,43,0.18)]"
          >
            <div className="animate-pulse">
              <div className="flex items-center justify-between gap-4">
                <div className="h-4 w-24 rounded-full bg-slate-200" />
                <div className="h-4 w-16 rounded-full bg-slate-100" />
              </div>
              <div className="mt-5 h-7 w-4/5 rounded-2xl bg-slate-200" />
              <div className="mt-3 space-y-2">
                <div className="h-3.5 w-full rounded-full bg-slate-100" />
                <div className="h-3.5 w-11/12 rounded-full bg-slate-100" />
                <div className="h-3.5 w-3/4 rounded-full bg-slate-100" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <div className="h-7 w-20 rounded-full bg-slate-100" />
                <div className="h-7 w-24 rounded-full bg-slate-100" />
                <div className="h-7 w-[4.5rem] rounded-full bg-slate-100" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DashboardShell({
  snapshot,
  filters,
}: {
  snapshot: DashboardSnapshot;
  filters: DashboardFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingView, setPendingView] = useState<DashboardView | null>(null);

  const resolvedPendingView = pendingView === snapshot.activeView ? null : pendingView;
  const isViewPending = resolvedPendingView !== null;
  const displayedView = resolvedPendingView ?? snapshot.activeView;
  const activeLabel = getDashboardViewLabel(displayedView, snapshot.categories);

  function setView(view: DashboardView) {
    if (view === snapshot.activeView && resolvedPendingView === null) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (view === "all") {
      params.delete("view");
    } else {
      params.set("view", view);
    }

    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;

    setPendingView(view === snapshot.activeView ? null : view);
    router.push(nextUrl);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-16 lg:self-start">
        <DashboardViewTabs activeView={displayedView} categories={snapshot.categories} layout="sidebar" onChange={setView} />
        <div className="mt-4">
          <DashboardFiltersBar filters={filters} tags={snapshot.tags} entities={snapshot.entities} layout="sidebar" />
        </div>
      </aside>

      <div className="min-w-0 lg:flex lg:justify-center">
        <div className="w-full lg:max-w-[700px]">
          <div className="mb-5 flex items-end justify-between border-b border-black/6 pb-3">
            <h2 className="font-display text-xl font-semibold tracking-tight text-slate-950 md:text-[1.55rem]">
              {activeLabel}
            </h2>
            {isViewPending ? (
              <div className="h-4 w-[4.5rem] animate-pulse rounded-full bg-slate-100" aria-hidden="true" />
            ) : (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {snapshot.feedItems.length} items
              </p>
            )}
          </div>

          {isViewPending ? (
            <DashboardFeedSkeleton view={displayedView} categories={snapshot.categories} />
          ) : snapshot.feedItems.length === 0 ? (
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
  );
}
