import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, supabaseAdmin, ADMIN_EMAIL } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const userId = params.id;
  try {
    const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !authUser?.user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const u = authUser.user;
    const { data: portfolios } = await supabaseAdmin.from("portfolios").select("id, name, type, created_at").eq("user_id", userId).order("created_at", { ascending: false });

    const enrichedPortfolios = await Promise.all((portfolios || []).map(async (pf) => {
      const { data: assets } = await supabaseAdmin.from("portfolio_assets").select("symbol, name, type, weight, target_amount").eq("portfolio_id", pf.id).order("weight", { ascending: false });
      const capital = (assets || []).reduce((s, a) => s + (a.target_amount || 0), 0);
      return { ...pf, asset_count: assets?.length || 0, capital: Math.round(capital), assets: assets || [] };
    }));

    await supabaseAdmin.from("admin_actions_log").insert({ admin_email: ADMIN_EMAIL, action: "view_user", target_type: "user", target_id: userId });
    return NextResponse.json({
      user: { id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, full_name: u.user_metadata?.full_name || u.user_metadata?.name || null, is_admin: u.email === ADMIN_EMAIL },
      portfolios: enrichedPortfolios,
    });
  } catch (err) { console.error("Admin view user error:", err); return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
