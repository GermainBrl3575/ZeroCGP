import {
  isPlaceholderQty, computeQuantity, enrichAssets,
  perfSinceCreation, computePortfolioPerfs, computeVolatility,
  computeSharpe, computeDiversificationScore, computeEvolution,
  type RawAsset, type YahooData, type EnrichedAsset,
} from "@/lib/portfolioMetrics";

// ═══════════════════════════════════════════════════
// SIMULATED PORTFOLIO: 50 000€ invested 3 months ago
// ═══════════════════════════════════════════════════
// CW8.PA  bought at 500€, now 520€ (+4%)
// ESE.PA  bought at 40€,  now 38€  (-5%)
// MC.PA   bought at 700€, now 735€ (+5%)
// OBLI.PA bought at 100€, now 101€ (+1%)

const ASSETS: RawAsset[] = [
  { id: "a1", symbol: "CW8.PA",  name: "Amundi MSCI World",  type: "etf",   weight: 40, target_amount: 20000, quantity: 40 },    // 20000/500=40 parts
  { id: "a2", symbol: "ESE.PA",  name: "BNP S&P 500",        type: "etf",   weight: 25, target_amount: 12500, quantity: 312.5 },  // 12500/40=312.5
  { id: "a3", symbol: "MC.PA",   name: "LVMH",               type: "stock", weight: 20, target_amount: 10000, quantity: 14.2857 },// 10000/700≈14.29
  { id: "a4", symbol: "OBLI.PA", name: "Euro Govt Bond",     type: "bond",  weight: 15, target_amount: 7500,  quantity: 75 },     // 7500/100=75
];

// 63 daily closes simulating 3 months of trading
function generateCloses(start: number, end: number, days: number): number[] {
  const closes: number[] = [];
  for (let i = 0; i < days; i++) {
    const t = i / (days - 1);
    // Linear trend + small noise
    const noise = Math.sin(i * 0.7) * start * 0.005;
    closes.push(Math.round((start + (end - start) * t + noise) * 100) / 100);
  }
  return closes;
}

function generateTimestamps(days: number, startDate = "2026-01-10"): number[] {
  const base = new Date(startDate).getTime() / 1000;
  return Array.from({ length: days }, (_, i) => base + i * 86400);
}

const DAYS = 63;
const YAHOO: Record<string, YahooData> = {
  "CW8.PA":  { currentPrice: 520, closes: generateCloses(500, 520, DAYS), timestamps: generateTimestamps(DAYS) },
  "ESE.PA":  { currentPrice: 38,  closes: generateCloses(40, 38, DAYS),   timestamps: generateTimestamps(DAYS) },
  "MC.PA":   { currentPrice: 735, closes: generateCloses(700, 735, DAYS), timestamps: generateTimestamps(DAYS) },
  "OBLI.PA": { currentPrice: 101, closes: generateCloses(100, 101, DAYS), timestamps: generateTimestamps(DAYS) },
};

// ═══════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════

describe("isPlaceholderQty", () => {
  test("detects placeholder: quantity = target_amount / 100", () => {
    expect(isPlaceholderQty(200, 20000)).toBe(true);  // 20000/100=200
    expect(isPlaceholderQty(125, 12500)).toBe(true);
  });
  test("real quantity is not placeholder", () => {
    expect(isPlaceholderQty(40, 20000)).toBe(false);   // 40 ≠ 200
    expect(isPlaceholderQty(312.5, 12500)).toBe(false); // 312.5 ≠ 125
  });
  test("zero quantity is not placeholder", () => {
    expect(isPlaceholderQty(0, 20000)).toBe(false);
  });
  test("zero target_amount is not placeholder", () => {
    expect(isPlaceholderQty(50, 0)).toBe(false);
  });
});

describe("computeQuantity", () => {
  test("uses stored quantity when valid", () => {
    const qty = computeQuantity(ASSETS[0], YAHOO["CW8.PA"].closes, 520, "optimized");
    expect(qty).toBe(40);
  });
  test("placeholder quantity falls back to target/initialPrice", () => {
    const placeholder: RawAsset = { id: "x", symbol: "CW8.PA", name: "test", type: "etf", weight: 40, target_amount: 20000, quantity: 200 };
    const qty = computeQuantity(placeholder, YAHOO["CW8.PA"].closes, 520, "optimized");
    // 20000 / closes[0] = 20000 / 500 = 40
    expect(qty).toBeCloseTo(40, 0);
  });
  test("zero quantity falls back to target/initialPrice", () => {
    const noQty: RawAsset = { id: "x", symbol: "CW8.PA", name: "test", type: "etf", weight: 40, target_amount: 20000, quantity: 0 };
    const qty = computeQuantity(noQty, YAHOO["CW8.PA"].closes, 520, "optimized");
    expect(qty).toBeCloseTo(40, 0);
  });
});

describe("enrichAssets", () => {
  const { enriched, capitalInitial, valeurActuelle } = enrichAssets(ASSETS, YAHOO, "optimized");

  test("capitalInitial = sum of target_amounts", () => {
    expect(capitalInitial).toBe(50000);
  });

  test("valeurActuelle is reasonable (not 0, not absurd)", () => {
    // CW8: 40×520=20800, ESE: 312.5×38=11875, MC: 14.29×735=10503, OBLI: 75×101=7575
    // Total ≈ 50753
    expect(valeurActuelle).toBeGreaterThan(45000);
    expect(valeurActuelle).toBeLessThan(60000);
  });

  test("each asset has currentValue > 0", () => {
    enriched.forEach(a => expect(a.currentValue).toBeGreaterThan(0));
  });

  test("weight is preserved from input", () => {
    expect(enriched[0].weight).toBe(40);
    expect(enriched[1].weight).toBe(25);
    expect(enriched[2].weight).toBe(20);
    expect(enriched[3].weight).toBe(15);
  });

  test("weights sum to 100", () => {
    const totalW = enriched.reduce((s, a) => s + a.weight, 0);
    expect(totalW).toBe(100);
  });

  test("sinceCreation perf is computed for each asset", () => {
    enriched.forEach(a => {
      expect(a.perfs).toHaveProperty("sinceCreation");
      expect(typeof a.perfs["sinceCreation"]).toBe("number");
    });
  });

  test("CW8 sinceCreation ≈ +4% (500→520)", () => {
    const cw8 = enriched.find(a => a.symbol === "CW8.PA")!;
    expect(cw8.perfs["sinceCreation"]).toBeGreaterThan(2);
    expect(cw8.perfs["sinceCreation"]).toBeLessThan(6);
  });

  test("ESE sinceCreation ≈ -5% (40→38)", () => {
    const ese = enriched.find(a => a.symbol === "ESE.PA")!;
    expect(ese.perfs["sinceCreation"]).toBeLessThan(0);
    expect(ese.perfs["sinceCreation"]).toBeGreaterThan(-10);
  });
});

describe("perfSinceCreation", () => {
  test("50000→52000 = +4%", () => {
    expect(perfSinceCreation(52000, 50000)).toBe(4);
  });
  test("50000→45000 = -10%", () => {
    expect(perfSinceCreation(45000, 50000)).toBe(-10);
  });
  test("0 capital → 0%", () => {
    expect(perfSinceCreation(5000, 0)).toBe(0);
  });
  test("no change → 0%", () => {
    expect(perfSinceCreation(50000, 50000)).toBe(0);
  });
});

describe("computePortfolioPerfs", () => {
  const { enriched } = enrichAssets(ASSETS, YAHOO, "optimized");
  const perfs = computePortfolioPerfs(enriched);

  test("returns all period keys", () => {
    expect(perfs).toHaveProperty("1D");
    expect(perfs).toHaveProperty("1M");
    expect(perfs).toHaveProperty("3M");
    expect(perfs).toHaveProperty("6M");
    expect(perfs).toHaveProperty("1Y");
  });

  test("all perfs are numbers", () => {
    Object.values(perfs).forEach(v => expect(typeof v).toBe("number"));
  });

  test("portfolio perf is weighted average (not simple average)", () => {
    // CW8 (40%) went up, ESE (25%) went down → portfolio perf depends on weights
    // This is a sanity check, not an exact value test
    expect(perfs["1M"]).not.toBe(0); // something happened
  });
});

describe("computeVolatility", () => {
  const { enriched } = enrichAssets(ASSETS, YAHOO, "optimized");
  const vol = computeVolatility(enriched, YAHOO);

  test("volatility is positive", () => {
    expect(vol).toBeGreaterThan(0);
  });

  test("volatility is reasonable (1-50%)", () => {
    expect(vol).toBeGreaterThan(1);
    expect(vol).toBeLessThan(50);
  });

  test("volatility is annualized (not daily)", () => {
    // Daily vol ~0.5%, annualized = 0.5% * sqrt(252) ≈ 8%
    // Should be in single/low double digits, not < 1%
    expect(vol).toBeGreaterThan(1);
  });

  test("zero-length closes returns 0", () => {
    const emptyYahoo: Record<string, YahooData> = {
      "CW8.PA":  { currentPrice: 520, closes: [], timestamps: [] },
      "ESE.PA":  { currentPrice: 38,  closes: [], timestamps: [] },
      "MC.PA":   { currentPrice: 735, closes: [], timestamps: [] },
      "OBLI.PA": { currentPrice: 101, closes: [], timestamps: [] },
    };
    const vol0 = computeVolatility(enriched, emptyYahoo);
    expect(vol0).toBe(0);
  });
});

describe("computeSharpe", () => {
  test("positive: perf=10%, vol=15%, rf=3% → Sharpe≈0.47", () => {
    expect(computeSharpe(10, 15, 3)).toBeCloseTo(0.47, 1);
  });
  test("negative: perf=-5%, vol=20% → negative Sharpe", () => {
    expect(computeSharpe(-5, 20, 3)).toBeLessThan(0);
  });
  test("zero vol → 0", () => {
    expect(computeSharpe(10, 0, 3)).toBe(0);
  });
  test("default rf is 3", () => {
    expect(computeSharpe(10, 14)).toBeCloseTo((10 - 3) / 14, 1);
  });
  test("high perf, low vol → high Sharpe", () => {
    expect(computeSharpe(20, 8, 3)).toBeGreaterThan(2);
  });
});

describe("computeDiversificationScore", () => {
  const { enriched } = enrichAssets(ASSETS, YAHOO, "optimized");

  test("4 assets (2 etf, 1 stock, 1 bond) → base 5 + some bonuses", () => {
    const score = computeDiversificationScore(enriched);
    expect(score).toBeGreaterThanOrEqual(5);
    expect(score).toBeLessThanOrEqual(10);
  });

  test("score increases with more assets", () => {
    const small = computeDiversificationScore(enriched.slice(0, 2));
    const full = computeDiversificationScore(enriched);
    expect(full).toBeGreaterThanOrEqual(small);
  });

  test("10+ assets with diverse types → score 8+", () => {
    const big: EnrichedAsset[] = Array.from({ length: 12 }, (_, i) => ({
      id: `a${i}`, symbol: `SYM${i}`, name: `Asset ${i}`,
      type: i < 5 ? "etf" : i < 9 ? "stock" : "bond",
      weight: 8.33, targetAmount: 5000, currentPrice: 100, currentValue: 5000, perfs: {},
    }));
    expect(computeDiversificationScore(big)).toBeGreaterThanOrEqual(8);
  });

  test("1 asset at 100% weight → low score", () => {
    const one: EnrichedAsset[] = [{
      id: "a1", symbol: "X", name: "X", type: "etf",
      weight: 100, targetAmount: 50000, currentPrice: 100, currentValue: 50000, perfs: {},
    }];
    expect(computeDiversificationScore(one)).toBeLessThanOrEqual(6);
  });
});

describe("computeEvolution", () => {
  const { enriched } = enrichAssets(ASSETS, YAHOO, "optimized");
  const { evolution, maxDrawdown, peakValue } = computeEvolution(enriched, YAHOO);

  test("evolution has correct number of data points", () => {
    expect(evolution.length).toBe(DAYS);
  });

  test("each point has date and value", () => {
    evolution.forEach(e => {
      expect(e).toHaveProperty("date");
      expect(e).toHaveProperty("value");
      expect(typeof e.date).toBe("string");
      expect(typeof e.value).toBe("number");
    });
  });

  test("first value ≈ capitalInitial (50000)", () => {
    expect(evolution[0].value).toBeGreaterThan(45000);
    expect(evolution[0].value).toBeLessThan(55000);
  });

  test("values are all positive", () => {
    evolution.forEach(e => expect(e.value).toBeGreaterThan(0));
  });

  test("peakValue ≥ first value", () => {
    expect(peakValue).toBeGreaterThanOrEqual(evolution[0].value);
  });

  test("maxDrawdown is negative or zero", () => {
    expect(maxDrawdown).toBeLessThanOrEqual(0);
  });

  test("maxDrawdown is reasonable (> -50%)", () => {
    expect(maxDrawdown).toBeGreaterThan(-50);
  });

  test("dates are chronologically ordered", () => {
    for (let i = 1; i < evolution.length; i++) {
      expect(evolution[i].date >= evolution[i - 1].date).toBe(true);
    }
  });
});

describe("Edge cases", () => {
  test("empty assets → empty results", () => {
    const { enriched, capitalInitial, valeurActuelle } = enrichAssets([], {}, "optimized");
    expect(enriched).toHaveLength(0);
    expect(capitalInitial).toBe(0);
    expect(valeurActuelle).toBe(0);
  });

  test("asset with no Yahoo data → uses target_amount as fallback", () => {
    const noData: RawAsset[] = [{ id: "x", symbol: "UNKNOWN", name: "Unknown", type: "etf", weight: 100, target_amount: 10000, quantity: 0 }];
    const { enriched } = enrichAssets(noData, {}, "optimized");
    expect(enriched[0].currentValue).toBe(10000); // fallback
  });

  test("perfSinceCreation handles tiny amounts", () => {
    expect(perfSinceCreation(1, 1)).toBe(0);
    expect(perfSinceCreation(2, 1)).toBe(100);
  });
});
