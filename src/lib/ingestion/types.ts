import type { FeedItemType, SourceRecord, SourceType, TagRuleRecord } from "@/lib/domain";

export interface NormalizedIncomingItem {
  title: string;
  excerpt: string;
  canonicalUrl: string;
  publishedAt: Date;
  contentType: FeedItemType;
  authorName?: string | null;
  thumbnailUrl?: string | null;
  fingerprint?: string;
  tagIds?: string[];
}

export interface SourceAdapterResult {
  items: NormalizedIncomingItem[];
  adapter: SourceType;
  warnings: string[];
}

export interface SourceAdapter {
  type: SourceType;
  fetchItems(source: SourceRecord): Promise<SourceAdapterResult>;
}

export interface TaggingContext {
  source: SourceRecord;
  rules: TagRuleRecord[];
}
