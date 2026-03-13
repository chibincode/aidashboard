import { describe, expect, it } from "vitest";
import { recommendSourceNameFromUrl } from "@/lib/source-form-ui";

describe("source form UI helpers", () => {
  it("humanizes X handles into brand names", () => {
    expect(recommendSourceNameFromUrl("https://x.com/SuperDesignDev")).toBe("Super Design Dev");
    expect(recommendSourceNameFromUrl("https://x.com/andy_hooke")).toBe("Andy Hooke");
  });

  it("humanizes YouTube handle URLs", () => {
    expect(recommendSourceNameFromUrl("https://www.youtube.com/@Framer")).toBe("Framer");
    expect(recommendSourceNameFromUrl("https://www.youtube.com/@ycombinator")).toBe("Y Combinator");
  });

  it("derives brand names from website and RSS hostnames", () => {
    expect(recommendSourceNameFromUrl("https://onepagelove.com/feed")).toBe("One Page Love");
    expect(recommendSourceNameFromUrl("https://www.nngroup.com/articles/")).toBe("NN Group");
  });

  it("does not invent a bad name for youtube channel ids", () => {
    expect(recommendSourceNameFromUrl("https://www.youtube.com/channel/UCXZCJLdBC09xxGZ6gcdrc6A")).toBe("");
  });
});
