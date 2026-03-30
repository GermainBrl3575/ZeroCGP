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
];

export const UNIVERSE_COUNT = ASSET_UNIVERSE.length;
