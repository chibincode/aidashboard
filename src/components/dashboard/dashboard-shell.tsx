"use client";

import { startTransition, useCallback, useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from "react";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  filterDashboardItems,
  resolveActiveDashboardView,
} from "@/lib/dashboard";
import { DASHBOARD_LOCATION_CHANGE_EVENT, DASHBOARD_REFRESH_START_EVENT } from "@/lib/dashboard-events";
import type { DashboardFilters, DashboardItem, DashboardPagination, DashboardSnapshot, DashboardView } from "@/lib/domain";
import { parseDashboardFiltersFromSearchParams, parseDashboardPageFromSearchParams, serializeDashboardFilters, serializeDashboardLocation } from "@/lib/filters";

type DashboardFeedState = Pick<DashboardSnapshot, "allItems" | "feedItems" | "pagination"> & {
  filtersKey: string;
};

function hydrateDashboardItem(
  item: Omit<DashboardItem, "publishedAt"> & {
    publishedAt: string;
  },
): DashboardItem {
  return {
    ...item,
    publishedAt: new Date(item.publishedAt),
  };
}

function hydrateDashboardItems(
  items: Array<
    Omit<DashboardItem, "publishedAt"> & {
      publishedAt: string;
    }
  >,
) {
  return items.map(hydrateDashboardItem);
}

function mergeDashboardItems(...collections: DashboardItem[][]) {
  const itemMap = new Map<string, DashboardItem>();

  for (const collection of collections) {
    for (const item of collection) {
      itemMap.set(item.id, item);
    }
  }

  return [...itemMap.values()];
}

function createFeedCacheKey(filtersKey: string, page: number) {
  return `${filtersKey}::${page}`;
}

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
  const initialFiltersKey = useMemo(() => serializeDashboardFilters(filters) || "all", [filters]);
  const initialPage = snapshot.pagination.page;
  const initialFeedState = useMemo<DashboardFeedState>(
    () => ({
      allItems: snapshot.allItems,
      feedItems: snapshot.feedItems,
      pagination: snapshot.pagination,
      filtersKey: initialFiltersKey,
    }),
    [initialFiltersKey, snapshot.allItems, snapshot.feedItems, snapshot.pagination],
  );
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
    [initialFiltersKey]: snapshot.overview,
  }));
  const [overviewEvidenceCache, setOverviewEvidenceCache] = useState<Record<string, DashboardItem[]>>(() => ({
    [initialFiltersKey]: snapshot.allItems,
  }));
  const [feedState, setFeedState] = useState<DashboardFeedState>(initialFeedState);
  const [feedCache, setFeedCache] = useState<Record<string, Pick<DashboardFeedState, "allItems" | "feedItems" | "pagination">>>(() => ({
    [createFeedCacheKey(initialFiltersKey, initialPage)]: initialFeedState,
  }));
  const [feedLoading, setFeedLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewRetrying, setOverviewRetrying] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [detailPendingAction, setDetailPendingAction] = useState<"read" | "save" | null>(null);
  const initialSearch = useMemo(() => {
    const query = serializeDashboardLocation(filters, initialPage);
    return query ? `?${query}` : "";
  }, [filters, initialPage]);
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
  const currentPage = useMemo(() => parseDashboardPageFromSearchParams(new URLSearchParams(currentSearch)), [currentSearch]);
  const currentFiltersKey = useMemo(() => serializeDashboardFilters(currentFilters) || "all", [currentFilters]);
  const lookupItems = useMemo(
    () =>
      mergeDashboardItems(feedState.allItems, overviewEvidenceCache[currentFiltersKey] ?? []).map((item) => {
        const override = itemStateOverrides[item.id];
        return override ? { ...item, ...override } : item;
      }),
    [currentFiltersKey, feedState.allItems, itemStateOverrides, overviewEvidenceCache],
  );
  const feedItems = useMemo(
    () =>
      feedState.feedItems.map((item) => {
        const override = itemStateOverrides[item.id];
        return override ? { ...item, ...override } : item;
      }),
    [feedState.feedItems, itemStateOverrides],
  );
  const itemsById = useMemo(() => new Map(lookupItems.map((item) => [item.id, item] as const)), [lookupItems]);
  const activeCategories = snapshot.categories;
  const visibleFeedItems = useMemo(() => filterDashboardItems(feedItems, currentFilters), [currentFilters, feedItems]);
  const activeView = useMemo(
    () => resolveActiveDashboardView(currentFilters.view, activeCategories),
    [activeCategories, currentFilters.view],
  );
  const activeLabel = getDashboardViewLabel(activeView, activeCategories);
  const isBackgroundRefreshing = refreshingRenderId === snapshot.renderId;
  const isLoadingDifferentSlice = feedLoading && currentPage === 1 && feedState.filtersKey !== currentFiltersKey;
  const isLoadingMore = feedLoading && feedState.filtersKey === currentFiltersKey && currentPage > feedState.pagination.page;
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

  function syncUrl(nextFilters: DashboardFilters, nextPage = 1, mode: "push" | "replace" = "push") {
    const query = serializeDashboardLocation(nextFilters, nextPage);
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl === currentUrl) {
      return;
    }

    window.history[mode === "replace" ? "replaceState" : "pushState"](null, "", nextUrl);
    window.dispatchEvent(new Event(DASHBOARD_LOCATION_CHANGE_EVENT));
  }

  function applyFilters(nextFilters: DashboardFilters, nextPage = 1, mode: "push" | "replace" = "push") {
    syncUrl(nextFilters, nextPage, mode);
  }

  function setView(view: DashboardView) {
    if (view === activeView) {
      return;
    }

    applyFilters({
      ...currentFilters,
      view: view === "all" ? undefined : view,
    }, 1);
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

  useEffect(() => {
    setFeedCache((current) => ({
      ...current,
      [createFeedCacheKey(initialFiltersKey, initialPage)]: {
        allItems: snapshot.allItems,
        feedItems: snapshot.feedItems,
        pagination: snapshot.pagination,
      },
    }));
    setOverviewEvidenceCache((current) => ({
      ...current,
      [initialFiltersKey]: snapshot.allItems,
    }));

    if (currentFiltersKey === initialFiltersKey && currentPage === initialPage) {
      setFeedState(initialFeedState);
      setFeedLoading(false);
    }
  }, [
    currentFiltersKey,
    currentPage,
    initialFeedState,
    initialFiltersKey,
    initialPage,
    snapshot.allItems,
    snapshot.feedItems,
    snapshot.pagination,
  ]);

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
      evidenceItems: Array<
        Omit<DashboardItem, "publishedAt"> & {
          publishedAt: string;
        }
      >;
    };

    return {
      overview: payload.overview
        ? {
            ...payload.overview,
            generatedAt: payload.overview.generatedAt ? new Date(payload.overview.generatedAt) : null,
          }
        : null,
      evidenceItems: hydrateDashboardItems(payload.evidenceItems),
    };
  });

  const requestFeed = useEffectEvent(async (nextFilters: DashboardFilters, nextPage: number, signal?: AbortSignal) => {
    const response = await fetch("/api/dashboard/feed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters: nextFilters,
        page: nextPage,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to load feed (${response.status}).`);
    }

    const payload = (await response.json()) as {
      allItems: Array<
        Omit<DashboardItem, "publishedAt"> & {
          publishedAt: string;
        }
      >;
      feedItems: Array<
        Omit<DashboardItem, "publishedAt"> & {
          publishedAt: string;
        }
      >;
      pagination: DashboardPagination;
    };

    return {
      allItems: hydrateDashboardItems(payload.allItems),
      feedItems: hydrateDashboardItems(payload.feedItems),
      pagination: payload.pagination,
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

    if (currentFiltersKey === initialFiltersKey && currentPage === initialPage) {
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
      .then((nextPayload) => {
        setOverview(nextPayload.overview);
        setOverviewCache((current) => ({
          ...current,
          [currentFiltersKey]: nextPayload.overview,
        }));
        setOverviewEvidenceCache((current) => ({
          ...current,
          [currentFiltersKey]: nextPayload.evidenceItems,
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
  }, [currentFilters, currentFiltersKey, currentPage, initialFiltersKey, initialPage, overviewCache, requestOverview, snapshot.overview]);

  useEffect(() => {
    if (currentFiltersKey === initialFiltersKey && currentPage === initialPage) {
      setFeedState(initialFeedState);
      setFeedLoading(false);
      return;
    }

    const cacheKey = createFeedCacheKey(currentFiltersKey, currentPage);
    const cachedFeed = feedCache[cacheKey];

    if (cachedFeed) {
      setFeedState({
        ...cachedFeed,
        filtersKey: currentFiltersKey,
      });
      setFeedLoading(false);
      return;
    }

    const controller = new AbortController();
    setFeedLoading(true);

    void requestFeed(currentFilters, currentPage, controller.signal)
      .then((nextFeed) => {
        setFeedState({
          ...nextFeed,
          filtersKey: currentFiltersKey,
        });
        setFeedCache((current) => ({
          ...current,
          [cacheKey]: nextFeed,
        }));
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error(error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setFeedLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [currentFilters, currentFiltersKey, currentPage, feedCache, initialFeedState, initialFiltersKey, initialPage, requestFeed]);

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
      .then((nextPayload) => {
        setOverview(nextPayload.overview);
        setOverviewCache((current) => ({
          ...current,
          [currentFiltersKey]: nextPayload.overview,
        }));
        setOverviewEvidenceCache((current) => ({
          ...current,
          [currentFiltersKey]: nextPayload.evidenceItems,
        }));
        setOverviewRetryMessage(
          !nextPayload.overview
            ? {
                tone: "neutral",
                text: "No items landed in the last 24 hours for this slice.",
              }
            : nextPayload.overview.mode === "ai" && !nextPayload.overview.stale
              ? {
                  tone: "success",
                  text: "AI summary refreshed successfully.",
                }
              : nextPayload.overview.mode === "ai" && nextPayload.overview.stale
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

  function loadMoreItems() {
    if (!feedState.pagination.hasMore || isLoadingMore) {
      return;
    }

    applyFilters(currentFilters, currentPage + 1);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-16 lg:self-start">
        <DashboardViewTabs activeView={activeView} categories={activeCategories} layout="sidebar" onChange={setView} />
        <div className="mt-4">
          <DashboardFiltersBar
            filters={currentFilters}
            tags={snapshot.tags}
            entities={snapshot.entities}
            layout="sidebar"
            onChange={(nextFilters) => applyFilters(nextFilters, 1)}
            onClear={() => applyFilters({}, 1, "push")}
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
                {feedState.pagination.hasMore ? `${visibleFeedItems.length} of ${feedState.pagination.totalItems} items` : `${feedState.pagination.totalItems} items`}
              </p>
            )}
          </div>

          {isBackgroundRefreshing || isLoadingDifferentSlice ? (
            <DashboardFeedSkeleton view={activeView} categories={activeCategories} />
          ) : visibleFeedItems.length === 0 ? (
            <Card className="rounded-[24px] border border-dashed border-black/10 bg-black/[0.015] p-6 text-sm text-slate-500 shadow-none">
              No items match the current tab and filters.
            </Card>
          ) : (
            <>
              <div className="grid gap-4 [content-visibility:auto] [contain-intrinsic-size:1200px]">
                {visibleFeedItems.map((item) => (
                  <FeedCard key={item.id} item={item} onItemStateChange={handleItemStateChange} onOpenDetail={openDetail} />
                ))}
              </div>

              {feedState.pagination.hasMore ? (
                <div className="mt-5 flex justify-center">
                  <Button variant="secondary" size="sm" loading={isLoadingMore} loadingLabel="Loading more..." onClick={loadMoreItems}>
                    Load more
                  </Button>
                </div>
              ) : null}
            </>
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
