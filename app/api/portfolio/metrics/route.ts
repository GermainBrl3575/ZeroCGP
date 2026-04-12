import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

const YF_ALIASES: Record<string, string> = {
  "SWRD.PA": "SWRD.L", "SGLD.PA": "SGLD.L", "IBGS.PA": "IBGS.L",
  "AGGH.PA": "AGGH.L", "IUSN.PA": "IUSN.DE", "EIMI.PA": "EIMI.L",
};

async function fetchYahoo(symbol: string, range: string, interval: string) {
  const yfSym = YF_ALIASES[symbol] || symbol;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?range=${range}&interval=${interval}`;
  try {
    const res = await fetch(url, { headers: YF_HEADERS, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.chart?.result?.[0] || null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const portfolioId = req.nextUrl.searchParams.get("id");
  if (!portfolioId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: portfolio } = await supabase
    .from("portfolios").select("id, name, type, created_at")
    .eq("id", portfolioId).single();

  const { data: assets } = await supabase
    .from("portfolio_assets").select("id, symbol, name, type, weight, target_amount, quantity")
    .eq("portfolio_id", portfolioId).order("weight", { ascending: false });

  if (!portfolio || !assets?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch 1Y daily data for each asset (covers all period calculations + evolution chart)
  const yahooData: Record<string, { currentPrice: number; closes: number[]; timestamps: number[] }> = {};
  await Promise.all(assets.map(async (a) => {
    const result = await fetchYahoo(a.symbol, "1y", "1d");
    if (!result) return;
    const closes = (result.indicators?.quote?.[0]?.close || []).map((c: number | null) => c ?? 0);
    const timestamps = result.timestamp || [];
    yahooData[a.symbol] = {
      currentPrice: result.meta?.regularMarketPrice || 0,
      closes,
      timestamps,
    };
  }));

  // Enrich assets
  const capitalInitial = assets.reduce((s, a) => s + (a.target_amount || 0), 0);
  let valeurActuelle = 0;

  const enrichedAssets = assets.map(a => {
    const yahoo = yahooData[a.symbol];
    const currentPrice = yahoo?.currentPrice || 0;
    // Detect placeholder quantities from old saves (amount/100)
    const isPlaceholder = a.target_amount > 0 && a.quantity > 0
      && Math.abs(a.quantity - a.target_amount / 100) < 0.02;
    // Real quantity: use stored if valid, else compute from initial price
    let qty: number;
    if (isPlaceholder || !a.quantity) {
      // Fallback: use first available close as proxy for creation price
      const closes = yahoo?.closes || [];
      const initialPrice = closes[0] || currentPrice || 1;
      qty = a.target_amount > 0 ? a.target_amount / initialPrice : 0;
    } else {
      qty = a.quantity;
    }
    const currentValue = currentPrice > 0 ? currentPrice * qty : a.target_amount || 0;
    valeurActuelle += currentValue;

    const closes = yahoo?.closes || [];
    const perfs: Record<string, number> = {};
    const periodsMap: [string, number][] = [["1D", 1], ["1M", 21], ["3M", 63], ["6M", 126], ["1Y", 252]];
    for (const [label, days] of periodsMap) {
      if (closes.length > days) {
        const oldPrice = closes[closes.length - 1 - days];
        if (oldPrice > 0 && currentPrice > 0) {
          perfs[label] = Math.round(((currentPrice - oldPrice) / oldPrice) * 10000) / 100;
        }
      }
    }
    perfs["sinceCreation"] = a.target_amount > 0
      ? Math.round(((currentValue - a.target_amount) / a.target_amount) * 10000) / 100
      : 0;

    return {
      id: a.id, symbol: a.symbol, name: a.name, type: a.type,
      weight: a.weight, targetAmount: a.target_amount || 0,
      currentPrice: Math.round(currentPrice * 100) / 100,
      currentValue: Math.round(currentValue),
      perfs,
    };
  });

  // Portfolio-level perf
  const perfSinceCreation = capitalInitial > 0
    ? Math.round(((valeurActuelle - capitalInitial) / capitalInitial) * 10000) / 100
    : 0;

  // Weighted portfolio perfs by period
  const totalWeight = enrichedAssets.reduce((s, a) => s + a.weight, 0) || 1;
  const portfolioPerfs: Record<string, number> = {};
  for (const period of ["1D", "1M", "3M", "6M", "1Y"]) {
    portfolioPerfs[period] = Math.round(
      enrichedAssets.reduce((s, a) => s + (a.perfs[period] || 0) * a.weight / totalWeight, 0) * 100
    ) / 100;
  }

  // Volatility (annualized std of daily returns, last 63 trading days)
  const dailyReturns: number[] = [];
  const minLen = Math.min(...enrichedAssets.map(a => yahooData[a.symbol]?.closes?.length || 0));
  for (let d = 1; d < Math.min(minLen, 63); d++) {
    let pfReturn = 0;
    enrichedAssets.forEach(a => {
      const closes = yahooData[a.symbol]?.closes || [];
      if (closes[d] > 0 && closes[d - 1] > 0) {
        pfReturn += ((closes[d] - closes[d - 1]) / closes[d - 1]) * (a.weight / totalWeight);
      }
    });
    dailyReturns.push(pfReturn);
  }
  const mean = dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length : 0;
  const volatilite = Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100;

  // Sharpe (simplified: annualized return / vol, rf=3%)
  const sharpe = volatilite > 0 ? Math.round((perfSinceCreation - 3) / volatilite * 100) / 100 : 0;

  // Diversification score /10
  const etfs = enrichedAssets.filter(a => a.type === "etf").length;
  const stocks = enrichedAssets.filter(a => a.type === "stock").length;
  const topWeight = Math.max(...enrichedAssets.map(a => a.weight), 0);
  let diversificationScore = 5;
  if (enrichedAssets.length >= 8) diversificationScore++;
  if (enrichedAssets.length >= 10) diversificationScore++;
  if (etfs >= 3) diversificationScore++;
  if (topWeight < 35) diversificationScore++;
  if (stocks >= 2 && etfs >= 2) diversificationScore++;
  diversificationScore = Math.min(diversificationScore, 10);

  // Evolution: daily portfolio value
  const evolution: { date: string; value: number }[] = [];
  const refSymbol = enrichedAssets[0]?.symbol;
  const refTs = yahooData[refSymbol]?.timestamps || [];
  for (let d = 0; d < refTs.length; d++) {
    let dayValue = 0;
    enrichedAssets.forEach(a => {
      const closes = yahooData[a.symbol]?.closes || [];
      const firstClose = closes[0] || 1;
      const qty = a.targetAmount > 0 && firstClose > 0 ? a.targetAmount / firstClose : 0;
      dayValue += (closes[d] || 0) * qty;
    });
    const date = new Date(refTs[d] * 1000).toISOString().split("T")[0];
    evolution.push({ date, value: Math.round(dayValue) });
  }

  // Max drawdown + peak
  let peak = 0, maxDrawdown = 0;
  evolution.forEach(e => {
    if (e.value > peak) peak = e.value;
    const dd = peak > 0 ? ((e.value - peak) / peak) * 100 : 0;
    if (dd < maxDrawdown) maxDrawdown = dd;
  });

  return NextResponse.json({
    portfolio: {
      ...portfolio,
      capitalInitial: Math.round(capitalInitial),
      valeurActuelle: Math.round(valeurActuelle),
      perfSinceCreation,
      portfolioPerfs,
      volatilite,
      sharpe,
      diversificationScore,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      peakValue: Math.round(peak),
      daysSinceCreation: Math.floor((Date.now() - new Date(portfolio.created_at).getTime()) / 86400000),
      evolution,
    },
    assets: enrichedAssets,
  });
}
