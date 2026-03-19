import { NextResponse } from "next/server";
import { z } from "zod";
import type { DashboardFilters } from "@/lib/domain";
import { normalizeDashboardFilters } from "@/lib/filters";
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
    force: z.boolean().optional(),
  })
  .optional();

export async function buildDashboardOverviewResponse(request: Request, force = false) {
  const body = requestSchema.parse(await request.json().catch(() => undefined));
  const filters = normalizeDashboardFilters(body?.filters as Partial<DashboardFilters> | undefined);
  const snapshot = await getDashboardSnapshot(filters, {
    forceOverview: force || body?.force === true,
  });

  return NextResponse.json({
    overview: snapshot.overview,
  });
}
