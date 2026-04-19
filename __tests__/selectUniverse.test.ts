import { parseRiskProfile, norm, dedupFilter, BANK_BLOCKED, type Asset } from "@/lib/optimize";

const CAT: Asset[] = [
  { s:"CW8.PA",   n:"Amundi MSCI World",  zone:"monde", type:"etf",   dedup:"MSCI_WORLD",ter:0.12,pea:true, cto:true, av:true },
  { s:"PANX.PA",  n:"PEA MSCI World",     zone:"monde", type:"etf",   dedup:"MSCI_WORLD",ter:0.13,pea:true, cto:true, av:true },
  { s:"ESE.PA",   n:"BNP S&P 500",        zone:"usa",   type:"etf",   dedup:"SP500",     ter:0.15,pea:true, cto:true, av:true },
  { s:"PAEEM.PA", n:"Amundi MSCI EM PEA", zone:"em",    type:"etf",   dedup:"EM_PEA",    ter:0.20,pea:true, cto:true, av:true },
  { s:"MC.PA",    n:"LVMH",               zone:"europe", type:"stock", dedup:"MC",        ter:0,   pea:true, cto:true, av:true },
  { s:"AAPL",     n:"Apple",              zone:"usa",   type:"stock",  dedup:"AAPL",      ter:0,   pea:false,cto:true, av:false },
  { s:"TSLA",     n:"Tesla",              zone:"usa",   type:"stock",  dedup:"TSLA",      ter:0,   pea:false,cto:true, av:false },
  { s:"NVDA",     n:"Nvidia",             zone:"usa",   type:"stock",  dedup:"NVDA",      ter:0,   pea:false,cto:true, av:false },
  { s:"OBLI.PA",  n:"Euro Govt Bond",     zone:"europe",type:"bond",   dedup:"EUR_GOV",   ter:0.15,pea:false,cto:true, av:true },
  { s:"SGLD.L",   n:"iShares Gold",       zone:"monde", type:"gold",   dedup:"GOLD_EU",   ter:0.12,pea:false,cto:true, av:true },
  { s:"IWDA.AS",  n:"iShares MSCI World", zone:"monde", type:"etf",   dedup:"MSCI_WORLD",ter:0.20,pea:false,cto:true, av:false },
];

function filterBySupport(assets: Asset[], support: "PEA"|"CTO"|"AV"): Asset[] {
  if (support === "PEA") return assets.filter(a => a.pea);
  if (support === "AV") return assets.filter(a => a.av);
  return assets;
}

function filterByZone(assets: Asset[], zones: string[]): Asset[] {
  if (zones.includes("monde") || zones.includes("Monde entier")) return assets;
  const zoneMap: Record<string, string[]> = {
    "Amérique du Nord": ["usa"], "Europe": ["europe"], "Asie-Pacifique": ["em"],
    "Marchés Émergents": ["em"],
  };
  const allowed = new Set<string>(["monde", "any"]);
  zones.forEach(z => (zoneMap[z] || [z]).forEach(x => allowed.add(x)));
  return assets.filter(a => allowed.has(a.zone));
}

function filterByRisk(assets: Asset[], risk: string): Asset[] {
  if (risk === "defensive") {
    const excl = ["TSLA","NVDA","KWEB","MCHI"];
    return assets.filter(a => !excl.includes(a.s));
  }
  return assets;
}

function filterByBank(assets: Asset[], banque: string): Asset[] {
  const blocked = BANK_BLOCKED[banque] || [];
  return assets.filter(a => !blocked.includes(a.s));
}

describe("parseRiskProfile", () => {
  test("Modéré + -20% → moderate", () => { expect(parseRiskProfile("Modéré", "−20% maximum")).toBe("moderate"); });
  test("Agressif + Pas de limite → aggressive", () => { expect(parseRiskProfile("Agressif", "Pas de limite")).toBe("aggressive"); });
  test("Conservateur + -10% → defensive", () => { expect(parseRiskProfile("Conservateur", "−10% maximum")).toBe("defensive"); });
  test("Dynamique + -20% → moderate (Q3 constrains)", () => { expect(parseRiskProfile("Dynamique", "−20% maximum")).toBe("moderate"); });
  test("Modéré + -35% → moderate (Q2 constrains)", () => { expect(parseRiskProfile("Modéré", "−35% maximum")).toBe("moderate"); });
  test("Conservateur + Pas de limite → defensive", () => { expect(parseRiskProfile("Conservateur", "Pas de limite")).toBe("defensive"); });
});

describe("Support filtering", () => {
  test("PEA → no asset with pea:false", () => {
    const f = filterBySupport(CAT, "PEA");
    expect(f.every(a => a.pea)).toBe(true);
    expect(f.find(a => a.s === "AAPL")).toBeUndefined();
  });
  test("AV → no asset with av:false", () => {
    const f = filterBySupport(CAT, "AV");
    expect(f.every(a => a.av)).toBe(true);
  });
  test("CTO → all assets", () => {
    expect(filterBySupport(CAT, "CTO").length).toBe(CAT.length);
  });
});

describe("Zone filtering", () => {
  test("Europe → only europe + monde", () => {
    filterByZone(CAT, ["Europe"]).forEach(a => expect(["europe","monde","any"]).toContain(a.zone));
  });
  test("monde → all assets", () => {
    expect(filterByZone(CAT, ["Monde entier"]).length).toBe(CAT.length);
  });
});

describe("Risk filtering", () => {
  test("defensive excludes TSLA/NVDA", () => {
    const f = filterByRisk(CAT, "defensive");
    expect(f.find(a => a.s === "TSLA")).toBeUndefined();
    expect(f.find(a => a.s === "NVDA")).toBeUndefined();
  });
  test("defensive keeps bonds and gold", () => {
    const f = filterByRisk(CAT, "defensive");
    expect(f.find(a => a.type === "bond")).toBeDefined();
    expect(f.find(a => a.type === "gold")).toBeDefined();
  });
});

describe("Bank filtering", () => {
  test("IB blocks PAEEM.PA", () => {
    const f = filterByBank(CAT, "Interactive Brokers");
    expect(f.find(a => a.s === "PAEEM.PA")).toBeUndefined();
  });
  test("Trade Republic blocks nothing", () => {
    expect(filterByBank(CAT, "Trade Republic").length).toBe(CAT.length);
  });
});

describe("Anti-doublon via dedupFilter", () => {
  test("never CW8.PA + PANX.PA together", () => {
    const f = dedupFilter(CAT);
    const msci = f.filter(a => a.dedup === "MSCI_WORLD");
    expect(msci.length).toBe(1);
    expect(msci[0].s).toBe("CW8.PA"); // lowest ter
  });
});

describe("Combined pipeline", () => {
  test("PEA + Europe + defensive = valid universe", () => {
    let u = filterBySupport(CAT, "PEA");
    u = filterByZone(u, ["Europe"]);
    u = filterByRisk(u, "defensive");
    u = dedupFilter(u);
    expect(u.length).toBeGreaterThan(0);
    u.forEach(a => expect(a.pea).toBe(true));
  });
});
