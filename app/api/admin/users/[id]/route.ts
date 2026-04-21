import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "germain@burel.net";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Double-check admin
  const authHeader = req.headers.get("cookie") || "";
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { cookie: authHeader } } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = params.id;

  try {
    // Get user info
    const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(userId);
    if (authErr || !authUser?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const u = authUser.user;

    // Get portfolios with assets
    const { data: portfolios } = await supabase
      .from("portfolios")
      .select("id, name, type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const enrichedPortfolios = await Promise.all(
      (portfolios || []).map(async (pf) => {
        const { data: assets } = await supabase
          .from("portfolio_assets")
          .select("symbol, name, type, weight, target_amount")
          .eq("portfolio_id", pf.id)
          .order("weight", { ascending: false });

        const capital = (assets || []).reduce((s, a) => s + (a.target_amount || 0), 0);
        return {
          ...pf,
          asset_count: assets?.length || 0,
          capital: Math.round(capital),
          assets: assets || [],
        };
      })
    );

    // Log admin action
    await supabase.from("admin_actions_log").insert({
      admin_email: ADMIN_EMAIL,
      action: "view_user",
      target_type: "user",
      target_id: userId,
    }).then(() => {});

    return NextResponse.json({
      user: {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || null,
        is_admin: u.email === ADMIN_EMAIL,
      },
      portfolios: enrichedPortfolios,
    });
  } catch (err) {
    console.error("Admin view user error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
