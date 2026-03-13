import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { appConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const rawType = requestUrl.searchParams.get("type");
  const type = (rawType === "magiclink" || rawType === "signup" ? "email" : rawType) as EmailOtpType | null;
  const nextPath = requestUrl.searchParams.get("next") ?? requestUrl.searchParams.get("redirect_to") ?? "/";

  if (!tokenHash || !type || !appConfig.hasSupabaseAuth) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", requestUrl.origin));
  }

  const redirectPath = nextPath.startsWith("/") ? nextPath : "/";
  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
