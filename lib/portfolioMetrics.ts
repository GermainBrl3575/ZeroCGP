/**
 * Pure portfolio metrics calculations.
 * Extracted from /api/portfolio/metrics for testability.
 */

export interface RawAsset {
  id: string; symbol: string; name: string; type: string;
  weight: number; target_amount: number; quantity: number;
}

export interface YahooData {
  currentPrice: number; closes: number[]; timestamps: number[];
}

export interface EnrichedAsset {
  id: string; symbol: string; name: string; type: string;
  weight: number; targetAmount: number;
  currentPrice: number; currentValue: number;
  perfs: Record<string, number>;
}

export interface PortfolioMetrics {
  capitalInitial: number;
  valeurActuelle: number;
  perfSinceCreation: number;
  portfolioPerfs: Record<string, number>;
  volatilite: number;
  sharpe: number;
  diversificationScore: number;
  maxDrawdown: number;
  peakValue: number;
  evolution: { date: string; value: number }[];
  assets: EnrichedAsset[];
}

// ─── Detect if quantity is a placeholder (target_amount / 100) ────
export function isPlaceholderQty(quantity: number, targetAmount: number): boolean {
  return targetAmount > 0 && quantity > 0 && Math.abs(quantity - targetAmount / 100) < 0.02;
}

// ─── Compute real quantity from stored data + prices ──────────────
export function computeQuantity(
  asset: RawAsset, closes: number[], currentPrice: number, portfolioType: string
): number {
  const placeholder = isPlaceholderQty(asset.quantity, asset.target_amount);
  if (placeholder || !asset.quantity) {
    const initialPrice = closes[0] || currentPrice || 1;
    return asset.target_amount > 0 ? asset.target_amount / initialPrice : 0;
  }
  return asset.quantity;
}

// ─── Enrich assets with current values and perfs ──────────────────
export function enrichAssets(
  assets: RawAsset[], yahooData: Record<string, YahooData>, portfolioType: string
): { enriched: EnrichedAsset[]; capitalInitial: number; valeurActuelle: number } {
  const capitalInitial = assets.reduce((s, a) => s + (a.target_amount || 0), 0);
  let valeurActuelle = 0;

  const enriched = assets.map(a => {
    const yahoo = yahooData[a.symbol];
    const currentPrice = yahoo?.currentPrice || 0;
    const closes = yahoo?.closes || [];
    const qty = computeQuantity(a, closes, currentPrice, portfolioType);
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

  return { enriched, capitalInitial, valeurActuelle: Math.round(valeurActuelle) };
}

// ─── Portfolio-level perf since creation ───────────────────────────
export function perfSinceCreation(valeurActuelle: number, capitalInitial: number): number {
  return capitalInitial > 0
    ? Math.round(((valeurActuelle - capitalInitial) / capitalInitial) * 10000) / 100
    : 0;
}

// ─── Weighted portfolio perfs by period ───────────────────────────
export function computePortfolioPerfs(assets: EnrichedAsset[]): Record<string, number> {
  const totalWeight = assets.reduce((s, a) => s + a.weight, 0) || 1;
  const perfs: Record<string, number> = {};
  for (const period of ["1D", "1M", "3M", "6M", "1Y"]) {
    perfs[period] = Math.round(
      assets.reduce((s, a) => s + (a.perfs[period] || 0) * a.weight / totalWeight, 0) * 100
    ) / 100;
  }
  return perfs;
}

// ─── Annualized volatility from daily returns ─────────────────────
export function computeVolatility(
  assets: EnrichedAsset[], yahooData: Record<string, YahooData>
): number {
  const totalWeight = assets.reduce((s, a) => s + a.weight, 0) || 1;
  const dailyReturns: number[] = [];
  const minLen = Math.min(...assets.map(a => yahooData[a.symbol]?.closes?.length || 0));
  for (let d = 1; d < Math.min(minLen, 63); d++) {
    let pfReturn = 0;
    assets.forEach(a => {
      const closes = yahooData[a.symbol]?.closes || [];
      if (closes[d] > 0 && closes[d - 1] > 0) {
        pfReturn += ((closes[d] - closes[d - 1]) / closes[d - 1]) * (a.weight / totalWeight);
      }
    });
    dailyReturns.push(pfReturn);
  }
  if (dailyReturns.length === 0) return 0;
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length;
  return Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100;
}

// ─── Sharpe ratio ─────────────────────────────────────────────────
export function computeSharpe(perfPct: number, volPct: number, rfPct = 3): number {
  return volPct > 0 ? Math.round((perfPct - rfPct) / volPct * 100) / 100 : 0;
}

// ─── Diversification score /10 ────────────────────────────────────
export function computeDiversificationScore(assets: EnrichedAsset[]): number {
  const etfs = assets.filter(a => a.type === "etf").length;
  const stocks = assets.filter(a => a.type === "stock").length;
  const topWeight = Math.max(...assets.map(a => a.weight), 0);
  let score = 5;
  if (assets.length >= 8) score++;
  if (assets.length >= 10) score++;
  if (etfs >= 3) score++;
  if (topWeight < 35) score++;
  if (stocks >= 2 && etfs >= 2) score++;
  return Math.min(score, 10);
}

// ─── Portfolio evolution + drawdown ───────────────────────────────
export function computeEvolution(
  assets: EnrichedAsset[], yahooData: Record<string, YahooData>
): { evolution: { date: string; value: number }[]; maxDrawdown: number; peakValue: number } {
  const evolution: { date: string; value: number }[] = [];
  const refSymbol = assets[0]?.symbol;
  const refTs = yahooData[refSymbol]?.timestamps || [];

  for (let d = 0; d < refTs.length; d++) {
    let dayValue = 0;
    assets.forEach(a => {
      const closes = yahooData[a.symbol]?.closes || [];
      const firstClose = closes[0] || 1;
      const qty = a.targetAmount > 0 && firstClose > 0 ? a.targetAmount / firstClose : 0;
      dayValue += (closes[d] || 0) * qty;
    });
    const date = new Date(refTs[d] * 1000).toISOString().split("T")[0];
    evolution.push({ date, value: Math.round(dayValue) });
  }

  let peak = 0, maxDrawdown = 0;
  evolution.forEach(e => {
    if (e.value > peak) peak = e.value;
    const dd = peak > 0 ? ((e.value - peak) / peak) * 100 : 0;
    if (dd < maxDrawdown) maxDrawdown = dd;
  });

  return { evolution, maxDrawdown: Math.round(maxDrawdown * 100) / 100, peakValue: Math.round(peak) };
}
