import { createTagAction, deleteTagAction, toggleTagAction } from "@/actions/admin";
import { AdminModeNote } from "@/components/admin/admin-mode-note";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { appConfig } from "@/lib/env";
import { getAdminSnapshot } from "@/lib/repositories/app-repository";

export default async function TagsPage() {
  const snapshot = await getAdminSnapshot();

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
      <section>
        <SectionHeading
          eyebrow="Tags"
          title="Shape a two-level taxonomy"
          description="Use tags for topic slicing, competitor clustering and future automation. Parent tags provide the first layer; children sharpen the signal."
        />
        <AdminModeNote />
        <Card className="p-5">
          <form action={createTagAction} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Name
              <Input name="name" placeholder="Feature Launch" disabled={!appConfig.hasDatabase} required />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Parent tag
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
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Color
              <Input name="color" type="color" defaultValue="#197d71" disabled={!appConfig.hasDatabase} />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="isActive" defaultChecked disabled={!appConfig.hasDatabase} />
              Active
            </label>
            <Button type="submit" disabled={!appConfig.hasDatabase}>
              Create tag
            </Button>
          </form>
        </Card>
      </section>

      <section className="grid gap-4">
        {snapshot.tags.map((tag) => {
          const parent = snapshot.tags.find((entry) => entry.id === tag.parentId);
          return (
            <Card key={tag.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={tag.isActive ? "accent" : "muted"}>{tag.isActive ? "active" : "paused"}</Badge>
                    {parent ? <Badge tone="muted">Parent: {parent.name}</Badge> : null}
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-slate-950">{tag.name}</h3>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
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
            </Card>
          );
        })}
      </section>
    </div>
  );
}
