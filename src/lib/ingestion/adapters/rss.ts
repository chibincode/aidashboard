import Parser from "rss-parser";
import type { SourceRecord } from "@/lib/domain";
import type { SourceAdapterResult } from "@/lib/ingestion/types";

const parser = new Parser();

export async function fetchRssItems(source: SourceRecord): Promise<SourceAdapterResult> {
  const feed = await parser.parseURL(source.url);

  return {
    adapter: "rss",
    warnings: [],
    items: (feed.items ?? []).map((item) => ({
      title: item.title ?? "Untitled update",
      excerpt: item.contentSnippet ?? item.content ?? "",
      canonicalUrl: item.link ?? source.url,
      publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
      contentType: (source.config.itemType as "article" | "update" | undefined) ?? "article",
      authorName: item.creator ?? null,
      thumbnailUrl: null,
    })),
  };
}
