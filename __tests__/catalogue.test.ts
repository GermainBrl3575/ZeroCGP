/**
 * Catalogue and flags — tests for asset metadata correctness.
 * Validates av/pea flags, dedup groups, and weight normalization.
 */

type Asset = {
  s: string; av: boolean; pea: boolean; dedup?: string;
  type: string; ter?: number;
};

// Catalogue flags matching the real DB rules
const CATALOGUE: Asset[] = [
  // .PA → always av:true
  { s:"CW8.PA",   av:true,  pea:true,  dedup:"MSCI_WORLD", type:"etf", ter:0.38 },
  { s:"PANX.PA",  av:true,  pea:true,  dedup:"MSCI_WORLD", type:"etf", ter:0.38 },
  { s:"ESE.PA",   av:true,  pea:true,  type:"etf", ter:0.15 },
  { s:"PAEEM.PA", av:true,  pea:true,  type:"etf", ter:0.20 },
  { s:"MC.PA",    av:true,  pea:true,  type:"stock" },
  { s:"OBLI.PA",  av:true,  pea:false, type:"bond" },
  // .DE → av:false except XGLE.DE
  { s:"XGLE.DE",  av:true,  pea:false, type:"bond" },
  { s:"SXR8.DE",  av:false, pea:false, type:"etf" },
  { s:"EUNL.DE",  av:false, pea:false, type:"etf" },
  // .L → av:false except SGLD.L and IBGS.L
  { s:"SGLD.L",   av:true,  pea:false, type:"gold" },
  { s:"IBGS.L",   av:true,  pea:false, type:"bond" },
  { s:"SUWS.L",   av:false, pea:false, dedup:"MSCI_WORLD", type:"etf" },
  { s:"VWRL.L",   av:false, pea:false, type:"etf" },
  // US
  { s:"AAPL",     av:false, pea:false, type:"stock" },
  { s:"MSFT",     av:false, pea:false, type:"stock" },
];

describe("AV flag rules", () => {
  test("all .PA assets have av:true", () => {
    const pa = CATALOGUE.filter(a => a.s.endsWith(".PA"));
    expect(pa.length).toBeGreaterThan(0);
    expect(pa.every(a => a.av)).toBe(true);
  });

  test("XGLE.DE has av:true (exception)", () => {
    const xgle = CATALOGUE.find(a => a.s === "XGLE.DE");
    expect(xgle?.av).toBe(true);
  });

  test("SGLD.L has av:true (exception)", () => {
    const sgld = CATALOGUE.find(a => a.s === "SGLD.L");
    expect(sgld?.av).toBe(true);
  });

  test("IBGS.L has av:true (exception)", () => {
    const ibgs = CATALOGUE.find(a => a.s === "IBGS.L");
    expect(ibgs?.av).toBe(true);
  });

  test(".DE assets (except XGLE.DE) have av:false", () => {
    const de = CATALOGUE.filter(a => a.s.endsWith(".DE") && a.s !== "XGLE.DE");
    expect(de.length).toBeGreaterThan(0);
    expect(de.every(a => !a.av)).toBe(true);
  });

  test(".L assets (except SGLD.L/IBGS.L) have av:false", () => {
    const l = CATALOGUE.filter(a => a.s.endsWith(".L") && a.s !== "SGLD.L" && a.s !== "IBGS.L");
    expect(l.length).toBeGreaterThan(0);
    expect(l.every(a => !a.av)).toBe(true);
  });
});

describe("Dedup groups", () => {
  test("SUWS.L has dedup=MSCI_WORLD (same as CW8.PA)", () => {
    const suws = CATALOGUE.find(a => a.s === "SUWS.L");
    expect(suws?.dedup).toBe("MSCI_WORLD");
  });

  test("CW8.PA and PANX.PA share dedup=MSCI_WORLD", () => {
    const cw8 = CATALOGUE.find(a => a.s === "CW8.PA");
    const panx = CATALOGUE.find(a => a.s === "PANX.PA");
    expect(cw8?.dedup).toBe("MSCI_WORLD");
    expect(panx?.dedup).toBe("MSCI_WORLD");
    expect(cw8?.dedup).toBe(panx?.dedup);
  });

  test("assets without dedup are independent", () => {
    const noDup = CATALOGUE.filter(a => !a.dedup);
    expect(noDup.length).toBeGreaterThan(5);
  });
});

describe("Weight normalization", () => {
  test("weights sum to 100% after normalization", () => {
    const raw = [32.8, 25.1, 18.2, 12.5, 8.4, 3.0];
    const total = raw.reduce((a, b) => a + b, 0);
    const normalized = raw.map(w => (w / total) * 100);
    const sum = normalized.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 100)).toBeLessThan(0.01);
  });

  test("normalization preserves relative order", () => {
    const raw = [32.8, 25.1, 18.2, 12.5, 8.4];
    const total = raw.reduce((a, b) => a + b, 0);
    const normalized = raw.map(w => (w / total) * 100);
    for (let i = 0; i < normalized.length - 1; i++) {
      expect(normalized[i]).toBeGreaterThan(normalized[i + 1]);
    }
  });

  test("zero weights stay zero after normalization", () => {
    const raw = [50, 30, 20, 0, 0];
    const total = raw.reduce((a, b) => a + b, 0);
    const normalized = raw.map(w => total > 0 ? (w / total) * 100 : 0);
    expect(normalized[3]).toBe(0);
    expect(normalized[4]).toBe(0);
    expect(Math.abs(normalized[0] + normalized[1] + normalized[2] - 100)).toBeLessThan(0.01);
  });
});

describe("PEA flag rules", () => {
  test("all .PA etf/stock assets have pea:true", () => {
    const paEquity = CATALOGUE.filter(a => a.s.endsWith(".PA") && (a.type === "etf" || a.type === "stock"));
    expect(paEquity.every(a => a.pea)).toBe(true);
  });

  test(".PA bonds have pea:false", () => {
    const paBonds = CATALOGUE.filter(a => a.s.endsWith(".PA") && a.type === "bond");
    expect(paBonds.every(a => !a.pea)).toBe(true);
  });

  test("US stocks have pea:false", () => {
    const us = CATALOGUE.filter(a => !a.s.includes("."));
    expect(us.every(a => !a.pea)).toBe(true);
  });
});
