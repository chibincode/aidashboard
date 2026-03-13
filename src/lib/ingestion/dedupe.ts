import type { NormalizedIncomingItem } from "@/lib/ingestion/types";
import { fingerprintForFeedItem, normalizeFeedItemUrl } from "@/lib/feed-item-identity";

export const fingerprintForItem = fingerprintForFeedItem;

export function dedupeIncomingItems(items: NormalizedIncomingItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    item.canonicalUrl = normalizeFeedItemUrl(item.canonicalUrl);

    const fingerprint = item.fingerprint ?? fingerprintForItem(item);
    if (seen.has(fingerprint)) {
      return false;
    }

    seen.add(fingerprint);
    item.fingerprint = fingerprint;
    return true;
  });
}
