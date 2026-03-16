import { NextResponse } from "next/server";
import { syncDueSourcesForCurrentOwner } from "@/lib/ingestion/due-source-sync";

export async function POST() {
  const result = await syncDueSourcesForCurrentOwner();
  return NextResponse.json(result);
}
