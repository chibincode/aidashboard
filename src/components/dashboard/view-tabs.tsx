"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DashboardView } from "@/lib/domain";
import { cn } from "@/lib/utils";

const tabs: Array<{ value: DashboardView; label: string }> = [
  { value: "all", label: "All" },
  { value: "ai-ux-ui", label: "AI UX/UI" },
  { value: "competitor-watch", label: "Competitor Watch" },
  { value: "industry-signals", label: "Industry Signals" },
  { value: "saved", label: "Saved" },
];

export function DashboardViewTabs({ activeView }: { activeView: DashboardView }) {
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
