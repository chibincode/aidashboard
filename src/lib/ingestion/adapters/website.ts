import * as cheerio from "cheerio";
import type { SourceRecord } from "@/lib/domain";
import { getSourceExtractorProfile, isGallerySource } from "@/lib/source-normalization";
import type { SourceAdapterResult } from "@/lib/ingestion/types";

function parseA1GalleryHtml(source: SourceRecord, html: string): SourceAdapterResult {
  const $ = cheerio.load(html);
  const items = $("article.website_item")
    .slice(0, 12)
    .map((_, node) => {
      const root = $(node);
      if (root.hasClass("is-advert")) {
        return null;
      }

      const link = root.find("a.card-overlay-link").first();
      const href = link.attr("href");
      const title = link.attr("aria-label")?.trim();
      const image = root.find("img").first();
      const thumbnailUrl = image.attr("src") ?? image.attr("data-src") ?? null;
      const canonicalUrl = href ? new URL(href, source.url).toString() : null;

      if (!title || !canonicalUrl || !thumbnailUrl) {
        return null;
      }

      return {
        title,
        excerpt: `${title} featured on A1 Gallery.`,
        canonicalUrl,
        publishedAt: new Date(),
        contentType: "article" as const,
        authorName: null,
        thumbnailUrl,
        fingerprint: `${source.id}:${canonicalUrl}`.toLowerCase(),
      };
    })
    .get()
    .filter(Boolean);

  return {
    adapter: "website",
    warnings: items.length === 0 ? ["No A1 Gallery entries matched the configured card selector."] : [],
    items,
  };
}

export function parseWebsiteHtml(source: SourceRecord, html: string): SourceAdapterResult {
  const extractorProfile = getSourceExtractorProfile(source);

  if (extractorProfile === "a1-gallery-home") {
    return parseA1GalleryHtml(source, html);
  }

  const $ = cheerio.load(html);
  const listSelector = String(source.config.listSelector ?? "article");
  const items = $(listSelector)
    .slice(0, 12)
    .map((_, node) => {
      const root = $(node);
      const title = root.find("h1, h2, h3, [data-title]").first().text().trim() || root.text().trim().slice(0, 80);
      const href = root.find("a").first().attr("href");
      const excerpt = root.find("p").first().text().trim();
      const dateAttr = root.find("time").first().attr("datetime");
      const thumbnailUrl =
        root.find("img").first().attr("src") ??
        root.find("img").first().attr("data-src") ??
        null;
      const canonicalUrl = href ? new URL(href, source.url).toString() : source.url;

      return {
        title: title || "Untitled update",
        excerpt,
        canonicalUrl,
        publishedAt: dateAttr ? new Date(dateAttr) : new Date(),
        contentType: (source.config.itemType as "article" | "update" | undefined) ?? "article",
        authorName: null,
        thumbnailUrl,
        fingerprint: isGallerySource(source) ? `${source.id}:${canonicalUrl}`.toLowerCase() : undefined,
      };
    })
    .get();

  return {
    adapter: "website",
    warnings: items.length === 0 ? ["No entries matched the configured selector."] : [],
    items,
  };
}

export async function fetchWebsiteItems(source: SourceRecord) {
  const response = await fetch(source.url, {
    headers: {
      "User-Agent": "SignalDeckBot/1.0",
    },
    next: {
      revalidate: 0,
    },
  });

  const html = await response.text();
  return parseWebsiteHtml(source, html);
}
