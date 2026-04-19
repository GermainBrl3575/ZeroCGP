/**
 * Pure utility functions extracted from app/api/optimize/route.ts.
 * These are importable and testable without Next.js or DB dependencies.
 */

// ─── Asset type ───────────────────────────────────────────────
export interface Asset {
  s: string; n: string;
  zone: "monde" | "usa" | "europe" | "em" | "any";
  type: "etf" | "stock" | "bond" | "gold" | "commodity" | "crypto" | "reit";
  dedup: string; ter: number; weeks?: number;
  pea: boolean; cto: boolean; av: boolean;
  esg?: boolean; excl_esg?: boolean;
}

// ─── Normalize accented strings ───────────────────────────────
export function norm(s: string): string {
  return s.toLowerCase()
    .replace(/[\u00e9\u00e8\u00ea\u00eb]/g, "e")
    .replace(/[\u00e0\u00e2\u00e4]/g, "a")
    .replace(/[\u00f9\u00fb\u00fc]/g, "u")
    .replace(/[\u00ee\u00ef]/g, "i")
    .replace(/[\u00f4\u00f6]/g, "o")
    .replace(/[\u00e7]/g, "c");
}

// ─── Dedup filter: keep lowest TER per dedup group ────────────
export function dedupFilter(assets: Asset[]): Asset[] {
  const m = new Map<string, Asset>();
  for (const a of assets) {
    const ex = m.get(a.dedup);
    if (!ex || a.ter < ex.ter) m.set(a.dedup, a);
  }
  return [...m.values()];
}

// ─── Infer asset type from dedup key ──────────────────────────
export function inferType(dedup: string, dbType: string): string {
  const bondKeys = ["EUR_GOV", "EUR_GOV_ST", "EUR_AGG", "GLOBAL_AGG", "US_20Y", "US_7_10Y", "US_AGG", "US_IG", "US_HY", "EM_GOV", "US_1_3Y", "US_TOTAL", "US_TIPS", "EM_BOND_USD"];
  const goldKeys = ["GOLD_EU", "GOLD_US", "GOLD_MINERS"];
  const commodityKeys = ["NAT_RES", "CMDTY"];
  const reitKeys = ["US_REITS", "US_REITS2", "US_REITS3", "GLOBAL_REITS", "EU_REITS", "AMT", "DLR", "PLD"];
  if (bondKeys.includes(dedup)) return "bond";
  if (goldKeys.includes(dedup)) return "gold";
  if (commodityKeys.includes(dedup)) return "commodity";
  if (reitKeys.includes(dedup)) return "reit";
  if (dbType === "stock") return "stock";
  return "etf";
}

// ─── Project weights onto simplex with min/max constraints ────
export function projectSimplex(w: number[], wMin: number[], wMax: number[]): number[] {
  const N = w.length;
  for (let iter = 0; iter < 50; iter++) {
    let excess = 0;
    for (let i = 0; i < N; i++) { if (w[i] < wMin[i]) { excess += wMin[i] - w[i]; w[i] = wMin[i]; } }
    const free = w.map((v, i) => v > wMin[i] ? i : -1).filter(i => i >= 0);
    if (free.length > 0 && excess > 0) { const e = excess / free.length; free.forEach(i => { w[i] = Math.max(wMin[i], w[i] - e); }); }
    let over = 0;
    for (let i = 0; i < N; i++) { if (w[i] > wMax[i]) { over += w[i] - wMax[i]; w[i] = wMax[i]; } }
    const free2 = w.map((v, i) => v < wMax[i] ? i : -1).filter(i => i >= 0);
    if (free2.length > 0 && over > 0) { const e = over / free2.length; free2.forEach(i => { w[i] = Math.min(wMax[i], w[i] + e); }); }
    const s = w.reduce((a, b) => a + b, 0);
    if (s > 0) for (let i = 0; i < N; i++) w[i] /= s;
    if (Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9) break;
  }
  return w;
}

// ─── Compute moments (mean returns + covariance matrix) ───────
export function computeMoments(returns: Record<string, number[]>) {
  const syms = Object.keys(returns);
  const N = syms.length;
  const T = Math.min(...syms.map(s => returns[s].length));
  const mu = syms.map(s => (returns[s].slice(-T).reduce((a, b) => a + b, 0) / T) * 52);
  const cov: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) for (let j = i; j < N; j++) {
    const ri = returns[syms[i]].slice(-T), rj = returns[syms[j]].slice(-T);
    const mi = ri.reduce((a, b) => a + b, 0) / T, mj = rj.reduce((a, b) => a + b, 0) / T;
    let cv = 0; for (let t = 0; t < T; t++) cv += (ri[t] - mi) * (rj[t] - mj);
    cov[i][j] = cov[j][i] = (cv / (T - 1)) * 52;
  }
  return { syms, N, T, mu, cov };
}

// ─── Portfolio metrics ────────────────────────────────────────
export function portfolioReturn(w: number[], mu: number[]): number {
  return w.reduce((a, x, i) => a + x * mu[i], 0);
}

export function portfolioVariance(w: number[], cov: number[][]): number {
  const N = w.length;
  let v = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) v += w[i] * w[j] * cov[i][j];
  return v;
}

export function portfolioVolatility(w: number[], cov: number[][]): number {
  return Math.sqrt(Math.max(0, portfolioVariance(w, cov)));
}

export function sharpeRatio(ret: number, vol: number, rf = 0.03): number {
  return vol > 0 ? (ret - rf) / vol : 0;
}

// ─── Risk profile parsing ─────────────────────────────────────
export function parseRiskProfile(q2: string, q3: string): "defensive" | "moderate" | "balanced" | "aggressive" {
  const n2 = norm(q2);
  const riskFromQ2: Record<string, string> = {
    conservateur: "defensive", modere: "moderate", dynamique: "balanced", agressif: "aggressive",
  };
  const riskFromQ3: Record<string, string> = {
    "10%": "defensive", "20%": "moderate", "35%": "balanced",
  };
  const order = ["defensive", "moderate", "balanced", "aggressive"];

  let riskQ2 = "balanced";
  for (const [k, v] of Object.entries(riskFromQ2)) { if (n2.includes(k)) { riskQ2 = v; break; } }

  let riskQ3 = "aggressive";
  if (norm(q3).includes("limite") || norm(q3).includes("illimite")) riskQ3 = "aggressive";
  else { for (const [k, v] of Object.entries(riskFromQ3)) { if (q3.includes(k)) { riskQ3 = v; break; } } }

  return order[Math.min(order.indexOf(riskQ2), order.indexOf(riskQ3))] as "defensive" | "moderate" | "balanced" | "aggressive";
}

// ─── Bank blocked assets ──────────────────────────────────────
export const BANK_BLOCKED: Record<string, string[]> = {
  "BoursoBank": ["VOO","VTI","SPY","QQQ","CSPX.L","IVV","AGG","TLT","LQD","HYG","IEF","VNQ","GLD","IAU","IEMG","VWO","ACWI","REET","GNR","MCHI","KWEB","INDA","EWZ","EWY","EWT","EWH","IBIT"],
  "Interactive Brokers": ["PAEEM.PA","AEEM.PA"],
  "Trade Republic": [],
  "Autre": [],
};
