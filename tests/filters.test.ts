import { describe, expect, it } from "vitest";
import {
  parseDashboardFilters,
  parseDashboardPage,
  serializeDashboardFilters,
  serializeDashboardLocation,
} from "@/lib/filters";

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

  it("normalizes missing or invalid page values to 1", () => {
    expect(parseDashboardPage({})).toBe(1);
    expect(parseDashboardPage({ page: "0" })).toBe(1);
    expect(parseDashboardPage({ page: "-3" })).toBe(1);
    expect(parseDashboardPage({ page: "abc" })).toBe(1);
  });

  it("keeps filters serialization separate from location page state", () => {
    const filters = parseDashboardFilters({
      view: "category_website_inspiration",
      unread: "1",
      saved: "1",
    });

    expect(serializeDashboardFilters(filters)).toBe("view=category_website_inspiration&unread=1&saved=1");
    expect(serializeDashboardLocation(filters, 3)).toBe("view=category_website_inspiration&unread=1&saved=1&page=3");
    expect(serializeDashboardLocation(filters, 1)).toBe("view=category_website_inspiration&unread=1&saved=1");
  });
});
