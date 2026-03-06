import type { SourceRecord, TagRuleRecord } from "@/lib/domain";
import { dedupeIncomingItems } from "@/lib/ingestion/dedupe";
import { fetchRssItems } from "@/lib/ingestion/adapters/rss";
import { fetchWebsiteItems } from "@/lib/ingestion/adapters/website";
import { fetchXItems } from "@/lib/ingestion/adapters/x";
import { fetchYouTubeItems } from "@/lib/ingestion/adapters/youtube";
import { applyTagRules } from "@/lib/ingestion/rules";

export async function ingestSource(source: SourceRecord, rules: TagRuleRecord[]) {
  const result =
    source.type === "rss"
      ? await fetchRssItems(source)
      : source.type === "website"
        ? await fetchWebsiteItems(source)
        : source.type === "youtube"
          ? await fetchYouTubeItems(source)
          : await fetchXItems(source);

  const deduped = dedupeIncomingItems(result.items).map((item) => ({
    ...item,
    tagIds: applyTagRules(
      {
        ...item,
        tagIds: source.defaultTagIds,
      },
      rules.filter((rule) => !rule.sourceId || rule.sourceId === source.id),
    ),
  }));

  return {
    ...result,
    items: deduped,
  };
}
