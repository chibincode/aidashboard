import Parser from "rss-parser";
import type { SourceRecord } from "@/lib/domain";
import type { SourceAdapterResult } from "@/lib/ingestion/types";

const parser = new Parser();

export async function fetchYouTubeItems(source: SourceRecord): Promise<SourceAdapterResult> {
  const feedUrl = String(source.config.feedUrl ?? source.url);
  const feed = await parser.parseURL(feedUrl);

  return {
    adapter: "youtube",
    warnings: [],
    items: (feed.items ?? []).map((item) => ({
      title: item.title ?? "Untitled video",
      excerpt: item.contentSnippet ?? item.content ?? "",
      canonicalUrl: item.link ?? source.url,
      publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
      contentType: "video",
      authorName: item.creator ?? source.name,
      thumbnailUrl: null,
    })),
  };
}
