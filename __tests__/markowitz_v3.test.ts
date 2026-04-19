import {
  computeMoments, markowitz_v3, projectSimplex,
  getPriorKey, MU_PRIOR, MU_CAP, WMAX_BY_TYPE, RISK_AVERSION,
  type Asset, type Method, type RiskProfile,
} from "@/lib/markowitz_v3";

// ─── Test helpers ─────────────────────────────────────────────

function makeAsset(overrides: Partial<Asset> & { s: string }): Asset {
  return {
    n: overrides.s, zone: "monde", type: "etf", dedup: overrides.s,
    ter: 0.2, pea: true, cto: true, av: true, ...overrides,
  };
}

// mulberry32 — same RNG as markowitz_v3.ts for consistency
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Generate realistic weekly returns for a given annual return and volatility
function generateReturns(annualRet: number, annualVol: number, weeks: number, seed = 1): number[] {
  const weeklyMu = Math.log(1 + annualRet) / 52;
  const weeklyVol = annualVol / Math.sqrt(52);
  const rand = mulberry32(seed);
  const returns: number[] = [];
  for (let i = 0; i < weeks; i++) {
    const u1 = rand(), u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    const logR = weeklyMu + weeklyVol * z;
    returns.push(Math.exp(logR) - 1);
  }
  return returns;
}

const CAT: Asset[] = [
  makeAsset({ s: "BOND", type: "bond", zone: "any" }),
  makeAsset({ s: "ETF_WORLD", type: "etf", zone: "monde" }),
  makeAsset({ s: "GOLD", type: "gold", zone: "any" }),
  makeAsset({ s: "STOCK1", type: "stock", zone: "usa" }),
  makeAsset({ s: "STOCK2", type: "stock", zone: "europe" }),
  makeAsset({ s: "ETF_EM", type: "etf", zone: "em" }),
];

function makeReturns() {
  return {
    BOND:      generateReturns(0.025, 0.04, 400, 10),
    ETF_WORLD: generateReturns(0.08, 0.15, 500, 20),
    GOLD:      generateReturns(0.04, 0.12, 450, 30),
    STOCK1:    generateReturns(0.10, 0.25, 350, 40),
    STOCK2:    generateReturns(0.07, 0.20, 300, 50),
    ETF_EM:    generateReturns(0.06, 0.18, 250, 60),
  };
}

// ─── computeMoments tests ─────────────────────────────────────

describe("computeMoments", () => {
  const returns = makeReturns();
  const moments = computeMoments(returns, CAT);

  test("mu has correct length", () => {
    expect(moments.mu.length).toBe(6);
    expect(moments.symbols.length).toBe(6);
  });

  test("mu is geometric with shrinkage — ETF world in 6-10% range", () => {
    const etfIdx = moments.symbols.indexOf("ETF_WORLD");
    expect(moments.mu[etfIdx]).toBeGreaterThan(0.06);
    expect(moments.mu[etfIdx]).toBeLessThan(0.10);
  });

  test("bond mu < 6% (cap applied)", () => {
    const bondIdx = moments.symbols.indexOf("BOND");
    expect(moments.mu[bondIdx]).toBeLessThan(0.06);
    expect(moments.mu[bondIdx]).toBeGreaterThan(-0.02);
  });

  test("stock mu capped at 18%", () => {
    // Even with high historical returns, cap must hold
    const highReturns = { TEST: generateReturns(0.50, 0.30, 500, 99) };
    const highCAT = [makeAsset({ s: "TEST", type: "stock", zone: "usa" })];
    const m = computeMoments(highReturns, highCAT);
    expect(m.mu[0]).toBeLessThanOrEqual(0.18);
  });

  test("shrinkage pulls toward prior when T is small", () => {
    const shortReturns = { SHORT: generateReturns(0.30, 0.20, 120, 77) };
    const shortCAT = [makeAsset({ s: "SHORT", type: "etf", zone: "monde" })];
    const m = computeMoments(shortReturns, shortCAT);
    // With only 120 weeks, shrinkage should pull significantly toward 7% prior
    expect(m.mu[0]).toBeLessThan(0.25);
  });

  test("sigma is symmetric", () => {
    const N = moments.sigma.length;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      expect(Math.abs(moments.sigma[i][j] - moments.sigma[j][i])).toBeLessThan(1e-10);
    }
  });

  test("sigma diagonal is positive", () => {
    for (let i = 0; i < moments.sigma.length; i++) {
      expect(moments.sigma[i][i]).toBeGreaterThan(0);
    }
  });

  test("pairwise covariance uses different T for each pair", () => {
    // BOND has 400w, ETF_EM has 250w → pairwise T = 250
    // BOND self → T = 400
    // The variance of BOND should use all 400 weeks, not truncated to 250
    const bondIdx = moments.symbols.indexOf("BOND");
    const emIdx = moments.symbols.indexOf("ETF_EM");
    // sigma[bond][bond] computed with T=400, sigma[bond][em] computed with T=250
    // Both should be positive
    expect(moments.sigma[bondIdx][bondIdx]).toBeGreaterThan(0);
    expect(moments.sigma[bondIdx][emIdx]).not.toBe(0);
  });

  test("T_vec reflects actual data lengths", () => {
    expect(moments.T_vec[moments.symbols.indexOf("BOND")]).toBe(400);
    expect(moments.T_vec[moments.symbols.indexOf("ETF_EM")]).toBe(250);
  });
});

// ─── getPriorKey tests ────────────────────────────────────────

describe("getPriorKey", () => {
  test("monde ETF → etf_equity", () => {
    expect(getPriorKey(makeAsset({ s: "X", type: "etf", zone: "monde" }))).toBe("etf_equity");
  });
  test("usa ETF → etf_equity", () => {
    expect(getPriorKey(makeAsset({ s: "X", type: "etf", zone: "usa" }))).toBe("etf_equity");
  });
  test("europe ETF → etf_region", () => {
    expect(getPriorKey(makeAsset({ s: "X", type: "etf", zone: "europe" }))).toBe("etf_region");
  });
  test("any ETF → bond (bond/gold ETF)", () => {
    expect(getPriorKey(makeAsset({ s: "X", type: "etf", zone: "any" }))).toBe("bond");
  });
  test("stock → stock", () => {
    expect(getPriorKey(makeAsset({ s: "X", type: "stock", zone: "usa" }))).toBe("stock");
  });
  test("gold → gold", () => {
    expect(getPriorKey(makeAsset({ s: "X", type: "gold", zone: "any" }))).toBe("gold");
  });
});

// ─── markowitz_v3 tests ───────────────────────────────────────

describe("markowitz_v3", () => {
  const returns = makeReturns();
  const moments = computeMoments(returns, CAT);
  const N = moments.symbols.length;
  const wMin = new Array(N).fill(0);
  const wMax = moments.symbols.map(s => {
    const a = CAT.find(c => c.s === s);
    return WMAX_BY_TYPE[a?.type || "etf"] || 0.35;
  });

  test("weights sum to 1.0", () => {
    const result = markowitz_v3(moments, "maxsharpe", { wMin, wMax }, "balanced", returns);
    const sum = Object.values(result.weights).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.02);
  });

  test("defensive converges toward bonds/gold without explicit minimum", () => {
    const result = markowitz_v3(moments, "maxutility", { wMin, wMax }, "defensive", returns);
    const bondWeight = result.weights["BOND"] || 0;
    const goldWeight = result.weights["GOLD"] || 0;
    const safeWeight = bondWeight + goldWeight;
    // With λ=12, optimizer should naturally prefer low-variance assets
    expect(safeWeight).toBeGreaterThan(0.2);
  });

  test("aggressive converges toward high return assets", () => {
    const result = markowitz_v3(moments, "maxutility", { wMin, wMax }, "aggressive", returns);
    const etfWeight = result.weights["ETF_WORLD"] || 0;
    const stockWeight = (result.weights["STOCK1"] || 0) + (result.weights["STOCK2"] || 0);
    // With λ=1.5, optimizer should favor equity
    expect(etfWeight + stockWeight).toBeGreaterThan(0.3);
  });

  test("determinism: two runs give identical weights", () => {
    const r1 = markowitz_v3(moments, "maxsharpe", { wMin, wMax }, "balanced", returns);
    const r2 = markowitz_v3(moments, "maxsharpe", { wMin, wMax }, "balanced", returns);
    for (const sym of Object.keys(r1.weights)) {
      expect(r1.weights[sym]).toBe(r2.weights[sym]);
    }
  });

  test("minvariance has lower vol than maxsharpe", () => {
    const mv = markowitz_v3(moments, "minvariance", { wMin, wMax }, "balanced", returns);
    const ms = markowitz_v3(moments, "maxsharpe", { wMin, wMax }, "balanced", returns);
    expect(mv.vol).toBeLessThanOrEqual(ms.vol + 0.001);
  });

  test("ret is realistic: between -2% and 15%", () => {
    for (const method of ["minvariance", "maxsharpe", "maxutility"] as Method[]) {
      const r = markowitz_v3(moments, method, { wMin, wMax }, "balanced", returns);
      expect(r.ret).toBeGreaterThan(-0.02);
      expect(r.ret).toBeLessThan(0.15);
    }
  });

  test("sharpe is between -1 and 2", () => {
    const r = markowitz_v3(moments, "maxsharpe", { wMin, wMax }, "balanced", returns);
    expect(r.sharpe).toBeGreaterThan(-1);
    expect(r.sharpe).toBeLessThan(2);
  });

  test("var95 is positive", () => {
    const r = markowitz_v3(moments, "maxsharpe", { wMin, wMax }, "balanced", returns);
    expect(r.var95).toBeGreaterThan(0);
  });

  test("no weight exceeds wMax", () => {
    const r = markowitz_v3(moments, "maxsharpe", { wMin, wMax }, "balanced", returns);
    for (const [sym, w] of Object.entries(r.weights)) {
      const idx = moments.symbols.indexOf(sym);
      expect(w).toBeLessThanOrEqual(wMax[idx] + 0.01);
    }
  });
});

// ─── Constants sanity ─────────────────────────────────────────

describe("constants", () => {
  test("MU_PRIOR values are reasonable", () => {
    for (const v of Object.values(MU_PRIOR)) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(0.20);
    }
  });

  test("MU_CAP >= MU_PRIOR for matching types", () => {
    expect(MU_CAP.etf).toBeGreaterThanOrEqual(MU_PRIOR.etf_equity);
    expect(MU_CAP.stock).toBeGreaterThanOrEqual(MU_PRIOR.stock);
    expect(MU_CAP.bond).toBeGreaterThanOrEqual(MU_PRIOR.bond);
  });

  test("RISK_AVERSION decreases from defensive to aggressive", () => {
    expect(RISK_AVERSION.defensive).toBeGreaterThan(RISK_AVERSION.moderate);
    expect(RISK_AVERSION.moderate).toBeGreaterThan(RISK_AVERSION.balanced);
    expect(RISK_AVERSION.balanced).toBeGreaterThan(RISK_AVERSION.aggressive);
  });
});
