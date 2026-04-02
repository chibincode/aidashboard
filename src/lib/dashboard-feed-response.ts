import { NextResponse } from "next/server";
import { z } from "zod";
import type { DashboardFilters } from "@/lib/domain";
import { normalizeDashboardFilters, normalizeDashboardPage } from "@/lib/filters";
import { getDashboardSnapshot } from "@/lib/repositories/app-repository";

const requestSchema = z
  .object({
    filters: z
      .object({
        view: z.string().optional(),
        entity: z.string().optional(),
        tag: z.string().optional(),
        sourceType: z.string().optional(),
        unreadOnly: z.boolean().optional(),
        savedOnly: z.boolean().optional(),
      })
      .optional(),
    page: z.number().optional(),
  })
  .optional();

export async function buildDashboardFeedResponse(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => undefined));
  const filters = normalizeDashboardFilters(body?.filters as Partial<DashboardFilters> | undefined);
  const page = normalizeDashboardPage(body?.page);
  const snapshot = await getDashboardSnapshot(filters, {
    page,
    includeOverview: false,
  });

  return NextResponse.json({
    activeView: snapshot.activeView,
    allItems: snapshot.allItems,
    feedItems: snapshot.feedItems,
    pagination: snapshot.pagination,
  });
}
