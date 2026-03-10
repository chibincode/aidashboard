import Link from "next/link";
import { renderSettingsSection } from "@/components/settings/settings-sections";
import type { AdminSnapshot, SettingsTabId } from "@/lib/domain";
import { settingsTabs } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function SettingsPageShell({
  activeTab,
  snapshot,
}: {
  activeTab: SettingsTabId;
  snapshot: AdminSnapshot;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-16 lg:self-start">
        <div className="px-2 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Settings</p>
        </div>
        <div className="flex flex-col gap-1">
          {settingsTabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "rounded-[18px] px-3 py-3 text-sm font-semibold transition",
                  active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-black/[0.035] hover:text-slate-950",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0">{renderSettingsSection(activeTab, snapshot)}</div>
    </section>
  );
}
