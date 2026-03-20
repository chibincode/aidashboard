import type { DashboardItem, SocialMetrics } from "@/lib/domain";

function parseDurationSeconds(label?: string | null) {
  if (!label) {
    return null;
  }

  const parts = label.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
}

export function getDashboardItemSourceName(item: DashboardItem) {
  return item.authorName ?? item.sourceName.replace(/\s+(YouTube|X)$/i, "");
}

export function getDashboardItemSourceHandle(item: DashboardItem) {
  if (item.sourceHandle) {
    return item.sourceHandle.replace(/^@/, "");
  }

  return getDashboardItemSourceName(item)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function getDashboardItemAvatarFallbackClass(item: DashboardItem) {
  switch (item.sourceType) {
    case "youtube":
      return "bg-[#b42318] text-white";
    case "x":
      return "bg-slate-950 text-white";
    case "website":
      return "bg-[#e4f3ef] text-[#166a5c]";
    case "rss":
      return "bg-[#fff1d6] text-[#9a6700]";
    default:
      return "bg-slate-200 text-slate-700";
  }
}

function getFallbackSocialCounts(item: DashboardItem): SocialMetrics {
  const seed = [...item.id].reduce((total, char, index) => total + char.charCodeAt(0) * (index + 3), 0);

  return {
    replies: 4 + (seed % 36),
    reposts: seed % 14,
    likes: 12 + (seed % 420),
    views: 400 + (seed % 24_000),
    bookmarks: 3 + (seed % 360),
  };
}

export function getDashboardItemResolvedSocialCounts(item: DashboardItem) {
  return {
    ...getFallbackSocialCounts(item),
    ...item.socialMetrics,
  };
}

export function isDashboardItemShortVideo(item: DashboardItem) {
  const durationSeconds = parseDurationSeconds(item.mediaLabel);

  return item.sourceType === "youtube" && (item.canonicalUrl.includes("/shorts/") || (durationSeconds !== null && durationSeconds < 90));
}

export function isDashboardItemXVideo(item: DashboardItem) {
  return item.sourceType === "x" && item.mediaKind === "video";
}

export function isDashboardItemXImage(item: DashboardItem) {
  return item.sourceType === "x" && item.mediaKind === "image";
}

export function isDashboardItemWebsiteInspiration(item: DashboardItem) {
  return (
    Boolean(item.thumbnailUrl) &&
    (item.sourceType === "website" || item.sourceType === "rss") &&
    item.tags.some((tag) => tag.slug === "website-inspiration")
  );
}
