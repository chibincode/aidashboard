"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Bookmark, CheckCheck, ExternalLink, History, Newspaper, PlayCircle, Radio } from "lucide-react";
import type { DashboardItem } from "@/lib/domain";
import { setItemReadAction, toggleSavedAction } from "@/actions/item-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatRelativeTime } from "@/lib/utils";

const contentTypeIcon = {
  article: Newspaper,
  video: PlayCircle,
  post: Radio,
  update: History,
};

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

  return (
    <Card
      className={cn(
        "group border p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_60px_-34px_rgba(11,31,43,0.4)]",
        optimistic.isRead ? "border-black/6 bg-white/80" : "border-[color:var(--accent-soft)] bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={item.isNew ? "accent" : "muted"}>{item.isNew ? "new" : "queued"}</Badge>
            <Badge tone="muted">{item.sourceType}</Badge>
            {item.entityName ? <Badge tone="muted">{item.entityName}</Badge> : null}
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Icon className="size-3.5" />
              {item.sourceName}
            </div>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">{item.excerpt}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
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
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/6 pt-4">
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
            Open source
            <ExternalLink className="size-4" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
