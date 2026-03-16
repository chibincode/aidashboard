import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCategoryMutationState, createEmptyCategoryFormValues } from "@/lib/category-forms";
import { createEmptySourceFormValues, createSourceMutationState } from "@/lib/source-forms";

const {
  createCategoryRecord,
  createSourceRecord,
  deleteCategoryRecord,
  deleteEntityRecord,
  deleteRuleRecord,
  deleteSourceRecord,
  deleteTagRecord,
  toggleCategoryRecord,
  updateEntityRecord,
  updateSourceRecord,
  updateCategoryRecord,
  updateTagRecord,
  getSourceRecordById,
  syncSourceById,
  revalidatePath,
  cookieStore,
  requireOwnerActionSession,
} = vi.hoisted(() => ({
  createCategoryRecord: vi.fn(),
  createSourceRecord: vi.fn(),
  deleteCategoryRecord: vi.fn(),
  deleteEntityRecord: vi.fn(),
  deleteRuleRecord: vi.fn(),
  deleteSourceRecord: vi.fn(),
  deleteTagRecord: vi.fn(),
  toggleCategoryRecord: vi.fn(),
  updateEntityRecord: vi.fn(),
  updateSourceRecord: vi.fn(),
  updateCategoryRecord: vi.fn(),
  updateTagRecord: vi.fn(),
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
  createCategoryRecord,
  createEntityRecord: vi.fn(),
  createRuleRecord: vi.fn(),
  createSourceRecord,
  createTagRecord: vi.fn(),
  deleteCategoryRecord,
  deleteEntityRecord,
  deleteRuleRecord,
  deleteSourceRecord,
  deleteTagRecord,
  getSourceRecordById,
  toggleCategoryRecord,
  toggleRuleRecord: vi.fn(),
  toggleSourceRecord: vi.fn(),
  toggleTagRecord: vi.fn(),
  updateEntityRecord,
  updateCategoryRecord,
  updateSourceRecord,
  updateTagRecord,
}));

describe("admin source actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncSourceById.mockResolvedValue({
      sourceId: "source_default",
      skipped: false,
      fetchedCount: 3,
      createdCount: 3,
      dedupedCount: 0,
      warnings: [],
    });
  });

  it("stores normalized YouTube config on create and runs the initial sync", async () => {
    createSourceRecord.mockResolvedValue("source_openai");

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
    expect(result.message).toBe("Source created. Initial sync completed.");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "settings-toast",
      expect.any(String),
      expect.objectContaining({
        path: "/",
        maxAge: 60,
        sameSite: "lax",
      }),
    );
    expect(revalidatePath).not.toHaveBeenCalledWith("/admin/sources");
    expect(revalidatePath).not.toHaveBeenCalledWith("/");
  });

  it("returns a warning message when the initial sync finishes with warnings", async () => {
    createSourceRecord.mockResolvedValue("source_openai");
    syncSourceById.mockResolvedValueOnce({
      sourceId: "source_openai",
      skipped: false,
      fetchedCount: 0,
      createdCount: 0,
      dedupedCount: 0,
      warnings: ["Missing feed metadata"],
    });

    const { createSourceAction } = await import("@/actions/admin");
    const formData = new FormData();
    formData.set("name", "OpenAI YouTube");
    formData.set("type", "youtube");
    formData.set("url", "https://www.youtube.com/channel/UCXZCJLdBC09xxGZ6gcdrc6A");

    const result = await createSourceAction(
      createSourceMutationState(createEmptySourceFormValues()),
      formData,
    );

    expect(syncSourceById).toHaveBeenCalledWith("source_openai");
    expect(result.status).toBe("success");
    expect(result.message).toBe(
      "Source created. Initial sync completed with warnings. Check source status for details.",
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      "settings-toast",
      expect.any(String),
      expect.objectContaining({
        path: "/",
        maxAge: 60,
        sameSite: "lax",
      }),
    );
    expect(revalidatePath).not.toHaveBeenCalledWith("/admin/sources");
    expect(revalidatePath).not.toHaveBeenCalledWith("/");
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

  it("updates sources with rewritten YouTube config and runs the initial sync", async () => {
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
    expect(syncSourceById).toHaveBeenCalledWith("source_openai");
    expect(result.status).toBe("success");
    expect(result.message).toBe("Source updated. Initial sync completed.");
    expect(revalidatePath).not.toHaveBeenCalledWith("/admin/sources");
    expect(revalidatePath).not.toHaveBeenCalledWith("/");
  });

  it("stores gallery extractor config for website inspiration sources", async () => {
    createSourceRecord.mockResolvedValue("source_a1_gallery");

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

  it("stores normalized X config on create and runs the initial sync", async () => {
    createSourceRecord.mockResolvedValue("source_riyvir");

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

  it("returns success when the initial sync fails after create", async () => {
    createSourceRecord.mockResolvedValue("source_framer");
    syncSourceById.mockRejectedValueOnce(new Error("Queue unavailable"));

    const { createSourceAction } = await import("@/actions/admin");
    const formData = new FormData();
    formData.set("name", "Framer");
    formData.set("type", "website");
    formData.set("url", "https://www.framer.com/");
    formData.set("priority", "70");
    formData.set("refreshMinutes", "30");
    formData.set("isActive", "on");

    const result = await createSourceAction(
      createSourceMutationState(createEmptySourceFormValues()),
      formData,
    );

    expect(createSourceRecord).toHaveBeenCalled();
    expect(syncSourceById).toHaveBeenCalledWith("source_framer");
    expect(result.status).toBe("success");
    expect(result.message).toBe("Source created, but the initial sync failed. Check source status for details.");
    expect(cookieStore.set).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalledWith("/admin/sources");
    expect(revalidatePath).not.toHaveBeenCalledWith("/");
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
    expect(revalidatePath).not.toHaveBeenCalledWith("/admin/sources");
    expect(revalidatePath).not.toHaveBeenCalledWith("/");
  });

  it("sets a flash toast when deleting other settings resources", async () => {
    const { deleteCategoryAction, deleteEntityAction, deleteTagAction, deleteRuleAction } = await import("@/actions/admin");

    const categoryFormData = new FormData();
    categoryFormData.set("id", "category_1");
    await deleteCategoryAction(categoryFormData);

    const entityFormData = new FormData();
    entityFormData.set("id", "entity_1");
    await deleteEntityAction(entityFormData);

    const tagFormData = new FormData();
    tagFormData.set("id", "tag_1");
    await deleteTagAction(tagFormData);

    const ruleFormData = new FormData();
    ruleFormData.set("id", "rule_1");
    await deleteRuleAction(ruleFormData);

    expect(deleteCategoryRecord).toHaveBeenCalledWith("category_1");
    expect(deleteEntityRecord).toHaveBeenCalledWith("entity_1");
    expect(deleteTagRecord).toHaveBeenCalledWith("tag_1");
    expect(deleteRuleRecord).toHaveBeenCalledWith("rule_1");
    expect(cookieStore.set).toHaveBeenCalledTimes(4);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/categories");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/entities");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/rules");
  });

  it("updates entities and tags and revalidates the matching settings routes", async () => {
    const { updateEntityAction, updateTagAction } = await import("@/actions/admin");

    const entityFormData = new FormData();
    entityFormData.set("id", "entity_1");
    entityFormData.set("name", "AI UX Signals");
    entityFormData.set("kind", "topic");
    entityFormData.set("description", "Interaction patterns and workflows.");
    entityFormData.set("color", "#197d71");
    await updateEntityAction(entityFormData);

    const tagFormData = new FormData();
    tagFormData.set("id", "tag_1");
    tagFormData.set("name", "AI UX/UI");
    tagFormData.set("parentId", "tag_parent");
    tagFormData.set("color", "#0f766e");
    tagFormData.set("isActive", "on");
    await updateTagAction(tagFormData);

    expect(updateEntityRecord).toHaveBeenCalledWith({
      id: "entity_1",
      name: "AI UX Signals",
      kind: "topic",
      description: "Interaction patterns and workflows.",
      color: "#197d71",
    });
    expect(updateTagRecord).toHaveBeenCalledWith({
      id: "tag_1",
      name: "AI UX/UI",
      parentId: "tag_parent",
      color: "#0f766e",
      isActive: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/entities");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags");
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

describe("admin category actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates categories with tags, entities, and entity kinds", async () => {
    const { createCategoryAction } = await import("@/actions/admin");
    const formData = new FormData();
    formData.set("name", "Competitor Watch");
    formData.set("description", "Everything competitor related.");
    formData.set("tone", "amber");
    formData.set("position", "30");
    formData.set("isActive", "on");
    formData.append("entityKinds", "competitor");
    formData.append("tagIds", "tag_competitor");
    formData.append("entityIds", "entity_tp");

    const result = await createCategoryAction(
      createCategoryMutationState(createEmptyCategoryFormValues()),
      formData,
    );

    expect(createCategoryRecord).toHaveBeenCalledWith({
      name: "Competitor Watch",
      description: "Everything competitor related.",
      tone: "amber",
      position: 30,
      isActive: true,
      tagIds: ["tag_competitor"],
      entityIds: ["entity_tp"],
      entityKinds: ["competitor"],
    });
    expect(result.status).toBe("success");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/categories");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("rejects categories without matching selectors", async () => {
    const { createCategoryAction } = await import("@/actions/admin");
    const formData = new FormData();
    formData.set("name", "Empty");
    formData.set("tone", "sand");
    formData.set("position", "10");

    const result = await createCategoryAction(
      createCategoryMutationState(createEmptyCategoryFormValues()),
      formData,
    );

    expect(createCategoryRecord).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.fieldErrors.conditions).toContain("Choose at least one");
  });

  it("updates and toggles categories", async () => {
    const { toggleCategoryAction, updateCategoryAction } = await import("@/actions/admin");

    const updateFormData = new FormData();
    updateFormData.set("id", "category_1");
    updateFormData.set("name", "Signals");
    updateFormData.set("description", "Updated description");
    updateFormData.set("tone", "mint");
    updateFormData.set("position", "20");
    updateFormData.set("isActive", "on");
    updateFormData.append("tagIds", "tag_aiux");

    const result = await updateCategoryAction(
      createCategoryMutationState(createEmptyCategoryFormValues({ id: "category_1" })),
      updateFormData,
    );

    expect(updateCategoryRecord).toHaveBeenCalledWith({
      id: "category_1",
      name: "Signals",
      description: "Updated description",
      tone: "mint",
      position: 20,
      isActive: true,
      tagIds: ["tag_aiux"],
      entityIds: [],
      entityKinds: [],
    });
    expect(result.status).toBe("success");

    const toggleFormData = new FormData();
    toggleFormData.set("id", "category_1");
    toggleFormData.set("isActive", "false");
    await toggleCategoryAction(toggleFormData);

    expect(toggleCategoryRecord).toHaveBeenCalledWith("category_1", false);
  });
});
