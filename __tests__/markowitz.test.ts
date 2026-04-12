import {
  projectSimplex, computeMoments, portfolioReturn,
  portfolioVariance, portfolioVolatility, sharpeRatio,
} from "@/lib/optimize";

// ─── Test data ────────────────────────────────────────────────
function generateReturns(n: number, periods: number, seed = 42): Record<string, number[]> {
  const returns: Record<string, number[]> = {};
  let rng = seed;
  const rand = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff; };
  for (let i = 0; i < n; i++) {
    returns[`ASSET${i}`] = Array.from({ length: periods }, () => (rand() - 0.48) * 0.04);
  }
  return returns;
}

describe("projectSimplex", () => {
  test("weights sum to 1.0", () => {
    const w = projectSimplex([0.4, 0.3, 0.2, 0.1], [0, 0, 0, 0], [1, 1, 1, 1]);
    expect(Math.abs(w.reduce((a, b) => a + b, 0) - 1.0)).toBeLessThan(0.001);
  });

  test("respects minimum weights", () => {
    const wMin = [0.1, 0.1, 0.1, 0.1];
    const w = projectSimplex([0.01, 0.01, 0.5, 0.48], wMin, [1, 1, 1, 1]);
    for (let i = 0; i < w.length; i++) expect(w[i]).toBeGreaterThanOrEqual(wMin[i] - 0.001);
  });

  test("respects maximum weights", () => {
    const wMax = [0.32, 0.32, 0.32, 0.32];
    const w = projectSimplex([0.9, 0.05, 0.03, 0.02], [0, 0, 0, 0], wMax);
    for (let i = 0; i < w.length; i++) expect(w[i]).toBeLessThanOrEqual(wMax[i] + 0.001);
  });

  test("handles equal weights", () => {
    const w = projectSimplex([0.25, 0.25, 0.25, 0.25], [0, 0, 0, 0], [1, 1, 1, 1]);
    expect(Math.abs(w.reduce((a, b) => a + b, 0) - 1.0)).toBeLessThan(0.001);
    w.forEach(x => expect(Math.abs(x - 0.25)).toBeLessThan(0.001));
  });

  test("no weight exceeds 0.32 for 5+ assets", () => {
    const w = projectSimplex([0.5, 0.2, 0.15, 0.1, 0.05], [0, 0, 0, 0, 0], [0.32, 0.32, 0.32, 0.32, 0.32]);
    expect(Math.max(...w)).toBeLessThanOrEqual(0.321);
  });

  test("min + max fight: both respected", () => {
    const w = projectSimplex([0.5, 0.5, 0, 0], [0.05, 0.05, 0.05, 0.05], [0.40, 0.40, 0.40, 0.40]);
    w.forEach(x => expect(x).toBeGreaterThanOrEqual(0.049));
    w.forEach(x => expect(x).toBeLessThanOrEqual(0.401));
    expect(Math.abs(w.reduce((a, b) => a + b, 0) - 1.0)).toBeLessThan(0.001);
  });
});

describe("computeMoments", () => {
  test("T = Math.min of all series lengths", () => {
    const { T } = computeMoments({ A: [0.01, 0.02, 0.03, 0.04, 0.05], B: [0.01, 0.02, 0.03] });
    expect(T).toBe(3);
  });

  test("slice(-T) aligns periods", () => {
    const { T } = computeMoments({ A: [0.10, 0.20, 0.01, 0.02], B: [0.01, 0.02] });
    expect(T).toBe(2);
  });

  test("covariance matrix is symmetric", () => {
    const { cov, N } = computeMoments(generateReturns(4, 52));
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++)
      expect(Math.abs(cov[i][j] - cov[j][i])).toBeLessThan(1e-10);
  });

  test("diagonal is positive (variance > 0)", () => {
    const { cov, N } = computeMoments(generateReturns(4, 52));
    for (let i = 0; i < N; i++) expect(cov[i][i]).toBeGreaterThan(0);
  });

  test("mu has correct length", () => {
    const { mu, N } = computeMoments(generateReturns(5, 100));
    expect(mu.length).toBe(N);
    expect(N).toBe(5);
  });
});

describe("portfolio metrics", () => {
  const returns = generateReturns(3, 52);
  const { mu, cov } = computeMoments(returns);
  const w = [0.5, 0.3, 0.2];

  test("portfolioReturn is weighted sum of mu", () => {
    const r = portfolioReturn(w, mu);
    const expected = w.reduce((a, x, i) => a + x * mu[i], 0);
    expect(r).toBeCloseTo(expected, 10);
  });

  test("portfolioVariance is non-negative", () => {
    expect(portfolioVariance(w, cov)).toBeGreaterThanOrEqual(0);
  });

  test("portfolioVolatility = sqrt(variance)", () => {
    const vol = portfolioVolatility(w, cov);
    const variance = portfolioVariance(w, cov);
    expect(vol).toBeCloseTo(Math.sqrt(variance), 10);
  });

  test("zero-weight portfolio has zero return", () => {
    expect(portfolioReturn([0, 0, 0], mu)).toBe(0);
  });
});

describe("sharpeRatio", () => {
  test("Sharpe = (R - rf) / vol", () => {
    expect(sharpeRatio(0.12, 0.15, 0.03)).toBeCloseTo(0.6, 2);
  });

  test("zero vol returns 0", () => {
    expect(sharpeRatio(0.05, 0, 0.03)).toBe(0);
  });

  test("negative return gives negative Sharpe", () => {
    expect(sharpeRatio(-0.05, 0.20, 0.03)).toBeLessThan(0);
  });

  test("default rf is 0.03", () => {
    expect(sharpeRatio(0.10, 0.14)).toBeCloseTo((0.10 - 0.03) / 0.14, 2);
  });
});
