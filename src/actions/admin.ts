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
  toggleRuleRecord,
  toggleSourceRecord,
  toggleTagRecord,
} from "@/lib/repositories/app-repository";
import { splitCommaList } from "@/lib/utils";

export async function createSourceAction(formData: FormData) {
  await createSourceRecord({
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "website") as "rss" | "website" | "youtube" | "x",
    url: String(formData.get("url") ?? ""),
    entityId: String(formData.get("entityId") ?? "") || null,
    priority: Number(formData.get("priority") ?? 50),
    refreshMinutes: Number(formData.get("refreshMinutes") ?? 30),
    isActive: formData.get("isActive") === "on",
    defaultTagIds: formData.getAll("defaultTagIds").map(String),
  });

  revalidatePath("/admin/sources");
  revalidatePath("/");
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
}

export async function deleteRuleAction(formData: FormData) {
  await deleteRuleRecord(String(formData.get("id")));
  revalidatePath("/admin/rules");
}
