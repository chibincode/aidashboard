"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp, RefreshCw, Sparkles } from "lucide-react";
import { SourceAvatar } from "@/components/dashboard/source-avatar";
import { getDashboardItemAvatarFallbackClass, getDashboardItemSourceName } from "@/components/dashboard/feed-item-meta";
import type { DashboardItem, DashboardOverview as DashboardOverviewData } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatRelativeTime } from "@/lib/utils";

function formatOverviewModel(model: string | null) {
  if (!model) {
    return null;
  }

  return model.split("/").pop()?.replace(/-\d{6,}$/, "") ?? model;
}

function getEvidencePreview(item: DashboardItem) {
  return item.title.trim() || item.excerpt.trim() || item.canonicalUrl;
}

function OverviewSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-slate-200" />
          <div>
            <div className="h-4 w-24 rounded-full bg-slate-200" />
            <div className="mt-2 h-3 w-36 rounded-full bg-slate-100" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-20 rounded-full bg-slate-100" />
          <div className="h-7 w-24 rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="mt-6 h-10 w-5/6 rounded-[20px] bg-slate-200" />
      <div className="mt-6 grid gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-[24px] border border-white/60 bg-white/70 p-4">
            <div className="flex gap-3">
              <div className="size-9 rounded-2xl bg-slate-200" />
              <div className="min-w-0 flex-1">
                <div className="h-4 w-full rounded-full bg-slate-100" />
                <div className="mt-3 h-16 rounded-[18px] bg-slate-50" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardOverview({
  overview,
  itemLookup,
  loading = false,
  retrying = false,
  retryMessage,
  onRetry,
  onOpenEvidenceItem,
}: {
  overview: DashboardOverviewData | null;
  itemLookup?: ReadonlyMap<string, DashboardItem>;
  loading?: boolean;
  retrying?: boolean;
  retryMessage?: { tone: "neutral" | "success" | "warning"; text: string } | null;
  onRetry?: () => void;
  onOpenEvidenceItem?: (itemId: string) => void;
}) {
  const [expandedInsights, setExpandedInsights] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedInsights({});
  }, [overview?.headline, overview?.generatedAt?.toISOString()]);

  const evidenceItemsByInsight = useMemo(() => {
    if (!overview || !itemLookup) {
      return {};
    }

    return Object.fromEntries(
      overview.insights.map((insight) => [
        insight.id,
        insight.sourceItemIds
          .map((itemId) => itemLookup.get(itemId) ?? null)
          .filter((item): item is DashboardItem => item !== null),
      ]),
    );
  }, [itemLookup, overview]);

  if (!overview && !loading) {
    return null;
  }

  return (
    <Card
      className={cn(
        "relative mb-6 overflow-hidden border-black/8 bg-[linear-gradient(180deg,rgba(244,250,248,0.97),rgba(255,255,255,0.99))] p-6 shadow-[0_28px_80px_-42px_rgba(13,23,32,0.42)]",
        loading && "min-h-[360px]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-28 rounded-b-[34px] bg-[radial-gradient(circle_at_top,rgba(69,186,160,0.2),transparent_70%)]" />
      <div className="pointer-events-none absolute -right-16 top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(144,205,244,0.16),transparent_70%)]" />

      {loading || !overview ? (
        <OverviewSkeleton />
      ) : (
        <div className="relative" aria-live="polite">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex size-11 items-center justify-center rounded-[18px] bg-[color:var(--accent-soft)]/85 text-[color:var(--accent-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight text-slate-950">Overview</p>
                <p className="text-xs text-slate-500">AI-distilled signal with traceable evidence.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge tone="accent">Last 24h</Badge>
              <Badge tone={overview.mode === "ai" ? "accent" : "danger"}>
                {overview.mode === "ai" ? "AI Summary" : "Stats Only"}
              </Badge>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-[color:var(--accent-soft)]/80 bg-[linear-gradient(180deg,rgba(226,244,239,0.85),rgba(255,255,255,0.7))] px-4 py-3 text-[color:var(--accent-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <p className="font-medium">{overview.statusText}</p>
            {overview.failureReason ? (
              <p className="mt-1.5 text-sm leading-6 text-slate-700">
                Why this happened: {overview.failureReason}
              </p>
            ) : null}
            {overview.model ? (
              <p className="mt-1 text-xs uppercase tracking-[0.18em] opacity-80">Model {formatOverviewModel(overview.model)}</p>
            ) : null}
          </div>

          <div className="mt-6">
            <p className="max-w-[14ch] text-[1.45rem] font-semibold leading-[1.2] tracking-tight text-slate-950 md:max-w-[18ch] md:text-[1.9rem]">
              {overview.headline}
            </p>
          </div>

          <div className="mt-6 grid gap-3.5">
            {overview.insights.map((insight, index) => {
              const evidenceItems = evidenceItemsByInsight[insight.id] ?? [];
              const isExpanded = expandedInsights[insight.id] === true;
              const visibleEvidenceItems = isExpanded ? evidenceItems : evidenceItems.slice(0, 2);
              const hiddenEvidenceCount = Math.max(evidenceItems.length - visibleEvidenceItems.length, 0);

              return (
                <article
                  key={insight.id}
                  className="rounded-[24px] border border-white/75 bg-white/86 p-4 shadow-[0_16px_44px_-34px_rgba(15,23,42,0.32)] backdrop-blur"
                >
                  <div className="flex gap-3.5">
                    <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-[18px] bg-slate-950 text-sm font-semibold text-white shadow-[0_12px_30px_-22px_rgba(15,23,42,0.55)]">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium leading-7 text-slate-900 md:text-[15.5px]">{insight.summary}</p>

                      {evidenceItems.length > 0 ? (
                        <div className="mt-4 space-y-2.5">
                          {visibleEvidenceItems.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="group/evidence flex w-full items-start justify-between gap-3 rounded-[18px] border border-black/6 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] px-3.5 py-3 text-left transition hover:-translate-y-px hover:border-[color:var(--accent-soft)] hover:shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]"
                              onClick={() => onOpenEvidenceItem?.(item.id)}
                            >
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                <SourceAvatar
                                  src={item.authorAvatarUrl}
                                  name={getDashboardItemSourceName(item)}
                                  className="mt-0.5 size-10"
                                  fallbackClassName={getDashboardItemAvatarFallbackClass(item)}
                                />

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    <span className="text-[color:var(--accent-strong)]">{getDashboardItemSourceName(item)}</span>
                                    <span className="text-slate-300">•</span>
                                    <span suppressHydrationWarning>{formatRelativeTime(item.publishedAt)}</span>
                                  </div>
                                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-800">{getEvidencePreview(item)}</p>
                                </div>
                              </div>

                              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-black/6 bg-white text-slate-500 transition group-hover/evidence:border-[color:var(--accent-soft)] group-hover/evidence:text-[color:var(--accent-strong)]">
                                <ArrowUpRight className="size-4" aria-hidden="true" />
                              </span>
                            </button>
                          ))}

                          {evidenceItems.length > 2 ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-full px-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)] transition hover:text-slate-900"
                              aria-expanded={isExpanded}
                              onClick={() =>
                                setExpandedInsights((current) => ({
                                  ...current,
                                  [insight.id]: !isExpanded,
                                }))
                              }
                            >
                              {isExpanded ? <ChevronUp className="size-3.5" aria-hidden="true" /> : <ChevronDown className="size-3.5" aria-hidden="true" />}
                              {isExpanded ? "Collapse sources" : `View ${hiddenEvidenceCount} more source${hiddenEvidenceCount === 1 ? "" : "s"}`}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/6 pt-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{overview.itemCount} items</span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">•</span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{overview.sourceCount} sources</span>
              {overview.generatedAt ? (
                <>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">•</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500" suppressHydrationWarning>
                    Updated {formatRelativeTime(overview.generatedAt)}
                  </span>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {overview.topTags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: `${tag.color}18`, color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
              {overview.canRetry && onRetry ? (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={retrying}
                  loadingLabel="Retrying AI..."
                  onClick={onRetry}
                >
                  {retrying ? null : <RefreshCw className="size-3.5" aria-hidden="true" />}
                  {overview.mode === "ai" ? "Refresh AI" : "Retry AI Summary"}
                </Button>
              ) : null}
            </div>
          </div>

          {retrying || retryMessage ? (
            <div
              className={cn(
                "mt-3 rounded-2xl border px-3.5 py-2 text-sm",
                retrying && "border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/40 text-[color:var(--accent-strong)]",
                !retrying && retryMessage?.tone === "success" && "border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/40 text-[color:var(--accent-strong)]",
                !retrying && retryMessage?.tone === "warning" && "border-[#f5d0c5] bg-[#fff7f4] text-[#9a3412]",
                !retrying && retryMessage?.tone === "neutral" && "border-black/6 bg-black/[0.03] text-slate-600",
              )}
              role="status"
            >
              {retrying ? "Retrying OpenRouter for a fresh summary..." : retryMessage?.text}
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
