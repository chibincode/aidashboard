"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Bookmark, CheckCheck, ExternalLink, Heart, History, MessageCircle, Newspaper, PlayCircle, Radio, Repeat2 } from "lucide-react";
import type { DashboardItem } from "@/lib/domain";
import { setItemReadAction, toggleSavedAction } from "@/actions/item-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, compactNumber, formatRelativeTime } from "@/lib/utils";

const contentTypeIcon = {
  article: Newspaper,
  video: PlayCircle,
  post: Radio,
  update: History,
};

const sourceTypeMeta = {
  youtube: {
    label: "YouTube",
    sourceLabel: "Channel",
    actionLabel: "Watch on YouTube",
    chipClass: "bg-[#fff0f0] text-[#b42318] ring-1 ring-[#f04438]/15",
    iconClass: "bg-[#b42318] text-white",
    frameClass: "border-[#efb9b9] bg-[linear-gradient(180deg,rgba(255,243,243,0.96),rgba(255,255,255,0.98))]",
  },
  x: {
    label: "X",
    sourceLabel: "Account",
    actionLabel: "Open post",
    chipClass: "bg-slate-950 text-white",
    iconClass: "bg-slate-950 text-white",
    frameClass: "border-slate-300 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.98))]",
  },
  website: {
    label: "Website",
    sourceLabel: "Source",
    actionLabel: "Open source",
    chipClass: "bg-[#eef6f2] text-[#166a5c] ring-1 ring-[#197d71]/12",
    iconClass: "bg-[#e4f3ef] text-[#166a5c]",
    frameClass: "",
  },
  rss: {
    label: "Feed",
    sourceLabel: "Feed",
    actionLabel: "Open source",
    chipClass: "bg-[#fff6e8] text-[#9a6700] ring-1 ring-[#d97706]/12",
    iconClass: "bg-[#fff1d6] text-[#9a6700]",
    frameClass: "",
  },
} as const;

function parseDurationSeconds(label?: string | null) {
  if (!label) {
    return null;
  }

  const parts = label.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
}

function getDisplaySourceName(item: DashboardItem) {
  return item.authorName ?? item.sourceName.replace(/\s+(YouTube|X)$/i, "");
}

function getSourceHandle(item: DashboardItem) {
  if (item.sourceHandle) {
    return item.sourceHandle.replace(/^@/, "");
  }

  return getDisplaySourceName(item).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getSyntheticSocialCounts(item: DashboardItem) {
  const seed = [...item.id].reduce((total, char, index) => total + char.charCodeAt(0) * (index + 3), 0);

  return {
    replies: 12 + (seed % 34),
    reposts: 80 + (seed % 620),
    likes: 320 + (seed % 6400),
  };
}

export function FeedCard({ item }: { item: DashboardItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, updateOptimistic] = useOptimistic(
    { isRead: item.isRead, isSaved: item.isSaved },
    (state, patch: Partial<{ isRead: boolean; isSaved: boolean }>) => ({
      ...state,
      ...patch,
    }),
  );

  const Icon = contentTypeIcon[item.contentType];
  const meta = sourceTypeMeta[item.sourceType];
  const isYouTube = item.sourceType === "youtube";
  const isX = item.sourceType === "x";
  const sourceName = getDisplaySourceName(item);
  const sourceHandle = getSourceHandle(item);
  const socialCounts = isX ? getSyntheticSocialCounts(item) : null;
  const durationSeconds = parseDurationSeconds(item.mediaLabel);
  const isShortVideo = isYouTube && (item.canonicalUrl.includes("/shorts/") || (durationSeconds !== null && durationSeconds < 90));

  const actionButtons = (
    <div className={cn("flex flex-wrap items-center justify-end gap-2", isX ? "md:w-[120px]" : "")}>
      <Button
        variant={optimistic.isRead ? "secondary" : "primary"}
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            updateOptimistic({ isRead: !optimistic.isRead });
            await setItemReadAction(item.id, !optimistic.isRead);
            router.refresh();
          })
        }
      >
        <CheckCheck className="size-3.5" />
        {optimistic.isRead ? "Unread" : "Read"}
      </Button>
      <Button
        variant={optimistic.isSaved ? "primary" : "secondary"}
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            updateOptimistic({ isSaved: !optimistic.isSaved });
            await toggleSavedAction(item.id, !optimistic.isSaved);
            router.refresh();
          })
        }
      >
        <Bookmark className="size-3.5" />
        {optimistic.isSaved ? "Saved" : "Save"}
      </Button>
    </div>
  );

  return (
    <Card
      className={cn(
        "group overflow-hidden rounded-[24px] border transition hover:border-black/10 hover:bg-white hover:shadow-[0_16px_40px_-32px_rgba(11,31,43,0.5)]",
        meta.frameClass,
        isYouTube || isX ? "p-0" : "p-4",
        optimistic.isRead
          ? "border-black/6 bg-white/72"
          : "border-[color:var(--accent-soft)] bg-white/92 shadow-[0_12px_30px_-28px_rgba(11,31,43,0.32)]",
      )}
    >
      {isYouTube ? (
        <div className="grid md:grid-cols-[320px_minmax(0,1fr)]">
          <Link
            href={item.canonicalUrl}
            target="_blank"
            rel="noreferrer"
            className="group/thumb relative block overflow-hidden bg-slate-950"
          >
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt=""
                className="aspect-video h-full w-full object-cover transition duration-500 group-hover/thumb:scale-[1.04]"
              />
            ) : (
              <div className="aspect-video w-full bg-[radial-gradient(circle_at_top,#ef5350,transparent_42%),linear-gradient(135deg,#7f1d1d,#ef4444)]" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_10%,rgba(15,23,42,0.8)_100%)]" />
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ff0000] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                <PlayCircle className="size-3.5" />
                YouTube
              </span>
              <span className="rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                {isShortVideo ? "Short" : "Video"}
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex size-16 items-center justify-center rounded-full bg-white/92 text-[#b42318] shadow-[0_20px_45px_-24px_rgba(15,23,42,0.7)] transition duration-300 group-hover/thumb:scale-110">
                <PlayCircle className="size-8 fill-current" />
              </span>
            </div>
            <div className="absolute bottom-4 left-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur">
                {sourceName}
              </span>
            </div>
            <div className="absolute bottom-4 right-4 rounded-full bg-black/78 px-2.5 py-1 text-[12px] font-semibold text-white">
              {item.mediaLabel ?? "Video"}
            </div>
          </Link>

          <div className="flex min-w-0 flex-col p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                      meta.chipClass,
                    )}
                  >
                    <span className={cn("inline-flex size-4 items-center justify-center rounded-full", meta.iconClass)}>
                      <Icon className="size-2.5" />
                    </span>
                    {meta.label}
                  </span>
                  <Badge tone={item.isNew ? "accent" : "muted"}>{item.isNew ? "new" : "queued"}</Badge>
                  <Badge tone="muted">{isShortVideo ? "short-form" : "watchlist"}</Badge>
                  {item.entityName ? <Badge tone="muted">{item.entityName}</Badge> : null}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#b42318] text-sm font-semibold text-white">
                    {sourceName.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-950">{sourceName}</div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                      <span>{meta.sourceLabel}</span>
                      <span className="text-slate-300">•</span>
                      <span>{formatRelativeTime(item.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {actionButtons}
            </div>

            <div className="mt-4 min-w-0">
              <h3 className="text-lg font-semibold tracking-tight text-slate-950 md:text-[1.35rem]">{item.title}</h3>
              <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600">{item.excerpt}</p>
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-[#f1cece] pt-3">
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ backgroundColor: `${tag.color}18`, color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              <Link
                href={item.canonicalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-[#b42318] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#912018]"
              >
                {meta.actionLabel}
                <ExternalLink className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : isX ? (
        <div className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.8)]">
                {sourceName.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                      meta.chipClass,
                    )}
                  >
                    <span className={cn("inline-flex size-4 items-center justify-center rounded-full", meta.iconClass)}>
                      <Icon className="size-2.5" />
                    </span>
                    {meta.label}
                  </span>
                  <Badge tone={item.isNew ? "accent" : "muted"}>{item.isNew ? "new" : "queued"}</Badge>
                  {item.entityName ? <Badge tone="muted">{item.entityName}</Badge> : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-semibold text-slate-950">{sourceName}</span>
                  <span className="text-slate-400">@{sourceHandle}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">{formatRelativeTime(item.publishedAt)}</span>
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-[15px] leading-7 text-slate-950">{item.title}</p>
                  <p className="line-clamp-2 text-[14px] leading-6 text-slate-600">{item.excerpt}</p>
                </div>
              </div>
            </div>
            {actionButtons}
          </div>

          <div className="mt-4 flex items-center gap-6 border-y border-black/6 py-3 text-[13px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="size-3.5" />
              {compactNumber(socialCounts?.replies ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Repeat2 className="size-3.5" />
              {compactNumber(socialCounts?.reposts ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="size-3.5" />
              {compactNumber(socialCounts?.likes ?? 0)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: `${tag.color}16`, color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
            <Link
              href={item.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-slate-700"
            >
              {meta.actionLabel}
              <ExternalLink className="size-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                  meta.chipClass,
                )}
              >
                <span className={cn("inline-flex size-4 items-center justify-center rounded-full", meta.iconClass)}>
                  <Icon className="size-2.5" />
                </span>
                {meta.label}
              </span>
              <Badge tone={item.isNew ? "accent" : "muted"}>{item.isNew ? "new" : "queued"}</Badge>
              {item.entityName ? <Badge tone="muted">{item.entityName}</Badge> : null}
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span className="text-slate-400">{meta.sourceLabel}</span>
                {sourceName}
              </div>
              <h3 className="mt-2 text-base font-semibold tracking-tight text-slate-950 md:text-lg">{item.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{item.excerpt}</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/6 pt-3">
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ backgroundColor: `${tag.color}18`, color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span>{formatRelativeTime(item.publishedAt)}</span>
                <Link
                  href={item.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-[color:var(--accent-strong)]"
                >
                  {meta.actionLabel}
                  <ExternalLink className="size-4" />
                </Link>
              </div>
            </div>
          </div>
          <div className="opacity-100 transition md:opacity-70 md:group-hover:opacity-100">{actionButtons}</div>
        </div>
      )}
    </Card>
  );
}
