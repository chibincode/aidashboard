"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings2, X } from "lucide-react";
import {
  createCategoryAction,
  createEntityAction,
  createRuleAction,
  createSourceAction,
  createTagAction,
  deleteCategoryAction,
  deleteEntityAction,
  deleteRuleAction,
  deleteSourceAction,
  deleteTagAction,
  getAdminSnapshotAction,
  toggleCategoryAction,
  toggleRuleAction,
  toggleSourceAction,
  toggleTagAction,
  updateCategoryAction,
  updateEntityAction,
  updateSourceAction,
  updateTagAction,
} from "@/actions/admin";
import {
  EntitiesSettingsPanel,
  RulesSettingsPanel,
  TagsSettingsPanel,
} from "@/components/settings/basic-settings-panels";
import { CategoriesSettingsPanel } from "@/components/settings/categories-settings-panel";
import { SourcesSettingsPanel } from "@/components/settings/sources-settings-panel";
import { Button } from "@/components/ui/button";
import type { AdminSnapshot, SettingsTabId } from "@/lib/domain";
import { settingsTabs } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function SettingsDialog({
  defaultTab = "sources",
  isDemoMode = false,
}: {
  defaultTab?: SettingsTabId;
  isDemoMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTabId>(defaultTab);
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const refreshSnapshot = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const nextSnapshot = await getAdminSnapshotAction();
      setSnapshot(nextSnapshot);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  function openDialog() {
    setActiveTab(defaultTab);
    setOpen(true);
    if (!snapshot && !isLoading) {
      void refreshSnapshot();
    }
  }

  function renderPanel() {
    if (isLoading && !snapshot) {
      return (
        <div className="rounded-[24px] border border-black/8 bg-white px-5 py-8 text-sm text-slate-500 shadow-[0_12px_34px_-30px_rgba(12,23,32,0.3)]">
          Loading settings…
        </div>
      );
    }

    if (loadError && !snapshot) {
      return (
        <div className="grid gap-4 rounded-[24px] border border-[#fecaca] bg-[#fff5f5] px-5 py-6 text-sm text-[#991b1b] shadow-[0_12px_34px_-30px_rgba(12,23,32,0.3)]">
          <p>{loadError}</p>
          <div>
            <Button type="button" variant="secondary" onClick={() => void refreshSnapshot()} disabled={isLoading}>
              Retry
            </Button>
          </div>
        </div>
      );
    }

    if (!snapshot) {
      return null;
    }

    const headerByTab: Record<SettingsTabId, { title: string; description: string }> = {
      sources: { title: "Sources", description: "Inputs, priorities, refresh cadence." },
      entities: { title: "Entities", description: "Tracked topics, competitors, products." },
      tags: { title: "Tags", description: "Taxonomy for slicing the feed." },
      categories: { title: "Categories", description: "Configurable homepage groupings driven by your taxonomy." },
      rules: { title: "Rules", description: "Simple auto-tagging logic." },
    };
    const section = headerByTab[activeTab];

    let panel: React.ReactNode;

    switch (activeTab) {
      case "sources":
        panel = (
          <SourcesSettingsPanel
            snapshot={snapshot}
            canManageSources
            isDemoMode={isDemoMode}
            createAction={createSourceAction}
            updateAction={updateSourceAction}
            toggleAction={toggleSourceAction}
            deleteAction={deleteSourceAction}
            onDataChange={refreshSnapshot}
          />
        );
        break;
      case "entities":
        panel = (
          <EntitiesSettingsPanel
            snapshot={snapshot}
            canManageEntities
            createAction={createEntityAction}
            updateAction={updateEntityAction}
            deleteAction={deleteEntityAction}
            onDataChange={refreshSnapshot}
          />
        );
        break;
      case "tags":
        panel = (
          <TagsSettingsPanel
            snapshot={snapshot}
            canManageTags
            createAction={createTagAction}
            updateAction={updateTagAction}
            toggleAction={toggleTagAction}
            deleteAction={deleteTagAction}
            onDataChange={refreshSnapshot}
          />
        );
        break;
      case "categories":
        panel = (
          <CategoriesSettingsPanel
            snapshot={snapshot}
            canManageCategories
            createAction={createCategoryAction}
            updateAction={updateCategoryAction}
            toggleAction={toggleCategoryAction}
            deleteAction={deleteCategoryAction}
            onDataChange={refreshSnapshot}
          />
        );
        break;
      case "rules":
        panel = (
          <RulesSettingsPanel
            snapshot={snapshot}
            canManageRules
            createAction={createRuleAction}
            toggleAction={toggleRuleAction}
            deleteAction={deleteRuleAction}
            onDataChange={refreshSnapshot}
          />
        );
        break;
    }

    return (
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">{section.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{section.description}</p>
        </div>
        {panel}
      </div>
    );
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

                <div className="min-h-0 overflow-y-auto p-4 md:p-5">{renderPanel()}</div>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}
