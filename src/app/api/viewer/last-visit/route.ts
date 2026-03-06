import { NextResponse } from "next/server";
import { setLastVisitTimestamp } from "@/lib/repositories/app-repository";

export async function POST() {
  await setLastVisitTimestamp();
  return NextResponse.json({ ok: true });
}
