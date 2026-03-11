import { describe, expect, it, vi } from "vitest";
import { seedSources } from "@/lib/seed";
import {
  getSourceExtractorProfile,
  getYouTubeSourceConfig,
  isGallerySource,
  normalizeSourceInput,
  normalizeYouTubeSourceInput,
  SourceValidationError,
} from "@/lib/source-normalization";

describe("YouTube source normalization", () => {
  it("normalizes a feed url into a typed YouTube config", async () => {
    const result = await normalizeYouTubeSourceInput(
      "https://www.youtube.com/feeds/videos.xml?channel_id=UCXZCJLdBC09xxGZ6gcdrc6A",
    );

    expect(result).toEqual({
      url: "https://www.youtube.com/channel/UCXZCJLdBC09xxGZ6gcdrc6A",
      config: {
        feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCXZCJLdBC09xxGZ6gcdrc6A",
        channelId: "UCXZCJLdBC09xxGZ6gcdrc6A",
        channelUrl: "https://www.youtube.com/channel/UCXZCJLdBC09xxGZ6gcdrc6A",
        inputUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCXZCJLdBC09xxGZ6gcdrc6A",
        itemType: "video",
      },
    });
  });

  it("normalizes a channel url without fetching", async () => {
    const result = await normalizeYouTubeSourceInput(
      "https://www.youtube.com/channel/UCcefcZRL2oaA_uBNeo5UOWg",
    );

    expect(result.config.feedUrl).toBe(
      "https://www.youtube.com/feeds/videos.xml?channel_id=UCcefcZRL2oaA_uBNeo5UOWg",
    );
    expect(result.url).toBe("https://www.youtube.com/channel/UCcefcZRL2oaA_uBNeo5UOWg");
  });

  it("resolves a public handle into a typed YouTube config", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      text: async () => '{"channelId":"UCW5gUZ7lKGrAbLOkHv2xfbw"}',
    })) as unknown as typeof fetch;

    const result = await normalizeYouTubeSourceInput(
      "https://www.youtube.com/@Framer",
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result).toEqual({
      url: "https://www.youtube.com/@Framer",
      config: {
        feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCW5gUZ7lKGrAbLOkHv2xfbw",
        channelId: "UCW5gUZ7lKGrAbLOkHv2xfbw",
        channelUrl: "https://www.youtube.com/channel/UCW5gUZ7lKGrAbLOkHv2xfbw",
        handleUrl: "https://www.youtube.com/@Framer",
        inputUrl: "https://www.youtube.com/@Framer",
        itemType: "video",
      },
    });
  });

  it("rejects unsupported YouTube url shapes", async () => {
    await expect(
      normalizeYouTubeSourceInput("https://www.youtube.com/user/OpenAI"),
    ).rejects.toBeInstanceOf(SourceValidationError);
  });

  it("rejects unresolvable handles", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      text: async () => "<html></html>",
    })) as unknown as typeof fetch;

    await expect(
      normalizeYouTubeSourceInput("https://www.youtube.com/@missing", fetchImpl),
    ).rejects.toBeInstanceOf(SourceValidationError);
  });

  it("keeps seeded YouTube sources compatible with validated configs", () => {
    const youtubeSources = seedSources.filter((source) => source.type === "youtube");

    expect(youtubeSources).not.toHaveLength(0);
    expect(youtubeSources.every((source) => Boolean(getYouTubeSourceConfig(source)))).toBe(true);
  });

  it("normalizes gallery RSS sources with a gallery extractor profile", async () => {
    const result = await normalizeSourceInput({
      type: "rss",
      url: "https://onepagelove.com/feed",
      extractorProfile: "gallery-rss",
    });

    expect(result).toEqual({
      url: "https://onepagelove.com/feed",
      config: {
        extractorProfile: "gallery-rss",
        itemType: "article",
      },
    });
  });

  it("normalizes A1 website sources with the dedicated profile", async () => {
    const result = await normalizeSourceInput({
      type: "website",
      url: "https://www.a1.gallery/",
      extractorProfile: "a1-gallery-home",
    });

    expect(result).toEqual({
      url: "https://www.a1.gallery/",
      config: {
        extractorProfile: "a1-gallery-home",
        itemType: "article",
      },
    });
  });

  it("identifies seeded gallery sources correctly", () => {
    const gallerySources = seedSources.filter((source) =>
      ["source_saaslandingpage_gallery", "source_onepagelove_gallery", "source_a1_gallery"].includes(source.id),
    );

    expect(gallerySources).toHaveLength(3);
    expect(gallerySources.every((source) => isGallerySource(source))).toBe(true);
    expect(getSourceExtractorProfile(gallerySources[0])).toBe("gallery-rss");
  });
});
