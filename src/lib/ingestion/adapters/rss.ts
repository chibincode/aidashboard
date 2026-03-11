import * as cheerio from "cheerio";
import Parser from "rss-parser";
import type { SourceRecord } from "@/lib/domain";
import { getSourceExtractorProfile, isGallerySource } from "@/lib/source-normalization";
import type { SourceAdapterResult } from "@/lib/ingestion/types";

const parser = new Parser();

function getImageUrlFromHtml(html?: string | null) {
  if (!html) {
    return null;
  }

  const $ = cheerio.load(html);
  const image = $("img").first();
  return image.attr("src") ?? image.attr("data-src") ?? null;
}

function getExcerptFromHtml(html?: string | null) {
  if (!html) {
    return "";
  }

  const $ = cheerio.load(html);
  return $.text().replace(/\s+/g, " ").trim();
}

export async function fetchRssItems(source: SourceRecord): Promise<SourceAdapterResult> {
  const feed = await parser.parseURL(source.url);
  const extractorProfile = getSourceExtractorProfile(source);
  const gallerySource = isGallerySource(source);

  return {
    adapter: "rss",
    warnings: [],
    items: (feed.items ?? []).map((item) => {
      const rawItem = item as Record<string, unknown>;
      const rawHtml =
        typeof rawItem["content:encoded"] === "string"
          ? rawItem["content:encoded"]
          : typeof item.content === "string"
            ? item.content
            : typeof rawItem.summary === "string"
              ? rawItem.summary
              : null;
      const canonicalUrl = item.link ?? source.url;
      const excerpt =
        item.contentSnippet?.trim() ||
        getExcerptFromHtml(rawHtml) ||
        item.content?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ||
        "";

      return {
        title: item.title ?? "Untitled update",
        excerpt,
        canonicalUrl,
        publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
        contentType: (source.config.itemType as "article" | "update" | undefined) ?? "article",
        authorName: item.creator ?? null,
        thumbnailUrl: getImageUrlFromHtml(rawHtml),
        fingerprint:
          gallerySource || extractorProfile === "gallery-rss"
            ? `${source.id}:${canonicalUrl}`.toLowerCase()
            : undefined,
      };
    }),
  };
}
