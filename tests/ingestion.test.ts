import { describe, expect, it } from "vitest";
import { dedupeIncomingItems } from "@/lib/ingestion/dedupe";
import { parseWebsiteHtml } from "@/lib/ingestion/adapters/website";
import { applyTagRules } from "@/lib/ingestion/rules";
import { seedRules, seedSources, seedTags } from "@/lib/seed";

describe("ingestion adapters", () => {
  it("parses website html into normalized feed items", () => {
    const source = seedSources.find((entry) => entry.id === "source_truckerpath_blog");
    expect(source).toBeDefined();

    const result = parseWebsiteHtml(
      source!,
      `
        <main>
          <div class="post">
            <h2>New route planning dashboard</h2>
            <a href="/blog/new-route-planning-dashboard">Read more</a>
            <time datetime="2026-03-06T04:45:00.000Z"></time>
            <p>Faster lane filtering and trip context.</p>
          </div>
        </main>
      `,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      title: "New route planning dashboard",
      canonicalUrl: "https://truckerpath.com/blog/new-route-planning-dashboard",
      contentType: "update",
    });
  });

  it("deduplicates items by canonical fingerprint", () => {
    const deduped = dedupeIncomingItems([
      {
        title: "Same launch",
        excerpt: "A",
        canonicalUrl: "https://example.com/posts/1",
        publishedAt: new Date(),
        contentType: "article",
      },
      {
        title: "Same launch",
        excerpt: "B",
        canonicalUrl: "https://example.com/posts/1",
        publishedAt: new Date(),
        contentType: "article",
      },
    ]);

    expect(deduped).toHaveLength(1);
  });

  it("applies keyword rules to incoming items", () => {
    const item = {
      title: "Broker pricing update is now live",
      excerpt: "Subscription controls appear directly in the web deck.",
      canonicalUrl: "https://example.com/pricing-update",
      publishedAt: new Date(),
      contentType: "update" as const,
      tagIds: [seedTags[0].id],
    };

    const tagIds = applyTagRules(item, seedRules);

    expect(tagIds).toContain("tag_pricing");
    expect(tagIds).toContain(seedTags[0].id);
  });
});
