import type { DashboardView } from "@/lib/domain";

export const dashboardViewTabs: ReadonlyArray<{ value: DashboardView; label: string }> = [
  { value: "all", label: "All" },
  { value: "ai-ux-ui", label: "AI UX/UI" },
  { value: "website-inspiration", label: "Website Inspiration" },
  { value: "competitor-watch", label: "Competitor Watch" },
  { value: "industry-signals", label: "Industry Signals" },
  { value: "saved", label: "Saved" },
] as const;

const dashboardViewLabelMap = Object.fromEntries(
  dashboardViewTabs.map((tab) => [tab.value, tab.label]),
) as Record<DashboardView, string>;

export function getDashboardViewLabel(view: DashboardView) {
  return dashboardViewLabelMap[view];
}
