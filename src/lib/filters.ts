import type { DashboardFilters, SourceType } from "@/lib/domain";
import { sourceTypes } from "@/lib/domain";

type SearchParamValue = string | string[] | undefined;

function takeFirst(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDashboardFilters(params: Record<string, SearchParamValue>): DashboardFilters {
  const view = takeFirst(params.view);
  const sourceType = takeFirst(params.sourceType);
  const unreadOnly = takeFirst(params.unread) === "1";
  const savedOnly = takeFirst(params.saved) === "1";

  return {
    view: view || undefined,
    entity: takeFirst(params.entity) || undefined,
    tag: takeFirst(params.tag) || undefined,
    sourceType:
      sourceType && sourceTypes.includes(sourceType as SourceType)
        ? (sourceType as SourceType)
        : undefined,
    unreadOnly,
    savedOnly,
  };
}

export function parseDashboardFiltersFromSearchParams(searchParams: URLSearchParams): DashboardFilters {
  return parseDashboardFilters(Object.fromEntries(searchParams.entries()));
}

export function createDashboardSearchParams(filters: DashboardFilters) {
  const params = new URLSearchParams();

  if (filters.view && filters.view !== "all") {
    params.set("view", filters.view);
  }

  if (filters.entity) {
    params.set("entity", filters.entity);
  }

  if (filters.tag) {
    params.set("tag", filters.tag);
  }

  if (filters.sourceType) {
    params.set("sourceType", filters.sourceType);
  }

  if (filters.unreadOnly) {
    params.set("unread", "1");
  }

  if (filters.savedOnly) {
    params.set("saved", "1");
  }

  return params;
}

export function serializeDashboardFilters(filters: DashboardFilters) {
  return createDashboardSearchParams(filters).toString();
}
