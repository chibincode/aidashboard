import { Inngest } from "inngest";
import { appConfig } from "@/lib/env";

export const inngest = new Inngest({
  id: "signal-deck",
  name: appConfig.name,
});
