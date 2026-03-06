import { createHash } from "node:crypto";
import type { NormalizedIncomingItem } from "@/lib/ingestion/types";

export function fingerprintForItem(item: Pick<NormalizedIncomingItem, "canonicalUrl" | "title">) {
  const value = `${item.canonicalUrl}::${item.title}`.toLowerCase();
  return createHash("sha256").update(value).digest("hex");
}

export function dedupeIncomingItems(items: NormalizedIncomingItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const fingerprint = item.fingerprint ?? fingerprintForItem(item);
    if (seen.has(fingerprint)) {
      return false;
    }

    seen.add(fingerprint);
    item.fingerprint = fingerprint;
    return true;
  });
}
