import { appConfig } from "@/lib/env";
import { Badge } from "@/components/ui/badge";

export function AdminModeNote() {
  if (!appConfig.isDemoMode) {
    return null;
  }

  return (
    <div className="mb-5 rounded-[24px] border border-dashed border-black/10 bg-white/70 p-4 text-sm text-slate-600">
      <div className="mb-2 flex items-center gap-2">
        <Badge tone="muted">Demo mode</Badge>
        Admin pages are fully wired, but mutations stay read-only until `DATABASE_URL` is configured.
      </div>
      Connect Neon/Postgres, run `npm run db:push`, then `npm run db:seed` to switch this control room from preview to live editing.
    </div>
  );
}
