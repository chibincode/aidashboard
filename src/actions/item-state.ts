"use server";

import { revalidatePath } from "next/cache";
import { upsertItemState } from "@/lib/repositories/app-repository";

export async function setItemReadAction(feedItemId: string, nextValue: boolean) {
  await upsertItemState(feedItemId, {
    isRead: nextValue,
    lastViewedAt: new Date(),
  });

  revalidatePath("/");
}

export async function toggleSavedAction(feedItemId: string, nextValue: boolean) {
  await upsertItemState(feedItemId, {
    isSaved: nextValue,
    ...(nextValue ? { isRead: true } : {}),
    lastViewedAt: new Date(),
  });

  revalidatePath("/");
}
