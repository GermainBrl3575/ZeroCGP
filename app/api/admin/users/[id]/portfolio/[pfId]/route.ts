import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "germain@burel.net";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

const YF_HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };
const YF_ALIASES: Record<string, string> = { "SWRD.PA": "SWRD.L", "SGLD.PA": "SGLD.L", "IBGS.PA": "IBGS.L" };

async function fetchYahoo(symbol: string) {
  const yfSym = YF_ALIASES[symbol] || symbol;
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?range=1y&interval=1d`, { headers: YF_HEADERS, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.chart?.result?.[0] || null;
  } catch { return null; }
}

export async function GET(req: NextRequest, { params }: { params: { id: string; pfId: string } }) {
  const authHeader = req.headers.get("cookie") || "";
  const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { cookie: authHeader } } });
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id: userId, pfId } = params;

  try {
    const { data: portfolio } = await supabase.from("portfolios").select("id, name, type, created_at, user_id").eq("id", pfId).single();
    if (!portfolio || portfolio.user_id !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const userEmail = authUser?.user?.email || "unknown";

    const { data: assets } = await supabase.from("portfolio_assets").select("id, symbol, name, type, weight, target_amount, quantity").eq("portfolio_id", pfId).order("weight", { ascending: false });
    if (!assets?.length) return NextResponse.json({ error: "Empty portfolio" }, { status: 404 });

    const capitalInitial = assets.reduce((s, a) => s + (a.target_amount || 0), 0);
    let valeurActuelle = 0;

    const enrichedAssets = await Promise.all(assets.map(async (a) => {
      const result = await fetchYahoo(a.symbol);
      const currentPrice = result?.meta?.regularMarketPrice || 0;
      const closes = (result?.indicators?.quote?.[0]?.close || []).filter(Boolean);
      const isPlaceholder = a.target_amount > 0 && a.quantity > 0 && Math.abs(a.quantity - a.target_amount / 100) < 0.02;
      const qty = isPlaceholder || !a.quantity ? (a.target_amount > 0 && (closes[0] || currentPrice) > 0 ? a.target_amount / (closes[0] || currentPrice) : 0) : a.quantity;
      const currentValue = currentPrice > 0 ? currentPrice * qty : a.target_amount || 0;
      valeurActuelle += currentValue;
      const perfs: Record<string, number> = {};
      for (const [label, days] of [["1D", 1], ["1M", 21], ["3M", 63], ["6M", 126], ["1Y", 252]] as [string, number][]) {
        if (closes.length > days) { const old = closes[closes.length - 1 - days]; if (old > 0 && currentPrice > 0) perfs[label] = Math.round(((currentPrice - old) / old) * 10000) / 100; }
      }
      return { id: a.id, symbol: a.symbol, name: a.name, type: a.type, weight: a.weight, targetAmount: a.target_amount || 0, currentPrice: Math.round(currentPrice * 100) / 100, currentValue: Math.round(currentValue), perfs };
    }));

    const perfSinceCreation = capitalInitial > 0 ? Math.round(((valeurActuelle - capitalInitial) / capitalInitial) * 10000) / 100 : 0;

    await supabase.from("admin_actions_log").insert({ admin_email: ADMIN_EMAIL, action: "view_user_portfolio", target_type: "portfolio", target_id: pfId, details: { user_id: userId, user_email: userEmail } }).then(() => {});

    return NextResponse.json({ portfolio: { ...portfolio, userEmail, capitalInitial: Math.round(capitalInitial), valeurActuelle: Math.round(valeurActuelle), perfSinceCreation }, assets: enrichedAssets });
  } catch (err) { console.error("Admin view portfolio error:", err); return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
