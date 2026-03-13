import type { CategoryRecord, DashboardView } from "@/lib/domain";

export function getDashboardViewTabs(categories: CategoryRecord[]) {
  return [
    { value: "all", label: "All" },
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
    { value: "saved", label: "Saved" },
  ] satisfies ReadonlyArray<{ value: DashboardView; label: string }>;
}

export function getDashboardViewLabel(view: DashboardView, categories: CategoryRecord[]) {
  return getDashboardViewTabs(categories).find((tab) => tab.value === view)?.label ?? "All";
}
