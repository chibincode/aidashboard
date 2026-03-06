import { createEntityAction, deleteEntityAction } from "@/actions/admin";
import { AdminModeNote } from "@/components/admin/admin-mode-note";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { appConfig } from "@/lib/env";
import { getAdminSnapshot } from "@/lib/repositories/app-repository";

export default async function EntitiesPage() {
  const snapshot = await getAdminSnapshot();

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
      <section>
        <SectionHeading
          eyebrow="Entities"
          title="Model topics and competitors"
          description="Entities are the anchor points for grouping items into AI UX/UI, competitor watch and product-specific streams."
        />
        <AdminModeNote />
        <Card className="p-5">
          <form action={createEntityAction} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Name
              <Input name="name" placeholder="Company or topic name" disabled={!appConfig.hasDatabase} required />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Kind
              <Select name="kind" defaultValue="competitor" disabled={!appConfig.hasDatabase}>
                <option value="topic">Topic</option>
                <option value="competitor">Competitor</option>
                <option value="product">Product</option>
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Description
              <Textarea name="description" placeholder="What do you want to track here?" disabled={!appConfig.hasDatabase} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Accent color
              <Input name="color" type="color" defaultValue="#197d71" disabled={!appConfig.hasDatabase} />
            </label>
            <Button type="submit" disabled={!appConfig.hasDatabase}>
              Create entity
            </Button>
          </form>
        </Card>
      </section>

      <section className="grid gap-4">
        {snapshot.entities.map((entity) => (
          <Card key={entity.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="muted">{entity.kind}</Badge>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entity.color }} />
                </div>
                <h3 className="mt-3 font-display text-2xl font-semibold text-slate-950">{entity.name}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{entity.description}</p>
              </div>
              <form action={deleteEntityAction}>
                <input type="hidden" name="id" value={entity.id} />
                <Button type="submit" variant="danger" disabled={!appConfig.hasDatabase}>
                  Delete
                </Button>
              </form>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
