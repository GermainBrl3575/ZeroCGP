/**
 * Markowitz v3 — Clean portfolio optimization
 *
 * Fixes from v2:
 * - Geometric returns instead of arithmetic × 52
 * - Pairwise covariance (no truncation to T=min)
 * - Bayes-Stein shrinkage on mu toward class priors
 * - Ledoit-Wolf shrinkage on Σ
 * - Risk aversion via λ only (no hard constraints per profile)
 * - No diversity penalty, no phase 3 re-run, no proxy substitution
 * - Seeded RNG for deterministic results
 */

// ─── Types ────────────────────────────────────────────────────

export interface Asset {
  s: string; n: string;
  zone: "monde" | "usa" | "europe" | "em" | "any";
  type: "etf" | "stock" | "bond" | "gold" | "commodity" | "crypto" | "reit";
  dedup: string; ter: number;
  pea: boolean; cto: boolean; av: boolean;
  esg?: boolean; excl_esg?: boolean;
}

export interface Moments {
  mu: number[];        // annualized geometric returns (shrunk + capped)
  sigma: number[][];   // annualized covariance (Ledoit-Wolf shrunk)
  symbols: string[];
  T_vec: number[];     // weeks of data per symbol
}

export interface MarkowitzConstraints {
  wMax: number[];
  wMin: number[];
}

export interface OptimResult {
  weights: Record<string, number>;   // symbol → weight (0-1)
  ret: number;    // annualized return
  vol: number;    // annualized volatility
  sharpe: number;
  var95: number;
}

export type RiskProfile = "defensive" | "moderate" | "balanced" | "aggressive";
export type Method = "minvariance" | "maxsharpe" | "maxutility";

// ─── Constants ────────────────────────────────────────────────

// Priors: long-term expected annual returns by asset class
// Based on Dimson-Marsh-Staunton (1900-2020) + current yield environment
export const MU_PRIOR: Record<string, number> = {
  etf_equity: 0.07,   // broad equity ETFs
  etf_region: 0.06,   // regional equity ETFs
  stock: 0.08,        // individual stocks
  bond: 0.025,        // EUR govt bonds
  gold: 0.04,         // gold long-term real return + inflation
  commodity: 0.04,
  reit: 0.06,
};

// Hard caps on annualized mu — never show > this regardless of history
export const MU_CAP: Record<string, number> = {
  etf: 0.15,
  stock: 0.18,
  bond: 0.06,
  gold: 0.10,
  commodity: 0.10,
  reit: 0.12,
};

export const MU_FLOOR = -0.02;

export const SHRINK_LAMBDA = 0.4;  // 0 = pure empirical, 1 = pure prior

// wMax by asset type
export const WMAX_BY_TYPE: Record<string, number> = {
  etf: 0.35,
  stock: 0.10,
  bond: 0.40,
  gold: 0.15,
  commodity: 0.15,
  reit: 0.15,
};

// Risk aversion parameter λ for utility function
export const RISK_AVERSION: Record<string, number> = {
  defensive: 12,
  moderate: 6,
  balanced: 3,
  aggressive: 1.5,
};

const RF_RATE = 0.03;

// ─── Seeded RNG (mulberry32) ──────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─── Helper: get prior key from asset ─────────────────────────

export function getPriorKey(asset: Asset): string {
  if (asset.type === "etf") {
    if (["monde", "usa"].includes(asset.zone)) return "etf_equity";
    if (["europe", "em"].includes(asset.zone)) return "etf_region";
    return "bond"; // zone="any" → bond/gold ETF
  }
  return asset.type; // stock, bond, gold, commodity, reit, crypto
}

// ─── computeMoments ───────────────────────────────────────────

export function computeMoments(
  returns: Record<string, number[]>,
  CAT: Asset[]
): Moments {
  const symbols = Object.keys(returns);
  const N = symbols.length;
  const T_vec = symbols.map(s => returns[s].length);
  const T_max = Math.max(...T_vec);

  // 1. Geometric annualized returns + shrinkage
  const mu = symbols.map((s, idx) => {
    const r = returns[s];
    const T_s = r.length;

    // Geometric annualized return
    const logReturns = r.map(x => Math.log(1 + x));
    const meanLogWeekly = logReturns.reduce((a, b) => a + b, 0) / T_s;
    const muGeomAnnual = Math.exp(meanLogWeekly * 52) - 1;

    // Prior
    const asset = CAT.find(a => a.s === s);
    const priorKey = asset ? getPriorKey(asset) : "etf_equity";
    const muPrior = MU_PRIOR[priorKey] ?? 0.07;

    // Bayes-Stein shrinkage: more data → less shrinkage, but always some residual
    // T=100 → α=0.267, T=500 → α=0.114, T=878 → α=0.074
    const alpha = SHRINK_LAMBDA / (1 + T_s / 200);
    const muShrunk = (1 - alpha) * muGeomAnnual + alpha * muPrior;

    // Hard caps
    const assetType = asset?.type || "etf";
    const cap = MU_CAP[assetType] ?? 0.15;
    return Math.min(cap, Math.max(MU_FLOOR, muShrunk));
  });

  // 2. Pairwise covariance matrix
  const sigma: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = i; j < N; j++) {
      const T_ij = Math.min(T_vec[i], T_vec[j]);
      const ri = returns[symbols[i]].slice(-T_ij);
      const rj = returns[symbols[j]].slice(-T_ij);
      const mi = ri.reduce((a, b) => a + b, 0) / T_ij;
      const mj = rj.reduce((a, b) => a + b, 0) / T_ij;
      let cv = 0;
      for (let t = 0; t < T_ij; t++) cv += (ri[t] - mi) * (rj[t] - mj);
      sigma[i][j] = sigma[j][i] = (cv / (T_ij - 1)) * 52;
    }
  }

  // 3. Ledoit-Wolf shrinkage on Σ
  const T_avg = T_vec.reduce((a, b) => a + b, 0) / N;
  let traceS = 0;
  for (let i = 0; i < N; i++) traceS += sigma[i][i];
  const muTarget = traceS / N;
  const delta = Math.min(1, Math.max(0.05, N / T_avg));

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const target = i === j ? muTarget : 0;
      sigma[i][j] = (1 - delta) * sigma[i][j] + delta * target;
    }
  }

  console.log(`[MOMENTS] N=${N} T_avg=${Math.round(T_avg)} delta_LW=${delta.toFixed(3)} mu=[${mu.map(m => (m * 100).toFixed(1) + '%').join(', ')}]`);

  return { mu, sigma, symbols, T_vec };
}

// ─── projectSimplex (reused from existing code) ───────────────

export function projectSimplex(w: number[], wMin: number[], wMax: number[]): number[] {
  const N = w.length;
  for (let iter = 0; iter < 50; iter++) {
    let excess = 0;
    for (let i = 0; i < N; i++) {
      if (w[i] < wMin[i]) { excess += wMin[i] - w[i]; w[i] = wMin[i]; }
    }
    const free = w.map((v, i) => v > wMin[i] ? i : -1).filter(i => i >= 0);
    if (free.length > 0 && excess > 0) {
      const e = excess / free.length;
      free.forEach(i => { w[i] = Math.max(wMin[i], w[i] - e); });
    }
    let over = 0;
    for (let i = 0; i < N; i++) {
      if (w[i] > wMax[i]) { over += w[i] - wMax[i]; w[i] = wMax[i]; }
    }
    const free2 = w.map((v, i) => v < wMax[i] ? i : -1).filter(i => i >= 0);
    if (free2.length > 0 && over > 0) {
      const e = over / free2.length;
      free2.forEach(i => { w[i] = Math.min(wMax[i], w[i] + e); });
    }
    const s = w.reduce((a, b) => a + b, 0);
    if (s > 0) for (let i = 0; i < N; i++) w[i] /= s;
    if (Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9) break;
  }
  return w;
}

// ─── markowitz_v3 ─────────────────────────────────────────────

export function markowitz_v3(
  moments: Moments,
  method: Method,
  constraints: MarkowitzConstraints,
  riskProfile: RiskProfile,
  returns: Record<string, number[]>  // for VaR calculation
): OptimResult {
  const { mu, sigma, symbols } = moments;
  const N = symbols.length;
  const rfRate = RF_RATE;
  const lambda = RISK_AVERSION[riskProfile];
  const { wMin, wMax } = constraints;

  if (N < 2) return { weights: {}, ret: 0, vol: 0, sharpe: 0, var95: 0 };

  // Portfolio metric functions
  const portRet = (w: number[]) => w.reduce((a, x, i) => a + x * mu[i], 0);
  const portVar = (w: number[]) => {
    let v = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) v += w[i] * w[j] * sigma[i][j];
    return v;
  };
  const portVol = (w: number[]) => Math.sqrt(Math.max(0, portVar(w)));
  const covW = (w: number[]) => sigma.map(row => row.reduce((a, x, j) => a + x * w[j], 0));

  // Score function — CLEAN, no penalties
  const score = (w: number[]) => {
    const r = portRet(w), v = portVar(w), vol = Math.sqrt(Math.max(0, v));
    if (method === "minvariance") return -v;
    if (method === "maxsharpe") return vol > 1e-10 ? (r - rfRate) / vol : -999;
    // maxutility: r - (λ/2) * v
    return r - (lambda / 2) * v;
  };

  // Gradient — CLEAN analytical
  const gradient = (w: number[]) => {
    const r = portRet(w), v = portVar(w), vol = Math.sqrt(Math.max(0, v));
    const sw = covW(w);
    if (method === "minvariance") return sw.map(x => -2 * x);
    if (method === "maxsharpe") {
      if (vol < 1e-10) return mu.map(x => x - rfRate);
      const s = (r - rfRate) / vol;
      return mu.map((m, i) => (m - s * sw[i] / vol) / vol);
    }
    // maxutility: ∇ = μ - λ Σw
    return mu.map((m, i) => m - lambda * sw[i]);
  };

  // Seeded Dirichlet
  const rng = mulberry32(42);
  const dirichlet = (alpha: number) => {
    const raw = symbols.map(() => {
      let x = 0;
      for (let j = 0; j < Math.max(1, Math.round(alpha * 2)); j++) {
        x -= Math.log(rng() + 1e-10);
      }
      return x;
    });
    const s = raw.reduce((a, b) => a + b, 0);
    return raw.map(x => x / s);
  };

  // Phase 1: Monte Carlo with Dirichlet starts
  const MC_STARTS = 40;
  const MC_TRIALS = 3000;
  let bestW = projectSimplex(new Array(N).fill(1 / N), wMin, wMax);
  let bestScore = score(bestW);
  const candidates: number[][] = [];

  for (let trial = 0; trial < MC_TRIALS; trial++) {
    const raw = trial % 3 === 0 ? dirichlet(0.5) : symbols.map(() => rng());
    const s = raw.reduce((a, b) => a + b, 0);
    const w = projectSimplex(raw.map(x => x / s), wMin, wMax);
    const sc = score(w);
    if (sc > bestScore) { bestScore = sc; bestW = [...w]; }
    if (trial % Math.floor(MC_TRIALS / MC_STARTS) === 0) candidates.push([...w]);
  }
  candidates.push([...bestW]);

  // Phase 2: Gradient ascent per start
  for (const start of candidates) {
    let w = [...start];
    let lr = 0.05;
    let prevScore = score(w);
    for (let step = 0; step < 500; step++) {
      const g = gradient(w);
      const gnorm = Math.sqrt(g.reduce((a, b) => a + b * b, 0));
      if (gnorm < 1e-9) break;
      const gn = g.map(x => x / gnorm);
      const wNew = projectSimplex(w.map((x, i) => x + lr * gn[i]), wMin, wMax);
      const newScore = score(wNew);
      if (newScore > prevScore) {
        w = wNew; prevScore = newScore; lr = Math.min(lr * 1.1, 0.3);
        if (newScore > bestScore) { bestScore = newScore; bestW = [...w]; }
      } else {
        lr *= 0.5;
        if (lr < 1e-6) break;
      }
    }
  }

  // Post-processing
  const finalRet = portRet(bestW);
  const finalVol = portVol(bestW);
  const finalSharpe = finalVol > 0 ? (finalRet - rfRate) / finalVol : 0;

  // VaR 95% historical
  const T_min = Math.min(...symbols.map(s => returns[s]?.length || 0));
  const portR: number[] = [];
  for (let t = 0; t < T_min; t++) {
    let pr = 0;
    symbols.forEach((s, i) => { pr += bestW[i] * (returns[s].slice(-T_min)[t] || 0); });
    portR.push(pr);
  }
  portR.sort((a, b) => a - b);
  const var95 = Math.abs(portR[Math.floor(portR.length * 0.05)] || 0) * Math.sqrt(52);

  // Filter weights > 1%
  const weights: Record<string, number> = {};
  symbols.forEach((s, i) => { if (bestW[i] > 0.01) weights[s] = bestW[i]; });

  console.log(`[MARKOWITZ_V3] ${method} λ=${lambda} ret=${(finalRet * 100).toFixed(1)}% vol=${(finalVol * 100).toFixed(1)}% sharpe=${finalSharpe.toFixed(2)}`);

  return { weights, ret: finalRet, vol: finalVol, sharpe: finalSharpe, var95 };
}
