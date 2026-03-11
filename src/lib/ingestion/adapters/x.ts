import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as cheerio from "cheerio";
import type { SourceRecord } from "@/lib/domain";
import { env } from "@/lib/env";
import type { SourceAdapterResult } from "@/lib/ingestion/types";
import { fetchRssItems } from "@/lib/ingestion/adapters/rss";

const execFileAsync = promisify(execFile);

function parseCompactCount(value: string) {
  const cleaned = value.replace(/,/g, "").trim().toUpperCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([KMB])?$/);
  if (!match) {
    const fallback = Number(cleaned);
    return Number.isFinite(fallback) ? fallback : undefined;
  }

  const base = Number(match[1]);
  const multiplier =
    match[2] === "K" ? 1_000 : match[2] === "M" ? 1_000_000 : match[2] === "B" ? 1_000_000_000 : 1;

  return Math.round(base * multiplier);
}

function toExcerpt(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function toTitle(text: string) {
  const cleaned = toExcerpt(text);
  if (cleaned.length <= 88) {
    return cleaned;
  }

  return `${cleaned.slice(0, 85).trimEnd()}...`;
}

export function normalizeXProfileImageUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  return value.replace(/_normal(?=\.(jpg|jpeg|png|webp|gif)(?:$|\?))/i, "_400x400");
}

function parseRelativeTimestamp(value: string) {
  const cleaned = value.trim().toLowerCase();
  const now = Date.now();

  if (cleaned === "just now") {
    return new Date(now);
  }

  const match = cleaned.match(/^(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago$/);
  if (!match) {
    return new Date(now);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  } as const;

  return new Date(now - amount * multipliers[unit as keyof typeof multipliers]);
}

function getTwStalkerAvatarUrl($: cheerio.CheerioAPI, handle: string | null) {
  const selector = handle
    ? `img[alt='${handle} Profile Picture'], img[alt='@${handle} Profile Picture']`
    : "img[alt$='Profile Picture']";

  return normalizeXProfileImageUrl(
    $(selector).first().attr("src") ??
      $(".my-profile-dash img.img-thumbnail").first().attr("src") ??
      $("meta[property='og:image']").attr("content") ??
      null,
  );
}

async function fetchXProfileImageFromApi(handle: string) {
  if (!env.X_BEARER_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.x.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=profile_image_url`,
      {
        headers: {
          Authorization: `Bearer ${env.X_BEARER_TOKEN}`,
        },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      data?: {
        profile_image_url?: string;
      };
    };

    return normalizeXProfileImageUrl(payload.data?.profile_image_url ?? null);
  } catch {
    return null;
  }
}

function withAuthorAvatar(result: SourceAdapterResult, authorAvatarUrl: string | null): SourceAdapterResult {
  if (!authorAvatarUrl) {
    return result;
  }

  return {
    ...result,
    items: result.items.map((item) => ({
      ...item,
      authorAvatarUrl: item.authorAvatarUrl ?? authorAvatarUrl,
    })),
  };
}

export function parseTwStalkerHtml(source: SourceRecord, html: string): SourceAdapterResult {
  const $ = cheerio.load(html);
  const handle = typeof source.config.handle === "string" ? source.config.handle.replace(/^@/, "") : null;
  const authorAvatarUrl = getTwStalkerAvatarUrl($, handle);
  const items = $(".activity-posts")
    .slice(0, 8)
    .map((_, node) => {
      const root = $(node);
      const text = toExcerpt(root.find(".activity-descp > p").first().text());
      const detailHref = root.find('.like-comment-view a[href*="/status/"]').last().attr("href");
      const statusId = detailHref?.match(/status\/(\d+)/)?.[1];
      const timestampText = root.find('.user-text3 span a[href*="/status/"]').first().text();
      const authorName = toExcerpt(root.find(".user-text3 h4").first().contents().first().text()) || source.name.replace(/\s+X$/i, "");
      const poster = root.find("video[poster]").first().attr("poster");
      const image = root.find(".carousel-item img").first().attr("src");
      const metricValues = root
        .find(".left-comments .like-item span")
        .map((__, metric) => parseCompactCount($(metric).text()))
        .get();
      const canonicalUrl =
        handle && statusId
          ? `https://x.com/${handle}/status/${statusId}`
          : detailHref
            ? new URL(detailHref, `https://x.com/${handle ?? ""}/`).toString()
            : source.url;

      const mediaKind: "video" | "image" | null = poster ? "video" : image ? "image" : null;

      return {
        title: toTitle(text || "Untitled post"),
        excerpt: text,
        canonicalUrl,
        publishedAt: parseRelativeTimestamp(timestampText),
        contentType: "post" as const,
        authorName: authorName || null,
        authorAvatarUrl,
        thumbnailUrl: poster ?? image ?? null,
        mediaKind,
        socialMetrics: {
          replies: metricValues[0],
          reposts: metricValues[1],
          likes: metricValues[2],
          views: metricValues[3],
          bookmarks: metricValues[4],
        },
        fingerprint: statusId ? `${source.id}:${statusId}` : undefined,
      };
    })
    .get()
    .filter((item) => item.excerpt.length > 0);

  return {
    adapter: "x",
    warnings: items.length === 0 ? ["TwStalker returned no readable posts for this account."] : [],
    items,
  };
}

async function fetchTwStalkerItems(source: SourceRecord) {
  const handle = typeof source.config.handle === "string" ? source.config.handle.replace(/^@/, "") : null;
  if (!handle) {
    return null;
  }

  try {
    const { stdout } = await execFileAsync(
      "curl",
      [
        "-L",
        "--compressed",
        "-A",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        `https://twstalker.com/${handle}`,
      ],
      {
        encoding: "utf8",
        maxBuffer: 6 * 1024 * 1024,
        timeout: 15_000,
      },
    );

    return parseTwStalkerHtml(source, stdout);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown TwStalker error";

    return {
      adapter: "x" as const,
      warnings: [`TwStalker curl failed for @${handle}: ${message}`],
      items: [],
    };
  }
}

export async function fetchXItems(source: SourceRecord) {
  const twStalkerResult = await fetchTwStalkerItems(source);
  if (twStalkerResult && twStalkerResult.items.length > 0) {
    return twStalkerResult;
  }

  if (typeof source.config.rssUrl === "string" && source.config.rssUrl.length > 0) {
    const handle = typeof source.config.handle === "string" ? source.config.handle.replace(/^@/, "") : null;
    const authorAvatarUrl =
      (handle ? await fetchXProfileImageFromApi(handle) : null) ??
      (typeof source.config.avatarUrl === "string" ? normalizeXProfileImageUrl(source.config.avatarUrl) : null);

    const rssResult = await fetchRssItems({
      ...source,
      type: "rss",
      url: source.config.rssUrl,
    });

    return withAuthorAvatar(
      {
        adapter: "x" as const,
        warnings: twStalkerResult?.warnings ?? [],
        items: rssResult.items,
      },
      authorAvatarUrl,
    );
  }

  return {
    adapter: "x" as const,
    warnings: twStalkerResult?.warnings ?? ["No X adapter path configured for this source."],
    items: [],
  };
}
