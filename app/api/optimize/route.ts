import { NextRequest, NextResponse } from "next/server";
import { filterAssets, FilterAnswers } from "@/lib/filterAssets";
import { AssetMeta } from "@/lib/assetUniverse";

// ── Fetch cours historiques Yahoo Finance ────────────────────
async function fetchHistoricalReturns(
  symbols: string[],
  days = 365 * 5
): Promise<Record<string, number[]>> {
  const results: Record<string, number[]> = {};
  const endDate   = Math.floor(Date.now() / 1000);
  const startDate = endDate - days * 86400;

  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startDate}&period2=${endDate}&interval=1mo&includePrePost=false`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
          },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return;
        const data = await res.json();
        const closes: number[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
        const validCloses = closes.filter((c: number) => c !== null && !isNaN(c));
        if (validCloses.length < 12) return; // minimum 12 mois

        // Calculer les rendements mensuels
        const returns: number[] = [];
        for (let i = 1; i < validCloses.length; i++) {
          if (validCloses[i - 1] > 0) {
            returns.push((validCloses[i] - validCloses[i - 1]) / validCloses[i - 1]);
          }
        }
        if (returns.length >= 12) results[symbol] = returns;
      } catch {
        // Symbole indisponible — on l'ignore
      }
    })
  );
  return results;
}

// ── Statistiques de base ──────────────────────────────────────
function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function variance(arr: number[]): number {
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
}
function stddev(arr: number[]): number { return Math.sqrt(variance(arr)); }
function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  const ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n));
  return a.slice(0, n).reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0) / (n - 1);
}

// ── Ledoit-Wolf shrinkage simplifié ──────────────────────────
function shrinkCovMatrix(cov: number[][], alpha = 0.15): number[][] {
  const n = cov.length;
  const traceCov = cov.reduce((s, row, i) => s + row[i], 0);
  const mu = traceCov / n;
  return cov.map((row, i) =>
    row.map((v, j) => {
      const target = i === j ? mu : 0;
      return (1 - alpha) * v + alpha * target;
    })
  );
}

// ── Portfolio variance ────────────────────────────────────────
function portfolioVariance(weights: number[], cov: number[][]): number {
  let v = 0;
  for (let i = 0; i < weights.length; i++)
    for (let j = 0; j < weights.length; j++)
      v += weights[i] * weights[j] * cov[i][j];
  return v;
}

function portfolioReturn(weights: number[], returns: number[]): number {
  return weights.reduce((s, w, i) => s + w * returns[i], 0);
}

// ── Optimisation Monte Carlo ──────────────────────────────────
function optimizePortfolio(
  symbols:   string[],
  annualRet: number[],
  covMatrix: number[][],
  capital:   number,
  nSim =     8000,
  riskFree = 0.03
) {
  const n = symbols.length;
  let gmv    = { weights: Array(n).fill(1/n), ret: 0, vol: 1e9, sharpe: 0 };
  let maxSh  = { weights: Array(n).fill(1/n), ret: 0, vol: 1, sharpe: -1e9 };
  let maxUt  = { weights: Array(n).fill(1/n), ret: 0, vol: 1, utility: -1e9 };
  const frontier: {vol:number;ret:number}[] = [];

  for (let s = 0; s < nSim; s++) {
    // Générer poids aléatoires (Dirichlet-like)
    const raw = Array.from({length: n}, () => -Math.log(Math.random() + 1e-10));
    const sum = raw.reduce((a, b) => a + b, 0);
    const w   = raw.map(v => v / sum);

    const ret = portfolioReturn(w, annualRet);
    const vol = Math.sqrt(Math.max(0, portfolioVariance(w, covMatrix) * 12));
    if (vol < 0.001) continue;
    const sharpe = (ret - riskFree) / vol;
    const utility = ret - 0.5 * 3 * vol * vol; // lambda=3

    if (vol < gmv.vol)         { gmv   = {weights:w, ret, vol, sharpe}; }
    if (sharpe > maxSh.sharpe) { maxSh = {weights:w, ret, vol, sharpe}; }
    if (utility > maxUt.utility){ maxUt = {weights:w, ret, vol, utility}; }

    if (s % 40 === 0) frontier.push({vol: parseFloat(vol.toFixed(3)), ret: parseFloat(ret.toFixed(3))});
  }

  // Trier frontière par vol croissante, garder pareto-optimal
  const sorted = frontier.sort((a, b) => a.vol - b.vol);
  let paretoRet = -Infinity;
  const pareto = sorted.filter(p => {
    if (p.ret > paretoRet) { paretoRet = p.ret; return true; }
    return false;
  }).slice(0, 60);

  function buildResult(opt: typeof gmv, label: string, method: string, rec = false) {
    const weights = opt.weights.map((w, i) => ({
      symbol:  symbols[i],
      name:    "",
      type:    "etf",
      weight:  parseFloat(w.toFixed(4)),
      amount:  Math.round(capital * w),
    })).filter(w => w.weight > 0.01)
      .sort((a, b) => b.weight - a.weight);

    const var95 = Math.abs(opt.ret - 1.645 * opt.vol) * 100;
    return {
      method,
      label,
      rec,
      ret:    parseFloat((opt.ret * 100).toFixed(2)),
      vol:    parseFloat((opt.vol * 100).toFixed(2)),
      sharpe: parseFloat(opt.sharpe.toFixed(3)),
      var95:  parseFloat(var95.toFixed(2)),
      weights,
      frontier: pareto,
    };
  }

  return [
    buildResult(gmv,   "Variance Minimale", "gmv"),
    buildResult(maxSh, "Sharpe Maximum",    "maxsharpe", true),
    buildResult(maxUt, "Utilité Maximale",  "utility"),
  ];
}

// ── Handler principal ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { capital = 50000, answers = {} } = body;

    const filterAnswers: FilterAnswers = {
      horizon:  answers[1] ?? answers["1"] ?? "5 à 10 ans",
      risk:     answers[2] ?? answers["2"] ?? "Modéré",
      maxLoss:  answers[3] ?? answers["3"] ?? "−20% maximum",
      esg:      answers[4] ?? answers["4"] ?? "Aucun filtre",
      classes:  answers[5] ?? answers["5"] ?? "ETF,Actions",
      geo:      answers[6] ?? answers["6"] ?? "Monde entier",
      diversif: answers[7] ?? answers["7"] ?? "Équilibré (8–10 actifs)",
    };

    // 1. Filtrer l'univers
    const filtered: AssetMeta[] = filterAssets(filterAnswers);
    const symbols = filtered.map(a => a.symbol);

    // 2. Télécharger les cours Yahoo Finance
    const historicalReturns = await fetchHistoricalReturns(symbols, 365 * 5);
    const validSymbols = Object.keys(historicalReturns);

    if (validSymbols.length < 4) {
      return NextResponse.json({ error: "Données insuffisantes" }, { status: 422 });
    }

    // Aligner les longueurs de séries
    const minLen = Math.min(...validSymbols.map(s => historicalReturns[s].length));
    const alignedReturns = validSymbols.map(s => historicalReturns[s].slice(-minLen));

    // 3. Rendements annuels (moyenne des rendements mensuels × 12)
    const annualRet = alignedReturns.map(r => mean(r) * 12);

    // 4. Matrice de covariance (mensuelle → annualisée)
    const rawCov: number[][] = validSymbols.map((_, i) =>
      validSymbols.map((__, j) => covariance(alignedReturns[i], alignedReturns[j]) * 12)
    );
    const covMatrix = shrinkCovMatrix(rawCov);

    // 5. Optimisation
    const results = optimizePortfolio(validSymbols, annualRet, covMatrix, capital, 10000);

    // 6. Enrichir les poids avec les métadonnées
    for (const r of results) {
      r.weights = r.weights.map(w => {
        const meta = filtered.find(a => a.symbol === w.symbol);
        return { ...w, name: meta?.name ?? w.symbol, type: meta?.type ?? "etf" };
      });
    }

    return NextResponse.json({
      results,
      universeSize: symbols.length,
      computedOn:   validSymbols.length,
      symbols:      validSymbols,
    });

  } catch (err) {
    console.error("Optimize error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
