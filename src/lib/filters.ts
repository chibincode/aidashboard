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
