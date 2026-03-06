import Link from "next/link";
import { ArrowRight, BookType, Orbit, Tags, Workflow } from "lucide-react";
import { AdminModeNote } from "@/components/admin/admin-mode-note";
import { SectionHeading } from "@/components/admin/section-heading";
import { Card } from "@/components/ui/card";
import { getAdminSnapshot } from "@/lib/repositories/app-repository";

const cards = [
  {
    href: "/admin/sources",
    title: "Sources",
    description: "Add website, RSS, YouTube and X inputs, then tune priority, refresh cadence and tag defaults.",
    icon: Orbit,
  },
  {
    href: "/admin/entities",
    title: "Entities",
    description: "Define tracked topics, competitors and products so the deck groups signals correctly.",
    icon: BookType,
  },
  {
    href: "/admin/tags",
    title: "Tags",
    description: "Run a two-level taxonomy for product themes, categories and signals you want to compare over time.",
    icon: Tags,
  },
  {
    href: "/admin/rules",
    title: "Rules",
    description: "Auto-attach tags when titles, URLs or content types match your watch criteria.",
    icon: Workflow,
  },
];

export default async function AdminIndexPage() {
  const snapshot = await getAdminSnapshot();

  return (
    <div>
      <SectionHeading
        eyebrow="Workspace summary"
        title={snapshot.workspace.name}
        description="One place to maintain the watchlist logic that powers the dashboard. Every admin module is built to remove code edits from day-to-day curation."
      />
      <AdminModeNote />

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="h-full p-5 transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between">
                  <div className="rounded-2xl bg-[color:var(--accent-soft)] p-3 text-[color:var(--accent-strong)]">
                    <Icon className="size-5" />
                  </div>
                  <ArrowRight className="size-4 text-slate-400" />
                </div>
                <h3 className="mt-5 font-display text-2xl font-semibold text-slate-950">{card.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{card.description}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
