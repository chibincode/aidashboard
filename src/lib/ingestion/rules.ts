import type { TagRuleRecord } from "@/lib/domain";
import type { NormalizedIncomingItem } from "@/lib/ingestion/types";
import { unique } from "@/lib/utils";

export function applyTagRules(item: NormalizedIncomingItem, rules: TagRuleRecord[]) {
  const text = `${item.title} ${item.excerpt}`.toLowerCase();
  const url = item.canonicalUrl.toLowerCase();

  const matchedTags = rules
    .filter((rule) => rule.isActive)
    .filter((rule) => {
      const { keywords, urlContains, contentTypes } = rule.conditions;

      const keywordMatch =
        !keywords || keywords.length === 0 || keywords.some((keyword) => text.includes(keyword.toLowerCase()));
      const urlMatch =
        !urlContains || urlContains.length === 0 || urlContains.some((fragment) => url.includes(fragment.toLowerCase()));
      const contentTypeMatch =
        !contentTypes || contentTypes.length === 0 || contentTypes.includes(item.contentType);

      return keywordMatch && urlMatch && contentTypeMatch;
    })
    .flatMap((rule) => rule.actions.tagIds);

  return unique([...(item.tagIds ?? []), ...matchedTags]);
}
