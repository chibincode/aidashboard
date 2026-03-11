"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import {
  Bookmark,
  CheckCheck,
  ExternalLink,
  Heart,
  History,
  ImageIcon,
  MessageCircle,
  Newspaper,
  PlayCircle,
  Radio,
  Repeat2,
  Eye,
} from "lucide-react";
import type { DashboardItem, SocialMetrics } from "@/lib/domain";
import { setItemReadAction, toggleSavedAction } from "@/actions/item-state";
import { FeedDetailModal } from "@/components/dashboard/feed-detail-modal";
import { SourceAvatar } from "@/components/dashboard/source-avatar";
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
    accentClass: "text-[#b42318]",
    avatarClass: "bg-[#b42318] text-white",
    ctaClass: "bg-[#b42318] text-white hover:bg-[#912018]",
  },
  x: {
    label: "X",
    sourceLabel: "Account",
    actionLabel: "Open post",
    chipClass: "bg-slate-950 text-white",
    iconClass: "bg-slate-950 text-white",
    frameClass: "border-slate-300 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.98))]",
    accentClass: "text-slate-950",
    avatarClass: "bg-slate-950 text-white",
    ctaClass: "text-slate-900 hover:text-slate-700",
  },
  website: {
    label: "Website",
    sourceLabel: "Source",
    actionLabel: "Open source",
    chipClass: "bg-[#eef6f2] text-[#166a5c] ring-1 ring-[#197d71]/12",
    iconClass: "bg-[#e4f3ef] text-[#166a5c]",
    frameClass: "",
    accentClass: "text-[#166a5c]",
    avatarClass: "bg-[#e4f3ef] text-[#166a5c]",
    ctaClass: "text-slate-900 hover:text-[color:var(--accent-strong)]",
  },
  rss: {
    label: "Feed",
    sourceLabel: "Feed",
    actionLabel: "Open source",
    chipClass: "bg-[#fff6e8] text-[#9a6700] ring-1 ring-[#d97706]/12",
    iconClass: "bg-[#fff1d6] text-[#9a6700]",
    frameClass: "",
    accentClass: "text-[#9a6700]",
    avatarClass: "bg-[#fff1d6] text-[#9a6700]",
    ctaClass: "text-slate-900 hover:text-[color:var(--accent-strong)]",
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

  return getDisplaySourceName(item)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getFallbackSocialCounts(item: DashboardItem): SocialMetrics {
  const seed = [...item.id].reduce((total, char, index) => total + char.charCodeAt(0) * (index + 3), 0);

  return {
    replies: 4 + (seed % 36),
    reposts: seed % 14,
    likes: 12 + (seed % 420),
    views: 400 + (seed % 24_000),
    bookmarks: 3 + (seed % 360),
  };
}

function getResolvedSocialCounts(item: DashboardItem) {
  return {
    ...getFallbackSocialCounts(item),
    ...item.socialMetrics,
  };
}

function TagPills({ item }: { item: DashboardItem }) {
  return (
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
  );
}

export function FeedCard({ item }: { item: DashboardItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [detailOpen, setDetailOpen] = useState(false);
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
  const socialCounts = isX ? getResolvedSocialCounts(item) : null;
  const durationSeconds = parseDurationSeconds(item.mediaLabel);
  const isShortVideo = isYouTube && (item.canonicalUrl.includes("/shorts/") || (durationSeconds !== null && durationSeconds < 90));
  const isXVideo = item.sourceType === "x" && item.mediaKind === "video";
  const isXImage = item.sourceType === "x" && item.mediaKind === "image";
  const isWebsiteInspiration =
    Boolean(item.thumbnailUrl) &&
    (item.sourceType === "website" || item.sourceType === "rss") &&
    item.tags.some((tag) => tag.slug === "website-inspiration");
  const actionLabel = isWebsiteInspiration ? "Open review" : meta.actionLabel;

  function setReadValue(nextValue: boolean) {
    startTransition(async () => {
      updateOptimistic({ isRead: nextValue });
      await setItemReadAction(item.id, nextValue);
      router.refresh();
    });
  }

  function setSavedValue(nextValue: boolean) {
    startTransition(async () => {
      updateOptimistic({ isSaved: nextValue });
      await toggleSavedAction(item.id, nextValue);
      router.refresh();
    });
  }

  function renderStateButtons(className?: string) {
    return (
      <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
        <Button
          variant={optimistic.isRead ? "secondary" : "primary"}
          size="sm"
          disabled={isPending}
          onClick={() => setReadValue(!optimistic.isRead)}
        >
          <CheckCheck className="size-3.5" />
          {optimistic.isRead ? "Unread" : "Read"}
        </Button>
        <Button
          variant={optimistic.isSaved ? "primary" : "secondary"}
          size="sm"
          disabled={isPending}
          onClick={() => setSavedValue(!optimistic.isSaved)}
        >
          <Bookmark className="size-3.5" />
          {optimistic.isSaved ? "Saved" : "Save"}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card
        className={cn(
          "group overflow-hidden rounded-[24px] border transition hover:border-black/10 hover:bg-white hover:shadow-[0_16px_40px_-32px_rgba(11,31,43,0.5)]",
          meta.frameClass,
          optimistic.isRead
            ? "border-black/6 bg-white/72"
            : "border-[color:var(--accent-soft)] bg-white/92 shadow-[0_12px_30px_-28px_rgba(11,31,43,0.32)]",
        )}
      >
        {isYouTube ? (
          <div>
            <button type="button" className="block w-full text-left" onClick={() => setDetailOpen(true)}>
              <div className="relative overflow-hidden bg-slate-950">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="aspect-video h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="aspect-video w-full bg-[radial-gradient(circle_at_top,#ef5350,transparent_42%),linear-gradient(135deg,#7f1d1d,#ef4444)]" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_30%,rgba(15,23,42,0.48)_100%)]" />
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
                  <span className="inline-flex size-14 items-center justify-center rounded-full bg-black/58 text-white backdrop-blur-sm transition duration-300 group-hover:scale-110">
                    <PlayCircle className="size-8 fill-current" />
                  </span>
                </div>
                <div className="absolute bottom-4 right-4 rounded-full bg-black/80 px-2.5 py-1 text-[12px] font-semibold text-white">
                  {item.mediaLabel ?? "Video"}
                </div>
              </div>
            </button>

            <div className="flex items-start gap-3 p-4 md:p-5">
              <button type="button" className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={() => setDetailOpen(true)}>
                <SourceAvatar
                  src={item.authorAvatarUrl}
                  name={sourceName}
                  className="size-11"
                  fallbackClassName={meta.avatarClass}
                />
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-[17px] font-semibold leading-6 tracking-tight text-slate-950">{item.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                    <span className="font-medium text-slate-700">{sourceName}</span>
                    <span suppressHydrationWarning>{formatRelativeTime(item.publishedAt)}</span>
                    <span>{meta.label}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.excerpt}</p>
                </div>
              </button>

              {renderStateButtons("shrink-0 flex-col items-end")}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f1cece] px-4 pb-4 pt-3 md:px-5 md:pb-5">
              <TagPills item={item} />
              <Link
                href={item.canonicalUrl}
                target="_blank"
                rel="noreferrer"
                className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition", meta.ctaClass)}
              >
                {meta.actionLabel}
                <ExternalLink className="size-4" />
              </Link>
            </div>
          </div>
        ) : isX ? (
          <div className="p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <button type="button" className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={() => setDetailOpen(true)}>
                <SourceAvatar
                  src={item.authorAvatarUrl}
                  name={sourceName}
                  className="size-11"
                  fallbackClassName={meta.avatarClass}
                />
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
                    {item.entityName ? <Badge tone="muted">{item.entityName}</Badge> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-semibold text-slate-950">{sourceName}</span>
                    <span className="text-slate-400">@{sourceHandle}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500" suppressHydrationWarning>
                      {formatRelativeTime(item.publishedAt)}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="text-[15px] leading-7 text-slate-950">{item.title}</p>
                    <p className="line-clamp-2 text-[14px] leading-6 text-slate-600">{item.excerpt}</p>
                  </div>
                </div>
              </button>

              {renderStateButtons("shrink-0 flex-col items-end")}
            </div>

            {item.thumbnailUrl ? (
              <button
                type="button"
                className="mt-4 block w-full overflow-hidden rounded-[22px] border border-black/8 bg-slate-950 text-left shadow-[0_20px_48px_-36px_rgba(15,23,42,0.55)] transition hover:shadow-[0_22px_56px_-34px_rgba(15,23,42,0.62)]"
                onClick={() => setDetailOpen(true)}
              >
                <div className="relative">
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className={cn("w-full", isXVideo ? "aspect-video object-cover" : "max-h-[520px] object-contain bg-slate-50")}
                  />
                  <div className="absolute left-4 top-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                      {isXVideo ? <PlayCircle className="size-3.5" /> : <ImageIcon className="size-3.5" />}
                      {isXVideo ? "Video post" : isXImage ? "Image post" : "Media post"}
                    </span>
                  </div>
                </div>
              </button>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-6 border-y border-black/6 py-3 text-[13px] text-slate-500">
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
              <span className="inline-flex items-center gap-1.5">
                <Eye className="size-3.5" />
                {compactNumber(socialCounts?.views ?? 0)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Bookmark className="size-3.5" />
                {compactNumber(socialCounts?.bookmarks ?? 0)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <TagPills item={item} />
              <Link
                href={item.canonicalUrl}
                target="_blank"
                rel="noreferrer"
                className={cn("inline-flex items-center gap-1 text-sm font-semibold transition", meta.ctaClass)}
              >
                {meta.actionLabel}
                <ExternalLink className="size-4" />
              </Link>
            </div>
          </div>
        ) : isWebsiteInspiration ? (
          <div>
            <button type="button" className="block w-full text-left" onClick={() => setDetailOpen(true)}>
              <div className="relative overflow-hidden bg-slate-100">
                <img
                  src={item.thumbnailUrl ?? ""}
                  alt=""
                  className="aspect-[1.24/1] h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_38%,rgba(15,23,42,0.18)_100%)]" />
                <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                      meta.chipClass,
                    )}
                  >
                    <span className={cn("inline-flex size-4 items-center justify-center rounded-full", meta.iconClass)}>
                      <Icon className="size-2.5" />
                    </span>
                    Website Inspiration
                  </span>
                  <Badge tone={item.isNew ? "accent" : "muted"}>{item.isNew ? "new" : "queued"}</Badge>
                </div>
              </div>
            </button>

            <div className="p-4 md:p-5">
              <div className="flex gap-4">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDetailOpen(true)}>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <span className="text-slate-400">{meta.sourceLabel}</span>
                    <span>{sourceName}</span>
                    <span suppressHydrationWarning>{formatRelativeTime(item.publishedAt)}</span>
                  </div>
                  <h3 className="mt-3 text-[17px] font-semibold leading-6 tracking-tight text-slate-950">{item.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.excerpt}</p>
                </button>

                {renderStateButtons("opacity-100 transition md:opacity-70 md:group-hover:opacity-100")}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/6 pt-3">
                <TagPills item={item} />
                <Link
                  href={item.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn("inline-flex items-center gap-1 font-semibold transition", meta.ctaClass)}
                >
                  {actionLabel}
                  <ExternalLink className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex gap-4">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDetailOpen(true)}>
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
              </button>

              {renderStateButtons("opacity-100 transition md:opacity-70 md:group-hover:opacity-100")}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/6 pt-3">
              <TagPills item={item} />
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span suppressHydrationWarning>{formatRelativeTime(item.publishedAt)}</span>
                <Link
                  href={item.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn("inline-flex items-center gap-1 font-semibold transition", meta.ctaClass)}
                >
                  {actionLabel}
                  <ExternalLink className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </Card>

      <FeedDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        item={item}
        sourceName={sourceName}
        sourceHandle={sourceHandle}
        socialCounts={socialCounts}
        isShortVideo={isShortVideo}
        isXVideo={isXVideo}
        actionButtons={renderStateButtons()}
      />
    </>
  );
}
