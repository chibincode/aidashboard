"use client";

import type { DashboardView } from "@/lib/domain";
import { dashboardViewTabs } from "@/components/dashboard/view-meta";
import { cn } from "@/lib/utils";

export function DashboardViewTabs({
  activeView,
  layout = "row",
  onChange,
}: {
  activeView: DashboardView;
  layout?: "row" | "sidebar";
  onChange: (view: DashboardView) => void;
}) {
  if (layout === "sidebar") {
    return (
      <div>
        <div className="px-2 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Categories</p>
        </div>
        <div className="flex flex-col gap-1">
          {dashboardViewTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={activeView === tab.value}
              onClick={() => onChange(tab.value)}
              className={cn(
                "rounded-[18px] px-3 py-3 text-left text-sm font-semibold transition",
                activeView === tab.value
                  ? "bg-slate-950 text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]"
                  : "bg-transparent text-slate-700 hover:bg-black/[0.035]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {dashboardViewTabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          aria-pressed={activeView === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold transition",
            activeView === tab.value
              ? "bg-slate-950 text-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.7)]"
              : "bg-white/78 text-slate-700 ring-1 ring-black/8 hover:bg-white",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
