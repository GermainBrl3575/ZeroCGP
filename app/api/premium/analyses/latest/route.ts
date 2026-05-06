import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const auth = await verifyUser(req);
  if (auth instanceof NextResponse) return auth;

  const portfolioId = req.nextUrl.searchParams.get("portfolio_id");
  if (!portfolioId) {
    return NextResponse.json({ error: "Missing portfolio_id" }, { status: 400 });
  }

  const { data: analysis } = await supabase
    .from("premium_analyses")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .eq("user_id", auth.user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!analysis) {
    return NextResponse.json({ analysis: null });
  }

  return NextResponse.json({ analysis });
}
