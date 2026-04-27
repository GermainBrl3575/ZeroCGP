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

  // Fetch 1Y daily data for each asset (with currency)
  const yahooData: Record<string, {
    currentPrice: number; closes: number[]; timestamps: number[]; currency: string;
  }> = {};
  await Promise.all(assets.map(async (a) => {
    const result = await fetchYahoo(a.symbol, "1y", "1d");
    if (!result) return;
    const closes = (result.indicators?.quote?.[0]?.close || []).map((c: number | null) => c ?? 0);
    const timestamps = result.timestamp || [];
    yahooData[a.symbol] = {
      currentPrice: result.meta?.regularMarketPrice || 0,
      closes,
      timestamps,
      currency: result.meta?.currency || "EUR",
    };
  }));

  // Fetch EUR/USD rates if any asset is quoted in USD
  // EURUSD=X ≈ 1.08 means 1 EUR = 1.08 USD → to convert USD→EUR: price / rate
  const needsUsd = Object.values(yahooData).some(d => d.currency === "USD");
  let fxTs: number[] = [];
  let fxCloses: number[] = [];
  if (needsUsd) {
    const fxResult = await fetchYahoo("EURUSD=X", "1y", "1d");
    if (fxResult) {
      fxTs = fxResult.timestamp || [];
      fxCloses = (fxResult.indicators?.quote?.[0]?.close || []).map((c: number | null) => c ?? 1);
    }
  }

  function usdToEur(usdPrice: number, targetTs: number): number {
    if (!fxTs.length) return usdPrice;
    let idx = 0;
    for (let i = 0; i < fxTs.length; i++) {
      if (fxTs[i] <= targetTs) idx = i;
      else break;
    }
    const rate = fxCloses[idx] || 1;
    return rate > 0 ? usdPrice / rate : usdPrice;
  }

  // Pre-compute EUR-converted closes + current price per asset
  const eurData: Record<string, { closes: number[]; currentPrice: number }> = {};
  for (const a of assets) {
    const y = yahooData[a.symbol];
    if (!y) { eurData[a.symbol] = { closes: [], currentPrice: 0 }; continue; }
    if (y.currency === "USD") {
      const closes = y.closes.map((c, i) => usdToEur(c, y.timestamps[i]));
      const lastTs = y.timestamps[y.timestamps.length - 1] || Date.now() / 1000;
      eurData[a.symbol] = { closes, currentPrice: usdToEur(y.currentPrice, lastTs) };
    } else if (y.currency !== "EUR") {
      // GBP, CHF, JPY… TODO: add more FX pairs
      console.warn(`[metrics] Unhandled currency ${y.currency} for ${a.symbol}`);
      eurData[a.symbol] = { closes: y.closes, currentPrice: y.currentPrice };
    } else {
      eurData[a.symbol] = { closes: y.closes, currentPrice: y.currentPrice };
    }
  }

  // Enrich assets (all values in EUR)
  const capitalInitial = assets.reduce((s, a) => s + (a.target_amount || 0), 0);
  let valeurActuelle = 0;

  const enrichedAssets = assets.map(a => {
    const eur = eurData[a.symbol];
    const currentPrice = eur?.currentPrice || 0;
    const closes = eur?.closes || [];

    const isPlaceholder = a.target_amount > 0 && a.quantity > 0
      && Math.abs(a.quantity - a.target_amount / 100) < 0.02;
    let qty: number;
    if (isPlaceholder || !a.quantity) {
      const initialPrice = closes[0] || currentPrice || 1;
      qty = a.target_amount > 0 ? a.target_amount / initialPrice : 0;
    } else {
      qty = a.quantity;
    }
    const currentValue = currentPrice > 0 ? currentPrice * qty : a.target_amount || 0;
    valeurActuelle += currentValue;

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

  const totalWeight = enrichedAssets.reduce((s, a) => s + a.weight, 0) || 1;
  const portfolioPerfs: Record<string, number> = {};
  for (const period of ["1D", "1M", "3M", "6M", "1Y"]) {
    portfolioPerfs[period] = Math.round(
      enrichedAssets.reduce((s, a) => s + (a.perfs[period] || 0) * a.weight / totalWeight, 0) * 100
    ) / 100;
  }

  // Volatility (annualized, EUR-converted closes)
  const dailyReturns: number[] = [];
  const minLen = Math.min(...enrichedAssets.map(a => eurData[a.symbol]?.closes?.length || 0));
  for (let d = 1; d < Math.min(minLen, 63); d++) {
    let pfReturn = 0;
    enrichedAssets.forEach(a => {
      const closes = eurData[a.symbol]?.closes || [];
      if (closes[d] > 0 && closes[d - 1] > 0) {
        pfReturn += ((closes[d] - closes[d - 1]) / closes[d - 1]) * (a.weight / totalWeight);
      }
    });
    dailyReturns.push(pfReturn);
  }
  const mean = dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length : 0;
  const volatilite = Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100;

  const daysSinceCreation = Math.max(1, Math.floor((Date.now() - new Date(portfolio.created_at).getTime()) / 86400000));
  const annualizedReturn = daysSinceCreation < 30 ? null : perfSinceCreation * (365 / daysSinceCreation);
  const volatiliteDisplay = daysSinceCreation < 30 ? null : volatilite;
  const sharpe = (volatilite > 0 && annualizedReturn !== null)
    ? Math.round((annualizedReturn - 3) / volatilite * 100) / 100 : null;

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

  // Evolution: EUR-converted, starting from portfolio creation date
  const creationTs = Math.floor(new Date(portfolio.created_at).getTime() / 1000);
  const refSymbol = enrichedAssets[0]?.symbol;
  const refTs = yahooData[refSymbol]?.timestamps || [];
  const creationIdx = refTs.findIndex(ts => ts >= creationTs);

  // Qty per asset based on EUR close at creation date
  const evoQty: Record<string, number> = {};
  enrichedAssets.forEach(a => {
    const closes = eurData[a.symbol]?.closes || [];
    const price = (creationIdx >= 0 ? closes[creationIdx] : null) || closes.find(c => c > 0) || 1;
    evoQty[a.symbol] = a.targetAmount > 0 ? a.targetAmount / price : 0;
  });

  const evolution: { date: string; value: number }[] = [];
  if (creationIdx >= 0) {
    for (let d = creationIdx; d < refTs.length; d++) {
      let dayValue = 0;
      enrichedAssets.forEach(a => {
        const closes = eurData[a.symbol]?.closes || [];
        dayValue += (closes[d] || 0) * (evoQty[a.symbol] || 0);
      });
      evolution.push({
        date: new Date(refTs[d] * 1000).toISOString().split("T")[0],
        value: Math.round(dayValue),
      });
    }
  }
  const finalEvolution = evolution.length < 2 ? [] : evolution;

  // Max drawdown + peak
  let peak = 0, maxDrawdown = 0;
  finalEvolution.forEach(e => {
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
      volatilite: volatiliteDisplay,
      sharpe,
      diversificationScore,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      peakValue: Math.round(peak),
      daysSinceCreation: Math.floor((Date.now() - new Date(portfolio.created_at).getTime()) / 86400000),
      evolution: finalEvolution,
    },
    assets: enrichedAssets,
  });
}
