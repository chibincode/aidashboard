import { describe, expect, it } from "vitest";
import { parseDashboardFilters } from "@/lib/filters";

describe("filter parsing", () => {
  it("accepts supported source types and boolean toggles", () => {
    const filters = parseDashboardFilters({
      entity: "entity_navpro",
      tag: "tag_navigation",
      sourceType: "youtube",
      unread: "1",
      saved: "0",
    });

    expect(filters).toEqual({
      view: undefined,
      entity: "entity_navpro",
      tag: "tag_navigation",
      sourceType: "youtube",
      unreadOnly: true,
      savedOnly: false,
    });
  });

  it("drops unsupported source types", () => {
    const filters = parseDashboardFilters({ sourceType: "unknown" });
    expect(filters.sourceType).toBeUndefined();
  });

  it("accepts the website inspiration dashboard view", () => {
    const filters = parseDashboardFilters({ view: "category_website_inspiration" });
    expect(filters.view).toBe("category_website_inspiration");
  });
});
