import { inngest } from "@/inngest/client";
import { syncSourceById } from "@/lib/ingestion/sync";
import { listActiveSourcesForIngestion } from "@/lib/repositories/app-repository";

export const scheduleSourceSync = inngest.createFunction(
  { id: "schedule-source-sync" },
  { cron: "*/30 * * * *" },
  async ({ step }) => {
    const sources = await step.run("load-sources", () => listActiveSourcesForIngestion());

    await Promise.all(
      sources.map((source) =>
        step.sendEvent("fanout-source-sync", {
          name: "signal/source.sync",
          data: { sourceId: source.id },
        }),
      ),
    );

    return { sourceCount: sources.length };
  },
);

export const syncSingleSource = inngest.createFunction(
  { id: "sync-single-source" },
  { event: "signal/source.sync" },
  async ({ event, step }) => {
    return step.run("run-source-ingestion", () => syncSourceById(String(event.data.sourceId)));
  },
);

export const inngestFunctions = [scheduleSourceSync, syncSingleSource];
