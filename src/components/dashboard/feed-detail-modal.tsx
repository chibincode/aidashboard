"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Bookmark,
  ExternalLink,
  Eye,
  Heart,
  History,
  ImageIcon,
  MessageCircle,
  Newspaper,
  PlayCircle,
  Radio,
  Repeat2,
  X,
} from "lucide-react";
import type { DashboardItem, SocialMetrics } from "@/lib/domain";
import { SourceAvatar } from "@/components/dashboard/source-avatar";
import { resolveXDisplayText } from "@/components/dashboard/x-copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    actionLabel: "Watch on YouTube",
  },
  x: {
    label: "X",
    actionLabel: "Open on X",
  },
  website: {
    label: "Website",
    actionLabel: "Open source",
  },
  rss: {
    label: "Feed",
    actionLabel: "Open source",
  },
} as const;

function getYouTubeEmbedUrl(canonicalUrl: string) {
  try {
    const url = new URL(canonicalUrl);
    let videoId = "";

    if (url.hostname.includes("youtu.be")) {
      videoId = url.pathname.slice(1);
    } else if (url.pathname.startsWith("/shorts/")) {
      videoId = url.pathname.split("/")[2] ?? "";
    } else {
      videoId = url.searchParams.get("v") ?? "";
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : null;
  } catch {
    return null;
  }
}

function MediaPanel({
  item,
  sourceName,
  isShortVideo,
  isXVideo,
}: {
  item: DashboardItem;
  sourceName: string;
  isShortVideo: boolean;
  isXVideo: boolean;
}) {
  const embedUrl = item.sourceType === "youtube" ? getYouTubeEmbedUrl(item.canonicalUrl) : null;

  if (embedUrl) {
    return (
      <div className="overflow-hidden rounded-[24px] bg-black shadow-[0_20px_48px_-36px_rgba(15,23,42,0.65)]">
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      </div>
    );
  }

  if (item.thumbnailUrl) {
    return (
      <div className="overflow-hidden rounded-[24px] border border-black/8 bg-slate-950 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.5)]">
        <div className="relative">
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className={cn(
              "w-full",
              item.sourceType === "youtube" ? "aspect-video object-cover" : "max-h-[72vh] object-contain",
            )}
          />

          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/88 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
              {item.sourceType === "youtube" ? (
                <PlayCircle className="size-3.5" />
              ) : item.mediaKind === "video" ? (
                <PlayCircle className="size-3.5" />
              ) : (
                <ImageIcon className="size-3.5" />
              )}
              {item.sourceType === "youtube" ? (isShortVideo ? "Short" : "Video") : isXVideo ? "Video post" : "Image post"}
            </span>
          </div>

          {item.mediaLabel ? (
            <div className="absolute bottom-4 right-4 rounded-full bg-black/78 px-2.5 py-1 text-[12px] font-semibold text-white">
              {item.mediaLabel}
            </div>
          ) : null}
        </div>

        {item.sourceType === "x" && isXVideo ? (
          <div className="border-t border-white/10 px-4 py-3 text-sm text-slate-300">
            Preview available here. Open on X to keep watching the video.
          </div>
        ) : null}
      </div>
    );
  }

  const Icon = contentTypeIcon[item.contentType];

  return (
    <div className="flex aspect-video items-center justify-center rounded-[24px] border border-dashed border-black/10 bg-black/[0.02]">
      <div className="text-center">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-white text-slate-900 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.35)]">
          <Icon className="size-7" />
        </span>
        <p className="mt-4 text-base font-semibold text-slate-950">{sourceName}</p>
        <p className="mt-1 text-sm text-slate-500">No media preview available. Use the source link to continue.</p>
      </div>
    </div>
  );
}

export function FeedDetailModal({
  open,
  onClose,
  item,
  sourceName,
  sourceHandle,
  socialCounts,
  isShortVideo,
  isXVideo,
  actionButtons,
}: {
  open: boolean;
  onClose: () => void;
  item: DashboardItem;
  sourceName: string;
  sourceHandle: string;
  socialCounts: SocialMetrics | null;
  isShortVideo: boolean;
  isXVideo: boolean;
  actionButtons: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  const Icon = contentTypeIcon[item.contentType];
  const meta = sourceTypeMeta[item.sourceType];
  const hasMedia = item.sourceType === "youtube" || Boolean(item.thumbnailUrl);
  const xDisplayText = item.sourceType === "x" ? resolveXDisplayText(item) : null;
  const actionLabel =
    (item.sourceType === "website" || item.sourceType === "rss") &&
    item.tags.some((tag) => tag.slug === "website-inspiration")
      ? "Open review"
      : meta.actionLabel;

  return createPortal(
    <div className="fixed inset-0 z-50" aria-hidden={!open}>
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.2)] backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-full w-full items-stretch md:items-start md:justify-center md:p-8">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={`feed-detail-title-${item.id}`}
          className="flex h-full w-full flex-col overflow-hidden bg-[#f8f9fb] md:h-auto md:max-h-[calc(100vh-48px)] md:max-w-[1280px] md:rounded-[30px] md:border md:border-black/8 md:shadow-[0_36px_90px_-48px_rgba(15,23,42,0.55)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-black/6 px-4 py-4 md:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <SourceAvatar
                src={item.authorAvatarUrl}
                name={sourceName}
                className="mt-0.5 size-11"
                fallbackClassName={item.sourceType === "x" ? "bg-slate-950 text-white" : "bg-slate-200 text-slate-700"}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 ring-1 ring-black/8">
                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-slate-950 text-white">
                      <Icon className="size-2.5" />
                    </span>
                    {meta.label}
                  </span>
                  <Badge tone={item.isNew ? "accent" : "muted"}>{item.isNew ? "new" : "queued"}</Badge>
                  {item.entityName ? <Badge tone="muted">{item.entityName}</Badge> : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-semibold text-slate-950">{sourceName}</span>
                  {(item.sourceType === "x" || item.sourceType === "youtube") && sourceHandle ? (
                    <span className="text-slate-400">@{sourceHandle}</span>
                  ) : null}
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500" suppressHydrationWarning>
                    {formatRelativeTime(item.publishedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {actionButtons}
              <Button variant="ghost" size="sm" aria-label="Close details" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <div className={cn("grid gap-6", hasMedia ? "lg:grid-cols-[minmax(0,1.45fr)_420px]" : "")}>
              {hasMedia ? (
                <MediaPanel item={item} sourceName={sourceName} isShortVideo={isShortVideo} isXVideo={isXVideo} />
              ) : null}

              <div className="min-w-0">
                {item.sourceType === "x" ? (
                  <>
                    <p id={`feed-detail-title-${item.id}`} className="text-[17px] leading-8 text-slate-950 md:text-[1.2rem]">
                      {xDisplayText?.primaryText}
                    </p>
                    {xDisplayText?.secondaryText ? (
                      <p className="mt-4 text-[15px] leading-7 text-slate-600">{xDisplayText.secondaryText}</p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <h2
                      id={`feed-detail-title-${item.id}`}
                      className="text-2xl font-semibold tracking-tight text-slate-950 md:text-[2rem]"
                    >
                      {item.title}
                    </h2>

                    <p className="mt-4 text-[15px] leading-7 text-slate-600">{item.excerpt}</p>
                  </>
                )}

                {item.sourceType === "x" && socialCounts ? (
                  <div className="mt-5 flex flex-wrap items-center gap-5 border-y border-black/6 py-3 text-[13px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <MessageCircle className="size-3.5" />
                      {compactNumber(socialCounts.replies ?? 0)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Repeat2 className="size-3.5" />
                      {compactNumber(socialCounts.reposts ?? 0)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Heart className="size-3.5" />
                      {compactNumber(socialCounts.likes ?? 0)}
                    </span>
                    {socialCounts.views ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Eye className="size-3.5" />
                        {compactNumber(socialCounts.views)}
                      </span>
                    ) : null}
                    {socialCounts.bookmarks ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Bookmark className="size-3.5" />
                        {compactNumber(socialCounts.bookmarks)}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
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

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href={item.canonicalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full bg-slate-950 px-4 py-2 no-underline transition hover:bg-slate-800"
                  >
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-white">
                      {actionLabel}
                      <ExternalLink className="size-4 text-white" />
                    </span>
                  </Link>
                </div>

                {!hasMedia ? (
                  <div className="mt-6 rounded-[22px] border border-black/8 bg-white/75 p-4 text-sm text-slate-500">
                    This detail view is a preview. Use the source link for the full article or original thread.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
