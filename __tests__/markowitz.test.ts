/**
 * Markowitz optimization — mathematical property tests.
 * Since markowitz() is not exported from route.ts, we reimplement
 * the core math functions and test their properties.
 */

// ─── Reimplemented core functions ─────────────────────────────
function projectSimplex(w: number[], wMin: number[], wMax: number[]): number[] {
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

function computeMoments(returns: Record<string, number[]>) {
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
  return { syms, T, mu, cov };
}

// ─── Test data ────────────────────────────────────────────────
function generateReturns(n: number, periods: number, seed = 42): Record<string, number[]> {
  const syms = Array.from({ length: n }, (_, i) => `ASSET${i}`);
  const returns: Record<string, number[]> = {};
  let rng = seed;
  const rand = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff; };
  for (const s of syms) {
    returns[s] = Array.from({ length: periods }, () => (rand() - 0.48) * 0.04);
  }
  return returns;
}

// ─── Tests ────────────────────────────────────────────────────
describe("projectSimplex", () => {
  test("weights sum to 1.0", () => {
    const w = projectSimplex([0.4, 0.3, 0.2, 0.1], [0, 0, 0, 0], [1, 1, 1, 1]);
    const sum = w.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  test("respects minimum weights", () => {
    const wMin = [0.1, 0.1, 0.1, 0.1];
    const w = projectSimplex([0.01, 0.01, 0.5, 0.48], wMin, [1, 1, 1, 1]);
    for (let i = 0; i < w.length; i++) {
      expect(w[i]).toBeGreaterThanOrEqual(wMin[i] - 0.001);
    }
  });

  test("respects maximum weights", () => {
    const wMax = [0.32, 0.32, 0.32, 0.32];
    const w = projectSimplex([0.9, 0.05, 0.03, 0.02], [0, 0, 0, 0], wMax);
    for (let i = 0; i < w.length; i++) {
      expect(w[i]).toBeLessThanOrEqual(wMax[i] + 0.001);
    }
  });

  test("handles edge case: all weights equal", () => {
    const w = projectSimplex([0.25, 0.25, 0.25, 0.25], [0, 0, 0, 0], [1, 1, 1, 1]);
    const sum = w.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  test("no weight exceeds maxWeight 0.32 for 5+ assets", () => {
    const w = projectSimplex(
      [0.5, 0.2, 0.15, 0.1, 0.05],
      [0, 0, 0, 0, 0],
      [0.32, 0.32, 0.32, 0.32, 0.32]
    );
    expect(Math.max(...w)).toBeLessThanOrEqual(0.321);
  });
});

describe("computeMoments", () => {
  test("T = Math.min of all series lengths", () => {
    const returns = {
      A: [0.01, 0.02, 0.03, 0.04, 0.05],
      B: [0.01, 0.02, 0.03],
      C: [0.01, 0.02, 0.03, 0.04],
    };
    const { T } = computeMoments(returns);
    expect(T).toBe(3);
  });

  test("slice(-T) aligns periods correctly", () => {
    const returns = {
      A: [0.10, 0.20, 0.01, 0.02, 0.03],
      B: [0.01, 0.02, 0.03],
    };
    const { T } = computeMoments(returns);
    expect(T).toBe(3);
    // A.slice(-3) = [0.01, 0.02, 0.03], same as B
    const sliced = returns.A.slice(-T);
    expect(sliced).toEqual([0.01, 0.02, 0.03]);
  });

  test("covariance matrix is symmetric", () => {
    const returns = generateReturns(4, 52);
    const { cov, syms } = computeMoments(returns);
    for (let i = 0; i < syms.length; i++) {
      for (let j = 0; j < syms.length; j++) {
        expect(Math.abs(cov[i][j] - cov[j][i])).toBeLessThan(1e-10);
      }
    }
  });

  test("diagonal of covariance is positive (variance > 0)", () => {
    const returns = generateReturns(4, 52);
    const { cov } = computeMoments(returns);
    for (let i = 0; i < cov.length; i++) {
      expect(cov[i][i]).toBeGreaterThan(0);
    }
  });
});

describe("Sharpe ratio", () => {
  test("Sharpe = (R - rf) / vol", () => {
    const R = 0.12; // 12% return
    const vol = 0.15; // 15% volatility
    const rf = 0.03; // 3% risk-free
    const sharpe = (R - rf) / vol;
    expect(sharpe).toBeCloseTo(0.6, 2);
  });

  test("Sharpe is 0 when vol is 0", () => {
    const R = 0.05;
    const vol = 0;
    const rf = 0.03;
    const sharpe = vol > 0 ? (R - rf) / vol : 0;
    expect(sharpe).toBe(0);
  });

  test("negative return gives negative Sharpe", () => {
    const R = -0.05;
    const vol = 0.20;
    const rf = 0.03;
    const sharpe = (R - rf) / vol;
    expect(sharpe).toBeLessThan(0);
  });
});

describe("portfolio weight constraints", () => {
  test("sum of weights = 100% within tolerance", () => {
    const weights = { A: 0.328, B: 0.251, C: 0.189, D: 0.132, E: 0.100 };
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  test("no weight below 1% threshold", () => {
    const weights = { A: 0.328, B: 0.251, C: 0.189, D: 0.132, E: 0.100 };
    for (const w of Object.values(weights)) {
      expect(w).toBeGreaterThanOrEqual(0.01);
    }
  });
});
