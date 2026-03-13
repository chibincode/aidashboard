"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { inngest } from "@/inngest/client";
import {
  createCategoryRecord,
  createEntityRecord,
  createRuleRecord,
  createSourceRecord,
  createTagRecord,
  deleteCategoryRecord,
  deleteEntityRecord,
  deleteRuleRecord,
  deleteSourceRecord,
  deleteTagRecord,
  getSourceRecordById,
  toggleCategoryRecord,
  toggleRuleRecord,
  toggleSourceRecord,
  toggleTagRecord,
  updateCategoryRecord,
  updateSourceRecord,
} from "@/lib/repositories/app-repository";
import { appConfig } from "@/lib/env";
import { requireOwnerActionSession } from "@/lib/auth-guards";
import { normalizeSourceInput, SourceValidationError } from "@/lib/source-normalization";
import {
  createCategoryMutationState,
  createEmptyCategoryFormValues,
  type CategoryFormValues,
  type CategoryMutationState,
} from "@/lib/category-forms";
import {
  createEmptySourceFormValues,
  createSourceMutationState,
  type SourceFormValues,
  type SourceMutationState,
} from "@/lib/source-forms";
import { entityKinds, type EntityKind, type ThemeTone } from "@/lib/domain";
import { createSettingsToast, serializeSettingsToast, SETTINGS_TOAST_COOKIE } from "@/lib/settings-toast";
import { splitCommaList } from "@/lib/utils";

function readSourceMutationValues(formData: FormData): SourceFormValues {
  return {
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    type: String(formData.get("type") ?? "website") as "rss" | "website" | "youtube" | "x",
    extractorProfile: String(formData.get("extractorProfile") ?? "") as SourceFormValues["extractorProfile"],
    url: String(formData.get("url") ?? "").trim(),
    entityId: String(formData.get("entityId") ?? ""),
    priority: String(formData.get("priority") ?? "70"),
    refreshMinutes: String(formData.get("refreshMinutes") ?? "30"),
    isActive: formData.get("isActive") === "on",
    defaultTagIds: formData.getAll("defaultTagIds").map(String),
  };
}

function withSourceState(
  previousState: SourceMutationState,
  values: ReturnType<typeof readSourceMutationValues>,
  overrides?: Partial<Omit<SourceMutationState, "values">>,
) {
  return createSourceMutationState(values, {
    nonce: previousState.nonce + 1,
    ...overrides,
  });
}

function readCategoryMutationValues(formData: FormData): CategoryFormValues {
  return {
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    tone: String(formData.get("tone") ?? "sand") as ThemeTone,
    position: String(formData.get("position") ?? "10"),
    isActive: formData.get("isActive") === "on",
    tagIds: formData.getAll("tagIds").map(String),
    entityIds: formData.getAll("entityIds").map(String),
    entityKinds: formData.getAll("entityKinds").map(String).filter((kind): kind is EntityKind => entityKinds.includes(kind as EntityKind)),
  };
}

function withCategoryState(
  previousState: CategoryMutationState,
  values: CategoryFormValues,
  overrides?: Partial<Omit<CategoryMutationState, "values">>,
) {
  return createCategoryMutationState(values, {
    nonce: previousState.nonce + 1,
    ...overrides,
  });
}

async function setSettingsToastMessage(message: string) {
  const cookieStore = await cookies();
  cookieStore.set(SETTINGS_TOAST_COOKIE, serializeSettingsToast(createSettingsToast(message)), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
  });
}

async function persistAndScheduleSourceValidation(
  sourceId: string,
  actionLabel: "created" | "updated",
) {
  const successMessage = `Source ${actionLabel}. Background validation started.`;

  try {
    await inngest.send({
      name: "signal/source.sync",
      data: { sourceId },
    });

    return {
      status: "success" as const,
      message: successMessage,
    };
  } catch (error) {
    return {
      status: "success" as const,
      message: "Source saved, but background validation could not be scheduled.",
    };
  }
}

export async function createSourceAction(
  previousState: SourceMutationState,
  formData: FormData,
): Promise<SourceMutationState> {
  await requireOwnerActionSession();
  const values = readSourceMutationValues(formData);

  if (!values.name) {
    return withSourceState(previousState, values, {
      status: "error",
      message: "Source name is required.",
      fieldErrors: { name: "Source name is required." },
    });
  }

  if (!values.url) {
    return withSourceState(previousState, values, {
      status: "error",
      message: "Source URL is required.",
      fieldErrors: { url: "Source URL is required." },
    });
  }

  try {
    const normalized = await normalizeSourceInput({
      type: values.type,
      url: values.url,
      extractorProfile: values.extractorProfile,
    });

    const sourceId = await createSourceRecord({
      name: values.name,
      type: values.type,
      url: normalized.url,
      config: normalized.config,
      entityId: values.entityId || null,
      priority: Number(values.priority || "70"),
      refreshMinutes: Number(values.refreshMinutes || "30"),
      isActive: values.isActive,
      defaultTagIds: values.defaultTagIds,
    });

    const validation = sourceId
      ? appConfig.hasDatabase
        ? await persistAndScheduleSourceValidation(sourceId, "created")
        : {
            status: "success" as const,
            message: "Source created. Demo-mode changes are stored in this browser.",
          }
      : {
          status: "error" as const,
          message: "Source was not created.",
        };

    if (validation.status === "success") {
      await setSettingsToastMessage(validation.message);
    }

    return createSourceMutationState(createEmptySourceFormValues(), {
      status: validation.status,
      message: validation.message,
      nonce: previousState.nonce + 1,
    });
  } catch (error) {
    if (error instanceof SourceValidationError) {
      return withSourceState(previousState, values, {
        status: "error",
        message: error.message,
        fieldErrors: { [error.field]: error.message },
      });
    }

    return withSourceState(previousState, values, {
      status: "error",
      message: error instanceof Error ? error.message : "Could not create source.",
    });
  }
}

export async function updateSourceAction(
  previousState: SourceMutationState,
  formData: FormData,
): Promise<SourceMutationState> {
  await requireOwnerActionSession();
  const values = readSourceMutationValues(formData);

  if (!values.id) {
    return withSourceState(previousState, values, {
      status: "error",
      message: "Missing source id.",
    });
  }

  if (!values.name) {
    return withSourceState(previousState, values, {
      status: "error",
      message: "Source name is required.",
      fieldErrors: { name: "Source name is required." },
    });
  }

  if (!values.url) {
    return withSourceState(previousState, values, {
      status: "error",
      message: "Source URL is required.",
      fieldErrors: { url: "Source URL is required." },
    });
  }

  try {
    const existingSource = await getSourceRecordById(values.id);
    if (!existingSource) {
      return withSourceState(previousState, values, {
        status: "error",
        message: "Source not found.",
      });
    }

    const normalized = await normalizeSourceInput({
      type: values.type,
      url: values.url,
      extractorProfile: values.extractorProfile,
      existingSource,
    });

    const sourceId = await updateSourceRecord({
      id: values.id,
      name: values.name,
      type: values.type,
      url: normalized.url,
      config: normalized.config,
      entityId: values.entityId || null,
      priority: Number(values.priority || "70"),
      refreshMinutes: Number(values.refreshMinutes || "30"),
      isActive: values.isActive,
      defaultTagIds: values.defaultTagIds,
    });

    const validation = appConfig.hasDatabase
      ? await persistAndScheduleSourceValidation(sourceId, "updated")
      : {
          status: "success" as const,
          message: "Source updated. Demo-mode changes are stored in this browser.",
        };

    if (validation.status === "success") {
      await setSettingsToastMessage(validation.message);
    }

    return withSourceState(previousState, values, {
      status: validation.status,
      message: validation.message,
    });
  } catch (error) {
    if (error instanceof SourceValidationError) {
      return withSourceState(previousState, values, {
        status: "error",
        message: error.message,
        fieldErrors: { [error.field]: error.message },
      });
    }

    return withSourceState(previousState, values, {
      status: "error",
      message: error instanceof Error ? error.message : "Could not update source.",
    });
  }
}

export async function toggleSourceAction(formData: FormData) {
  await requireOwnerActionSession();
  await toggleSourceRecord(String(formData.get("id")), formData.get("isActive") === "true");
  revalidatePath("/admin/sources");
  revalidatePath("/");
}

export async function deleteSourceAction(formData: FormData) {
  await requireOwnerActionSession();
  await deleteSourceRecord(String(formData.get("id")));
  await setSettingsToastMessage("Source deleted.");
}

export async function createEntityAction(formData: FormData) {
  await requireOwnerActionSession();
  await createEntityRecord({
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? "topic") as "topic" | "competitor" | "product",
    description: String(formData.get("description") ?? ""),
    color: String(formData.get("color") ?? "#197d71"),
  });

  revalidatePath("/admin/entities");
  revalidatePath("/");
}

export async function deleteEntityAction(formData: FormData) {
  await requireOwnerActionSession();
  await deleteEntityRecord(String(formData.get("id")));
  await setSettingsToastMessage("Entity deleted.");
  revalidatePath("/admin/entities");
  revalidatePath("/");
}

export async function createCategoryAction(
  previousState: CategoryMutationState,
  formData: FormData,
): Promise<CategoryMutationState> {
  await requireOwnerActionSession();
  const values = readCategoryMutationValues(formData);

  if (!values.name) {
    return withCategoryState(previousState, values, {
      status: "error",
      message: "Category name is required.",
      fieldErrors: { name: "Category name is required." },
    });
  }

  if (values.tagIds.length + values.entityIds.length + values.entityKinds.length === 0) {
    return withCategoryState(previousState, values, {
      status: "error",
      message: "Choose at least one tag, entity, or entity kind.",
      fieldErrors: { conditions: "Choose at least one tag, entity, or entity kind." },
    });
  }

  const position = Number(values.position);
  if (!Number.isFinite(position)) {
    return withCategoryState(previousState, values, {
      status: "error",
      message: "Order must be a number.",
      fieldErrors: { position: "Order must be a number." },
    });
  }

  await createCategoryRecord({
    name: values.name,
    description: values.description,
    tone: values.tone,
    position,
    isActive: values.isActive,
    tagIds: values.tagIds,
    entityIds: values.entityIds,
    entityKinds: values.entityKinds,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/");

  return createCategoryMutationState(createEmptyCategoryFormValues({ position: values.position }), {
    status: "success",
    message: "Category created.",
    nonce: previousState.nonce + 1,
  });
}

export async function updateCategoryAction(
  previousState: CategoryMutationState,
  formData: FormData,
): Promise<CategoryMutationState> {
  await requireOwnerActionSession();
  const values = readCategoryMutationValues(formData);

  if (!values.id) {
    return withCategoryState(previousState, values, {
      status: "error",
      message: "Missing category id.",
    });
  }

  if (!values.name) {
    return withCategoryState(previousState, values, {
      status: "error",
      message: "Category name is required.",
      fieldErrors: { name: "Category name is required." },
    });
  }

  if (values.tagIds.length + values.entityIds.length + values.entityKinds.length === 0) {
    return withCategoryState(previousState, values, {
      status: "error",
      message: "Choose at least one tag, entity, or entity kind.",
      fieldErrors: { conditions: "Choose at least one tag, entity, or entity kind." },
    });
  }

  const position = Number(values.position);
  if (!Number.isFinite(position)) {
    return withCategoryState(previousState, values, {
      status: "error",
      message: "Order must be a number.",
      fieldErrors: { position: "Order must be a number." },
    });
  }

  await updateCategoryRecord({
    id: values.id,
    name: values.name,
    description: values.description,
    tone: values.tone,
    position,
    isActive: values.isActive,
    tagIds: values.tagIds,
    entityIds: values.entityIds,
    entityKinds: values.entityKinds,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/");

  return withCategoryState(previousState, values, {
    status: "success",
    message: "Category updated.",
  });
}

export async function toggleCategoryAction(formData: FormData) {
  await requireOwnerActionSession();
  await toggleCategoryRecord(String(formData.get("id")), formData.get("isActive") === "true");
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireOwnerActionSession();
  await deleteCategoryRecord(String(formData.get("id")));
  await setSettingsToastMessage("Category deleted.");
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function createTagAction(formData: FormData) {
  await requireOwnerActionSession();
  await createTagRecord({
    name: String(formData.get("name") ?? ""),
    color: String(formData.get("color") ?? "#197d71"),
    parentId: String(formData.get("parentId") ?? "") || null,
    isActive: formData.get("isActive") === "on",
  });

  revalidatePath("/admin/tags");
  revalidatePath("/");
}

export async function toggleTagAction(formData: FormData) {
  await requireOwnerActionSession();
  await toggleTagRecord(String(formData.get("id")), formData.get("isActive") === "true");
  revalidatePath("/admin/tags");
  revalidatePath("/");
}

export async function deleteTagAction(formData: FormData) {
  await requireOwnerActionSession();
  await deleteTagRecord(String(formData.get("id")));
  await setSettingsToastMessage("Tag deleted.");
  revalidatePath("/admin/tags");
  revalidatePath("/");
}

export async function createRuleAction(formData: FormData) {
  await requireOwnerActionSession();
  await createRuleRecord({
    name: String(formData.get("name") ?? ""),
    sourceId: String(formData.get("sourceId") ?? "") || null,
    priority: Number(formData.get("priority") ?? 50),
    isActive: formData.get("isActive") === "on",
    keywords: splitCommaList(String(formData.get("keywords") ?? "")),
    urlContains: splitCommaList(String(formData.get("urlContains") ?? "")),
    tagIds: formData.getAll("tagIds").map(String),
  });

  revalidatePath("/admin/rules");
  revalidatePath("/");
}

export async function toggleRuleAction(formData: FormData) {
  await requireOwnerActionSession();
  await toggleRuleRecord(String(formData.get("id")), formData.get("isActive") === "true");
  revalidatePath("/admin/rules");
  revalidatePath("/");
}

export async function deleteRuleAction(formData: FormData) {
  await requireOwnerActionSession();
  await deleteRuleRecord(String(formData.get("id")));
  await setSettingsToastMessage("Rule deleted.");
  revalidatePath("/admin/rules");
  revalidatePath("/");
}
