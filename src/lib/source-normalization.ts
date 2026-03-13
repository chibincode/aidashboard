import type {
  GallerySourceConfig,
  GenericSourceConfig,
  SourceConfig,
  SourceExtractorProfile,
  SourceRecord,
  SourceType,
  XSourceConfig,
  YouTubeSourceConfig,
} from "@/lib/domain";

const CHANNEL_ID_PATTERN = /^UC[\w-]{20,}$/;

export const WEBSITE_INSPIRATION_TAG_SLUG = "website-inspiration";

export class SourceValidationError extends Error {
  constructor(
    message: string,
    readonly field: "name" | "url" | "extractorProfile" = "url",
  ) {
    super(message);
    this.name = "SourceValidationError";
  }
}

export interface NormalizeSourceInput {
  type: SourceType;
  url: string;
  extractorProfile?: SourceExtractorProfile | "";
  existingSource?: Pick<SourceRecord, "type" | "url" | "config"> | null;
  fetchImpl?: typeof fetch;
}

function buildYouTubeFeedUrl(channelId: string) {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

function buildYouTubeChannelUrl(channelId: string) {
  return `https://www.youtube.com/channel/${channelId}`;
}

function normalizeUrlValue(url: string) {
  return url.trim();
}

function isFeedPath(url: URL) {
  return url.hostname === "www.youtube.com" && url.pathname === "/feeds/videos.xml";
}

function isChannelPath(pathname: string) {
  return pathname.startsWith("/channel/");
}

function getHandleFromPath(pathname: string) {
  const trimmedPath = pathname.replace(/\/+$/, "");
  if (!trimmedPath.startsWith("/@")) {
    return null;
  }

  const handle = trimmedPath.slice(2);
  return handle && !handle.includes("/") ? handle : null;
}

function assertValidHttpsUrl(url: string) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new SourceValidationError("Enter a valid URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new SourceValidationError("Use an https:// URL.");
  }

  return parsed;
}

function assertValidYouTubeUrl(url: string) {
  const parsed = assertValidHttpsUrl(url);

  if (parsed.hostname !== "www.youtube.com" && parsed.hostname !== "youtube.com") {
    throw new SourceValidationError(
      "Use a YouTube feed URL, /channel/ URL, or /@handle URL.",
    );
  }

  if (parsed.hostname === "youtube.com") {
    parsed.hostname = "www.youtube.com";
  }

  return parsed;
}

function assertValidXUrl(url: string) {
  const parsed = assertValidHttpsUrl(url);

  if (!["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(parsed.hostname)) {
    throw new SourceValidationError("Use an X profile URL like https://x.com/handle.");
  }

  return parsed;
}

function getHandleFromXPath(pathname: string) {
  const trimmedPath = pathname.replace(/\/+$/, "");
  const segments = trimmedPath.split("/").filter(Boolean);

  if (segments.length !== 1) {
    return null;
  }

  const handle = segments[0]?.replace(/^@/, "");
  if (!handle || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return null;
  }

  return handle;
}

function buildYouTubeConfig(
  channelId: string,
  inputUrl: string,
  options?: { handleUrl?: string },
): YouTubeSourceConfig {
  const channelUrl = buildYouTubeChannelUrl(channelId);

  return {
    feedUrl: buildYouTubeFeedUrl(channelId),
    channelId,
    channelUrl,
    handleUrl: options?.handleUrl,
    inputUrl,
    itemType: "video",
  };
}

function buildXConfig(inputUrl: string, handle: string, existingConfig?: Record<string, unknown>): XSourceConfig {
  return {
    ...(existingConfig ?? {}),
    handle,
    rssUrl: `https://nitter.net/${handle}/rss`,
    inputUrl,
    handleUrl: `https://x.com/${handle}`,
    itemType: "post",
  };
}

function extractYouTubeChannelIdFromHtml(html: string) {
  const patterns = [
    /"channelId":"(UC[\w-]{20,})"/,
    /"externalId":"(UC[\w-]{20,})"/,
    /<link[^>]+rel="canonical"[^>]+href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{20,})"/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function buildGenericSourceConfig(
  input: NormalizeSourceInput,
): GenericSourceConfig | GallerySourceConfig {
  const preservedConfig =
    input.existingSource?.type === input.type
      ? ((input.existingSource.config ?? {}) as GenericSourceConfig)
      : {};

  const profile =
    input.extractorProfile ||
    (typeof preservedConfig.extractorProfile === "string"
      ? preservedConfig.extractorProfile
      : undefined);

  if (input.type === "rss") {
    return {
      ...preservedConfig,
      extractorProfile: profile === "gallery-rss" ? "gallery-rss" : "generic-rss",
      itemType: "article",
    };
  }

  if (input.type === "website") {
    if (profile === "a1-gallery-home") {
      return {
        ...preservedConfig,
        extractorProfile: "a1-gallery-home",
        itemType: "article",
      };
    }

    const fallbackConfig: GenericSourceConfig = {
      ...preservedConfig,
      itemType:
        preservedConfig.itemType === "update"
          ? "update"
          : "article",
    };

    delete fallbackConfig.extractorProfile;
    return fallbackConfig;
  }

  return preservedConfig;
}

export function getSourceExtractorProfile(
  source: Pick<SourceRecord, "config" | "type">,
): SourceExtractorProfile | null {
  const config = (source.config ?? {}) as Record<string, unknown>;
  const profile = typeof config.extractorProfile === "string" ? config.extractorProfile : null;

  if (profile === "generic-rss" || profile === "gallery-rss" || profile === "a1-gallery-home") {
    return profile;
  }

  if (source.type === "rss") {
    return "generic-rss";
  }

  return null;
}

export function isGalleryExtractorProfile(profile: SourceExtractorProfile | null | undefined) {
  return profile === "gallery-rss" || profile === "a1-gallery-home";
}

export function isGallerySource(
  source: Pick<SourceRecord, "config" | "type">,
) {
  return isGalleryExtractorProfile(getSourceExtractorProfile(source));
}

export function shouldAutoApplyWebsiteInspirationTag(
  source: Pick<SourceRecord, "config" | "type"> | { type: SourceType; config: SourceConfig },
) {
  return source.type === "rss" || source.type === "website"
    ? isGallerySource(source as Pick<SourceRecord, "config" | "type">)
    : false;
}

export async function normalizeYouTubeSourceInput(
  rawUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ url: string; config: YouTubeSourceConfig }> {
  const normalizedUrl = normalizeUrlValue(rawUrl);

  if (!normalizedUrl) {
    throw new SourceValidationError("URL is required.");
  }

  const parsedUrl = assertValidYouTubeUrl(normalizedUrl);

  if (isFeedPath(parsedUrl)) {
    const channelId = parsedUrl.searchParams.get("channel_id");
    if (!channelId || !CHANNEL_ID_PATTERN.test(channelId)) {
      throw new SourceValidationError("YouTube feed URL must include a valid channel_id.");
    }

    return {
      url: buildYouTubeChannelUrl(channelId),
      config: buildYouTubeConfig(channelId, normalizedUrl),
    };
  }

  if (isChannelPath(parsedUrl.pathname)) {
    const channelId = parsedUrl.pathname.split("/")[2] ?? "";
    if (!CHANNEL_ID_PATTERN.test(channelId)) {
      throw new SourceValidationError("Use a valid YouTube /channel/ URL.");
    }

    const channelUrl = buildYouTubeChannelUrl(channelId);
    return {
      url: channelUrl,
      config: buildYouTubeConfig(channelId, normalizedUrl),
    };
  }

  const handle = getHandleFromPath(parsedUrl.pathname);
  if (!handle) {
    throw new SourceValidationError(
      "Use a YouTube feed URL, /channel/ URL, or /@handle URL.",
    );
  }

  const handleUrl = `https://www.youtube.com/@${handle}`;
  const response = await fetchImpl(handleUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new SourceValidationError("Could not resolve that YouTube handle.");
  }

  const html = await response.text();
  const channelId = extractYouTubeChannelIdFromHtml(html);

  if (!channelId) {
    throw new SourceValidationError(
      "Could not resolve that YouTube handle. Use a feed URL, /channel/ URL, or a public /@handle.",
    );
  }

  return {
    url: handleUrl,
    config: buildYouTubeConfig(channelId, normalizedUrl, { handleUrl }),
  };
}

function coerceLegacyYouTubeConfig(
  source: Pick<SourceRecord, "url" | "config">,
): YouTubeSourceConfig | null {
  const config = (source.config ?? {}) as Record<string, unknown>;
  const feedUrl = typeof config.feedUrl === "string" ? config.feedUrl : null;
  const channelId = typeof config.channelId === "string" ? config.channelId : null;
  const channelUrl = typeof config.channelUrl === "string" ? config.channelUrl : null;
  const inputUrl = typeof config.inputUrl === "string" ? config.inputUrl : source.url;
  const handleUrl =
    typeof config.handleUrl === "string"
      ? config.handleUrl
      : source.url.includes("/@")
        ? source.url
        : undefined;

  if (feedUrl && channelId && channelUrl) {
    return {
      feedUrl,
      channelId,
      channelUrl,
      handleUrl,
      inputUrl,
      itemType: "video",
    };
  }

  if (!feedUrl) {
    return null;
  }

  try {
    const parsedFeed = new URL(feedUrl);
    const derivedChannelId = parsedFeed.searchParams.get("channel_id");
    if (!derivedChannelId || !CHANNEL_ID_PATTERN.test(derivedChannelId)) {
      return null;
    }

    return {
      feedUrl: buildYouTubeFeedUrl(derivedChannelId),
      channelId: derivedChannelId,
      channelUrl: buildYouTubeChannelUrl(derivedChannelId),
      handleUrl,
      inputUrl,
      itemType: "video",
    };
  } catch {
    return null;
  }
}

export function getYouTubeSourceConfig(
  source: Pick<SourceRecord, "url" | "config">,
): YouTubeSourceConfig | null {
  return coerceLegacyYouTubeConfig(source);
}

function coerceLegacyXConfig(
  source: Pick<SourceRecord, "url" | "config">,
): XSourceConfig | null {
  const config = (source.config ?? {}) as Record<string, unknown>;
  const handle = typeof config.handle === "string" ? config.handle.replace(/^@/, "") : null;
  const rssUrl = typeof config.rssUrl === "string" ? config.rssUrl : null;
  const inputUrl = typeof config.inputUrl === "string" ? config.inputUrl : source.url;
  const handleUrl =
    typeof config.handleUrl === "string"
      ? config.handleUrl
      : handle
        ? `https://x.com/${handle}`
        : undefined;

  if (handle && rssUrl) {
    return {
      ...config,
      handle,
      rssUrl,
      inputUrl,
      handleUrl,
      itemType: "post",
    };
  }

  try {
    return normalizeXSourceInput(source.url, {
      type: "x",
      config,
    }).config;
  } catch {
    return null;
  }
}

export function getXSourceConfig(
  source: Pick<SourceRecord, "url" | "config">,
): XSourceConfig | null {
  return coerceLegacyXConfig(source);
}

export function normalizeXSourceInput(
  rawUrl: string,
  existingSource?: Pick<SourceRecord, "type" | "config"> | null,
): { url: string; config: XSourceConfig } {
  const normalizedUrl = normalizeUrlValue(rawUrl);

  if (!normalizedUrl) {
    throw new SourceValidationError("URL is required.");
  }

  const parsedUrl = assertValidXUrl(normalizedUrl);
  const handle = getHandleFromXPath(parsedUrl.pathname);

  if (!handle) {
    throw new SourceValidationError("Use an X profile URL like https://x.com/handle.");
  }

  const existingConfig =
    existingSource?.type === "x" ? ((existingSource.config ?? {}) as Record<string, unknown>) : undefined;

  return {
    url: `https://x.com/${handle}`,
    config: buildXConfig(normalizedUrl, handle, existingConfig),
  };
}

export async function normalizeSourceInput(
  input: NormalizeSourceInput,
): Promise<{ url: string; config: SourceConfig }> {
  const normalizedUrl = normalizeUrlValue(input.url);

  if (!normalizedUrl) {
    throw new SourceValidationError("URL is required.");
  }

  if (input.type === "youtube") {
    return normalizeYouTubeSourceInput(normalizedUrl, input.fetchImpl);
  }

  if (input.type === "x") {
    return normalizeXSourceInput(normalizedUrl, input.existingSource);
  }

  assertValidHttpsUrl(normalizedUrl);

  return {
    url: normalizedUrl,
    config: buildGenericSourceConfig(input),
  };
}
