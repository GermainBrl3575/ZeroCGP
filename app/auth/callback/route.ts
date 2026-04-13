import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Handle code exchange (OAuth or magic link)
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // Handle email confirmation via token_hash
  if (token_hash && type) {
    await supabase.auth.verifyOtp({ token_hash, type: type as "email" | "signup" });
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // Fallback: redirect to login
  return NextResponse.redirect(`${origin}/auth/login`);
}
