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
  toggleCategoryAction,
  toggleRuleAction,
  toggleSourceAction,
  toggleTagAction,
  updateEntityAction,
  updateCategoryAction,
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
import { appConfig } from "@/lib/env";
import type { AdminSnapshot, SettingsTabId } from "@/lib/domain";

function SettingsSectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function SettingsModeNote() {
  if (!appConfig.isDemoMode) {
    return null;
  }

  return (
    <div className="mb-4 rounded-[20px] border border-dashed border-black/10 bg-black/[0.015] px-4 py-3 text-xs leading-6 text-slate-500">
      Demo mode is read-only until <code>DATABASE_URL</code> is configured.
    </div>
  );
}

export function SourcesSettingsSection({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <div>
      <SettingsSectionHeader title="Sources" description="Inputs, priorities, refresh cadence." />
      <SettingsModeNote />
      <SourcesSettingsPanel
        snapshot={snapshot}
        canManageSources={appConfig.hasDatabase}
        isDemoMode={appConfig.isDemoMode}
        createAction={createSourceAction}
        updateAction={updateSourceAction}
        toggleAction={toggleSourceAction}
        deleteAction={deleteSourceAction}
      />
    </div>
  );
}

export function EntitiesSettingsSection({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <div>
      <SettingsSectionHeader title="Entities" description="Tracked topics, competitors, products." />
      <SettingsModeNote />
      <EntitiesSettingsPanel
        snapshot={snapshot}
        canManageEntities={appConfig.hasDatabase}
        createAction={createEntityAction}
        updateAction={updateEntityAction}
        deleteAction={deleteEntityAction}
      />
    </div>
  );
}

export function TagsSettingsSection({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <div>
      <SettingsSectionHeader title="Tags" description="Taxonomy for slicing the feed." />
      <SettingsModeNote />
      <TagsSettingsPanel
        snapshot={snapshot}
        canManageTags={appConfig.hasDatabase}
        createAction={createTagAction}
        updateAction={updateTagAction}
        toggleAction={toggleTagAction}
        deleteAction={deleteTagAction}
      />
    </div>
  );
}

export function CategoriesSettingsSection({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <div>
      <SettingsSectionHeader title="Categories" description="Configurable homepage groupings driven by your taxonomy." />
      <SettingsModeNote />
      <CategoriesSettingsPanel
        snapshot={snapshot}
        canManageCategories={appConfig.hasDatabase}
        createAction={createCategoryAction}
        updateAction={updateCategoryAction}
        toggleAction={toggleCategoryAction}
        deleteAction={deleteCategoryAction}
      />
    </div>
  );
}

export function RulesSettingsSection({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <div>
      <SettingsSectionHeader title="Rules" description="Simple auto-tagging logic." />
      <SettingsModeNote />
      <RulesSettingsPanel
        snapshot={snapshot}
        canManageRules={appConfig.hasDatabase}
        createAction={createRuleAction}
        toggleAction={toggleRuleAction}
        deleteAction={deleteRuleAction}
      />
    </div>
  );
}

export function renderSettingsSection(tab: SettingsTabId, snapshot: AdminSnapshot) {
  switch (tab) {
    case "sources":
      return <SourcesSettingsSection snapshot={snapshot} />;
    case "entities":
      return <EntitiesSettingsSection snapshot={snapshot} />;
    case "tags":
      return <TagsSettingsSection snapshot={snapshot} />;
    case "categories":
      return <CategoriesSettingsSection snapshot={snapshot} />;
    case "rules":
      return <RulesSettingsSection snapshot={snapshot} />;
  }
}
