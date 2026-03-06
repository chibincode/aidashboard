import { AppShell } from "@/components/app-shell";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell
      pathname="/admin"
      title="Control room for sources, entities, tags and automation rules."
      subtitle="Keep the deck maintainable without code edits. Bind sources to competitors, shape the taxonomy, and prepare ingestion logic for live updates."
    >
      {children}
    </AppShell>
  );
}
