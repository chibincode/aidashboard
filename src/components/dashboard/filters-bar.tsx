"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Funnel, Sparkles } from "lucide-react";
import type { DashboardFilters, EntityRecord, TagRecord } from "@/lib/domain";
import { sourceTypes } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

export function DashboardFiltersBar({
  filters,
  tags,
  entities,
}: {
  filters: DashboardFilters;
  tags: TagRecord[];
  entities: EntityRecord[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value?: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function toggleFlag(key: "saved" | "unread", enabled: boolean) {
    updateParam(key, enabled ? "1" : undefined);
  }

  return (
    <Card className="mb-6 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Funnel className="size-4" />
            Focus filters
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Slice the deck by entity, tag, source type or review state without losing section context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.unreadOnly ? "primary" : "secondary"}
            size="sm"
            onClick={() => toggleFlag("unread", !filters.unreadOnly)}
          >
            Unread only
          </Button>
          <Button
            variant={filters.savedOnly ? "primary" : "secondary"}
            size="sm"
            onClick={() => toggleFlag("saved", !filters.savedOnly)}
          >
            Saved only
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
            Clear
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Select
          value={filters.entity ?? ""}
          onChange={(event) => updateParam("entity", event.target.value || undefined)}
        >
          <option value="">All entities</option>
          {entities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </Select>
        <Select value={filters.tag ?? ""} onChange={(event) => updateParam("tag", event.target.value || undefined)}>
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </Select>
        <Select
          value={filters.sourceType ?? ""}
          onChange={(event) => updateParam("sourceType", event.target.value || undefined)}
        >
          <option value="">All source types</option>
          {sourceTypes.map((sourceType) => (
            <option key={sourceType} value={sourceType}>
              {sourceType.toUpperCase()}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Sparkles className="size-3.5" />
        Hover a card to mark it read or pin it into Saved.
      </div>
    </Card>
  );
}
