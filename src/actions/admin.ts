"use server";

import { revalidatePath } from "next/cache";
import {
  createEntityRecord,
  createRuleRecord,
  createSourceRecord,
  createTagRecord,
  deleteEntityRecord,
  deleteRuleRecord,
  deleteSourceRecord,
  deleteTagRecord,
  getSourceRecordById,
  toggleRuleRecord,
  toggleSourceRecord,
  toggleTagRecord,
  updateSourceRecord,
} from "@/lib/repositories/app-repository";
import { syncSourceById } from "@/lib/ingestion/sync";
import { appConfig } from "@/lib/env";
import { normalizeSourceInput, SourceValidationError } from "@/lib/source-normalization";
import {
  createEmptySourceFormValues,
  createSourceMutationState,
  type SourceFormValues,
  type SourceMutationState,
} from "@/lib/source-forms";
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

async function persistAndValidateSource(
  sourceId: string,
  actionLabel: "created" | "updated",
) {
  try {
    await syncSourceById(sourceId);
    return {
      status: "success" as const,
      message: `Source ${actionLabel} and validated.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed.";
    return {
      status: "error" as const,
      message: `Source ${actionLabel}, but validation failed: ${message}`,
    };
  }
}

export async function createSourceAction(
  previousState: SourceMutationState,
  formData: FormData,
): Promise<SourceMutationState> {
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

  if (!appConfig.hasDatabase) {
    return withSourceState(previousState, values, {
      status: "error",
      message: "Demo mode is read-only. Connect DATABASE_URL to manage sources.",
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

    revalidatePath("/admin/sources");
    revalidatePath("/");

    const validation = sourceId ? await persistAndValidateSource(sourceId, "created") : { status: "error" as const, message: "Source was not created." };

    revalidatePath("/admin/sources");
    revalidatePath("/");

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

  if (!appConfig.hasDatabase) {
    return withSourceState(previousState, values, {
      status: "error",
      message: "Demo mode is read-only. Connect DATABASE_URL to manage sources.",
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

    revalidatePath("/admin/sources");
    revalidatePath("/");

    const validation = await persistAndValidateSource(sourceId, "updated");

    revalidatePath("/admin/sources");
    revalidatePath("/");

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
  await toggleSourceRecord(String(formData.get("id")), formData.get("isActive") === "true");
  revalidatePath("/admin/sources");
  revalidatePath("/");
}

export async function deleteSourceAction(formData: FormData) {
  await deleteSourceRecord(String(formData.get("id")));
  revalidatePath("/admin/sources");
  revalidatePath("/");
}

export async function createEntityAction(formData: FormData) {
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
  await deleteEntityRecord(String(formData.get("id")));
  revalidatePath("/admin/entities");
  revalidatePath("/");
}

export async function createTagAction(formData: FormData) {
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
  await toggleTagRecord(String(formData.get("id")), formData.get("isActive") === "true");
  revalidatePath("/admin/tags");
  revalidatePath("/");
}

export async function deleteTagAction(formData: FormData) {
  await deleteTagRecord(String(formData.get("id")));
  revalidatePath("/admin/tags");
  revalidatePath("/");
}

export async function createRuleAction(formData: FormData) {
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
  await toggleRuleRecord(String(formData.get("id")), formData.get("isActive") === "true");
  revalidatePath("/admin/rules");
  revalidatePath("/");
}

export async function deleteRuleAction(formData: FormData) {
  await deleteRuleRecord(String(formData.get("id")));
  revalidatePath("/admin/rules");
  revalidatePath("/");
}
