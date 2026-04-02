import { buildDashboardFeedResponse } from "@/lib/dashboard-feed-response";

export async function POST(request: Request) {
  return buildDashboardFeedResponse(request);
}
