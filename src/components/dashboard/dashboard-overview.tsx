"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import type { DashboardOverview as DashboardOverviewData } from "@/lib/domain";
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

function OverviewSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-24 rounded-full bg-slate-200" />
        <div className="h-6 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="mt-4 h-7 w-4/5 rounded-2xl bg-slate-200" />
      <div className="mt-4 space-y-3">
        <div className="h-3.5 w-full rounded-full bg-slate-100" />
        <div className="h-3.5 w-11/12 rounded-full bg-slate-100" />
        <div className="h-3.5 w-4/5 rounded-full bg-slate-100" />
      </div>
      <div className="mt-5 flex gap-2">
        <div className="h-7 w-20 rounded-full bg-slate-100" />
        <div className="h-7 w-24 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

export function DashboardOverview({
  overview,
  loading = false,
  retrying = false,
  retryMessage,
  onRetry,
}: {
  overview: DashboardOverviewData | null;
  loading?: boolean;
  retrying?: boolean;
  retryMessage?: { tone: "neutral" | "success" | "warning"; text: string } | null;
  onRetry?: () => void;
}) {
  if (!overview && !loading) {
    return null;
  }

  return (
    <Card
      className={cn(
        "mb-5 overflow-hidden border-black/6 bg-[linear-gradient(180deg,rgba(245,249,248,0.94),rgba(255,255,255,0.98))] p-5 shadow-[0_18px_50px_-36px_rgba(17,24,39,0.35)]",
        loading && "min-h-[220px]",
      )}
    >
      {loading || !overview ? (
        <OverviewSkeleton />
      ) : (
        <div aria-live="polite">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="inline-flex size-8 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
                  <Sparkles className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight text-slate-950">Overview</p>
                  <p className="text-xs text-slate-500">Compressed signal for the current slice.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge tone="accent">Last 24h</Badge>
              <Badge tone={overview.mode === "ai" ? "accent" : "danger"}>
                {overview.mode === "ai" ? "AI Summary" : "Stats Only"}
              </Badge>
            </div>
          </div>

          <div className="mt-4">
            <div
              className={cn(
                "mb-3 rounded-2xl border px-3.5 py-2 text-sm",
                overview.mode === "ai"
                  ? "border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/55 text-[color:var(--accent-strong)]"
                  : "border-[#f5d0c5] bg-[#fff7f4] text-[#9a3412]",
              )}
            >
              <p className="font-medium">{overview.statusText}</p>
              {overview.model ? (
                <p className="mt-1 text-xs uppercase tracking-[0.16em] opacity-75">
                  Model {formatOverviewModel(overview.model)}
                </p>
              ) : null}
            </div>
            <p className="text-[1.1rem] font-semibold leading-7 tracking-tight text-slate-950 md:text-[1.22rem]">
              {overview.headline}
            </p>
            <ul className="mt-4 grid gap-2.5 text-sm leading-6 text-slate-700">
              {overview.bullets.map((bullet, index) => (
                <li key={`${overview.mode}-${index}`} className="flex gap-3">
                  <span className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-[color:var(--accent)]" aria-hidden="true" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/6 pt-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {overview.itemCount} items
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">•</span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {overview.sourceCount} sources
              </span>
              {overview.generatedAt ? (
                <>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">•</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
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
