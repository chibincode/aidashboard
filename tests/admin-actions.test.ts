import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySourceFormValues, createSourceMutationState } from "@/lib/source-forms";

const {
  createSourceRecord,
  deleteEntityRecord,
  deleteRuleRecord,
  deleteSourceRecord,
  deleteTagRecord,
  updateSourceRecord,
  getSourceRecordById,
  syncSourceById,
  revalidatePath,
  cookieStore,
  requireOwnerActionSession,
} = vi.hoisted(() => ({
  createSourceRecord: vi.fn(),
  deleteEntityRecord: vi.fn(),
  deleteRuleRecord: vi.fn(),
  deleteSourceRecord: vi.fn(),
  deleteTagRecord: vi.fn(),
  updateSourceRecord: vi.fn(),
  getSourceRecordById: vi.fn(),
  syncSourceById: vi.fn(),
  revalidatePath: vi.fn(),
  cookieStore: {
    set: vi.fn(),
  },
  requireOwnerActionSession: vi.fn(async () => ({ user: { id: "usr_1", role: "owner" } })),
}));

vi.mock("@/lib/env", () => ({
  appConfig: {
    hasDatabase: true,
    isDemoMode: false,
    personalOwnerEmail: "owner@example.com",
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@/lib/ingestion/sync", () => ({
  syncSourceById,
}));

vi.mock("@/lib/auth-guards", () => ({
  requireOwnerActionSession,
}));

vi.mock("@/lib/repositories/app-repository", () => ({
  createEntityRecord: vi.fn(),
  createRuleRecord: vi.fn(),
  createSourceRecord,
  createTagRecord: vi.fn(),
  deleteEntityRecord,
  deleteRuleRecord,
  deleteSourceRecord,
  deleteTagRecord,
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
    expect(requireOwnerActionSession).toHaveBeenCalled();
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

  it("stores normalized X config on create and validates immediately", async () => {
    createSourceRecord.mockResolvedValue("source_riyvir");
    syncSourceById.mockResolvedValue({ sourceId: "source_riyvir", warnings: [] });

    const { createSourceAction } = await import("@/actions/admin");
    const formData = new FormData();
    formData.set("name", "Riyvir");
    formData.set("type", "x");
    formData.set("url", "https://x.com/Riyvir");
    formData.set("priority", "95");
    formData.set("refreshMinutes", "30");
    formData.set("isActive", "on");

    const result = await createSourceAction(
      createSourceMutationState(createEmptySourceFormValues()),
      formData,
    );

    expect(createSourceRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://x.com/Riyvir",
        config: {
          handle: "Riyvir",
          rssUrl: "https://nitter.net/Riyvir/rss",
          inputUrl: "https://x.com/Riyvir",
          handleUrl: "https://x.com/Riyvir",
          itemType: "post",
        },
      }),
    );
    expect(syncSourceById).toHaveBeenCalledWith("source_riyvir");
    expect(result.status).toBe("success");
  });

  it("sets a flash toast when deleting a source", async () => {
    const { deleteSourceAction } = await import("@/actions/admin");
    const formData = new FormData();
    formData.set("id", "source_openai");

    await deleteSourceAction(formData);

    expect(deleteSourceRecord).toHaveBeenCalledWith("source_openai");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "settings-toast",
      expect.any(String),
      expect.objectContaining({
        path: "/",
        maxAge: 60,
        sameSite: "lax",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin/sources");
  });

  it("sets a flash toast when deleting other settings resources", async () => {
    const { deleteEntityAction, deleteTagAction, deleteRuleAction } = await import("@/actions/admin");

    const entityFormData = new FormData();
    entityFormData.set("id", "entity_1");
    await deleteEntityAction(entityFormData);

    const tagFormData = new FormData();
    tagFormData.set("id", "tag_1");
    await deleteTagAction(tagFormData);

    const ruleFormData = new FormData();
    ruleFormData.set("id", "rule_1");
    await deleteRuleAction(ruleFormData);

    expect(deleteEntityRecord).toHaveBeenCalledWith("entity_1");
    expect(deleteTagRecord).toHaveBeenCalledWith("tag_1");
    expect(deleteRuleRecord).toHaveBeenCalledWith("rule_1");
    expect(cookieStore.set).toHaveBeenCalledTimes(3);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/entities");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/rules");
  });

  it("blocks settings mutations when the owner session is missing", async () => {
    requireOwnerActionSession.mockRejectedValueOnce(new Error("Unauthorized"));

    const { deleteSourceAction } = await import("@/actions/admin");
    const formData = new FormData();
    formData.set("id", "source_openai");

    await expect(deleteSourceAction(formData)).rejects.toThrow("Unauthorized");
    expect(deleteSourceRecord).not.toHaveBeenCalled();
  });
});
