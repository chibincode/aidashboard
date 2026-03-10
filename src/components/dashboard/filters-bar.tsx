"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Funnel } from "lucide-react";
import type { DashboardFilters, EntityRecord, TagRecord } from "@/lib/domain";
import { sourceTypes } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

export function DashboardFiltersBar({
  filters,
  tags,
  entities,
  layout = "toolbar",
}: {
  filters: DashboardFilters;
  tags: TagRecord[];
  entities: EntityRecord[];
  layout?: "toolbar" | "sidebar";
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
    <Card
      className={
        layout === "sidebar"
          ? "border-black/6 bg-white p-4 shadow-[0_10px_28px_-26px_rgba(12,23,32,0.18)]"
          : "mb-6 border-black/6 bg-white p-4 shadow-[0_10px_28px_-26px_rgba(12,23,32,0.18)]"
      }
    >
      <div className={layout === "sidebar" ? "flex flex-col gap-3" : "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"}>
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Funnel className="size-4" />
            Filters
          </div>
        </div>
        <div className={layout === "sidebar" ? "flex flex-wrap gap-2" : "flex flex-wrap gap-2"}>
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

      <div className={layout === "sidebar" ? "mt-4 grid gap-3" : "mt-4 grid gap-3 lg:grid-cols-3"}>
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
    </Card>
  );
}
