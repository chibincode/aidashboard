import Parser from "rss-parser";
import type { SourceRecord } from "@/lib/domain";
import type { SourceAdapterResult } from "@/lib/ingestion/types";
import { getYouTubeSourceConfig } from "@/lib/source-normalization";

const parser = new Parser();

export async function fetchYouTubeItems(source: SourceRecord): Promise<SourceAdapterResult> {
  const config = getYouTubeSourceConfig(source);

  if (!config) {
    throw new Error("YouTube source is missing a validated feed URL.");
  }

  const feedUrl = config.feedUrl;
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
