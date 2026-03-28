// lib/markowitz.ts
// Optimisation de portefeuille selon Markowitz
// Méthodes : GMV (Variance Minimale), MaxSharpe, Utilité Maximale

import type { OptimizationMethod, OptimizationResult, AssetType } from "@/types";

const RF = 0.035; // Taux sans risque (OAT 10 ans ≈ 3.5%)

// ─── Maths de base ───────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function covariance(a: number[], b: number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  return a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0) / (a.length - 1);
}

function buildCovMatrix(returns: number[][]): number[][] {
  const n = returns.length;
  const mat: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const cov = covariance(returns[i], returns[j]);
      mat[i][j] = cov;
      mat[j][i] = cov;
    }
  }
  return mat;
}

// Ledoit-Wolf shrinkage (δ = n / (T + n))
function shrinkCovMatrix(mat: number[][], T: number): number[][] {
  const n = mat.length;
  const delta = n / (T + n);
  // F = matrice diagonale des variances (target identity)
  const trace = mat.reduce((s, _, i) => s + mat[i][i], 0);
  const muF = trace / n;
  return mat.map((row, i) =>
    row.map((val, j) => {
      const f = i === j ? muF : 0;
      return (1 - delta) * val + delta * f;
    })
  );
}

// Inversion de matrice (Gauss-Jordan)
function invertMatrix(mat: number[][]): number[][] {
  const n = mat.length;
  const aug = mat.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
    }
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    const scale = aug[col][col];
    if (Math.abs(scale) < 1e-12) continue;
    aug[col] = aug[col].map((v) => v / scale);
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = aug[row][col];
        aug[row] = aug[row].map((v, k) => v - factor * aug[col][k]);
      }
    }
  }
  return aug.map((row) => row.slice(n));
}

function matMulVec(mat: number[][], vec: number[]): number[] {
  return mat.map((row) => row.reduce((s, v, i) => s + v * vec[i], 0));
}

function dot(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

function normalize(weights: number[]): number[] {
  const sum = weights.reduce((s, v) => s + Math.max(v, 0), 0);
  return weights.map((v) => Math.max(v, 0) / (sum || 1));
}

// ─── Méthodes d'optimisation ─────────────────────────────────────────────────

// Global Minimum Variance
function gmvWeights(sigmaInv: number[][]): number[] {
  const n = sigmaInv.length;
  const ones = new Array(n).fill(1);
  const sigmaInvOnes = matMulVec(sigmaInv, ones);
  const denom = dot(ones, sigmaInvOnes);
  return normalize(sigmaInvOnes.map((v) => v / denom));
}

// Maximum Sharpe Ratio (tangency portfolio)
function maxSharpeWeights(sigmaInv: number[][], mu: number[]): number[] {
  const excess = mu.map((m) => m - RF / 12); // mensuel
  const z = matMulVec(sigmaInv, excess);
  return normalize(z);
}

// Maximum Utility (U = E[r] - A/2 * σ²) avec A=10 (modéré)
function utilityWeights(
  sigmaInv: number[][],
  mu: number[],
  A = 10
): number[] {
  const z = matMulVec(sigmaInv, mu);
  return normalize(z.map((v) => v / A));
}

// ─── Pipeline principal ──────────────────────────────────────────────────────

export interface AssetData {
  symbol: string;
  name: string;
  type: AssetType;
  returns: number[];
}

export function optimize(
  assets: AssetData[],
  capital: number
): Record<OptimizationMethod, OptimizationResult> {
  const n = assets.length;
  const T = assets[0].returns.length;
  const returns = assets.map((a) => a.returns);

  // Rendements moyens mensuels → annualisés
  const mu = returns.map((r) => mean(r) * 12);

  // Matrice de covariance annualisée avec shrinkage
  const covRaw = buildCovMatrix(returns);
  const cov = shrinkCovMatrix(covRaw, T).map((row) =>
    row.map((v) => v * 12)
  );
  const sigmaInv = invertMatrix(cov);

  const methods: OptimizationMethod[] = ["gmv", "maxsharpe", "utility"];
  const weightFns = [
    () => gmvWeights(sigmaInv),
    () => maxSharpeWeights(sigmaInv, mu),
    () => utilityWeights(sigmaInv, mu),
  ];

  const results = {} as Record<OptimizationMethod, OptimizationResult>;

  methods.forEach((method, idx) => {
    const w = weightFns[idx]();
    const expectedReturn = dot(w, mu);
    const variance = w.reduce(
      (s, wi, i) => s + w.reduce((ss, wj, j) => ss + wi * wj * cov[i][j], 0),
      0
    );
    const volatility = Math.sqrt(variance);
    const sharpeRatio = (expectedReturn - RF) / volatility;
    const var95 = 1.645 * volatility;
    const cvar95 = 2.063 * volatility;
    const maxDrawdown = 1.5 * volatility;

    results[method] = {
      method,
      weights: assets.map((a, i) => ({
        symbol: a.symbol,
        name: a.name,
        weight: w[i],
        type: a.type,
      })),
      expectedReturn: parseFloat((expectedReturn * 100).toFixed(2)),
      volatility: parseFloat((volatility * 100).toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(3)),
      var95: parseFloat((var95 * 100).toFixed(2)),
      cvar95: parseFloat((cvar95 * 100).toFixed(2)),
      maxDrawdown: parseFloat((maxDrawdown * 100).toFixed(2)),
      capitalAllocation: assets.map((a, i) => ({
        symbol: a.symbol,
        name: a.name,
        type: a.type,
        weight: w[i],
        amount: parseFloat((capital * w[i]).toFixed(2)),
      })),
    };
  });

  return results;
}

// ─── Frontière efficiente (100 points) ──────────────────────────────────────

export function efficientFrontier(
  assets: AssetData[],
  nPoints = 60
): Array<{ expectedReturn: number; volatility: number }> {
  const returns = assets.map((a) => a.returns);
  const mu = returns.map((r) => mean(r) * 12);
  const covRaw = buildCovMatrix(returns);
  const cov = shrinkCovMatrix(covRaw, returns[0].length).map((row) =>
    row.map((v) => v * 12)
  );
  const sigmaInv = invertMatrix(cov);

  const minRet = Math.min(...mu);
  const maxRet = Math.max(...mu);
  const step = (maxRet - minRet) / (nPoints - 1);

  return Array.from({ length: nPoints }, (_, i) => {
    const target = minRet + i * step;
    // Portefeuille contraint sur le rendement cible (approximation via utilité)
    const A = 1 / (target - RF / 12 + 0.001);
    const w = normalize(matMulVec(sigmaInv, mu).map((v) => v / A));
    const variance = w.reduce(
      (s, wi, ii) =>
        s + w.reduce((ss, wj, jj) => ss + wi * wj * cov[ii][jj], 0),
      0
    );
    return {
      expectedReturn: parseFloat((dot(w, mu) * 100).toFixed(2)),
      volatility: parseFloat((Math.sqrt(variance) * 100).toFixed(2)),
    };
  });
}
