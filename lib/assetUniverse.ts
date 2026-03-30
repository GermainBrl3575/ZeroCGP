export type AssetClass = "etf" | "stock" | "crypto" | "bond" | "reit";
export type Region = "world" | "usa" | "europe" | "asia" | "emerging" | "global";
export type Sector = "tech" | "finance" | "health" | "energy" | "consumer" | "industrial" | "materials" | "telecom" | "utilities" | "realestate" | "luxury" | "defense" | "broad";

export interface AssetMeta {
  symbol: string;   // ticker Yahoo Finance
  name: string;
  type: AssetClass;
  region: Region;
  sector: Sector;
  esg: boolean;     // filtre ESG compatible
  ter?: number;     // frais annuels (ETF)
  isin?: string;
}

export const ASSET_UNIVERSE: AssetMeta[] = [
  // ── ETF MONDE / GLOBAL ────────────────────────────────────
  { symbol:"IWDA.AS",  name:"iShares MSCI World",           type:"etf", region:"world",    sector:"broad",    esg:false, ter:0.20, isin:"IE00B4L5Y983" },
  { symbol:"VWCE.DE",  name:"Vanguard All-World",           type:"etf", region:"world",    sector:"broad",    esg:false, ter:0.22, isin:"IE00BK5BQT80" },
  { symbol:"LCWD.PA",  name:"L&G MSCI World",               type:"etf", region:"world",    sector:"broad",    esg:false, ter:0.10, isin:"IE00BK5BQT80" },
  { symbol:"SWRD.PA",  name:"SPDR MSCI World",              type:"etf", region:"world",    sector:"broad",    esg:false, ter:0.12 },
  { symbol:"XDWD.DE",  name:"Xtrackers MSCI World",         type:"etf", region:"world",    sector:"broad",    esg:false, ter:0.19 },
  { symbol:"WSML.L",   name:"iShares MSCI World Small Cap", type:"etf", region:"world",    sector:"broad",    esg:false, ter:0.35 },
  { symbol:"SUSW.PA",  name:"iShares MSCI World ESG",       type:"etf", region:"world",    sector:"broad",    esg:true,  ter:0.20, isin:"IE00BYX2JD69" },
  { symbol:"PAWD.PA",  name:"Amundi MSCI World SRI",        type:"etf", region:"world",    sector:"broad",    esg:true,  ter:0.18 },
  { symbol:"SGWD.L",   name:"iShares MSCI World SRI",       type:"etf", region:"world",    sector:"broad",    esg:true,  ter:0.20 },

  // ── ETF USA ───────────────────────────────────────────────
  { symbol:"CSPX.AS",  name:"iShares Core S&P 500",         type:"etf", region:"usa",      sector:"broad",    esg:false, ter:0.07, isin:"IE00B5BMR087" },
  { symbol:"SXR8.DE",  name:"iShares Core S&P 500 EUR",     type:"etf", region:"usa",      sector:"broad",    esg:false, ter:0.07 },
  { symbol:"VUAA.PA",  name:"Vanguard S&P 500",             type:"etf", region:"usa",      sector:"broad",    esg:false, ter:0.07 },
  { symbol:"EQQQ.DE",  name:"Invesco NASDAQ-100",           type:"etf", region:"usa",      sector:"tech",     esg:false, ter:0.30, isin:"IE0032077012" },
  { symbol:"SXRV.DE",  name:"iShares NASDAQ-100",           type:"etf", region:"usa",      sector:"tech",     esg:false, ter:0.33 },
  { symbol:"QDVE.DE",  name:"iShares S&P 500 IT",           type:"etf", region:"usa",      sector:"tech",     esg:false, ter:0.15, isin:"IE00B3RBWM25" },
  { symbol:"QDVH.DE",  name:"iShares S&P 500 Health",       type:"etf", region:"usa",      sector:"health",   esg:false, ter:0.15 },
  { symbol:"QDVF.DE",  name:"iShares S&P 500 Financials",   type:"etf", region:"usa",      sector:"finance",  esg:false, ter:0.15 },
  { symbol:"QDVD.DE",  name:"iShares S&P 500 Energy",       type:"etf", region:"usa",      sector:"energy",   esg:false, ter:0.15 },
  { symbol:"XDWU.DE",  name:"Xtrackers MSCI USA",           type:"etf", region:"usa",      sector:"broad",    esg:false, ter:0.07 },
  { symbol:"ZPRV.DE",  name:"SPDR S&P 400 Mid Cap",         type:"etf", region:"usa",      sector:"broad",    esg:false, ter:0.14 },
  { symbol:"ZPRX.DE",  name:"SPDR S&P 600 Small Cap",       type:"etf", region:"usa",      sector:"broad",    esg:false, ter:0.14 },
  { symbol:"CSNDX.SW", name:"iShares Core NASDAQ-100 CHF",  type:"etf", region:"usa",      sector:"tech",     esg:false, ter:0.33 },

  // ── ETF EUROPE ────────────────────────────────────────────
  { symbol:"SXRT.DE",  name:"iShares Core EURO STOXX 50",   type:"etf", region:"europe",   sector:"broad",    esg:false, ter:0.10 },
  { symbol:"EXW1.DE",  name:"iShares STOXX Europe 600",     type:"etf", region:"europe",   sector:"broad",    esg:false, ter:0.20 },
  { symbol:"XESC.DE",  name:"Xtrackers Euro Stoxx 50",      type:"etf", region:"europe",   sector:"broad",    esg:false, ter:0.09 },
  { symbol:"MEUD.PA",  name:"Amundi Euro Stoxx 50",         type:"etf", region:"europe",   sector:"broad",    esg:false, ter:0.05 },
  { symbol:"LYPS.DE",  name:"Lyxor STOXX Europe 600",       type:"etf", region:"europe",   sector:"broad",    esg:false, ter:0.07 },
  { symbol:"DXGE.DE",  name:"WisdomTree Europe Hedged Eq",  type:"etf", region:"europe",   sector:"broad",    esg:false, ter:0.58 },
  { symbol:"CSSX5E.SW",name:"iShares Euro Stoxx 50 CHF",    type:"etf", region:"europe",   sector:"broad",    esg:false, ter:0.10 },
  { symbol:"IESE.AS",  name:"iShares MSCI EMU ESG",         type:"etf", region:"europe",   sector:"broad",    esg:true,  ter:0.20 },

  // ── ETF ASIE / PACIFIQUE ──────────────────────────────────
  { symbol:"IAEX.AS",  name:"iShares AEX",                  type:"etf", region:"europe",   sector:"broad",    esg:false, ter:0.28 },
  { symbol:"IJPA.AS",  name:"iShares Core MSCI Japan",      type:"etf", region:"asia",     sector:"broad",    esg:false, ter:0.12 },
  { symbol:"CSCA.SW",  name:"iShares MSCI China",           type:"etf", region:"asia",     sector:"broad",    esg:false, ter:0.40 },
  { symbol:"FLXC.L",   name:"Franklin FTSE China",          type:"etf", region:"asia",     sector:"broad",    esg:false, ter:0.19 },
  { symbol:"XCHA.DE",  name:"Xtrackers MSCI China",         type:"etf", region:"asia",     sector:"broad",    esg:false, ter:0.35 },
  { symbol:"IBZL.L",   name:"iShares MSCI India",           type:"etf", region:"asia",     sector:"broad",    esg:false, ter:0.65 },
  { symbol:"NDIA.L",   name:"WisdomTree India",             type:"etf", region:"asia",     sector:"broad",    esg:false, ter:0.84 },
  { symbol:"XDPM.DE",  name:"Xtrackers MSCI Pacific ex-Japan",type:"etf",region:"asia",    sector:"broad",    esg:false, ter:0.20 },

  // ── ETF ÉMERGENTS ─────────────────────────────────────────
  { symbol:"PAEEM.PA", name:"Amundi MSCI Emerging Markets", type:"etf", region:"emerging", sector:"broad",    esg:false, ter:0.20, isin:"LU1681045370" },
  { symbol:"IEMM.L",   name:"iShares Core MSCI EM IMI",     type:"etf", region:"emerging", sector:"broad",    esg:false, ter:0.18 },
  { symbol:"XMME.DE",  name:"Xtrackers MSCI EM",            type:"etf", region:"emerging", sector:"broad",    esg:false, ter:0.18 },
  { symbol:"VFEM.AS",  name:"Vanguard FTSE Emerging Markets",type:"etf", region:"emerging", sector:"broad",   esg:false, ter:0.22 },
  { symbol:"EIMI.L",   name:"iShares MSCI EM ESG Enhanced", type:"etf", region:"emerging", sector:"broad",    esg:true,  ter:0.18 },

  // ── ETF OBLIGATIONS ───────────────────────────────────────
  { symbol:"IBGL.AS",  name:"iShares Core Global Agg Bond", type:"bond",region:"global",   sector:"broad",    esg:false, ter:0.10 },
  { symbol:"AGGH.L",   name:"iShares Core Global Agg Hdg",  type:"bond",region:"global",   sector:"broad",    esg:false, ter:0.10 },
  { symbol:"XGSG.DE",  name:"Xtrackers Global Sov Bond",    type:"bond",region:"global",   sector:"broad",    esg:false, ter:0.20 },
  { symbol:"DBZB.DE",  name:"Xtrackers Euro Gov Bond",      type:"bond",region:"europe",   sector:"broad",    esg:false, ter:0.15 },
  { symbol:"IUSB.DE",  name:"iShares US Aggregate Bond",    type:"bond",region:"usa",      sector:"broad",    esg:false, ter:0.05 },
  { symbol:"STHY.L",   name:"SPDR Bloomberg Short Term HY", type:"bond",region:"global",   sector:"broad",    esg:false, ter:0.40 },
  { symbol:"IHYG.L",   name:"iShares EUR High Yield",       type:"bond",region:"europe",   sector:"broad",    esg:false, ter:0.50 },
  { symbol:"IUAG.DE",  name:"iShares € Corp Bond",          type:"bond",region:"europe",   sector:"broad",    esg:false, ter:0.20 },

  // ── ETF IMMOBILIER ────────────────────────────────────────
  { symbol:"EPRE.PA",  name:"FTSE EPRA Europe Real Estate", type:"reit",region:"europe",   sector:"realestate",esg:false,ter:0.40, isin:"FR0010686099" },
  { symbol:"IQQP.DE",  name:"iShares MSCI World REIT",      type:"reit",region:"world",    sector:"realestate",esg:false,ter:0.59 },
  { symbol:"XREA.L",   name:"Xtrackers FTSE EPRA REIT",     type:"reit",region:"world",    sector:"realestate",esg:false,ter:0.25 },
  { symbol:"IUSP.L",   name:"iShares US Property Yield",    type:"reit",region:"usa",      sector:"realestate",esg:false,ter:0.40 },
  { symbol:"EMRE.L",   name:"iShares EM Real Estate",       type:"reit",region:"emerging", sector:"realestate",esg:false,ter:0.59 },

  // ── ETF MATIÈRES PREMIÈRES ────────────────────────────────
  { symbol:"SGLD.L",   name:"Invesco Physical Gold",        type:"etf", region:"global",   sector:"materials",esg:false, ter:0.12 },
  { symbol:"CMOD.L",   name:"iShares Diversified Commodity",type:"etf", region:"global",   sector:"materials",esg:false, ter:0.19 },
  { symbol:"AIGA.DE",  name:"Amundi Gold",                  type:"etf", region:"global",   sector:"materials",esg:false, ter:0.15 },

  // ── GRANDES CAPITALISATIONS USA ───────────────────────────
  { symbol:"AAPL",     name:"Apple",                        type:"stock",region:"usa",     sector:"tech",     esg:false, isin:"US0378331005" },
  { symbol:"MSFT",     name:"Microsoft",                    type:"stock",region:"usa",     sector:"tech",     esg:false, isin:"US5949181045" },
  { symbol:"NVDA",     name:"Nvidia",                       type:"stock",region:"usa",     sector:"tech",     esg:false },
  { symbol:"AMZN",     name:"Amazon",                       type:"stock",region:"usa",     sector:"consumer", esg:false },
  { symbol:"GOOGL",    name:"Alphabet",                     type:"stock",region:"usa",     sector:"tech",     esg:false },
  { symbol:"META",     name:"Meta Platforms",               type:"stock",region:"usa",     sector:"tech",     esg:false },
  { symbol:"TSLA",     name:"Tesla",                        type:"stock",region:"usa",     sector:"industrial",esg:true },
  { symbol:"AVGO",     name:"Broadcom",                     type:"stock",region:"usa",     sector:"tech",     esg:false },
  { symbol:"JPM",      name:"JPMorgan Chase",               type:"stock",region:"usa",     sector:"finance",  esg:false },
  { symbol:"V",        name:"Visa",                         type:"stock",region:"usa",     sector:"finance",  esg:false },
  { symbol:"MA",       name:"Mastercard",                   type:"stock",region:"usa",     sector:"finance",  esg:false },
  { symbol:"UNH",      name:"UnitedHealth",                 type:"stock",region:"usa",     sector:"health",   esg:false },
  { symbol:"JNJ",      name:"Johnson & Johnson",            type:"stock",region:"usa",     sector:"health",   esg:false },
  { symbol:"LLY",      name:"Eli Lilly",                    type:"stock",region:"usa",     sector:"health",   esg:false },
  { symbol:"PFE",      name:"Pfizer",                       type:"stock",region:"usa",     sector:"health",   esg:false },
  { symbol:"MRK",      name:"Merck",                        type:"stock",region:"usa",     sector:"health",   esg:false },
  { symbol:"ABBV",     name:"AbbVie",                       type:"stock",region:"usa",     sector:"health",   esg:false },
  { symbol:"XOM",      name:"ExxonMobil",                   type:"stock",region:"usa",     sector:"energy",   esg:false },
  { symbol:"CVX",      name:"Chevron",                      type:"stock",region:"usa",     sector:"energy",   esg:false },
  { symbol:"HD",       name:"Home Depot",                   type:"stock",region:"usa",     sector:"consumer", esg:false },
  { symbol:"WMT",      name:"Walmart",                      type:"stock",region:"usa",     sector:"consumer", esg:false },
  { symbol:"PG",       name:"Procter & Gamble",             type:"stock",region:"usa",     sector:"consumer", esg:true  },
  { symbol:"KO",       name:"Coca-Cola",                    type:"stock",region:"usa",     sector:"consumer", esg:false },
  { symbol:"PEP",      name:"PepsiCo",                      type:"stock",region:"usa",     sector:"consumer", esg:false },
  { symbol:"COST",     name:"Costco",                       type:"stock",region:"usa",     sector:"consumer", esg:false },
  { symbol:"AMD",      name:"AMD",                          type:"stock",region:"usa",     sector:"tech",     esg:false },
  { symbol:"INTC",     name:"Intel",                        type:"stock",region:"usa",     sector:"tech",     esg:false },
  { symbol:"CRM",      name:"Salesforce",                   type:"stock",region:"usa",     sector:"tech",     esg:true  },
  { symbol:"ADBE",     name:"Adobe",                        type:"stock",region:"usa",     sector:"tech",     esg:true  },
  { symbol:"NFLX",     name:"Netflix",                      type:"stock",region:"usa",     sector:"tech",     esg:false },
  { symbol:"DIS",      name:"Walt Disney",                  type:"stock",region:"usa",     sector:"consumer", esg:false },
  { symbol:"BA",       name:"Boeing",                       type:"stock",region:"usa",     sector:"industrial",esg:false},
  { symbol:"GE",       name:"GE Aerospace",                 type:"stock",region:"usa",     sector:"industrial",esg:false},
  { symbol:"CAT",      name:"Caterpillar",                  type:"stock",region:"usa",     sector:"industrial",esg:false},
  { symbol:"RTX",      name:"RTX Corp",                     type:"stock",region:"usa",     sector:"defense",  esg:false },
  { symbol:"LMT",      name:"Lockheed Martin",              type:"stock",region:"usa",     sector:"defense",  esg:false },
  { symbol:"GS",       name:"Goldman Sachs",                type:"stock",region:"usa",     sector:"finance",  esg:false },
  { symbol:"BRK-B",    name:"Berkshire Hathaway",           type:"stock",region:"usa",     sector:"finance",  esg:false },
  { symbol:"MS",       name:"Morgan Stanley",               type:"stock",region:"usa",     sector:"finance",  esg:false },
  { symbol:"BAC",      name:"Bank of America",              type:"stock",region:"usa",     sector:"finance",  esg:false },
  { symbol:"BX",       name:"Blackstone",                   type:"stock",region:"usa",     sector:"finance",  esg:false },
  { symbol:"AMT",      name:"American Tower",               type:"reit", region:"usa",     sector:"realestate",esg:false},
  { symbol:"PLD",      name:"Prologis",                     type:"reit", region:"usa",     sector:"realestate",esg:true },
  { symbol:"NEE",      name:"NextEra Energy",               type:"stock",region:"usa",     sector:"utilities",esg:true  },
  { symbol:"DUK",      name:"Duke Energy",                  type:"stock",region:"usa",     sector:"utilities",esg:false },
  { symbol:"ISRG",     name:"Intuitive Surgical",           type:"stock",region:"usa",     sector:"health",   esg:false },
  { symbol:"TMO",      name:"Thermo Fisher Scientific",     type:"stock",region:"usa",     sector:"health",   esg:false },
  { symbol:"SPGI",     name:"S&P Global",                   type:"stock",region:"usa",     sector:"finance",  esg:false },
  { symbol:"MCO",      name:"Moody's",                      type:"stock",region:"usa",     sector:"finance",  esg:false },

  // ── GRANDES CAPITALISATIONS EUROPE ───────────────────────
  { symbol:"MC.PA",    name:"LVMH",                         type:"stock",region:"europe",  sector:"luxury",   esg:false, isin:"FR0000121014" },
  { symbol:"RMS.PA",   name:"Hermès",                       type:"stock",region:"europe",  sector:"luxury",   esg:false },
  { symbol:"KER.PA",   name:"Kering",                       type:"stock",region:"europe",  sector:"luxury",   esg:true  },
  { symbol:"CDI.PA",   name:"Christian Dior",               type:"stock",region:"europe",  sector:"luxury",   esg:false },
  { symbol:"CFR.SW",   name:"Richemont",                    type:"stock",region:"europe",  sector:"luxury",   esg:false },
  { symbol:"AIR.PA",   name:"Airbus",                       type:"stock",region:"europe",  sector:"defense",  esg:false, isin:"NL0000235190" },
  { symbol:"SAF.PA",   name:"Safran",                       type:"stock",region:"europe",  sector:"defense",  esg:false },
  { symbol:"LDO.MI",   name:"Leonardo",                     type:"stock",region:"europe",  sector:"defense",  esg:false },
  { symbol:"RHIM.L",   name:"Rheinmetall",                  type:"stock",region:"europe",  sector:"defense",  esg:false },
  { symbol:"ASML.AS",  name:"ASML",                         type:"stock",region:"europe",  sector:"tech",     esg:false, isin:"NL0010273215" },
  { symbol:"SAP.DE",   name:"SAP",                          type:"stock",region:"europe",  sector:"tech",     esg:true  },
  { symbol:"NOKIA.HE", name:"Nokia",                        type:"stock",region:"europe",  sector:"tech",     esg:false },
  { symbol:"CAP.PA",   name:"Capgemini",                    type:"stock",region:"europe",  sector:"tech",     esg:true  },
  { symbol:"DSY.PA",   name:"Dassault Systèmes",            type:"stock",region:"europe",  sector:"tech",     esg:true  },
  { symbol:"NOVO-B.CO",name:"Novo Nordisk",                 type:"stock",region:"europe",  sector:"health",   esg:true,  isin:"DK0060534915" },
  { symbol:"ROG.SW",   name:"Roche",                        type:"stock",region:"europe",  sector:"health",   esg:true  },
  { symbol:"NESN.SW",  name:"Nestlé",                       type:"stock",region:"europe",  sector:"consumer", esg:true  },
  { symbol:"NOVN.SW",  name:"Novartis",                     type:"stock",region:"europe",  sector:"health",   esg:true  },
  { symbol:"UHR.SW",   name:"Swatch Group",                 type:"stock",region:"europe",  sector:"luxury",   esg:false },
  { symbol:"BAYN.DE",  name:"Bayer",                        type:"stock",region:"europe",  sector:"health",   esg:false },
  { symbol:"SIE.DE",   name:"Siemens",                      type:"stock",region:"europe",  sector:"industrial",esg:true },
  { symbol:"VOW3.DE",  name:"Volkswagen",                   type:"stock",region:"europe",  sector:"industrial",esg:false},
  { symbol:"BMW.DE",   name:"BMW",                          type:"stock",region:"europe",  sector:"industrial",esg:false},
  { symbol:"MBG.DE",   name:"Mercedes-Benz",                type:"stock",region:"europe",  sector:"industrial",esg:false},
  { symbol:"BAS.DE",   name:"BASF",                         type:"stock",region:"europe",  sector:"materials",esg:false },
  { symbol:"BNP.PA",   name:"BNP Paribas",                  type:"stock",region:"europe",  sector:"finance",  esg:false },
  { symbol:"ACA.PA",   name:"Crédit Agricole",              type:"stock",region:"europe",  sector:"finance",  esg:false },
  { symbol:"SAN.MC",   name:"Banco Santander",              type:"stock",region:"europe",  sector:"finance",  esg:false },
  { symbol:"HSBA.L",   name:"HSBC",                         type:"stock",region:"europe",  sector:"finance",  esg:false },
  { symbol:"UBSG.SW",  name:"UBS Group",                    type:"stock",region:"europe",  sector:"finance",  esg:false },
  { symbol:"BP.L",     name:"BP",                           type:"stock",region:"europe",  sector:"energy",   esg:false },
  { symbol:"SHEL.L",   name:"Shell",                        type:"stock",region:"europe",  sector:"energy",   esg:false },
  { symbol:"TTE.PA",   name:"TotalEnergies",                type:"stock",region:"europe",  sector:"energy",   esg:false },
  { symbol:"EDF.PA",   name:"EDF",                          type:"stock",region:"europe",  sector:"utilities",esg:false },
  { symbol:"ENEL.MI",  name:"Enel",                         type:"stock",region:"europe",  sector:"utilities",esg:true  },
  { symbol:"IBE.MC",   name:"Iberdrola",                    type:"stock",region:"europe",  sector:"utilities",esg:true  },
  { symbol:"OR.PA",    name:"L'Oréal",                      type:"stock",region:"europe",  sector:"consumer", esg:true  },
  { symbol:"UNILEVER.AS",name:"Unilever",                   type:"stock",region:"europe",  sector:"consumer", esg:true  },
  { symbol:"ABI.BR",   name:"AB InBev",                     type:"stock",region:"europe",  sector:"consumer", esg:false },
  { symbol:"DG.PA",    name:"Vinci",                        type:"stock",region:"europe",  sector:"industrial",esg:false},
  { symbol:"CS.PA",    name:"AXA",                          type:"stock",region:"europe",  sector:"finance",  esg:false },
  { symbol:"MUV2.DE",  name:"Munich Re",                    type:"stock",region:"europe",  sector:"finance",  esg:false },

  // ── ASIE / PACIFIQUE ──────────────────────────────────────
  { symbol:"9988.HK",  name:"Alibaba",                      type:"stock",region:"asia",    sector:"tech",     esg:false },
  { symbol:"700.HK",   name:"Tencent",                      type:"stock",region:"asia",    sector:"tech",     esg:false },
  { symbol:"7203.T",   name:"Toyota",                       type:"stock",region:"asia",    sector:"industrial",esg:false},
  { symbol:"6758.T",   name:"Sony",                         type:"stock",region:"asia",    sector:"tech",     esg:false },
  { symbol:"6861.T",   name:"Keyence",                      type:"stock",region:"asia",    sector:"tech",     esg:false },
  { symbol:"2330.TW",  name:"TSMC",                         type:"stock",region:"asia",    sector:"tech",     esg:false },
  { symbol:"005930.KS",name:"Samsung Electronics",          type:"stock",region:"asia",    sector:"tech",     esg:false },
  { symbol:"RELIANCE.NS",name:"Reliance Industries",        type:"stock",region:"asia",    sector:"energy",   esg:false },

  // ── CRYPTO ────────────────────────────────────────────────
  { symbol:"BTC-EUR",  name:"Bitcoin",                      type:"crypto",region:"global", sector:"broad",    esg:false },
  { symbol:"ETH-EUR",  name:"Ethereum",                     type:"crypto",region:"global", sector:"broad",    esg:false },
  { symbol:"SOL-EUR",  name:"Solana",                       type:"crypto",region:"global", sector:"broad",    esg:false },
  { symbol:"BNB-EUR",  name:"BNB (Binance)",                type:"crypto",region:"global", sector:"broad",    esg:false },
  { symbol:"XRP-EUR",  name:"XRP",                          type:"crypto",region:"global", sector:"broad",    esg:false },
  { symbol:"ADA-EUR",  name:"Cardano",                      type:"crypto",region:"global", sector:"broad",    esg:true  },
  { symbol:"AVAX-EUR", name:"Avalanche",                    type:"crypto",region:"global", sector:"broad",    esg:false },
  { symbol:"DOT-EUR",  name:"Polkadot",                     type:"crypto",region:"global", sector:"broad",    esg:false },

  // ═══════════════════════════════════════════════════════
  // EXTENSION +320 ACTIFS — TOP 5 PAR PAYS
  // ═══════════════════════════════════════════════════════

  // ── ROYAUME-UNI ──────────────────────────────────────────
  { symbol:"AZN.L",     name:"AstraZeneca",              type:"stock", region:"europe",   sector:"health",    esg:true  },
  { symbol:"GSK.L",     name:"GSK",                      type:"stock", region:"europe",   sector:"health",    esg:false },
  { symbol:"RIO.L",     name:"Rio Tinto",                type:"stock", region:"europe",   sector:"materials", esg:false },
  { symbol:"LSEG.L",    name:"London Stock Exchange",    type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"BA.L",      name:"BAE Systems",              type:"stock", region:"europe",   sector:"defense",   esg:false },
  { symbol:"RR.L",      name:"Rolls-Royce",              type:"stock", region:"europe",   sector:"industrial",esg:false },
  { symbol:"VOD.L",     name:"Vodafone",                 type:"stock", region:"europe",   sector:"telecom",   esg:false },
  { symbol:"BATS.L",    name:"British American Tobacco", type:"stock", region:"europe",   sector:"consumer",  esg:false },
  { symbol:"ULVR.L",    name:"Unilever UK",              type:"stock", region:"europe",   sector:"consumer",  esg:true  },
  { symbol:"REL.L",     name:"RELX",                     type:"stock", region:"europe",   sector:"tech",      esg:true  },
  { symbol:"NWG.L",     name:"NatWest Group",            type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"LLOY.L",    name:"Lloyds Banking Group",     type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"BARC.L",    name:"Barclays",                 type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"STAN.L",    name:"Standard Chartered",       type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"PRU.L",     name:"Prudential",               type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"EXPN.L",    name:"Experian",                 type:"stock", region:"europe",   sector:"tech",      esg:false },
  { symbol:"NG.L",      name:"National Grid",            type:"stock", region:"europe",   sector:"utilities", esg:true  },
  { symbol:"SSE.L",     name:"SSE",                      type:"stock", region:"europe",   sector:"utilities", esg:true  },
  { symbol:"HLMA.L",    name:"Halma",                    type:"stock", region:"europe",   sector:"industrial",esg:true  },

  // ── FRANCE (complément) ───────────────────────────────────
  { symbol:"SU.PA",     name:"Schneider Electric",       type:"stock", region:"europe",   sector:"industrial",esg:true  },
  { symbol:"EL.PA",     name:"EssilorLuxottica",         type:"stock", region:"europe",   sector:"health",    esg:true  },
  { symbol:"BN.PA",     name:"Danone",                   type:"stock", region:"europe",   sector:"consumer",  esg:true  },
  { symbol:"PUB.PA",    name:"Publicis Groupe",          type:"stock", region:"europe",   sector:"tech",      esg:false },
  { symbol:"ML.PA",     name:"Michelin",                 type:"stock", region:"europe",   sector:"industrial",esg:true  },
  { symbol:"RI.PA",     name:"Pernod Ricard",            type:"stock", region:"europe",   sector:"consumer",  esg:false },
  { symbol:"SGO.PA",    name:"Saint-Gobain",             type:"stock", region:"europe",   sector:"materials", esg:false },
  { symbol:"ORA.PA",    name:"Orange",                   type:"stock", region:"europe",   sector:"telecom",   esg:false },
  { symbol:"RNO.PA",    name:"Renault",                  type:"stock", region:"europe",   sector:"industrial",esg:false },
  { symbol:"STM.PA",    name:"STMicroelectronics",       type:"stock", region:"europe",   sector:"tech",      esg:false },

  // ── ALLEMAGNE (complément) ────────────────────────────────
  { symbol:"ALV.DE",    name:"Allianz",                  type:"stock", region:"europe",   sector:"finance",   esg:true  },
  { symbol:"ADS.DE",    name:"Adidas",                   type:"stock", region:"europe",   sector:"consumer",  esg:true  },
  { symbol:"DTE.DE",    name:"Deutsche Telekom",         type:"stock", region:"europe",   sector:"telecom",   esg:false },
  { symbol:"IFX.DE",    name:"Infineon Technologies",    type:"stock", region:"europe",   sector:"tech",      esg:true  },
  { symbol:"RWE.DE",    name:"RWE",                      type:"stock", region:"europe",   sector:"utilities", esg:true  },
  { symbol:"EOAN.DE",   name:"E.ON",                     type:"stock", region:"europe",   sector:"utilities", esg:true  },
  { symbol:"DBK.DE",    name:"Deutsche Bank",            type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"MRK.DE",    name:"Merck KGaA",               type:"stock", region:"europe",   sector:"health",    esg:true  },
  { symbol:"HEN3.DE",   name:"Henkel",                   type:"stock", region:"europe",   sector:"consumer",  esg:true  },
  { symbol:"FRE.DE",    name:"Fresenius",                type:"stock", region:"europe",   sector:"health",    esg:false },

  // ── SUISSE (complément) ───────────────────────────────────
  { symbol:"ZURN.SW",   name:"Zurich Insurance",         type:"stock", region:"europe",   sector:"finance",   esg:true  },
  { symbol:"ABBN.SW",   name:"ABB",                      type:"stock", region:"europe",   sector:"industrial",esg:true  },
  { symbol:"SIKA.SW",   name:"Sika",                     type:"stock", region:"europe",   sector:"materials", esg:true  },
  { symbol:"LONN.SW",   name:"Lonza Group",              type:"stock", region:"europe",   sector:"health",    esg:true  },
  { symbol:"GIVN.SW",   name:"Givaudan",                 type:"stock", region:"europe",   sector:"materials", esg:true  },
  { symbol:"GEBN.SW",   name:"Geberit",                  type:"stock", region:"europe",   sector:"industrial",esg:true  },
  { symbol:"HOLN.SW",   name:"Holcim",                   type:"stock", region:"europe",   sector:"materials", esg:false },

  // ── PAYS-BAS (complément) ─────────────────────────────────
  { symbol:"INGA.AS",   name:"ING Groep",                type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"HEIA.AS",   name:"Heineken",                 type:"stock", region:"europe",   sector:"consumer",  esg:false },
  { symbol:"WKL.AS",    name:"Wolters Kluwer",           type:"stock", region:"europe",   sector:"tech",      esg:true  },
  { symbol:"AH.AS",     name:"Ahold Delhaize",           type:"stock", region:"europe",   sector:"consumer",  esg:true  },
  { symbol:"PHIA.AS",   name:"Philips",                  type:"stock", region:"europe",   sector:"health",    esg:true  },
  { symbol:"RAND.AS",   name:"Randstad",                 type:"stock", region:"europe",   sector:"industrial",esg:true  },
  { symbol:"ABN.AS",    name:"ABN AMRO",                 type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"AKZA.AS",   name:"Akzo Nobel",               type:"stock", region:"europe",   sector:"materials", esg:true  },

  // ── SUÈDE ────────────────────────────────────────────────
  { symbol:"VOLV-B.ST", name:"Volvo AB",                 type:"stock", region:"europe",   sector:"industrial",esg:true  },
  { symbol:"ERIC-B.ST", name:"Ericsson",                 type:"stock", region:"europe",   sector:"tech",      esg:false },
  { symbol:"ATCO-A.ST", name:"Atlas Copco",              type:"stock", region:"europe",   sector:"industrial",esg:true  },
  { symbol:"HM-B.ST",   name:"H&M",                      type:"stock", region:"europe",   sector:"consumer",  esg:true  },
  { symbol:"SEB-A.ST",  name:"SEB Bank",                 type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"INVE-B.ST", name:"Investor AB",              type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"SAND.ST",   name:"Sandvik",                  type:"stock", region:"europe",   sector:"industrial",esg:true  },
  { symbol:"SWED-A.ST", name:"Swedbank",                 type:"stock", region:"europe",   sector:"finance",   esg:false },

  // ── NORVÈGE ───────────────────────────────────────────────
  { symbol:"EQNR.OL",   name:"Equinor",                  type:"stock", region:"europe",   sector:"energy",    esg:false },
  { symbol:"DNB.OL",    name:"DNB Bank",                 type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"TEL.OL",    name:"Telenor",                  type:"stock", region:"europe",   sector:"telecom",   esg:false },
  { symbol:"ORK.OL",    name:"Orkla",                    type:"stock", region:"europe",   sector:"consumer",  esg:true  },
  { symbol:"YAR.OL",    name:"Yara International",       type:"stock", region:"europe",   sector:"materials", esg:true  },

  // ── DANEMARK (complément) ─────────────────────────────────
  { symbol:"DSV.CO",    name:"DSV Panalpina",            type:"stock", region:"europe",   sector:"industrial",esg:false },
  { symbol:"MAERSK-B.CO",name:"A.P. Møller-Mærsk",      type:"stock", region:"europe",   sector:"industrial",esg:false },
  { symbol:"CARL-B.CO", name:"Carlsberg",                type:"stock", region:"europe",   sector:"consumer",  esg:false },
  { symbol:"ORSTED.CO", name:"Ørsted",                   type:"stock", region:"europe",   sector:"utilities", esg:true  },
  { symbol:"VWS.CO",    name:"Vestas Wind Systems",      type:"stock", region:"europe",   sector:"utilities", esg:true  },

  // ── FINLANDE (complément) ─────────────────────────────────
  { symbol:"NESTE.HE",  name:"Neste",                    type:"stock", region:"europe",   sector:"energy",    esg:true  },
  { symbol:"SAMPO.HE",  name:"Sampo",                    type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"KNEBV.HE",  name:"Kone",                     type:"stock", region:"europe",   sector:"industrial",esg:true  },
  { symbol:"FORTUM.HE", name:"Fortum",                   type:"stock", region:"europe",   sector:"utilities", esg:true  },
  { symbol:"METSO.HE",  name:"Metso",                    type:"stock", region:"europe",   sector:"industrial",esg:false },

  // ── BELGIQUE ──────────────────────────────────────────────
  { symbol:"UCB.BR",    name:"UCB",                      type:"stock", region:"europe",   sector:"health",    esg:true  },
  { symbol:"GBLB.BR",   name:"Groupe Bruxelles Lambert", type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"COLR.BR",   name:"Colruyt",                  type:"stock", region:"europe",   sector:"consumer",  esg:true  },
  { symbol:"SOF.BR",    name:"Sofina",                   type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"APAM.AS",   name:"Aperam",                   type:"stock", region:"europe",   sector:"materials", esg:false },

  // ── ITALIE (complément) ───────────────────────────────────
  { symbol:"ENI.MI",    name:"Eni",                      type:"stock", region:"europe",   sector:"energy",    esg:false },
  { symbol:"UCG.MI",    name:"UniCredit",                type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"ISP.MI",    name:"Intesa Sanpaolo",          type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"RACE.MI",   name:"Ferrari",                  type:"stock", region:"europe",   sector:"luxury",    esg:false },
  { symbol:"G.MI",      name:"Generali",                 type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"STLAM.MI",  name:"Stellantis",               type:"stock", region:"europe",   sector:"industrial",esg:false },

  // ── ESPAGNE (complément) ──────────────────────────────────
  { symbol:"TEF.MC",    name:"Telefónica",               type:"stock", region:"europe",   sector:"telecom",   esg:false },
  { symbol:"BBVA.MC",   name:"BBVA",                     type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"REP.MC",    name:"Repsol",                   type:"stock", region:"europe",   sector:"energy",    esg:false },
  { symbol:"AMS.MC",    name:"Amadeus IT",               type:"stock", region:"europe",   sector:"tech",      esg:true  },
  { symbol:"CABK.MC",   name:"CaixaBank",                type:"stock", region:"europe",   sector:"finance",   esg:false },

  // ── PORTUGAL ─────────────────────────────────────────────
  { symbol:"EDP.LS",    name:"EDP",                      type:"stock", region:"europe",   sector:"utilities", esg:true  },
  { symbol:"GALP.LS",   name:"Galp Energia",             type:"stock", region:"europe",   sector:"energy",    esg:false },
  { symbol:"JMT.LS",    name:"Jerónimo Martins",         type:"stock", region:"europe",   sector:"consumer",  esg:false },
  { symbol:"BCP.LS",    name:"Millennium BCP",           type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"EDPR.LS",   name:"EDP Renováveis",           type:"stock", region:"europe",   sector:"utilities", esg:true  },

  // ── AUTRICHE ─────────────────────────────────────────────
  { symbol:"OMV.VI",    name:"OMV",                      type:"stock", region:"europe",   sector:"energy",    esg:false },
  { symbol:"EBS.VI",    name:"Erste Group Bank",         type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"VOE.VI",    name:"voestalpine",              type:"stock", region:"europe",   sector:"materials", esg:false },
  { symbol:"ANDR.VI",   name:"Andritz",                  type:"stock", region:"europe",   sector:"industrial",esg:false },
  { symbol:"RBI.VI",    name:"Raiffeisen Bank Intl",     type:"stock", region:"europe",   sector:"finance",   esg:false },

  // ── POLOGNE ───────────────────────────────────────────────
  { symbol:"PKN.WA",    name:"PKN Orlen",                type:"stock", region:"europe",   sector:"energy",    esg:false },
  { symbol:"PKO.WA",    name:"PKO Bank Polski",          type:"stock", region:"europe",   sector:"finance",   esg:false },
  { symbol:"DNP.WA",    name:"Dino Polska",              type:"stock", region:"europe",   sector:"consumer",  esg:false },
  { symbol:"CDR.WA",    name:"CD Projekt",               type:"stock", region:"europe",   sector:"tech",      esg:false },
  { symbol:"PZU.WA",    name:"PZU Group",                type:"stock", region:"europe",   sector:"finance",   esg:false },

  // ── JAPON (complément) ────────────────────────────────────
  { symbol:"7974.T",    name:"Nintendo",                 type:"stock", region:"asia",     sector:"tech",      esg:false },
  { symbol:"9432.T",    name:"NTT",                      type:"stock", region:"asia",     sector:"telecom",   esg:false },
  { symbol:"8306.T",    name:"Mitsubishi UFJ Financial", type:"stock", region:"asia",     sector:"finance",   esg:false },
  { symbol:"9984.T",    name:"SoftBank Group",           type:"stock", region:"asia",     sector:"tech",      esg:false },
  { symbol:"8035.T",    name:"Tokyo Electron",           type:"stock", region:"asia",     sector:"tech",      esg:false },
  { symbol:"6367.T",    name:"Daikin Industries",        type:"stock", region:"asia",     sector:"industrial",esg:true  },
  { symbol:"6902.T",    name:"Denso",                    type:"stock", region:"asia",     sector:"industrial",esg:false },
  { symbol:"8058.T",    name:"Mitsubishi Corporation",   type:"stock", region:"asia",     sector:"industrial",esg:false },
  { symbol:"4519.T",    name:"Chugai Pharmaceutical",    type:"stock", region:"asia",     sector:"health",    esg:true  },
  { symbol:"4063.T",    name:"Shin-Etsu Chemical",       type:"stock", region:"asia",     sector:"materials", esg:false },
  { symbol:"6501.T",    name:"Hitachi",                  type:"stock", region:"asia",     sector:"industrial",esg:true  },
  { symbol:"2914.T",    name:"Japan Tobacco",            type:"stock", region:"asia",     sector:"consumer",  esg:false },

  // ── CORÉE DU SUD (complément) ─────────────────────────────
  { symbol:"000660.KS", name:"SK Hynix",                 type:"stock", region:"asia",     sector:"tech",      esg:false },
  { symbol:"035420.KS", name:"NAVER",                    type:"stock", region:"asia",     sector:"tech",      esg:false },
  { symbol:"005380.KS", name:"Hyundai Motor",            type:"stock", region:"asia",     sector:"industrial",esg:false },
  { symbol:"051910.KS", name:"LG Chem",                  type:"stock", region:"asia",     sector:"materials", esg:false },
  { symbol:"035720.KS", name:"Kakao",                    type:"stock", region:"asia",     sector:"tech",      esg:false },

  // ── TAÏWAN (complément) ───────────────────────────────────
  { symbol:"2454.TW",   name:"MediaTek",                 type:"stock", region:"asia",     sector:"tech",      esg:false },
  { symbol:"2317.TW",   name:"Foxconn",                  type:"stock", region:"asia",     sector:"industrial",esg:false },
  { symbol:"2382.TW",   name:"Quanta Computer",          type:"stock", region:"asia",     sector:"tech",      esg:false },
  { symbol:"2308.TW",   name:"Delta Electronics",        type:"stock", region:"asia",     sector:"industrial",esg:true  },
  { symbol:"2412.TW",   name:"Chunghwa Telecom",         type:"stock", region:"asia",     sector:"telecom",   esg:false },

  // ── CHINE / HONG KONG (complément) ───────────────────────
  { symbol:"3690.HK",   name:"Meituan",                  type:"stock", region:"asia",     sector:"tech",      esg:false },
  { symbol:"9618.HK",   name:"JD.com",                   type:"stock", region:"asia",     sector:"consumer",  esg:false },
  { symbol:"2318.HK",   name:"Ping An Insurance",        type:"stock", region:"asia",     sector:"finance",   esg:false },
  { symbol:"0941.HK",   name:"China Mobile",             type:"stock", region:"asia",     sector:"telecom",   esg:false },
  { symbol:"1299.HK",   name:"AIA Group",                type:"stock", region:"asia",     sector:"finance",   esg:false },
  { symbol:"BIDU",      name:"Baidu",                    type:"stock", region:"asia",     sector:"tech",      esg:false },
  { symbol:"PDD",       name:"PDD Holdings (Pinduoduo)", type:"stock", region:"asia",     sector:"consumer",  esg:false },
  { symbol:"9999.HK",   name:"NetEase",                  type:"stock", region:"asia",     sector:"tech",      esg:false },
  { symbol:"NIO",       name:"NIO (EV)",                 type:"stock", region:"asia",     sector:"industrial",esg:true  },

  // ── INDE (complément) ─────────────────────────────────────
  { symbol:"TCS.NS",    name:"Tata Consultancy Services",type:"stock", region:"asia",     sector:"tech",      esg:true  },
  { symbol:"INFY.NS",   name:"Infosys",                  type:"stock", region:"asia",     sector:"tech",      esg:true  },
  { symbol:"HDFCBANK.NS",name:"HDFC Bank",               type:"stock", region:"asia",     sector:"finance",   esg:false },
  { symbol:"ICICIBANK.NS",name:"ICICI Bank",             type:"stock", region:"asia",     sector:"finance",   esg:false },
  { symbol:"BHARTIARTL.NS",name:"Bharti Airtel",         type:"stock", region:"asia",     sector:"telecom",   esg:false },
  { symbol:"WIPRO.NS",  name:"Wipro",                    type:"stock", region:"asia",     sector:"tech",      esg:true  },
  { symbol:"LT.NS",     name:"Larsen & Toubro",          type:"stock", region:"asia",     sector:"industrial",esg:false },
  { symbol:"SUNPHARMA.NS",name:"Sun Pharmaceutical",     type:"stock", region:"asia",     sector:"health",    esg:false },

  // ── AUSTRALIE ─────────────────────────────────────────────
  { symbol:"BHP.AX",    name:"BHP Group",                type:"stock", region:"world",    sector:"materials", esg:false },
  { symbol:"CBA.AX",    name:"Commonwealth Bank",        type:"stock", region:"asia",     sector:"finance",   esg:false },
  { symbol:"CSL.AX",    name:"CSL Limited",              type:"stock", region:"asia",     sector:"health",    esg:true  },
  { symbol:"ANZ.AX",    name:"ANZ Bank",                 type:"stock", region:"asia",     sector:"finance",   esg:false },
  { symbol:"WBC.AX",    name:"Westpac Banking",          type:"stock", region:"asia",     sector:"finance",   esg:false },
  { symbol:"NAB.AX",    name:"National Australia Bank",  type:"stock", region:"asia",     sector:"finance",   esg:false },
  { symbol:"MQG.AX",    name:"Macquarie Group",          type:"stock", region:"asia",     sector:"finance",   esg:false },
  { symbol:"WES.AX",    name:"Wesfarmers",               type:"stock", region:"asia",     sector:"consumer",  esg:false },
  { symbol:"FMG.AX",    name:"Fortescue Metals",         type:"stock", region:"asia",     sector:"materials", esg:false },
  { symbol:"TLS.AX",    name:"Telstra",                  type:"stock", region:"asia",     sector:"telecom",   esg:false },

  // ── CANADA ────────────────────────────────────────────────
  { symbol:"SHOP.TO",   name:"Shopify",                  type:"stock", region:"usa",      sector:"tech",      esg:true  },
  { symbol:"RY.TO",     name:"Royal Bank of Canada",     type:"stock", region:"usa",      sector:"finance",   esg:false },
  { symbol:"TD.TO",     name:"TD Bank",                  type:"stock", region:"usa",      sector:"finance",   esg:false },
  { symbol:"CNR.TO",    name:"Canadian National Railway",type:"stock", region:"usa",      sector:"industrial",esg:false },
  { symbol:"ENB.TO",    name:"Enbridge",                 type:"stock", region:"usa",      sector:"energy",    esg:false },
  { symbol:"SU.TO",     name:"Suncor Energy",            type:"stock", region:"usa",      sector:"energy",    esg:false },
  { symbol:"BAM.TO",    name:"Brookfield Asset Mgmt",    type:"stock", region:"usa",      sector:"finance",   esg:true  },
  { symbol:"BCE.TO",    name:"BCE Inc.",                 type:"stock", region:"usa",      sector:"telecom",   esg:false },
  { symbol:"ABX.TO",    name:"Barrick Gold",             type:"stock", region:"usa",      sector:"materials", esg:false },
  { symbol:"WPM.TO",    name:"Wheaton Precious Metals",  type:"stock", region:"usa",      sector:"materials", esg:true  },

  // ── BRÉSIL ────────────────────────────────────────────────
  { symbol:"VALE3.SA",  name:"Vale",                     type:"stock", region:"emerging", sector:"materials", esg:false },
  { symbol:"PETR4.SA",  name:"Petrobras",                type:"stock", region:"emerging", sector:"energy",    esg:false },
  { symbol:"ITUB4.SA",  name:"Itaú Unibanco",            type:"stock", region:"emerging", sector:"finance",   esg:false },
  { symbol:"ABEV3.SA",  name:"Ambev",                    type:"stock", region:"emerging", sector:"consumer",  esg:false },
  { symbol:"WEGE3.SA",  name:"WEG",                      type:"stock", region:"emerging", sector:"industrial",esg:true  },
  { symbol:"B3SA3.SA",  name:"B3 (Bolsa Brasileira)",    type:"stock", region:"emerging", sector:"finance",   esg:false },
  { symbol:"SUZB3.SA",  name:"Suzano",                   type:"stock", region:"emerging", sector:"materials", esg:false },

  // ── MEXIQUE ───────────────────────────────────────────────
  { symbol:"AMXL.MX",   name:"América Móvil",            type:"stock", region:"emerging", sector:"telecom",   esg:false },
  { symbol:"WALMEX.MX", name:"Walmart de México",        type:"stock", region:"emerging", sector:"consumer",  esg:false },
  { symbol:"FEMSAUBD.MX",name:"FEMSA",                   type:"stock", region:"emerging", sector:"consumer",  esg:false },
  { symbol:"CX",        name:"Cemex",                    type:"stock", region:"emerging", sector:"materials", esg:false },
  { symbol:"GFNORTEO.MX",name:"Banorte",                 type:"stock", region:"emerging", sector:"finance",   esg:false },

  // ── SINGAPORE ─────────────────────────────────────────────
  { symbol:"D05.SI",    name:"DBS Group",                type:"stock", region:"asia",     sector:"finance",   esg:true  },
  { symbol:"O39.SI",    name:"OCBC Bank",                type:"stock", region:"asia",     sector:"finance",   esg:false },
  { symbol:"U11.SI",    name:"UOB",                      type:"stock", region:"asia",     sector:"finance",   esg:false },
  { symbol:"Z74.SI",    name:"Singtel",                  type:"stock", region:"asia",     sector:"telecom",   esg:false },
  { symbol:"SEA",       name:"Sea Limited",              type:"stock", region:"asia",     sector:"tech",      esg:false },
  { symbol:"GRAB",      name:"Grab Holdings",            type:"stock", region:"asia",     sector:"tech",      esg:false },

  // ── ISRAËL ────────────────────────────────────────────────
  { symbol:"CHKP",      name:"Check Point Software",     type:"stock", region:"world",    sector:"tech",      esg:false },
  { symbol:"NICE",      name:"NICE Systems",             type:"stock", region:"world",    sector:"tech",      esg:false },
  { symbol:"CYBR",      name:"CyberArk Software",        type:"stock", region:"world",    sector:"tech",      esg:false },
  { symbol:"TEVA",      name:"Teva Pharmaceutical",      type:"stock", region:"world",    sector:"health",    esg:false },
  { symbol:"WIX",       name:"Wix.com",                  type:"stock", region:"world",    sector:"tech",      esg:false },

  // ── ARABIE SAOUDITE ───────────────────────────────────────
  { symbol:"2222.SR",   name:"Saudi Aramco",             type:"stock", region:"emerging", sector:"energy",    esg:false },
  { symbol:"1180.SR",   name:"Al Rajhi Bank",            type:"stock", region:"emerging", sector:"finance",   esg:false },
  { symbol:"2010.SR",   name:"SABIC",                    type:"stock", region:"emerging", sector:"materials", esg:false },
  { symbol:"1120.SR",   name:"Al Jazira Bank",           type:"stock", region:"emerging", sector:"finance",   esg:false },
  { symbol:"2350.SR",   name:"Saudi Telecom (STC)",      type:"stock", region:"emerging", sector:"telecom",   esg:false },

  // ── AFRIQUE DU SUD ────────────────────────────────────────
  { symbol:"NPSNY",     name:"Naspers",                  type:"stock", region:"emerging", sector:"tech",      esg:false },
  { symbol:"AGLXY",     name:"Anglo American",           type:"stock", region:"world",    sector:"materials", esg:false },
  { symbol:"FSR.JSE",   name:"FirstRand",                type:"stock", region:"emerging", sector:"finance",   esg:false },
  { symbol:"SHP.JSE",   name:"Shoprite Holdings",        type:"stock", region:"emerging", sector:"consumer",  esg:false },
  { symbol:"NED.JSE",   name:"Nedbank",                  type:"stock", region:"emerging", sector:"finance",   esg:false },

  // ── INDONÉSIE ─────────────────────────────────────────────
  { symbol:"BBCA.JK",   name:"Bank Central Asia",        type:"stock", region:"emerging", sector:"finance",   esg:false },
  { symbol:"BBRI.JK",   name:"Bank Rakyat Indonesia",    type:"stock", region:"emerging", sector:"finance",   esg:false },
  { symbol:"TLKM.JK",   name:"Telkom Indonesia",         type:"stock", region:"emerging", sector:"telecom",   esg:false },
  { symbol:"BMRI.JK",   name:"Bank Mandiri",             type:"stock", region:"emerging", sector:"finance",   esg:false },
  { symbol:"ASII.JK",   name:"Astra International",      type:"stock", region:"emerging", sector:"industrial",esg:false },

  // ── MALAISIE ──────────────────────────────────────────────
  { symbol:"1155.KL",   name:"Maybank",                  type:"stock", region:"emerging", sector:"finance",   esg:false },
  { symbol:"1023.KL",   name:"CIMB Group",               type:"stock", region:"emerging", sector:"finance",   esg:false },
  { symbol:"5347.KL",   name:"Tenaga Nasional",          type:"stock", region:"emerging", sector:"utilities", esg:false },
  { symbol:"6888.KL",   name:"Axiata Group",             type:"stock", region:"emerging", sector:"telecom",   esg:false },
  { symbol:"5681.KL",   name:"Petronas Chemicals",       type:"stock", region:"emerging", sector:"materials", esg:false },

  // ── THAÏLANDE ─────────────────────────────────────────────
  { symbol:"PTT.BK",    name:"PTT",                      type:"stock", region:"emerging", sector:"energy",    esg:false },
  { symbol:"ADVANC.BK", name:"Advanced Info Service",    type:"stock", region:"emerging", sector:"telecom",   esg:false },
  { symbol:"AOT.BK",    name:"Airports of Thailand",     type:"stock", region:"emerging", sector:"industrial",esg:false },
  { symbol:"CPALL.BK",  name:"CP All",                   type:"stock", region:"emerging", sector:"consumer",  esg:false },
  { symbol:"KBANK.BK",  name:"Kasikorn Bank",            type:"stock", region:"emerging", sector:"finance",   esg:false },

  // ════════════════════════════════════════════════════════
  // ETF THÉMATIQUES ET SECTORIELS SUPPLÉMENTAIRES
  // ════════════════════════════════════════════════════════

  // ── Sectoriels USA ────────────────────────────────────────
  { symbol:"XLK",       name:"Technology Select SPDR",   type:"etf",   region:"usa",      sector:"tech",      esg:false, ter:0.10 },
  { symbol:"XLF",       name:"Financial Select SPDR",    type:"etf",   region:"usa",      sector:"finance",   esg:false, ter:0.10 },
  { symbol:"XLV",       name:"Health Care Select SPDR",  type:"etf",   region:"usa",      sector:"health",    esg:false, ter:0.10 },
  { symbol:"XLE",       name:"Energy Select SPDR",       type:"etf",   region:"usa",      sector:"energy",    esg:false, ter:0.10 },
  { symbol:"XLI",       name:"Industrial Select SPDR",   type:"etf",   region:"usa",      sector:"industrial",esg:false, ter:0.10 },
  { symbol:"XLY",       name:"Consumer Disc. Select SPDR",type:"etf",  region:"usa",      sector:"consumer",  esg:false, ter:0.10 },
  { symbol:"XLP",       name:"Consumer Staples Select",  type:"etf",   region:"usa",      sector:"consumer",  esg:false, ter:0.10 },
  { symbol:"XLRE",      name:"Real Estate Select SPDR",  type:"etf",   region:"usa",      sector:"realestate",esg:false, ter:0.10 },
  { symbol:"SOXX",      name:"iShares Semiconductor ETF",type:"etf",   region:"usa",      sector:"tech",      esg:false, ter:0.35 },
  { symbol:"SMH",       name:"VanEck Semiconductor ETF", type:"etf",   region:"usa",      sector:"tech",      esg:false, ter:0.35 },

  // ── Thématiques Innovation ────────────────────────────────
  { symbol:"BOTZ",      name:"Global X Robotics & AI",   type:"etf",   region:"world",    sector:"tech",      esg:false, ter:0.68 },
  { symbol:"ROBO",      name:"ROBO Global Robotics ETF", type:"etf",   region:"world",    sector:"tech",      esg:false, ter:0.95 },
  { symbol:"ARKK",      name:"ARK Innovation ETF",       type:"etf",   region:"usa",      sector:"tech",      esg:false, ter:0.75 },
  { symbol:"DRIV",      name:"Global X Autonomous & EV", type:"etf",   region:"world",    sector:"industrial",esg:true,  ter:0.68 },

  // ── Énergie verte ─────────────────────────────────────────
  { symbol:"ICLN",      name:"iShares Global Clean Energy",type:"etf", region:"world",    sector:"utilities", esg:true,  ter:0.40 },
  { symbol:"IQQH.DE",   name:"iShares Global Clean Energy EUR",type:"etf",region:"world", sector:"utilities", esg:true,  ter:0.65 },
  { symbol:"INRG.L",    name:"iShares Global Clean Energy GBP",type:"etf",region:"world", sector:"utilities", esg:true,  ter:0.65 },
  { symbol:"ZPRE.DE",   name:"SPDR S&P Global Clean Energy",type:"etf",region:"world",    sector:"utilities", esg:true,  ter:0.40 },

  // ── Cryptos supplémentaires ────────────────────────────────
  { symbol:"SOL-EUR",   name:"Solana",                   type:"crypto",region:"global",   sector:"broad",     esg:false },
  { symbol:"BNB-EUR",   name:"BNB (Binance)",            type:"crypto",region:"global",   sector:"broad",     esg:false },
  { symbol:"XRP-EUR",   name:"XRP",                      type:"crypto",region:"global",   sector:"broad",     esg:false },
  { symbol:"ADA-EUR",   name:"Cardano",                  type:"crypto",region:"global",   sector:"broad",     esg:true  },
  { symbol:"AVAX-EUR",  name:"Avalanche",                type:"crypto",region:"global",   sector:"broad",     esg:false },
  { symbol:"DOT-EUR",   name:"Polkadot",                 type:"crypto",region:"global",   sector:"broad",     esg:false },

  // ── Obligations supplémentaires ───────────────────────────
  { symbol:"TLT",       name:"iShares 20+ Year Treasury",type:"bond",  region:"usa",      sector:"broad",     esg:false, ter:0.15 },
  { symbol:"HYG",       name:"iShares iBoxx High Yield", type:"bond",  region:"usa",      sector:"broad",     esg:false, ter:0.48 },
  { symbol:"LQD",       name:"iShares iBoxx Invest. Grade",type:"bond",region:"usa",      sector:"broad",     esg:false, ter:0.14 },
  { symbol:"EMB",       name:"iShares J.P. Morgan EM Bond",type:"bond",region:"emerging", sector:"broad",     esg:false, ter:0.39 },
  { symbol:"IEMB.L",    name:"iShares EM Local Govt Bond",type:"bond", region:"emerging", sector:"broad",     esg:false, ter:0.50 },

  // ── US stocks secteurs non représentés ────────────────────
  // Télécom
  { symbol:"T",         name:"AT&T",                     type:"stock", region:"usa",      sector:"telecom",   esg:false },
  { symbol:"VZ",        name:"Verizon",                  type:"stock", region:"usa",      sector:"telecom",   esg:false },
  { symbol:"TMUS",      name:"T-Mobile US",              type:"stock", region:"usa",      sector:"telecom",   esg:false },
  { symbol:"CMCSA",     name:"Comcast",                  type:"stock", region:"usa",      sector:"telecom",   esg:false },
  // Biotech
  { symbol:"AMGN",      name:"Amgen",                    type:"stock", region:"usa",      sector:"health",    esg:false },
  { symbol:"GILD",      name:"Gilead Sciences",          type:"stock", region:"usa",      sector:"health",    esg:false },
  { symbol:"REGN",      name:"Regeneron",                type:"stock", region:"usa",      sector:"health",    esg:false },
  { symbol:"VRTX",      name:"Vertex Pharmaceuticals",   type:"stock", region:"usa",      sector:"health",    esg:false },
  { symbol:"MRNA",      name:"Moderna",                  type:"stock", region:"usa",      sector:"health",    esg:false },
  // Semi-conducteurs
  { symbol:"QCOM",      name:"Qualcomm",                 type:"stock", region:"usa",      sector:"tech",      esg:false },
  { symbol:"TXN",       name:"Texas Instruments",        type:"stock", region:"usa",      sector:"tech",      esg:false },
  { symbol:"MU",        name:"Micron Technology",        type:"stock", region:"usa",      sector:"tech",      esg:false },
  { symbol:"KLAC",      name:"KLA Corporation",          type:"stock", region:"usa",      sector:"tech",      esg:false },
  { symbol:"AMAT",      name:"Applied Materials",        type:"stock", region:"usa",      sector:"tech",      esg:false },
  { symbol:"LRCX",      name:"Lam Research",             type:"stock", region:"usa",      sector:"tech",      esg:false },
  // Cybersécurité
  { symbol:"CRWD",      name:"CrowdStrike",              type:"stock", region:"usa",      sector:"tech",      esg:false },
  { symbol:"ZS",        name:"Zscaler",                  type:"stock", region:"usa",      sector:"tech",      esg:false },
  { symbol:"NET",       name:"Cloudflare",               type:"stock", region:"usa",      sector:"tech",      esg:false },
  // Cloud / SaaS
  { symbol:"NOW",       name:"ServiceNow",               type:"stock", region:"usa",      sector:"tech",      esg:true  },
  { symbol:"SNOW",      name:"Snowflake",                type:"stock", region:"usa",      sector:"tech",      esg:false },
  { symbol:"DDOG",      name:"Datadog",                  type:"stock", region:"usa",      sector:"tech",      esg:false },
  // Fintech
  { symbol:"PYPL",      name:"PayPal",                   type:"stock", region:"usa",      sector:"finance",   esg:false },
  { symbol:"COIN",      name:"Coinbase",                 type:"stock", region:"usa",      sector:"finance",   esg:false },
  { symbol:"SQ",        name:"Block (ex-Square)",        type:"stock", region:"usa",      sector:"finance",   esg:false },
  // Industriels / Défense
  { symbol:"GD",        name:"General Dynamics",         type:"stock", region:"usa",      sector:"defense",   esg:false },
  { symbol:"NOC",       name:"Northrop Grumman",         type:"stock", region:"usa",      sector:"defense",   esg:false },
  { symbol:"HON",       name:"Honeywell",                type:"stock", region:"usa",      sector:"industrial",esg:false },
  { symbol:"MMM",       name:"3M",                       type:"stock", region:"usa",      sector:"industrial",esg:false },
  { symbol:"ITW",       name:"Illinois Tool Works",      type:"stock", region:"usa",      sector:"industrial",esg:false },
  { symbol:"UPS",       name:"UPS",                      type:"stock", region:"usa",      sector:"industrial",esg:false },
  { symbol:"FDX",       name:"FedEx",                    type:"stock", region:"usa",      sector:"industrial",esg:false },
  { symbol:"DE",        name:"John Deere",               type:"stock", region:"usa",      sector:"industrial",esg:false },
  // Matériaux
  { symbol:"LIN",       name:"Linde",                    type:"stock", region:"usa",      sector:"materials", esg:true  },
  { symbol:"APD",       name:"Air Products",             type:"stock", region:"usa",      sector:"materials", esg:true  },
  { symbol:"ECL",       name:"Ecolab",                   type:"stock", region:"usa",      sector:"materials", esg:true  },
  { symbol:"FCX",       name:"Freeport-McMoRan",         type:"stock", region:"usa",      sector:"materials", esg:false },
  { symbol:"NEM",       name:"Newmont",                  type:"stock", region:"usa",      sector:"materials", esg:false },
  // REITs
  { symbol:"EQIX",      name:"Equinix (Data Centers)",   type:"reit",  region:"usa",      sector:"realestate",esg:true  },
  { symbol:"DLR",       name:"Digital Realty Trust",     type:"reit",  region:"usa",      sector:"realestate",esg:true  },
  { symbol:"PSA",       name:"Public Storage",           type:"reit",  region:"usa",      sector:"realestate",esg:false },
  { symbol:"O",         name:"Realty Income",            type:"reit",  region:"usa",      sector:"realestate",esg:false },
  { symbol:"SPG",       name:"Simon Property Group",     type:"reit",  region:"usa",      sector:"realestate",esg:false },
  // Restauration / Loisirs
  { symbol:"MCD",       name:"McDonald's",               type:"stock", region:"usa",      sector:"consumer",  esg:false },
  { symbol:"SBUX",      name:"Starbucks",                type:"stock", region:"usa",      sector:"consumer",  esg:false },
  { symbol:"NKE",       name:"Nike",                     type:"stock", region:"usa",      sector:"consumer",  esg:true  },
  { symbol:"TGT",       name:"Target",                   type:"stock", region:"usa",      sector:"consumer",  esg:false },
  { symbol:"LOW",       name:"Lowe's",                   type:"stock", region:"usa",      sector:"consumer",  esg:false },
  // Assurance
  { symbol:"CB",        name:"Chubb",                    type:"stock", region:"usa",      sector:"finance",   esg:false },
  { symbol:"AON",       name:"Aon",                      type:"stock", region:"usa",      sector:"finance",   esg:false },
  { symbol:"MMC",       name:"Marsh McLennan",           type:"stock", region:"usa",      sector:"finance",   esg:false },
  { symbol:"CI",        name:"Cigna",                    type:"stock", region:"usa",      sector:"health",    esg:false },
  { symbol:"HUM",       name:"Humana",                   type:"stock", region:"usa",      sector:"health",    esg:false },
];

];

export const UNIVERSE_COUNT = ASSET_UNIVERSE.length;
