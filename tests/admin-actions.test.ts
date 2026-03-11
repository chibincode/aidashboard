import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySourceFormValues, createSourceMutationState } from "@/lib/source-forms";

const {
  createSourceRecord,
  updateSourceRecord,
  getSourceRecordById,
  syncSourceById,
  revalidatePath,
} = vi.hoisted(() => ({
  createSourceRecord: vi.fn(),
  updateSourceRecord: vi.fn(),
  getSourceRecordById: vi.fn(),
  syncSourceById: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  appConfig: {
    hasDatabase: true,
    isDemoMode: false,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/lib/ingestion/sync", () => ({
  syncSourceById,
}));

vi.mock("@/lib/repositories/app-repository", () => ({
  createEntityRecord: vi.fn(),
  createRuleRecord: vi.fn(),
  createSourceRecord,
  createTagRecord: vi.fn(),
  deleteEntityRecord: vi.fn(),
  deleteRuleRecord: vi.fn(),
  deleteSourceRecord: vi.fn(),
  deleteTagRecord: vi.fn(),
  getSourceRecordById,
  toggleRuleRecord: vi.fn(),
  toggleSourceRecord: vi.fn(),
  toggleTagRecord: vi.fn(),
  updateSourceRecord,
}));

describe("admin source actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores normalized YouTube config on create and validates immediately", async () => {
    createSourceRecord.mockResolvedValue("source_openai");
    syncSourceById.mockResolvedValue({ sourceId: "source_openai" });

    const { createSourceAction } = await import("@/actions/admin");
    const formData = new FormData();
    formData.set("name", "OpenAI YouTube");
    formData.set("type", "youtube");
    formData.set("url", "https://www.youtube.com/channel/UCXZCJLdBC09xxGZ6gcdrc6A");
    formData.set("priority", "90");
    formData.set("refreshMinutes", "30");
    formData.set("isActive", "on");

    const result = await createSourceAction(
      createSourceMutationState(createEmptySourceFormValues()),
      formData,
    );

    expect(createSourceRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://www.youtube.com/channel/UCXZCJLdBC09xxGZ6gcdrc6A",
        config: expect.objectContaining({
          feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCXZCJLdBC09xxGZ6gcdrc6A",
          channelId: "UCXZCJLdBC09xxGZ6gcdrc6A",
        }),
      }),
    );
    expect(syncSourceById).toHaveBeenCalledWith("source_openai");
    expect(result.status).toBe("success");
    expect(result.message).toContain("validated");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/sources");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("does not persist invalid YouTube url formats", async () => {
    const { createSourceAction } = await import("@/actions/admin");
    const formData = new FormData();
    formData.set("name", "Broken source");
    formData.set("type", "youtube");
    formData.set("url", "https://www.youtube.com/user/openai");

    const result = await createSourceAction(
      createSourceMutationState(createEmptySourceFormValues()),
      formData,
    );

    expect(createSourceRecord).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.fieldErrors.url).toContain("/channel/");
  });

  it("updates sources with rewritten YouTube config", async () => {
    getSourceRecordById.mockResolvedValue({
      id: "source_openai",
      workspaceId: "ws_1",
      entityId: null,
      name: "OpenAI",
      slug: "openai",
      type: "rss",
      url: "https://example.com/feed.xml",
      refreshMinutes: 30,
      priority: 70,
      isActive: true,
      healthStatus: "healthy",
      config: { itemType: "article" },
      defaultTagIds: [],
      lastFetchedAt: null,
      lastErrorMessage: null,
    });
    updateSourceRecord.mockResolvedValue("source_openai");
    syncSourceById.mockRejectedValue(new Error("Fetch failed"));

    const { updateSourceAction } = await import("@/actions/admin");
    const formData = new FormData();
    formData.set("id", "source_openai");
    formData.set("name", "OpenAI YouTube");
    formData.set("type", "youtube");
    formData.set("url", "https://www.youtube.com/channel/UCXZCJLdBC09xxGZ6gcdrc6A");
    formData.set("priority", "95");
    formData.set("refreshMinutes", "30");
    formData.set("isActive", "on");

    const result = await updateSourceAction(
      createSourceMutationState({
        ...createEmptySourceFormValues(),
        id: "source_openai",
      }),
      formData,
    );

    expect(updateSourceRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "source_openai",
        config: expect.objectContaining({
          feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCXZCJLdBC09xxGZ6gcdrc6A",
        }),
      }),
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("validation failed");
  });

  it("stores gallery extractor config for website inspiration sources", async () => {
    createSourceRecord.mockResolvedValue("source_a1_gallery");
    syncSourceById.mockResolvedValue({ sourceId: "source_a1_gallery" });

    const { createSourceAction } = await import("@/actions/admin");
    const formData = new FormData();
    formData.set("name", "A1 Gallery");
    formData.set("type", "website");
    formData.set("extractorProfile", "a1-gallery-home");
    formData.set("url", "https://www.a1.gallery/");
    formData.set("priority", "80");
    formData.set("refreshMinutes", "60");
    formData.set("isActive", "on");

    const result = await createSourceAction(
      createSourceMutationState(createEmptySourceFormValues()),
      formData,
    );

    expect(createSourceRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://www.a1.gallery/",
        config: {
          extractorProfile: "a1-gallery-home",
          itemType: "article",
        },
      }),
    );
    expect(result.status).toBe("success");
  });
});
