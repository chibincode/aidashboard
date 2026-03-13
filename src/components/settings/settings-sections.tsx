import {
  createEntityAction,
  createRuleAction,
  createSourceAction,
  createTagAction,
  deleteEntityAction,
  deleteRuleAction,
  deleteSourceAction,
  deleteTagAction,
  toggleRuleAction,
  toggleSourceAction,
  toggleTagAction,
  updateSourceAction,
} from "@/actions/admin";
import { SourcesSettingsPanel } from "@/components/settings/sources-settings-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

function SettingsColumnCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`rounded-[24px] border-black/8 bg-white p-5 shadow-[0_12px_34px_-30px_rgba(12,23,32,0.3)] ${className ?? ""}`}
    >
      {children}
    </Card>
  );
}

function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ${className ?? ""}`}>{children}</span>;
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

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SettingsColumnCard>
          <form action={createEntityAction} className="grid gap-4">
            <div className="grid gap-1.5">
              <FieldLabel>Name</FieldLabel>
              <Input name="name" placeholder="Company or topic name" disabled={!appConfig.hasDatabase} required />
            </div>

            <label className="grid gap-1.5">
              <FieldLabel>Kind</FieldLabel>
              <Select name="kind" defaultValue="competitor" disabled={!appConfig.hasDatabase}>
                <option value="topic">Topic</option>
                <option value="competitor">Competitor</option>
                <option value="product">Product</option>
              </Select>
            </label>

            <label className="grid gap-1.5">
              <FieldLabel>Description</FieldLabel>
              <Textarea name="description" placeholder="What do you want to track here?" disabled={!appConfig.hasDatabase} />
            </label>

            <label className="grid gap-1.5">
              <FieldLabel>Accent</FieldLabel>
              <Input name="color" type="color" defaultValue="#197d71" disabled={!appConfig.hasDatabase} />
            </label>

            <Button type="submit" disabled={!appConfig.hasDatabase}>
              Add entity
            </Button>
          </form>
        </SettingsColumnCard>

        <div className="grid gap-3">
          {snapshot.entities.map((entity) => (
            <SettingsColumnCard key={entity.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="muted">{entity.kind}</Badge>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entity.color }} />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{entity.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{entity.description}</p>
                </div>
                <form action={deleteEntityAction}>
                  <input type="hidden" name="id" value={entity.id} />
                  <Button type="submit" variant="danger" disabled={!appConfig.hasDatabase}>
                    Delete
                  </Button>
                </form>
              </div>
            </SettingsColumnCard>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TagsSettingsSection({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <div>
      <SettingsSectionHeader title="Tags" description="Taxonomy for slicing the feed." />
      <SettingsModeNote />

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SettingsColumnCard>
          <form action={createTagAction} className="grid gap-4">
            <label className="grid gap-1.5">
              <FieldLabel>Name</FieldLabel>
              <Input name="name" placeholder="Feature launch" disabled={!appConfig.hasDatabase} required />
            </label>

            <label className="grid gap-1.5">
              <FieldLabel>Parent</FieldLabel>
              <Select name="parentId" defaultValue="" disabled={!appConfig.hasDatabase}>
                <option value="">No parent</option>
                {snapshot.tags
                  .filter((tag) => !tag.parentId)
                  .map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
              </Select>
            </label>

            <label className="grid gap-1.5">
              <FieldLabel>Color</FieldLabel>
              <Input name="color" type="color" defaultValue="#197d71" disabled={!appConfig.hasDatabase} />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="isActive" defaultChecked disabled={!appConfig.hasDatabase} />
              Active
            </label>

            <Button type="submit" disabled={!appConfig.hasDatabase}>
              Add tag
            </Button>
          </form>
        </SettingsColumnCard>

        <div className="grid gap-3">
          {snapshot.tags.map((tag) => {
            const parent = snapshot.tags.find((entry) => entry.id === tag.parentId);
            return (
              <SettingsColumnCard key={tag.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={tag.isActive ? "accent" : "muted"}>{tag.isActive ? "active" : "paused"}</Badge>
                      {parent ? <Badge tone="muted">{parent.name}</Badge> : null}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{tag.name}</h3>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.slug}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <form action={toggleTagAction}>
                      <input type="hidden" name="id" value={tag.id} />
                      <input type="hidden" name="isActive" value={String(!tag.isActive)} />
                      <Button type="submit" variant="secondary" disabled={!appConfig.hasDatabase}>
                        {tag.isActive ? "Pause" : "Enable"}
                      </Button>
                    </form>
                    <form action={deleteTagAction}>
                      <input type="hidden" name="id" value={tag.id} />
                      <Button type="submit" variant="danger" disabled={!appConfig.hasDatabase}>
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              </SettingsColumnCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function RulesSettingsSection({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <div>
      <SettingsSectionHeader title="Rules" description="Simple auto-tagging logic." />
      <SettingsModeNote />

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SettingsColumnCard>
          <form action={createRuleAction} className="grid gap-4">
            <label className="grid gap-1.5">
              <FieldLabel>Name</FieldLabel>
              <Input name="name" placeholder="Pricing motion" disabled={!appConfig.hasDatabase} required />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5">
                <FieldLabel>Scope</FieldLabel>
                <Select name="sourceId" defaultValue="" disabled={!appConfig.hasDatabase}>
                  <option value="">All sources</option>
                  {snapshot.sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-1.5">
                <FieldLabel>Priority</FieldLabel>
                <Input name="priority" type="number" defaultValue={50} disabled={!appConfig.hasDatabase} />
              </label>
            </div>

            <label className="grid gap-1.5">
              <FieldLabel>Keywords</FieldLabel>
              <Input name="keywords" placeholder="pricing, subscription, plan" disabled={!appConfig.hasDatabase} />
            </label>

            <label className="grid gap-1.5">
              <FieldLabel>URL Contains</FieldLabel>
              <Input name="urlContains" placeholder="/pricing, /release" disabled={!appConfig.hasDatabase} />
            </label>

            <div className="grid gap-2">
              <FieldLabel>Output Tags</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {snapshot.tags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-2 text-xs text-slate-700">
                    <input type="checkbox" name="tagIds" value={tag.id} disabled={!appConfig.hasDatabase} />
                    {tag.name}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="isActive" defaultChecked disabled={!appConfig.hasDatabase} />
              Enable immediately
            </label>

            <Button type="submit" disabled={!appConfig.hasDatabase}>
              Add rule
            </Button>
          </form>
        </SettingsColumnCard>

        <div className="grid gap-3">
          {snapshot.rules.map((rule) => {
            const tagNames = rule.actions.tagIds
              .map((tagId) => snapshot.tags.find((tag) => tag.id === tagId)?.name)
              .filter((name): name is string => Boolean(name));

            return (
              <SettingsColumnCard key={rule.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={rule.isActive ? "accent" : "muted"}>{rule.isActive ? "active" : "paused"}</Badge>
                      <Badge tone="muted">priority {rule.priority}</Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{rule.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Keywords: {(rule.conditions.keywords ?? []).join(", ") || "none"} · URL:{" "}
                      {(rule.conditions.urlContains ?? []).join(", ") || "none"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tagNames.map((name) => (
                        <Badge key={name} tone="muted">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <form action={toggleRuleAction}>
                      <input type="hidden" name="id" value={rule.id} />
                      <input type="hidden" name="isActive" value={String(!rule.isActive)} />
                      <Button type="submit" variant="secondary" disabled={!appConfig.hasDatabase}>
                        {rule.isActive ? "Pause" : "Enable"}
                      </Button>
                    </form>
                    <form action={deleteRuleAction}>
                      <input type="hidden" name="id" value={rule.id} />
                      <Button type="submit" variant="danger" disabled={!appConfig.hasDatabase}>
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              </SettingsColumnCard>
            );
          })}
        </div>
      </div>
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
    case "rules":
      return <RulesSettingsSection snapshot={snapshot} />;
  }
}
