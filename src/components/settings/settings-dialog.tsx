"use client";

import { useEffect, useState } from "react";
import { Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SettingsTabId } from "@/lib/domain";
import { settingsTabs } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function SettingsDialog({
  defaultTab = "sources",
  sourcesPanel,
  entitiesPanel,
  tagsPanel,
  categoriesPanel,
  rulesPanel,
}: {
  defaultTab?: SettingsTabId;
  sourcesPanel: React.ReactNode;
  entitiesPanel: React.ReactNode;
  tagsPanel: React.ReactNode;
  categoriesPanel: React.ReactNode;
  rulesPanel: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTabId>(defaultTab);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const panels: Record<SettingsTabId, React.ReactNode> = {
    sources: sourcesPanel,
    entities: entitiesPanel,
    tags: tagsPanel,
    categories: categoriesPanel,
    rules: rulesPanel,
  };

  function openDialog() {
    setActiveTab(defaultTab);
    setOpen(true);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openDialog}>
        <Settings2 className="size-4" />
        Settings
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50" aria-hidden={!open}>
          <div className="absolute inset-0 bg-[rgba(15,23,42,0.18)] backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative flex h-full w-full items-stretch md:items-start md:justify-center md:p-8">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-dialog-title"
              className="flex h-full w-full flex-col overflow-hidden bg-[#f8f9fb] md:h-auto md:max-h-[calc(100vh-64px)] md:max-w-[1120px] md:rounded-[30px] md:border md:border-black/8 md:shadow-[0_36px_90px_-48px_rgba(15,23,42,0.55)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-black/6 px-4 py-3 md:px-5">
                <div>
                  <h2 id="settings-dialog-title" className="text-base font-semibold tracking-tight text-slate-950">
                    Settings
                  </h2>
                  <p className="text-sm text-slate-500">Sources, entities, tags, categories, rules.</p>
                </div>
                <Button variant="ghost" size="sm" aria-label="Close settings" onClick={() => setOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>

              <div className="border-b border-black/6 px-4 py-3 md:hidden">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {settingsTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition",
                        activeTab === tab.id
                          ? "bg-slate-950 text-white"
                          : "bg-white text-slate-600 ring-1 ring-black/8 hover:text-slate-950",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 md:grid md:grid-cols-[190px_minmax(0,1fr)]">
                <aside className="hidden border-r border-black/6 p-3 md:block">
                  <div className="px-2 pb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Settings</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {settingsTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "rounded-[18px] px-3 py-3 text-left text-sm font-semibold transition",
                          activeTab === tab.id
                            ? "bg-slate-950 text-white"
                            : "text-slate-600 hover:bg-black/[0.035] hover:text-slate-950",
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </aside>

                <div className="min-h-0 overflow-y-auto p-4 md:p-5">{panels[activeTab]}</div>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}
