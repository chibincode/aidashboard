import { createRuleAction, deleteRuleAction, toggleRuleAction } from "@/actions/admin";
import { AdminModeNote } from "@/components/admin/admin-mode-note";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { appConfig } from "@/lib/env";
import { getAdminSnapshot } from "@/lib/repositories/app-repository";

export default async function RulesPage() {
  const snapshot = await getAdminSnapshot();

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
      <section>
        <SectionHeading
          eyebrow="Rules"
          title="Automate initial tagging"
          description="Rules are intentionally simple in v1: keywords, URL fragments, optional source scope and tag outputs."
        />
        <AdminModeNote />
        <Card className="p-5">
          <form action={createRuleAction} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Name
              <Input name="name" placeholder="Pricing motion" disabled={!appConfig.hasDatabase} required />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Source scope
                <Select name="sourceId" defaultValue="" disabled={!appConfig.hasDatabase}>
                  <option value="">All sources</option>
                  {snapshot.sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Priority
                <Input name="priority" type="number" defaultValue={50} disabled={!appConfig.hasDatabase} />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Keywords (comma separated)
              <Input name="keywords" placeholder="pricing, subscription, plan" disabled={!appConfig.hasDatabase} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              URL contains (comma separated)
              <Input name="urlContains" placeholder="/pricing, /release" disabled={!appConfig.hasDatabase} />
            </label>
            <div className="grid gap-2">
              <p className="text-sm font-medium text-slate-700">Output tags</p>
              <div className="flex flex-wrap gap-2">
                {snapshot.tags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-2 text-xs">
                    <input type="checkbox" name="tagIds" value={tag.id} disabled={!appConfig.hasDatabase} />
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
              Create rule
            </Button>
          </form>
        </Card>
      </section>

      <section className="grid gap-4">
        {snapshot.rules.map((rule) => {
          const tagNames = rule.actions.tagIds
            .map((tagId) => snapshot.tags.find((tag) => tag.id === tagId)?.name)
            .filter(Boolean);

          return (
            <Card key={rule.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={rule.isActive ? "accent" : "muted"}>{rule.isActive ? "active" : "paused"}</Badge>
                    <Badge tone="muted">priority {rule.priority}</Badge>
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-slate-950">{rule.name}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Keywords: {(rule.conditions.keywords ?? []).join(", ") || "none"} · URL fragments:{" "}
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
            </Card>
          );
        })}
      </section>
    </div>
  );
}
