import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "germain@burel.net";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("cookie") || "";
  const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { cookie: authHeader } } });
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const type = req.nextUrl.searchParams.get("type");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  try {
    let query = supabase.from("portfolios").select("id, name, type, created_at, user_id").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (type) query = query.eq("type", type);

    const { data: portfolios, error } = await query;
    if (error) throw error;

    // Get user emails
    const userIds = [...new Set((portfolios || []).map(p => p.user_id))];
    const userEmails: Record<string, string> = {};
    for (const uid of userIds) {
      const { data: u } = await supabase.auth.admin.getUserById(uid);
      if (u?.user?.email) userEmails[uid] = u.user.email;
    }

    // Get asset counts + capital per portfolio
    const pfIds = (portfolios || []).map(p => p.id);
    const { data: allAssets } = await supabase.from("portfolio_assets").select("portfolio_id, target_amount").in("portfolio_id", pfIds);

    const pfMeta: Record<string, { count: number; capital: number }> = {};
    (allAssets || []).forEach(a => {
      if (!pfMeta[a.portfolio_id]) pfMeta[a.portfolio_id] = { count: 0, capital: 0 };
      pfMeta[a.portfolio_id].count++;
      pfMeta[a.portfolio_id].capital += a.target_amount || 0;
    });

    const enriched = (portfolios || []).map(p => ({
      ...p,
      user_email: userEmails[p.user_id] || "?",
      asset_count: pfMeta[p.id]?.count || 0,
      capital: Math.round(pfMeta[p.id]?.capital || 0),
    }));

    await supabase.from("admin_actions_log").insert({ admin_email: ADMIN_EMAIL, action: "list_portfolios", details: { type, limit, offset, count: enriched.length } }).then(() => {});

    return NextResponse.json({ portfolios: enriched, total: enriched.length });
  } catch (err) {
    console.error("Admin list portfolios error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
