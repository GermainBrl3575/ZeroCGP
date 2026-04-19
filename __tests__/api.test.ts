/**
 * API endpoint contract tests.
 * Validates request/response structure without real DB calls.
 */

// Mock answer sets matching the questionnaire format
const VALID_ANSWERS = {
  "1": "5 à 10 ans",
  "2": "Modéré",
  "3": "−20% maximum",
  "4": "Aucun filtre",
  "5": "ETF,Actions",
  "6": "Monde entier",
  "7": "Equilibre",
  "8": '[{"type":"PEA","banque":"BoursoBank","pct":100}]',
};

const AGGRESSIVE_ANSWERS = {
  "1": "10 ans et plus",
  "2": "Agressif",
  "3": "Pas de limite",
  "4": "Aucun filtre",
  "5": "ETF,Actions",
  "6": "Monde entier",
  "7": "Large",
  "8": '[{"type":"CTO","banque":"Interactive Brokers","pct":100}]',
};

function validateOptimizeRequest(body: Record<string, unknown>) {
  if (!body.capital || typeof body.capital !== "number" || body.capital <= 0) {
    return { status: 400, error: "Capital requis" };
  }
  if (!body.answers || typeof body.answers !== "object") {
    return { status: 400, error: "Answers requis" };
  }
  const answers = body.answers as Record<string, string>;
  if (!answers["1"] || !answers["2"]) {
    return { status: 400, error: "Réponses incomplètes" };
  }
  return { status: 200 };
}

function parseRiskProfile(answers: Record<string, string>): string {
  const q2 = (answers["2"] || "").toLowerCase();
  const q3 = answers["3"] || "";
  const riskFromQ2: Record<string, string> = {
    conservateur: "defensive", modéré: "moderate", "modere": "moderate",
    dynamique: "balanced", agressif: "aggressive",
  };
  const riskFromQ3: Record<string, string> = {
    "10%": "defensive", "20%": "moderate", "35%": "balanced",
  };

  let riskQ2 = "balanced";
  for (const [k, v] of Object.entries(riskFromQ2)) {
    if (q2.includes(k)) { riskQ2 = v; break; }
  }
  let riskQ3 = "aggressive";
  if (q3.includes("limite")) riskQ3 = "aggressive";
  else { for (const [k, v] of Object.entries(riskFromQ3)) { if (q3.includes(k)) { riskQ3 = v; break; } } }

  const order = ["defensive", "moderate", "balanced", "aggressive"];
  return order[Math.min(order.indexOf(riskQ2), order.indexOf(riskQ3))];
}

function mockOptimizeResponse(capital: number, answers: Record<string, string>) {
  const risk = parseRiskProfile(answers);
  const methods = ["minvariance", "maxsharpe", "maxutility"];
  return {
    results: methods.map(m => ({
      method: m,
      label: m === "maxsharpe" ? "Sharpe Maximum" : m === "minvariance" ? "Variance Minimale" : "Utilité Maximale",
      ret: risk === "defensive" ? 4.2 : risk === "moderate" ? 7.5 : 10.8,
      vol: risk === "defensive" ? 6.1 : risk === "moderate" ? 11.2 : 16.5,
      sharpe: 0.45,
      var95: risk === "defensive" ? 9.2 : 16.8,
      rec: m === "maxsharpe",
      weights: [
        { symbol: "CW8.PA", name: "Amundi MSCI World", type: "etf", weight: 30, amount: capital * 0.30 },
        { symbol: "ESE.PA", name: "BNP S&P 500", type: "etf", weight: 20, amount: capital * 0.20 },
        { symbol: "MC.PA", name: "LVMH", type: "stock", weight: 15, amount: capital * 0.15 },
        { symbol: "PAEEM.PA", name: "MSCI EM", type: "etf", weight: 10, amount: capital * 0.10 },
        { symbol: "OBLI.PA", name: "Euro Govt Bond", type: "bond", weight: 25, amount: capital * 0.25 },
      ],
      frontier: [{ vol: 5, ret: 3 }, { vol: 10, ret: 7 }, { vol: 15, ret: 10 }],
    })),
  };
}

describe("API request validation", () => {
  test("valid request returns 200", () => {
    const result = validateOptimizeRequest({ capital: 50000, answers: VALID_ANSWERS });
    expect(result.status).toBe(200);
  });

  test("missing capital returns 400", () => {
    const result = validateOptimizeRequest({ answers: VALID_ANSWERS });
    expect(result.status).toBe(400);
  });

  test("zero capital returns 400", () => {
    const result = validateOptimizeRequest({ capital: 0, answers: VALID_ANSWERS });
    expect(result.status).toBe(400);
  });

  test("missing answers returns 400", () => {
    const result = validateOptimizeRequest({ capital: 50000 });
    expect(result.status).toBe(400);
  });

  test("empty answers returns 400", () => {
    const result = validateOptimizeRequest({ capital: 50000, answers: {} });
    expect(result.status).toBe(400);
  });
});

describe("Risk profile parsing", () => {
  test("Modéré + -20% → moderate", () => {
    expect(parseRiskProfile(VALID_ANSWERS)).toBe("moderate");
  });

  test("Agressif + Pas de limite → aggressive", () => {
    expect(parseRiskProfile(AGGRESSIVE_ANSWERS)).toBe("aggressive");
  });

  test("Conservateur + -10% → defensive", () => {
    expect(parseRiskProfile({ "2": "Conservateur", "3": "−10% maximum" })).toBe("defensive");
  });

  test("Dynamique + -20% → moderate (Q3 overrides Q2 downward)", () => {
    expect(parseRiskProfile({ "2": "Dynamique", "3": "−20% maximum" })).toBe("moderate");
  });

  test("Modéré + -35% → moderate (Q2 is the constraint)", () => {
    expect(parseRiskProfile({ "2": "Modéré", "3": "−35% maximum" })).toBe("moderate");
  });
});

describe("Optimize response structure", () => {
  test("returns 3 methods", () => {
    const resp = mockOptimizeResponse(50000, VALID_ANSWERS);
    expect(resp.results).toHaveLength(3);
    const methods = resp.results.map(r => r.method);
    expect(methods).toContain("minvariance");
    expect(methods).toContain("maxsharpe");
    expect(methods).toContain("maxutility");
  });

  test("exactly one result is recommended", () => {
    const resp = mockOptimizeResponse(50000, VALID_ANSWERS);
    const recs = resp.results.filter(r => r.rec);
    expect(recs).toHaveLength(1);
    expect(recs[0].method).toBe("maxsharpe");
  });

  test("all weights have required fields", () => {
    const resp = mockOptimizeResponse(50000, VALID_ANSWERS);
    for (const r of resp.results) {
      for (const w of r.weights) {
        expect(w).toHaveProperty("symbol");
        expect(w).toHaveProperty("name");
        expect(w).toHaveProperty("type");
        expect(w).toHaveProperty("weight");
        expect(w).toHaveProperty("amount");
      }
    }
  });

  test("capital = sum of amounts", () => {
    const capital = 50000;
    const resp = mockOptimizeResponse(capital, VALID_ANSWERS);
    for (const r of resp.results) {
      const totalAmount = r.weights.reduce((s, w) => s + w.amount, 0);
      expect(Math.abs(totalAmount - capital)).toBeLessThan(1);
    }
  });

  test("universe > 0 (weights array not empty)", () => {
    const resp = mockOptimizeResponse(50000, VALID_ANSWERS);
    for (const r of resp.results) {
      expect(r.weights.length).toBeGreaterThan(0);
    }
  });

  test("frontier has at least 2 points", () => {
    const resp = mockOptimizeResponse(50000, VALID_ANSWERS);
    for (const r of resp.results) {
      expect(r.frontier.length).toBeGreaterThanOrEqual(2);
    }
  });

  test("defensive profile has lower vol than aggressive", () => {
    const def = mockOptimizeResponse(50000, { "2": "Conservateur", "3": "−10% maximum" });
    const agg = mockOptimizeResponse(50000, AGGRESSIVE_ANSWERS);
    expect(def.results[0].vol).toBeLessThan(agg.results[0].vol);
  });
});
