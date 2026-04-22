import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, supabaseAdmin, ADMIN_EMAIL } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const type = req.nextUrl.searchParams.get("type");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  try {
    let query = supabaseAdmin.from("portfolios").select("id, name, type, created_at, user_id").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (type) query = query.eq("type", type);
    const { data: portfolios, error } = await query;
    if (error) throw error;

    const userIds = [...new Set((portfolios || []).map(p => p.user_id))];
    const userEmails: Record<string, string> = {};
    for (const uid of userIds) { const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid); if (u?.user?.email) userEmails[uid] = u.user.email; }

    const pfIds = (portfolios || []).map(p => p.id);
    const { data: allAssets } = await supabaseAdmin.from("portfolio_assets").select("portfolio_id, target_amount").in("portfolio_id", pfIds);
    const pfMeta: Record<string, { count: number; capital: number }> = {};
    (allAssets || []).forEach(a => { if (!pfMeta[a.portfolio_id]) pfMeta[a.portfolio_id] = { count: 0, capital: 0 }; pfMeta[a.portfolio_id].count++; pfMeta[a.portfolio_id].capital += a.target_amount || 0; });

    const enriched = (portfolios || []).map(p => ({ ...p, user_email: userEmails[p.user_id] || "?", asset_count: pfMeta[p.id]?.count || 0, capital: Math.round(pfMeta[p.id]?.capital || 0) }));
    await supabaseAdmin.from("admin_actions_log").insert({ admin_email: ADMIN_EMAIL, action: "list_portfolios", details: { type, limit, offset, count: enriched.length } });
    return NextResponse.json({ portfolios: enriched, total: enriched.length });
  } catch (err) { console.error("Admin list portfolios error:", err); return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
