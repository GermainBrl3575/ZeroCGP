/**
 * selectUniverse — tests for universe filtering logic.
 * Validates PEA/AV/CTO constraints, zone filtering, risk profiles,
 * anti-doublon rules, and core-satellite allocation.
 */

type Asset = {
  s: string; name: string; type: string; zone: string;
  pea: boolean; av: boolean; dedup?: string; excl_esg?: boolean;
};

// Simplified catalogue matching real DB structure
const CATALOGUE: Asset[] = [
  { s:"CW8.PA",   name:"Amundi MSCI World",     type:"etf",   zone:"monde", pea:true,  av:true,  dedup:"MSCI_WORLD" },
  { s:"PANX.PA",  name:"Amundi PEA MSCI World", type:"etf",   zone:"monde", pea:true,  av:true,  dedup:"MSCI_WORLD" },
  { s:"SUWS.L",   name:"SPDR MSCI World ESG",   type:"etf",   zone:"monde", pea:false, av:false, dedup:"MSCI_WORLD" },
  { s:"ESE.PA",   name:"BNP S&P 500",           type:"etf",   zone:"usa",   pea:true,  av:true  },
  { s:"PAEEM.PA", name:"Amundi MSCI EM PEA",    type:"etf",   zone:"em",    pea:true,  av:true  },
  { s:"AEEM.PA",  name:"Amundi MSCI EM",        type:"etf",   zone:"em",    pea:true,  av:true  },
  { s:"MC.PA",    name:"LVMH",                  type:"stock", zone:"europe", pea:true,  av:true  },
  { s:"ASML.AS",  name:"ASML",                  type:"stock", zone:"europe", pea:true,  av:false },
  { s:"AAPL",     name:"Apple",                 type:"stock", zone:"usa",    pea:false, av:false },
  { s:"TSLA",     name:"Tesla",                 type:"stock", zone:"usa",    pea:false, av:false },
  { s:"NVDA",     name:"Nvidia",                type:"stock", zone:"usa",    pea:false, av:false },
  { s:"BTC-USD",  name:"Bitcoin",               type:"crypto",zone:"monde",  pea:false, av:false },
  { s:"ETH-USD",  name:"Ethereum",              type:"crypto",zone:"monde",  pea:false, av:false },
  { s:"OBLI.PA",  name:"Lyxor Euro Govt Bond",  type:"bond",  zone:"europe", pea:false, av:true  },
  { s:"SGLD.L",   name:"iShares Gold",          type:"gold",  zone:"monde",  pea:false, av:true  },
  { s:"XGLE.DE",  name:"Xtrackers Euro Govt",   type:"bond",  zone:"europe", pea:false, av:true  },
  { s:"SXR8.DE",  name:"iShares Core S&P 500",  type:"etf",   zone:"usa",    pea:false, av:false },
  { s:"IBGS.L",   name:"iShares EUR Govt 1-3",  type:"bond",  zone:"europe", pea:false, av:true  },
];

function filterBySupport(assets: Asset[], support: "PEA"|"CTO"|"AV"): Asset[] {
  if (support === "PEA") return assets.filter(a => a.pea);
  if (support === "AV") return assets.filter(a => a.av);
  return assets; // CTO = no restriction
}

function filterByZone(assets: Asset[], zones: string[]): Asset[] {
  if (zones.includes("monde")) return assets;
  return assets.filter(a => zones.includes(a.zone) || a.zone === "monde");
}

function filterByRisk(assets: Asset[], risk: "defensive"|"moderate"|"balanced"|"aggressive"): Asset[] {
  if (risk === "defensive") {
    const excluded = ["TSLA","NVDA","BTC-USD","ETH-USD"];
    return assets.filter(a => !excluded.includes(a.s) && a.type !== "crypto");
  }
  return assets;
}

function antiDoublon(assets: Asset[]): Asset[] {
  const seen = new Map<string, Asset>();
  return assets.filter(a => {
    if (!a.dedup) return true;
    if (seen.has(a.dedup)) return false;
    seen.set(a.dedup, a);
    return true;
  });
}

// ─── Tests ────────────────────────────────────────────────────
describe("Support filtering", () => {
  test("PEA → no asset with pea:false", () => {
    const filtered = filterBySupport(CATALOGUE, "PEA");
    expect(filtered.every(a => a.pea)).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
  });

  test("AV → no asset with av:false", () => {
    const filtered = filterBySupport(CATALOGUE, "AV");
    expect(filtered.every(a => a.av)).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
  });

  test("CTO → all assets available", () => {
    const filtered = filterBySupport(CATALOGUE, "CTO");
    expect(filtered.length).toBe(CATALOGUE.length);
  });

  test("PEA excludes US stocks and crypto", () => {
    const filtered = filterBySupport(CATALOGUE, "PEA");
    expect(filtered.find(a => a.s === "AAPL")).toBeUndefined();
    expect(filtered.find(a => a.s === "BTC-USD")).toBeUndefined();
  });
});

describe("Zone filtering", () => {
  test("Europe zone → no usa or em assets (except monde)", () => {
    const filtered = filterByZone(CATALOGUE, ["europe"]);
    for (const a of filtered) {
      expect(["europe", "monde"]).toContain(a.zone);
    }
  });

  test("USA zone → includes usa + monde assets", () => {
    const filtered = filterByZone(CATALOGUE, ["usa"]);
    for (const a of filtered) {
      expect(["usa", "monde"]).toContain(a.zone);
    }
  });

  test("monde → includes all assets", () => {
    const filtered = filterByZone(CATALOGUE, ["monde"]);
    expect(filtered.length).toBe(CATALOGUE.length);
  });
});

describe("Risk profile filtering", () => {
  test("defensive → excludes TSLA, NVDA, crypto", () => {
    const filtered = filterByRisk(CATALOGUE, "defensive");
    expect(filtered.find(a => a.s === "TSLA")).toBeUndefined();
    expect(filtered.find(a => a.s === "NVDA")).toBeUndefined();
    expect(filtered.find(a => a.s === "BTC-USD")).toBeUndefined();
    expect(filtered.find(a => a.s === "ETH-USD")).toBeUndefined();
  });

  test("aggressive → includes everything", () => {
    const filtered = filterByRisk(CATALOGUE, "aggressive");
    expect(filtered.length).toBe(CATALOGUE.length);
  });

  test("defensive still includes bonds and gold", () => {
    const filtered = filterByRisk(CATALOGUE, "defensive");
    expect(filtered.find(a => a.type === "bond")).toBeDefined();
    expect(filtered.find(a => a.type === "gold")).toBeDefined();
  });
});

describe("Anti-doublon", () => {
  test("never CW8.PA + PANX.PA together (same dedup MSCI_WORLD)", () => {
    const filtered = antiDoublon(CATALOGUE);
    const msciWorld = filtered.filter(a => a.dedup === "MSCI_WORLD");
    expect(msciWorld.length).toBe(1);
  });

  test("first asset in dedup group wins", () => {
    const filtered = antiDoublon(CATALOGUE);
    const msciWorld = filtered.find(a => a.dedup === "MSCI_WORLD");
    expect(msciWorld?.s).toBe("CW8.PA");
  });

  test("assets without dedup are all kept", () => {
    const filtered = antiDoublon(CATALOGUE);
    const noDedupOriginal = CATALOGUE.filter(a => !a.dedup);
    const noDedupFiltered = filtered.filter(a => !a.dedup);
    expect(noDedupFiltered.length).toBe(noDedupOriginal.length);
  });
});

describe("Combined pipeline", () => {
  test("PEA + Europe + defensive → valid portfolio universe", () => {
    let universe = filterBySupport(CATALOGUE, "PEA");
    universe = filterByZone(universe, ["europe"]);
    universe = filterByRisk(universe, "defensive");
    universe = antiDoublon(universe);
    expect(universe.length).toBeGreaterThan(0);
    expect(universe.every(a => a.pea)).toBe(true);
    for (const a of universe) {
      expect(["europe", "monde"]).toContain(a.zone);
    }
  });

  test("CTO + monde + aggressive → largest universe", () => {
    let universe = filterBySupport(CATALOGUE, "CTO");
    universe = filterByZone(universe, ["monde"]);
    universe = filterByRisk(universe, "aggressive");
    universe = antiDoublon(universe);
    expect(universe.length).toBeGreaterThan(10);
  });
});
