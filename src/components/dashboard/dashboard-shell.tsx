"use client";

import { startTransition, useCallback, useDeferredValue, useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { setItemReadAction, toggleSavedAction } from "@/actions/item-state";
import { FeedDetailModal } from "@/components/dashboard/feed-detail-modal";
import {
  getDashboardItemResolvedSocialCounts,
  getDashboardItemSourceHandle,
  getDashboardItemSourceName,
  isDashboardItemShortVideo,
  isDashboardItemXVideo,
} from "@/components/dashboard/feed-item-meta";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardFiltersBar } from "@/components/dashboard/filters-bar";
import { FeedCard, FeedCardActions } from "@/components/dashboard/feed-card";
import { DashboardViewTabs } from "@/components/dashboard/view-tabs";
import { getDashboardViewLabel } from "@/components/dashboard/view-meta";
import { Card } from "@/components/ui/card";
import {
  buildDashboardSections,
  filterDashboardItems,
  getActiveDashboardCategories,
  getDashboardFeedItemsForView,
  resolveActiveDashboardView,
} from "@/lib/dashboard";
import { DASHBOARD_LOCATION_CHANGE_EVENT, DASHBOARD_REFRESH_START_EVENT } from "@/lib/dashboard-events";
import type { DashboardFilters, DashboardItem, DashboardSnapshot, DashboardView } from "@/lib/domain";
import { parseDashboardFiltersFromSearchParams, serializeDashboardFilters } from "@/lib/filters";

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
  const [overviewRetryMessage, setOverviewRetryMessage] = useState<{
    tone: "neutral" | "success" | "warning";
    text: string;
  } | null>(null);
  const [refreshingRenderId, setRefreshingRenderId] = useState<string | null>(null);
  const [itemStateOverrides, setItemStateOverrides] = useState<
    Record<string, Partial<Pick<DashboardItem, "isRead" | "isSaved">>>
  >({});
  const [overview, setOverview] = useState(snapshot.overview);
  const [overviewCache, setOverviewCache] = useState<Record<string, DashboardSnapshot["overview"]>>(() => ({
    [serializeDashboardFilters(filters) || "all"]: snapshot.overview,
  }));
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewRetrying, setOverviewRetrying] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [detailPendingAction, setDetailPendingAction] = useState<"read" | "save" | null>(null);
  const initialSearch = useMemo(() => {
    const query = serializeDashboardFilters(filters);
    return query ? `?${query}` : "";
  }, [filters]);
  const currentSearch = useSyncExternalStore(
    (onStoreChange) => {
      function handleLocationChange() {
        onStoreChange();
      }

      window.addEventListener("popstate", handleLocationChange);
      window.addEventListener(DASHBOARD_LOCATION_CHANGE_EVENT, handleLocationChange);

      return () => {
        window.removeEventListener("popstate", handleLocationChange);
        window.removeEventListener(DASHBOARD_LOCATION_CHANGE_EVENT, handleLocationChange);
      };
    },
    () => window.location.search,
    () => initialSearch,
  );
  const currentFilters = useMemo(
    () => parseDashboardFiltersFromSearchParams(new URLSearchParams(currentSearch)),
    [currentSearch],
  );
  const deferredFilters = useDeferredValue(currentFilters);
  const currentFiltersKey = useMemo(() => serializeDashboardFilters(currentFilters) || "all", [currentFilters]);
  const initialFiltersKey = useMemo(() => serializeDashboardFilters(filters) || "all", [filters]);
  const itemsWithOverrides = useMemo(
    () =>
      snapshot.allItems.map((item) => {
        const override = itemStateOverrides[item.id];
        return override ? { ...item, ...override } : item;
      }),
    [itemStateOverrides, snapshot.allItems],
  );
  const itemsById = useMemo(() => new Map(itemsWithOverrides.map((item) => [item.id, item] as const)), [itemsWithOverrides]);
  const activeCategories = useMemo(() => getActiveDashboardCategories(snapshot.categories), [snapshot.categories]);
  const filteredItems = useMemo(
    () => filterDashboardItems(itemsWithOverrides, deferredFilters),
    [deferredFilters, itemsWithOverrides],
  );
  const sections = useMemo(
    () => buildDashboardSections(filteredItems, activeCategories),
    [activeCategories, filteredItems],
  );
  const activeView = useMemo(
    () => resolveActiveDashboardView(deferredFilters.view, activeCategories),
    [activeCategories, deferredFilters.view],
  );
  const projectedFeedItems = useMemo(
    () => getDashboardFeedItemsForView(activeView, sections, filteredItems),
    [activeView, filteredItems, sections],
  );
  const projected = useMemo(
    () => ({
      activeView,
      categories: activeCategories,
      sections,
      feedItems: projectedFeedItems,
    }),
    [activeCategories, activeView, projectedFeedItems, sections],
  );
  const activeLabel = getDashboardViewLabel(projected.activeView, projected.categories);
  const isBackgroundRefreshing = refreshingRenderId === snapshot.renderId;
  const selectedDetailItem = useMemo(
    () => (detailItemId ? itemsById.get(detailItemId) ?? null : null),
    [detailItemId, itemsById],
  );

  useEffect(() => {
    setItemStateOverrides({});
  }, [snapshot.renderId]);

  useEffect(() => {
    if (detailItemId && !selectedDetailItem) {
      setDetailItemId(null);
    }
  }, [detailItemId, selectedDetailItem]);

  function syncUrl(nextFilters: DashboardFilters, mode: "push" | "replace" = "push") {
    const query = serializeDashboardFilters(nextFilters);
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl === currentUrl) {
      return;
    }

    window.history[mode === "replace" ? "replaceState" : "pushState"](null, "", nextUrl);
    window.dispatchEvent(new Event(DASHBOARD_LOCATION_CHANGE_EVENT));
  }

  function applyFilters(nextFilters: DashboardFilters, mode: "push" | "replace" = "push") {
    syncUrl(nextFilters, mode);
  }

  function setView(view: DashboardView) {
    if (view === projected.activeView) {
      return;
    }

    applyFilters({
      ...currentFilters,
      view: view === "all" ? undefined : view,
    });
  }

  useEffect(() => {
    function handleRefreshStart() {
      setRefreshingRenderId(snapshot.renderId);
    }

    window.addEventListener(DASHBOARD_REFRESH_START_EVENT, handleRefreshStart);

    return () => {
      window.removeEventListener(DASHBOARD_REFRESH_START_EVENT, handleRefreshStart);
    };
  }, [snapshot.renderId]);

  const requestOverview = useEffectEvent(async (nextFilters: DashboardFilters, force = false, signal?: AbortSignal) => {
    const response = await fetch(force ? "/api/dashboard/overview/retry" : "/api/dashboard/overview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters: nextFilters,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to load overview (${response.status}).`);
    }

    const payload = (await response.json()) as {
      overview:
        | (Omit<NonNullable<DashboardSnapshot["overview"]>, "generatedAt"> & {
            generatedAt: string | null;
          })
        | null;
    };

    if (!payload.overview) {
      return null;
    }

    return {
      ...payload.overview,
      generatedAt: payload.overview.generatedAt ? new Date(payload.overview.generatedAt) : null,
    };
  });

  useEffect(() => {
    setOverviewCache((current) => {
      if (current[initialFiltersKey] === snapshot.overview) {
        return current;
      }

      return {
        ...current,
        [initialFiltersKey]: snapshot.overview,
      };
    });

    if (currentFiltersKey === initialFiltersKey) {
      setOverview(snapshot.overview);
      setOverviewLoading(false);
      setOverviewRetryMessage(null);
      return;
    }

    if (Object.prototype.hasOwnProperty.call(overviewCache, currentFiltersKey)) {
      setOverview(overviewCache[currentFiltersKey] ?? null);
      setOverviewLoading(false);
      setOverviewRetryMessage(null);
      return;
    }

    const controller = new AbortController();
    setOverviewLoading(true);
    setOverviewRetryMessage(null);

    void requestOverview(currentFilters, false, controller.signal)
      .then((nextOverview) => {
        setOverview(nextOverview);
        setOverviewCache((current) => ({
          ...current,
          [currentFiltersKey]: nextOverview,
        }));
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error(error);
          setOverview(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setOverviewLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [currentFilters, currentFiltersKey, initialFiltersKey, overviewCache, requestOverview, snapshot.overview]);

  const applyItemStatePatch = useCallback((itemId: string, patch: Partial<Pick<DashboardItem, "isRead" | "isSaved">>) => {
    setItemStateOverrides((currentOverrides) => ({
      ...currentOverrides,
      [itemId]: {
        ...currentOverrides[itemId],
        ...patch,
      },
    }));
  }, []);

  const refreshForFilterPatch = useCallback(
    (patch: Partial<Pick<DashboardItem, "isRead" | "isSaved">>) => {
      const shouldRefreshForFilter =
        (patch.isRead !== undefined && currentFilters.unreadOnly) ||
        (patch.isSaved !== undefined && currentFilters.savedOnly);

      if (shouldRefreshForFilter) {
        startTransition(() => {
          router.refresh();
        });
      }
    },
    [currentFilters.savedOnly, currentFilters.unreadOnly, router],
  );

  const handleItemStateChange = useCallback(
    (itemId: string, patch: Partial<Pick<DashboardItem, "isRead" | "isSaved">>) => {
      applyItemStatePatch(itemId, patch);
      refreshForFilterPatch(patch);
    },
    [applyItemStatePatch, refreshForFilterPatch],
  );

  const openDetail = useCallback((itemId: string) => {
    setDetailItemId(itemId);
  }, []);

  const toggleDetailItemState = useCallback(
    async (kind: "read" | "save") => {
      if (!selectedDetailItem) {
        return;
      }

      const nextValue = kind === "read" ? !selectedDetailItem.isRead : !selectedDetailItem.isSaved;
      const previousRead = selectedDetailItem.isRead;
      const previousSaved = selectedDetailItem.isSaved;
      const patch =
        kind === "read" ? { isRead: nextValue } : nextValue ? { isSaved: true, isRead: true } : { isSaved: false };

      applyItemStatePatch(selectedDetailItem.id, patch);
      refreshForFilterPatch(patch);
      setDetailPendingAction(kind);

      try {
        if (kind === "read") {
          await setItemReadAction(selectedDetailItem.id, nextValue);
        } else {
          await toggleSavedAction(selectedDetailItem.id, nextValue);
        }
      } catch {
        applyItemStatePatch(
          selectedDetailItem.id,
          kind === "read" ? { isRead: previousRead } : { isSaved: previousSaved, isRead: previousRead },
        );
      } finally {
        setDetailPendingAction(null);
      }
    },
    [applyItemStatePatch, refreshForFilterPatch, selectedDetailItem],
  );

  function retryOverview() {
    setOverviewRetrying(true);
    setOverviewRetryMessage(null);

    void requestOverview(currentFilters, true)
      .then((nextOverview) => {
        setOverview(nextOverview);
        setOverviewCache((current) => ({
          ...current,
          [currentFiltersKey]: nextOverview,
        }));
        setOverviewRetryMessage(
          !nextOverview
            ? {
                tone: "neutral",
                text: "No items landed in the last 24 hours for this slice.",
              }
            : nextOverview.mode === "ai" && !nextOverview.stale
              ? {
                  tone: "success",
                  text: "AI summary refreshed successfully.",
                }
              : nextOverview.mode === "ai" && nextOverview.stale
                ? {
                    tone: "neutral",
                    text: "OpenRouter did not finish a fresh summary in time, so the last successful AI summary is still shown.",
                  }
              : {
                  tone: "warning",
                  text: "AI summary is still unavailable, so the overview stayed on direct stats.",
                },
        );
      })
      .catch((error) => {
        console.error(error);
        setOverviewRetryMessage({
          tone: "warning",
          text: "Retry failed. Keeping the previous overview.",
        });
      })
      .finally(() => {
        setOverviewRetrying(false);
      });
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-16 lg:self-start">
        <DashboardViewTabs activeView={projected.activeView} categories={projected.categories} layout="sidebar" onChange={setView} />
        <div className="mt-4">
          <DashboardFiltersBar
            filters={currentFilters}
            tags={snapshot.tags}
            entities={snapshot.entities}
            layout="sidebar"
            onChange={(nextFilters) => applyFilters(nextFilters)}
            onClear={() => applyFilters({}, "push")}
          />
        </div>
      </aside>

      <div className="min-w-0 lg:flex lg:justify-center">
        <div className="w-full lg:max-w-[700px]">
          <DashboardOverview
            overview={overview}
            itemLookup={itemsById}
            loading={overviewLoading}
            retrying={overviewRetrying}
            retryMessage={overviewRetryMessage}
            onRetry={overview?.canRetry ? retryOverview : undefined}
            onOpenEvidenceItem={openDetail}
          />

          <div className="mb-5 flex items-end justify-between border-b border-black/6 pb-3">
            <h2 className="font-display text-xl font-semibold tracking-tight text-slate-950 md:text-[1.55rem]">
              {activeLabel}
            </h2>
            {isBackgroundRefreshing ? (
              <div className="h-4 w-[4.5rem] animate-pulse rounded-full bg-slate-100" aria-hidden="true" />
            ) : (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {projected.feedItems.length} items
              </p>
            )}
          </div>

          {isBackgroundRefreshing ? (
            <DashboardFeedSkeleton view={projected.activeView} categories={projected.categories} />
          ) : projected.feedItems.length === 0 ? (
            <Card className="rounded-[24px] border border-dashed border-black/10 bg-black/[0.015] p-6 text-sm text-slate-500 shadow-none">
              No items match the current tab and filters.
            </Card>
          ) : (
            <div className="grid gap-4 [content-visibility:auto] [contain-intrinsic-size:1200px]">
              {projected.feedItems.map((item) => (
                <FeedCard key={item.id} item={item} onItemStateChange={handleItemStateChange} onOpenDetail={openDetail} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedDetailItem ? (
        <FeedDetailModal
          open
          onClose={() => setDetailItemId(null)}
          item={selectedDetailItem}
          sourceName={getDashboardItemSourceName(selectedDetailItem)}
          sourceHandle={getDashboardItemSourceHandle(selectedDetailItem)}
          socialCounts={selectedDetailItem.sourceType === "x" ? getDashboardItemResolvedSocialCounts(selectedDetailItem) : null}
          isShortVideo={isDashboardItemShortVideo(selectedDetailItem)}
          isXVideo={isDashboardItemXVideo(selectedDetailItem)}
          actionButtons={
            <FeedCardActions
              isPending={detailPendingAction !== null}
              isRead={selectedDetailItem.isRead}
              isSaved={selectedDetailItem.isSaved}
              pendingAction={detailPendingAction}
              onToggleRead={() => void toggleDetailItemState("read")}
              onToggleSaved={() => void toggleDetailItemState("save")}
            />
          }
        />
      ) : null}
    </section>
  );
}
