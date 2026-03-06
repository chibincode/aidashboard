import { createSourceAction, deleteSourceAction, toggleSourceAction } from "@/actions/admin";
import { AdminModeNote } from "@/components/admin/admin-mode-note";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getAdminSnapshot } from "@/lib/repositories/app-repository";
import { appConfig } from "@/lib/env";
import { formatRelativeTime } from "@/lib/utils";

export default async function SourcesPage() {
  const snapshot = await getAdminSnapshot();

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
      <section>
        <SectionHeading
          eyebrow="Sources"
          title="Add and tune inputs"
          description="Every source can be bound to an entity, assigned default tags, prioritized and toggled without leaving the app."
        />
        <AdminModeNote />
        <Card className="p-5">
          <form action={createSourceAction} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Name
                <Input name="name" placeholder="NavPro release notes" disabled={!appConfig.hasDatabase} required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Type
                <Select name="type" defaultValue="website" disabled={!appConfig.hasDatabase}>
                  <option value="website">Website</option>
                  <option value="rss">RSS / Atom</option>
                  <option value="youtube">YouTube</option>
                  <option value="x">X</option>
                </Select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              URL
              <Input name="url" placeholder="https://..." disabled={!appConfig.hasDatabase} required />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Entity
                <Select name="entityId" defaultValue="" disabled={!appConfig.hasDatabase}>
                  <option value="">Unassigned</option>
                  {snapshot.entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Priority
                <Input name="priority" type="number" min={0} max={100} defaultValue={70} disabled={!appConfig.hasDatabase} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Refresh (min)
                <Input
                  name="refreshMinutes"
                  type="number"
                  min={15}
                  max={240}
                  defaultValue={30}
                  disabled={!appConfig.hasDatabase}
                />
              </label>
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium text-slate-700">Default tags</p>
              <div className="flex flex-wrap gap-2">
                {snapshot.tags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-2 text-xs">
                    <input type="checkbox" name="defaultTagIds" value={tag.id} disabled={!appConfig.hasDatabase} />
                    {tag.name}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="isActive" defaultChecked disabled={!appConfig.hasDatabase} />
              Enable immediately
            </label>
            <Button type="submit" disabled={!appConfig.hasDatabase}>
              Create source
            </Button>
          </form>
        </Card>
      </section>

      <section className="space-y-4">
        {snapshot.sources.map((source) => (
          <Card key={source.id} className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={source.isActive ? "accent" : "muted"}>{source.isActive ? "active" : "paused"}</Badge>
                  <Badge tone={source.healthStatus === "healthy" ? "muted" : "danger"}>{source.healthStatus}</Badge>
                  <Badge tone="muted">{source.type}</Badge>
                </div>
                <h3 className="mt-3 font-display text-2xl font-semibold text-slate-950">{source.name}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{source.url}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {source.defaultTagIds.map((tagId) => {
                    const tag = snapshot.tags.find((entry) => entry.id === tagId);
                    return tag ? <Badge key={tag.id} tone="muted">{tag.name}</Badge> : null;
                  })}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Priority {source.priority} · refresh every {source.refreshMinutes} min · last fetched{" "}
                  {source.lastFetchedAt ? formatRelativeTime(source.lastFetchedAt) : "never"}
                </p>
                {source.lastErrorMessage ? <p className="mt-2 text-sm text-[#991b1b]">{source.lastErrorMessage}</p> : null}
              </div>
              <div className="flex gap-2">
                <form action={toggleSourceAction}>
                  <input type="hidden" name="id" value={source.id} />
                  <input type="hidden" name="isActive" value={String(!source.isActive)} />
                  <Button type="submit" variant="secondary" disabled={!appConfig.hasDatabase}>
                    {source.isActive ? "Pause" : "Enable"}
                  </Button>
                </form>
                <form action={deleteSourceAction}>
                  <input type="hidden" name="id" value={source.id} />
                  <Button type="submit" variant="danger" disabled={!appConfig.hasDatabase}>
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
