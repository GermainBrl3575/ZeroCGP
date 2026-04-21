import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "germain@burel.net";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  try {
    // Get all users via admin API
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers({
      page: Math.floor(offset / limit) + 1,
      perPage: limit,
    });

    if (authErr) throw authErr;

    // Get portfolio counts per user
    const { data: portfolios } = await supabase
      .from("portfolios")
      .select("user_id, id, created_at");

    const pfByUser: Record<string, { count: number; lastAt: string | null }> = {};
    (portfolios || []).forEach(p => {
      if (!pfByUser[p.user_id]) pfByUser[p.user_id] = { count: 0, lastAt: null };
      pfByUser[p.user_id].count++;
      if (!pfByUser[p.user_id].lastAt || p.created_at > pfByUser[p.user_id].lastAt!) {
        pfByUser[p.user_id].lastAt = p.created_at;
      }
    });

    const users = (authUsers?.users || []).map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      full_name: u.user_metadata?.full_name || u.user_metadata?.name || null,
      portfolio_count: pfByUser[u.id]?.count || 0,
      last_portfolio_at: pfByUser[u.id]?.lastAt || null,
    }));

    // Log admin action
    await supabase.from("admin_actions_log").insert({
      admin_email: ADMIN_EMAIL,
      action: "list_users",
      details: { limit, offset, count: users.length },
    }).then(() => {});

    return NextResponse.json({ users, total: authUsers?.users?.length || 0 });
  } catch (err) {
    console.error("Admin list users error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
