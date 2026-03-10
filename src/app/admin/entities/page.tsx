import { SettingsPageShell } from "@/components/settings/settings-page-shell";
import { getAdminSnapshot } from "@/lib/repositories/app-repository";

export default async function EntitiesPage() {
  const snapshot = await getAdminSnapshot();

  return <SettingsPageShell activeTab="entities" snapshot={snapshot} />;
}
