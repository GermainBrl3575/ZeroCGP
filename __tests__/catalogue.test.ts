import { norm, dedupFilter, inferType, type Asset } from "@/lib/optimize";

// Mini catalogue matching real DB
const CATALOGUE: Asset[] = [
  { s:"CW8.PA",  n:"Amundi MSCI World",    zone:"monde",type:"etf",  dedup:"MSCI_WORLD",ter:0.12,pea:true, cto:true,av:true },
  { s:"PANX.PA", n:"Amundi PEA MSCI World",zone:"monde",type:"etf",  dedup:"MSCI_WORLD",ter:0.13,pea:true, cto:true,av:true },
  { s:"IWDA.AS", n:"iShares MSCI World",   zone:"monde",type:"etf",  dedup:"MSCI_WORLD",ter:0.20,pea:false,cto:true,av:false },
  { s:"SUWS.L",  n:"iShares MSCI World ESG",zone:"monde",type:"etf", dedup:"MSCI_WORLD",ter:0.20,pea:false,cto:true,av:false,esg:true },
  { s:"ESE.PA",  n:"BNP S&P 500",          zone:"usa",  type:"etf",  dedup:"SP500",     ter:0.15,pea:true, cto:true,av:true },
  { s:"SXR8.DE", n:"iShares S&P 500 EUR",  zone:"usa",  type:"etf",  dedup:"SP500",     ter:0.07,pea:false,cto:true,av:false },
  { s:"MC.PA",   n:"LVMH",                 zone:"europe",type:"stock",dedup:"MC",        ter:0,   pea:true, cto:true,av:true },
  { s:"OBLI.PA", n:"Lyxor Euro Govt Bond", zone:"europe",type:"bond", dedup:"EUR_GOV",   ter:0.15,pea:false,cto:true,av:true },
  { s:"XGLE.DE", n:"Xtrackers Euro Govt",  zone:"europe",type:"bond", dedup:"EUR_GOV_DE",ter:0.15,pea:false,cto:true,av:true },
  { s:"SGLD.L",  n:"iShares Gold",         zone:"monde",type:"gold",  dedup:"GOLD_EU",   ter:0.12,pea:false,cto:true,av:true },
  { s:"IBGS.L",  n:"iShares EUR Govt 1-3", zone:"europe",type:"bond", dedup:"EUR_GOV_ST",ter:0.20,pea:false,cto:true,av:true },
  { s:"EUNL.DE", n:"iShares MSCI World EUR",zone:"monde",type:"etf", dedup:"MSCI_WORLD_DE",ter:0.20,pea:false,cto:true,av:false },
];

describe("norm()", () => {
  test("lowercases", () => { expect(norm("HELLO")).toBe("hello"); });
  test("replaces accents: é→e", () => { expect(norm("Modéré")).toBe("modere"); });
  test("replaces accents: à→a", () => { expect(norm("Déjà")).toBe("deja"); });
  test("replaces ç→c", () => { expect(norm("français")).toBe("francais"); });
  test("replaces î→i, ô→o, û→u", () => { expect(norm("île côte sûr")).toBe("ile cote sur"); });
  test("no-op on plain ASCII", () => { expect(norm("hello world")).toBe("hello world"); });
});

describe("dedupFilter()", () => {
  test("keeps lowest TER per dedup group", () => {
    const filtered = dedupFilter(CATALOGUE);
    const msci = filtered.filter(a => a.dedup === "MSCI_WORLD");
    expect(msci).toHaveLength(1);
    expect(msci[0].s).toBe("CW8.PA"); // ter 0.12 < 0.13 < 0.20
  });

  test("SP500 dedup keeps SXR8.DE (ter 0.07)", () => {
    const filtered = dedupFilter(CATALOGUE);
    const sp = filtered.filter(a => a.dedup === "SP500");
    expect(sp).toHaveLength(1);
    expect(sp[0].s).toBe("SXR8.DE");
  });

  test("unique dedups are all kept", () => {
    const filtered = dedupFilter(CATALOGUE);
    const dedups = new Set(filtered.map(a => a.dedup));
    // Each dedup should appear exactly once
    expect(filtered.length).toBe(dedups.size);
  });

  test("output length <= input length", () => {
    const filtered = dedupFilter(CATALOGUE);
    expect(filtered.length).toBeLessThanOrEqual(CATALOGUE.length);
  });
});

describe("inferType()", () => {
  test("EUR_GOV → bond", () => { expect(inferType("EUR_GOV", "etf")).toBe("bond"); });
  test("GLOBAL_AGG → bond", () => { expect(inferType("GLOBAL_AGG", "etf")).toBe("bond"); });
  test("GOLD_EU → gold", () => { expect(inferType("GOLD_EU", "etf")).toBe("gold"); });
  test("GOLD_MINERS → gold", () => { expect(inferType("GOLD_MINERS", "stock")).toBe("gold"); });
  test("US_REITS → reit", () => { expect(inferType("US_REITS", "etf")).toBe("reit"); });
  test("BTC → etf (crypto removed from optimizer)", () => { expect(inferType("BTC", "etf")).toBe("etf"); });
  test("stock type preserved", () => { expect(inferType("MC", "stock")).toBe("stock"); });
  test("unknown dedup + etf → etf", () => { expect(inferType("MSCI_WORLD", "etf")).toBe("etf"); });
  test("NAT_RES → commodity", () => { expect(inferType("NAT_RES", "etf")).toBe("commodity"); });
});

describe("AV flag rules on catalogue", () => {
  test("all .PA assets have av:true", () => {
    CATALOGUE.filter(a => a.s.endsWith(".PA")).forEach(a => expect(a.av).toBe(true));
  });
  test("XGLE.DE has av:true", () => { expect(CATALOGUE.find(a => a.s === "XGLE.DE")?.av).toBe(true); });
  test("SGLD.L has av:true", () => { expect(CATALOGUE.find(a => a.s === "SGLD.L")?.av).toBe(true); });
  test("IBGS.L has av:true", () => { expect(CATALOGUE.find(a => a.s === "IBGS.L")?.av).toBe(true); });
  test(".DE (except XGLE.DE) have av:false", () => {
    CATALOGUE.filter(a => a.s.endsWith(".DE") && a.s !== "XGLE.DE").forEach(a => expect(a.av).toBe(false));
  });
  test("SUWS.L has dedup MSCI_WORLD", () => {
    expect(CATALOGUE.find(a => a.s === "SUWS.L")?.dedup).toBe("MSCI_WORLD");
  });
});
