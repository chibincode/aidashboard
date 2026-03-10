import { SettingsPageShell } from "@/components/settings/settings-page-shell";
import { getAdminSnapshot } from "@/lib/repositories/app-repository";

export default async function RulesPage() {
  const snapshot = await getAdminSnapshot();

  return <SettingsPageShell activeTab="rules" snapshot={snapshot} />;
}
