import * as cheerio from "cheerio";
import type { SourceRecord } from "@/lib/domain";
import type { SourceAdapterResult } from "@/lib/ingestion/types";

export function parseWebsiteHtml(source: SourceRecord, html: string): SourceAdapterResult {
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

      return {
        title: title || "Untitled update",
        excerpt,
        canonicalUrl: href ? new URL(href, source.url).toString() : source.url,
        publishedAt: dateAttr ? new Date(dateAttr) : new Date(),
        contentType: (source.config.itemType as "article" | "update" | undefined) ?? "article",
        authorName: null,
        thumbnailUrl: null,
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
