"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DashboardView } from "@/lib/domain";
import { cn } from "@/lib/utils";

const tabs: Array<{ value: DashboardView; label: string }> = [
  { value: "all", label: "All" },
  { value: "ai-ux-ui", label: "AI UX/UI" },
  { value: "website-inspiration", label: "Website Inspiration" },
  { value: "competitor-watch", label: "Competitor Watch" },
  { value: "industry-signals", label: "Industry Signals" },
  { value: "saved", label: "Saved" },
];

export function DashboardViewTabs({
  activeView,
  layout = "row",
}: {
  activeView: DashboardView;
  layout?: "row" | "sidebar";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setView(view: DashboardView) {
    const params = new URLSearchParams(searchParams.toString());

    if (view === "all") {
      params.delete("view");
    } else {
      params.set("view", view);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  if (layout === "sidebar") {
    return (
      <div>
        <div className="px-2 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Categories</p>
        </div>
        <div className="flex flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setView(tab.value)}
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
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => setView(tab.value)}
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
