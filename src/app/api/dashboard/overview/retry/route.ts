import { buildDashboardOverviewResponse } from "@/lib/dashboard-overview-response";

export async function POST(request: Request) {
  return buildDashboardOverviewResponse(request, true);
}
