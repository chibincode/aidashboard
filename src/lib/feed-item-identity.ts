import { createHash } from "node:crypto";

const X_HOSTNAMES = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]);
const NITTER_HOSTNAMES = new Set(["nitter.net", "www.nitter.net"]);

export function normalizeFeedItemUrl(value: string) {
  try {
    const url = new URL(value.trim());
    url.hash = "";
    url.searchParams.sort();

    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
      url.port = "";
    }

    const hostname = url.hostname.toLowerCase();
    if (X_HOSTNAMES.has(hostname) || NITTER_HOSTNAMES.has(hostname)) {
      url.hostname = "x.com";

      const segments = url.pathname
        .split("/")
        .filter(Boolean)
        .map((segment, index) => (index === 0 ? segment.toLowerCase() : segment));
      url.pathname = `/${segments.join("/")}`;
    } else {
      url.hostname = hostname;
    }

    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return value.trim();
  }
}

export function fingerprintForFeedItem(item: Pick<{ canonicalUrl: string; title: string }, "canonicalUrl" | "title">) {
  const normalizedUrl = normalizeFeedItemUrl(item.canonicalUrl);
  const value = `${normalizedUrl}::${item.title}`.toLowerCase();
  return createHash("sha256").update(value).digest("hex");
}
