import type { SourceExtractorProfile, SourceType } from "@/lib/domain";

export type SourcePriorityLevel = "low" | "medium" | "high";

const X_HOSTNAMES = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]);
const YOUTUBE_HOSTNAMES = new Set(["youtube.com", "www.youtube.com"]);
const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[\w-]{20,}$/;
const X_HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/;
const COMMON_SUBDOMAINS = new Set(["www", "app", "blog", "news", "feeds", "feed", "m"]);
const SECOND_LEVEL_TLDS = new Set(["co", "com", "org", "net", "gov", "edu"]);
const SPECIAL_BRAND_NAMES = new Map<string, string>([
  ["openai", "OpenAI"],
  ["nngroup", "NN Group"],
  ["onepagelove", "One Page Love"],
  ["ycombinator", "Y Combinator"],
  ["weareoffmenu", "We Are Off Menu"],
]);

export function detectSourceTypeFromUrl(urlValue: string): SourceType | null {
  const value = urlValue.trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.replace(/\/+$/, "");

    if (X_HOSTNAMES.has(hostname)) {
      const segments = pathname.split("/").filter(Boolean);
      const handle = segments[0]?.replace(/^@/, "") ?? "";

      if (segments.length === 1 && X_HANDLE_PATTERN.test(handle)) {
        return "x";
      }
    }

    if (YOUTUBE_HOSTNAMES.has(hostname)) {
      if (pathname === "/feeds/videos.xml") {
        const channelId = url.searchParams.get("channel_id");
        if (channelId && YOUTUBE_CHANNEL_ID_PATTERN.test(channelId)) {
          return "youtube";
        }
      }

      if (pathname.startsWith("/channel/")) {
        const channelId = pathname.split("/")[2] ?? "";
        if (YOUTUBE_CHANNEL_ID_PATTERN.test(channelId)) {
          return "youtube";
        }
      }

      if (pathname.startsWith("/@")) {
        const handle = pathname.slice(2);
        if (handle && !handle.includes("/")) {
          return "youtube";
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

function titleCaseWord(word: string) {
  if (!word) {
    return word;
  }

  if (/^[A-Z0-9]+$/.test(word) && word.length <= 4) {
    return word;
  }

  const lower = word.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function splitMixedToken(value: string) {
  return value.match(/[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+|[0-9]+/g) ?? [value];
}

function humanizeBrandToken(token: string) {
  const normalized = decodeURIComponent(token).replace(/^@/, "").trim();
  if (!normalized) {
    return "";
  }

  const specialCase = SPECIAL_BRAND_NAMES.get(normalized.toLowerCase());
  if (specialCase) {
    return specialCase;
  }

  const parts = normalized
    .replace(/[-_.]+/g, " ")
    .split(/\s+/)
    .flatMap((part) => splitMixedToken(part))
    .filter(Boolean);

  return parts.map(titleCaseWord).join(" ").trim();
}

function getRegistrableHostnameLabel(hostname: string) {
  const segments = hostname
    .toLowerCase()
    .split(".")
    .filter(Boolean);

  while (segments.length > 2 && COMMON_SUBDOMAINS.has(segments[0] ?? "")) {
    segments.shift();
  }

  if (segments.length >= 3 && SECOND_LEVEL_TLDS.has(segments[segments.length - 2] ?? "")) {
    return segments[segments.length - 3] ?? "";
  }

  return segments.length >= 2 ? (segments[segments.length - 2] ?? "") : (segments[0] ?? "");
}

export function recommendSourceNameFromUrl(urlValue: string) {
  const value = urlValue.trim();
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.replace(/\/+$/, "");

    if (X_HOSTNAMES.has(hostname)) {
      const segments = pathname.split("/").filter(Boolean);
      const handle = segments[0]?.replace(/^@/, "") ?? "";

      if (segments.length === 1 && X_HANDLE_PATTERN.test(handle)) {
        return humanizeBrandToken(handle);
      }

      return "";
    }

    if (YOUTUBE_HOSTNAMES.has(hostname)) {
      if (pathname.startsWith("/@")) {
        const handle = pathname.slice(2);
        if (handle && !handle.includes("/")) {
          return humanizeBrandToken(handle);
        }
      }

      return "";
    }

    return humanizeBrandToken(getRegistrableHostnameLabel(hostname));
  } catch {
    return "";
  }
}

export function getDefaultExtractorProfileForType(type: SourceType): SourceExtractorProfile | "" {
  return type === "rss" ? "generic-rss" : "";
}

export function priorityValueToLevel(priority: string | number | null | undefined): SourcePriorityLevel {
  const numericPriority = typeof priority === "number" ? priority : Number(priority);

  if (!Number.isFinite(numericPriority)) {
    return "medium";
  }

  if (numericPriority < 50) {
    return "low";
  }

  if (numericPriority < 80) {
    return "medium";
  }

  return "high";
}

export function priorityLevelToValue(level: SourcePriorityLevel): "30" | "70" | "90" {
  if (level === "low") {
    return "30";
  }

  if (level === "high") {
    return "90";
  }

  return "70";
}

export function getPriorityLabel(level: SourcePriorityLevel) {
  if (level === "low") {
    return "Low";
  }

  if (level === "high") {
    return "High";
  }

  return "Medium";
}
