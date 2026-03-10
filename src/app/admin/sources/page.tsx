import { SettingsPageShell } from "@/components/settings/settings-page-shell";
import { getAdminSnapshot } from "@/lib/repositories/app-repository";

export default async function SourcesPage() {
  const snapshot = await getAdminSnapshot();

  return <SettingsPageShell activeTab="sources" snapshot={snapshot} />;
}
