import Parser from "rss-parser";
import { describe, expect, it, vi } from "vitest";
import { fetchRssItems } from "@/lib/ingestion/adapters/rss";
import { dedupeIncomingItems } from "@/lib/ingestion/dedupe";
import { fetchXItems, normalizeXProfileImageUrl, parseTwStalkerHtml } from "@/lib/ingestion/adapters/x";
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

  it("normalizes X status urls before deduplicating", () => {
    const deduped = dedupeIncomingItems([
      {
        title: "Same launch",
        excerpt: "A",
        canonicalUrl: "https://twitter.com/AILoadboard/status/1001/",
        publishedAt: new Date(),
        contentType: "post",
      },
      {
        title: "Same launch",
        excerpt: "B",
        canonicalUrl: "https://x.com/ailoadboard/status/1001#conversation",
        publishedAt: new Date(),
        contentType: "post",
      },
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.canonicalUrl).toBe("https://x.com/ailoadboard/status/1001");
  });

  it("normalizes nitter X status urls before deduplicating", () => {
    const deduped = dedupeIncomingItems([
      {
        title: "Same launch",
        excerpt: "A",
        canonicalUrl: "https://nitter.net/AILoadboard/status/1001",
        publishedAt: new Date(),
        contentType: "post",
      },
      {
        title: "Same launch",
        excerpt: "B",
        canonicalUrl: "https://x.com/ailoadboard/status/1001",
        publishedAt: new Date(),
        contentType: "post",
      },
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.canonicalUrl).toBe("https://x.com/ailoadboard/status/1001");
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

  it("parses X avatar urls from TwStalker html", () => {
    const source = seedSources.find((entry) => entry.id === "source_andy_hooke_x");
    expect(source).toBeDefined();

    const result = parseTwStalkerHtml(
      source!,
      `
        <div class="my-profile-dash">
          <img class="img-thumbnail" src="https://pbs.twimg.com/profile_images/1546442126543785984/rPOmKAIB_normal.jpg" alt="Picture" />
        </div>
        <article class="activity-posts">
          <div class="user-text3">
            <h4>Andy Hooke</h4>
            <span><a href="/andy_hooke/status/1">5 seconds ago</a></span>
          </div>
          <div class="activity-descp">
            <p>Another week of finding the best SaaS landing pages</p>
          </div>
          <div class="like-comment-view">
            <a href="/andy_hooke/status/1">Open</a>
          </div>
          <div class="left-comments">
            <div class="like-item"><span>5</span></div>
            <div class="like-item"><span>2</span></div>
            <div class="like-item"><span>75</span></div>
            <div class="like-item"><span>2K</span></div>
            <div class="like-item"><span>25</span></div>
          </div>
        </article>
      `,
    );

    expect(result.items[0]).toMatchObject({
      authorName: "Andy Hooke",
      authorAvatarUrl: "https://pbs.twimg.com/profile_images/1546442126543785984/rPOmKAIB_400x400.jpg",
      title: "Another week of finding the best SaaS landing pages",
      excerpt: "",
    });
  });

  it("normalizes nitter image proxy urls into direct X profile image urls", () => {
    expect(
      normalizeXProfileImageUrl(
        "https://nitter.net/pic/pbs.twimg.com%2Fprofile_images%2F2000755831135191040%2Fs6Pf_wjc_normal.jpg",
      ),
    ).toBe("https://pbs.twimg.com/profile_images/2000755831135191040/s6Pf_wjc_400x400.jpg");
  });

  it("hydrates X avatars from RSS feed metadata when the source falls back to RSS", async () => {
    const source = seedSources.find((entry) => entry.id === "source_andy_hooke_x");
    expect(source).toBeDefined();

    const parseURL = vi
      .spyOn(Parser.prototype, "parseURL")
      .mockResolvedValueOnce({
        image: {
          url: "https://nitter.net/pic/pbs.twimg.com%2Fprofile_images%2F1546442126543785984%2FrPOmKAIB_normal.jpg",
        },
      } as never)
      .mockResolvedValueOnce({
        items: [
          {
            title: "Another week of finding the best SaaS landing pages",
            link: "https://nitter.net/andy_hooke/status/1",
            isoDate: "2026-03-09T15:09:31.000Z",
            creator: "@andy_hooke",
          },
        ],
      } as never);

    const result = await fetchXItems(source!);

    expect(result.sourceAvatarUrl).toBe(
      "https://pbs.twimg.com/profile_images/1546442126543785984/rPOmKAIB_400x400.jpg",
    );
    expect(result.items[0]).toMatchObject({
      authorAvatarUrl: "https://pbs.twimg.com/profile_images/1546442126543785984/rPOmKAIB_400x400.jpg",
      canonicalUrl: "https://nitter.net/andy_hooke/status/1",
    });

    parseURL.mockRestore();
  });

  it("parses A1 Gallery homepage cards into image-backed website inspiration items", () => {
    const source = seedSources.find((entry) => entry.id === "source_a1_gallery");
    expect(source).toBeDefined();

    const result = parseWebsiteHtml(
      source!,
      `
        <main>
          <article class="website_item">
            <a class="card-overlay-link" aria-label="Sendr" href="/website/sendr"></a>
            <img src="https://cdn.example.com/sendr.png" alt="Sendr website screenshot" />
          </article>
          <article class="website_item is-advert">
            <a class="card-overlay-link" aria-label="Sponsored" href="/website/ad"></a>
            <img src="https://cdn.example.com/ad.png" alt="Sponsored" />
          </article>
        </main>
      `,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      title: "Sendr",
      canonicalUrl: "https://www.a1.gallery/website/sendr",
      thumbnailUrl: "https://cdn.example.com/sendr.png",
      fingerprint: "source_a1_gallery:https://www.a1.gallery/website/sendr",
    });
  });

  it("extracts thumbnails from gallery RSS content", async () => {
    const source = seedSources.find((entry) => entry.id === "source_onepagelove_gallery");
    expect(source).toBeDefined();

    const parseURL = vi.spyOn(Parser.prototype, "parseURL").mockResolvedValue({
      items: [
        {
          title: "Website Inspiration: Poly",
          link: "https://onepagelove.com/poly",
          isoDate: "2026-03-09T15:09:31.000Z",
          creator: "Rob Hope @robhope",
          content:
            '<p><img src="https://assets.onepagelove.com/poly.jpg" /></p><p>Brilliant feature storytelling brought to life as you scroll.</p>',
          contentSnippet: "Brilliant feature storytelling brought to life as you scroll.",
        },
      ],
    } as never);

    const result = await fetchRssItems(source!);

    expect(result.items[0]).toMatchObject({
      canonicalUrl: "https://onepagelove.com/poly",
      thumbnailUrl: "https://assets.onepagelove.com/poly.jpg",
      fingerprint: "source_onepagelove_gallery:https://onepagelove.com/poly",
    });

    parseURL.mockRestore();
  });
});
