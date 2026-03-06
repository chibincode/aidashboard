import type { SourceRecord } from "@/lib/domain";
import { fetchRssItems } from "@/lib/ingestion/adapters/rss";

export async function fetchXItems(source: SourceRecord) {
  if (typeof source.config.rssUrl === "string" && source.config.rssUrl.length > 0) {
    return fetchRssItems({
      ...source,
      type: "rss",
      url: source.config.rssUrl,
    });
  }

  return {
    adapter: "x" as const,
    warnings: ["No RSS-compatible adapter configured for this X source."],
    items: [],
  };
}
