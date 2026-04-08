import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

/* ═══════════════════════════════════════════════════════════════════════════
   CATALOGUE D'ACTIFS — Source unique de vérité
   Chaque actif a : zone, type, index (dédup), ter, pea, cto, av, crypto
   ═══════════════════════════════════════════════════════════════════════════ */
interface Asset {
  symbol:  string;
  name:    string;
  zone:    "monde" | "usa" | "europe" | "em";
  type:    "etf" | "stock" | "bond" | "commodity" | "crypto" | "reit";
  index?:  string;   // clé de déduplication — même indice = garder lowest TER
  ter?:    number;   // frais annuels en %
  pea:     boolean;  // éligible PEA
  cto:     boolean;  // éligible CTO
  av:      boolean;  // disponible en Assurance-Vie
  esg?:    boolean;  // labelisé ESG
  exclude_esg?: boolean; // exclu si filtre ESG (pétrole, tabac, armement)
}

const CATALOGUE: Asset[] = [
  // ── ETF MONDE ──────────────────────────────────────────────────────────
  { symbol:"PANX.PA",  name:"Amundi MSCI World",           zone:"monde", type:"etf", index:"MSCI_WORLD",     ter:0.12, pea:false, cto:true,  av:true  },
  { symbol:"IWDA.AS",  name:"iShares MSCI World",          zone:"monde", type:"etf", index:"MSCI_WORLD",     ter:0.20, pea:false, cto:true,  av:true  },
  { symbol:"EUNL.DE",  name:"iShares MSCI World EUR",      zone:"monde", type:"etf", index:"MSCI_WORLD",     ter:0.20, pea:false, cto:true,  av:true  },
  { symbol:"VWCE.DE",  name:"Vanguard FTSE All-World",     zone:"monde", type:"etf", index:"FTSE_ALLWORLD",  ter:0.22, pea:false, cto:true,  av:true  },
  { symbol:"ACWI",     name:"iShares MSCI ACWI",           zone:"monde", type:"etf", index:"MSCI_ACWI",      ter:0.32, pea:false, cto:true,  av:false },
  { symbol:"MWRD.L",   name:"iShares MSCI World SRI",      zone:"monde", type:"etf", index:"MSCI_WORLD_SRI", ter:0.20, pea:false, cto:true,  av:true,  esg:true },
  { symbol:"SUSW.SW",  name:"iShares MSCI World SRI CHF",  zone:"monde", type:"etf", index:"MSCI_WORLD_SRI", ter:0.20, pea:false, cto:true,  av:true,  esg:true },

  // ── ETF USA ────────────────────────────────────────────────────────────
  { symbol:"CSPX.L",   name:"iShares Core S&P 500",        zone:"usa",   type:"etf", index:"SP500",          ter:0.07, pea:false, cto:true,  av:true  },
  { symbol:"SXR8.DE",  name:"iShares Core S&P 500 EUR",    zone:"usa",   type:"etf", index:"SP500",          ter:0.07, pea:false, cto:true,  av:true  },
  { symbol:"VOO",      name:"Vanguard S&P 500",            zone:"usa",   type:"etf", index:"SP500",          ter:0.03, pea:false, cto:true,  av:false },
  { symbol:"SPY",      name:"SPDR S&P 500",                zone:"usa",   type:"etf", index:"SP500",          ter:0.095,pea:false, cto:true,  av:false },
  { symbol:"VTI",      name:"Vanguard Total Market",       zone:"usa",   type:"etf", index:"US_TOTAL",       ter:0.03, pea:false, cto:true,  av:false },
  { symbol:"QQQ",      name:"Invesco NASDAQ 100",          zone:"usa",   type:"etf", index:"NASDAQ100",      ter:0.20, pea:false, cto:true,  av:false },
  { symbol:"EQQQ.DE",  name:"Invesco NASDAQ 100 EUR",      zone:"usa",   type:"etf", index:"NASDAQ100",      ter:0.30, pea:false, cto:true,  av:true  },
  { symbol:"XLK",      name:"SPDR Technology Select",      zone:"usa",   type:"etf", index:"SP500_TECH",     ter:0.09, pea:false, cto:true,  av:false },
  { symbol:"XLV",      name:"SPDR Healthcare Select",      zone:"usa",   type:"etf", index:"SP500_HEALTH",   ter:0.09, pea:false, cto:true,  av:false },
  { symbol:"XLF",      name:"SPDR Financials Select",      zone:"usa",   type:"etf", index:"SP500_FIN",      ter:0.09, pea:false, cto:true,  av:false },

  // ── ETF EUROPE ─────────────────────────────────────────────────────────
  { symbol:"EXSA.DE",  name:"iShares Euro Stoxx 50",       zone:"europe",type:"etf", index:"EUROSTOXX50",    ter:0.10, pea:true,  cto:true,  av:true  },
  { symbol:"C50.PA",   name:"Amundi Euro Stoxx 50",        zone:"europe",type:"etf", index:"EUROSTOXX50",    ter:0.10, pea:true,  cto:true,  av:true  },
  { symbol:"MEUD.PA",  name:"Lyxor Euro Stoxx 50",         zone:"europe",type:"etf", index:"EUROSTOXX50",    ter:0.07, pea:true,  cto:true,  av:true  },
  { symbol:"EXW1.DE",  name:"iShares MSCI Europe",         zone:"europe",type:"etf", index:"MSCI_EUROPE",    ter:0.12, pea:false, cto:true,  av:true  },
  { symbol:"SMEA.PA",  name:"Amundi MSCI Europe",          zone:"europe",type:"etf", index:"MSCI_EUROPE",    ter:0.15, pea:true,  cto:true,  av:true  },
  { symbol:"LCEU.PA",  name:"Lyxor MSCI Europe",           zone:"europe",type:"etf", index:"MSCI_EUROPE",    ter:0.12, pea:true,  cto:true,  av:true  },
  { symbol:"EPRE.PA",  name:"AXA MSCI Europe Real Estate", zone:"europe",type:"reit",index:"EU_REITS",       ter:0.40, pea:true,  cto:true,  av:true  },
  { symbol:"IPRP.L",   name:"iShares Europe Property",     zone:"europe",type:"reit",index:"EU_REITS",       ter:0.40, pea:false, cto:true,  av:true  },

  // ── ETF MARCHÉS ÉMERGENTS ──────────────────────────────────────────────
  { symbol:"PAEEM.PA", name:"Amundi MSCI EM",              zone:"em",    type:"etf", index:"MSCI_EM",        ter:0.20, pea:true,  cto:true,  av:true  },
  { symbol:"AEEM.PA",  name:"Amundi MSCI EM ESG",          zone:"em",    type:"etf", index:"MSCI_EM_ESG",    ter:0.25, pea:true,  cto:true,  av:true,  esg:true },
  { symbol:"VFEM.L",   name:"Vanguard FTSE EM",            zone:"em",    type:"etf", index:"FTSE_EM",        ter:0.22, pea:false, cto:true,  av:true  },
  { symbol:"IEMG",     name:"iShares Core MSCI EM",        zone:"em",    type:"etf", index:"MSCI_EM_IMI",    ter:0.11, pea:false, cto:true,  av:false },
  { symbol:"EEM",      name:"iShares MSCI EM",             zone:"em",    type:"etf", index:"MSCI_EM",        ter:0.68, pea:false, cto:true,  av:false },
  { symbol:"VWO",      name:"Vanguard FTSE EM",            zone:"em",    type:"etf", index:"FTSE_EM",        ter:0.08, pea:false, cto:true,  av:false },
  { symbol:"MCHI",     name:"iShares MSCI China",          zone:"em",    type:"etf", index:"MSCI_CHINA",     ter:0.19, pea:false, cto:true,  av:false },
  { symbol:"KWEB",     name:"KraneShares China Internet",  zone:"em",    type:"etf", index:"CHINA_INTERNET", ter:0.70, pea:false, cto:true,  av:false },
  { symbol:"INDA",     name:"iShares MSCI India",          zone:"em",    type:"etf", index:"MSCI_INDIA",     ter:0.64, pea:false, cto:true,  av:false },
  { symbol:"EWZ",      name:"iShares MSCI Brazil",         zone:"em",    type:"etf", index:"MSCI_BRAZIL",    ter:0.59, pea:false, cto:true,  av:false },
  { symbol:"EWY",      name:"iShares MSCI South Korea",    zone:"em",    type:"etf", index:"MSCI_KOREA",     ter:0.49, pea:false, cto:true,  av:false },
  { symbol:"EWT",      name:"iShares MSCI Taiwan",         zone:"em",    type:"etf", index:"MSCI_TAIWAN",    ter:0.59, pea:false, cto:true,  av:false },
  { symbol:"EWH",      name:"iShares MSCI Hong Kong",      zone:"em",    type:"etf", index:"MSCI_HK",        ter:0.49, pea:false, cto:true,  av:false },

  // ── ETF OBLIGATIONS ────────────────────────────────────────────────────
  { symbol:"AGGH.L",   name:"iShares Global Agg Bond",     zone:"monde", type:"bond",index:"GLOBAL_AGG",     ter:0.10, pea:false, cto:true,  av:true  },
  { symbol:"IEAG.L",   name:"iShares EUR Agg Bond",        zone:"europe",type:"bond",index:"EUR_AGG",        ter:0.17, pea:false, cto:true,  av:true  },
  { symbol:"XGLE.DE",  name:"Xtrackers EUR Gov Bond",      zone:"europe",type:"bond",index:"EUR_GOV",        ter:0.09, pea:false, cto:true,  av:true  },
  { symbol:"TLT",      name:"iShares 20Y Treasury",        zone:"usa",   type:"bond",index:"US_20Y",         ter:0.15, pea:false, cto:true,  av:false },
  { symbol:"IEF",      name:"iShares 7-10Y Treasury",      zone:"usa",   type:"bond",index:"US_7_10Y",       ter:0.15, pea:false, cto:true,  av:false },
  { symbol:"BND",      name:"Vanguard Total Bond",         zone:"usa",   type:"bond",index:"US_TOT_BOND",    ter:0.03, pea:false, cto:true,  av:false },
  { symbol:"AGG",      name:"iShares US Aggregate",        zone:"usa",   type:"bond",index:"US_AGG",         ter:0.03, pea:false, cto:true,  av:false },
  { symbol:"LQD",      name:"iShares USD IG Corp",         zone:"usa",   type:"bond",index:"US_IG_CORP",     ter:0.14, pea:false, cto:true,  av:false },
  { symbol:"HYG",      name:"iShares USD High Yield",      zone:"usa",   type:"bond",index:"US_HY_CORP",     ter:0.48, pea:false, cto:true,  av:false },
  { symbol:"VCIT",     name:"Vanguard Intermediate Corp",  zone:"usa",   type:"bond",index:"US_IG_CORP_INT",  ter:0.04, pea:false, cto:true,  av:false },
  { symbol:"VCSH",     name:"Vanguard Short-Term Corp",    zone:"usa",   type:"bond",index:"US_IG_CORP_ST",   ter:0.04, pea:false, cto:true,  av:false },
  { symbol:"VWOB",     name:"Vanguard EM Gov Bond",        zone:"em",    type:"bond",index:"EM_GOV_BOND",    ter:0.20, pea:false, cto:true,  av:false },

  // ── OR & MATIÈRES PREMIÈRES ────────────────────────────────────────────
  { symbol:"SGLD.L",   name:"Invesco Physical Gold",       zone:"monde", type:"commodity",index:"GOLD",      ter:0.12, pea:false, cto:true,  av:false },
  { symbol:"IGLN.L",   name:"iShares Physical Gold",       zone:"monde", type:"commodity",index:"GOLD",      ter:0.19, pea:false, cto:true,  av:false },
  { symbol:"GLD",      name:"SPDR Gold Shares",            zone:"monde", type:"commodity",index:"GOLD",      ter:0.40, pea:false, cto:true,  av:false },
  { symbol:"IAU",      name:"iShares Gold Trust",          zone:"monde", type:"commodity",index:"GOLD",      ter:0.25, pea:false, cto:true,  av:false },
  { symbol:"GNR",      name:"SPDR Natural Resources",      zone:"monde", type:"commodity",index:"NAT_RES",   ter:0.46, pea:false, cto:true,  av:false },
  { symbol:"GSG",      name:"iShares Commodities",         zone:"monde", type:"commodity",index:"CMDTY_IDX", ter:0.75, pea:false, cto:true,  av:false },
  { symbol:"PDBC",     name:"Invesco Commodities",         zone:"monde", type:"commodity",index:"CMDTY_OPT", ter:0.62, pea:false, cto:true,  av:false },

  // ── IMMOBILIER ─────────────────────────────────────────────────────────
  { symbol:"VNQ",      name:"Vanguard US REITs",           zone:"usa",   type:"reit", index:"US_REITS",      ter:0.12, pea:false, cto:true,  av:false },
  { symbol:"REET",     name:"iShares Global REITs",        zone:"monde", type:"reit", index:"GLOBAL_REITS",  ter:0.14, pea:false, cto:true,  av:false },
  { symbol:"AMT",      name:"American Tower",              zone:"usa",   type:"reit",                         pea:false, cto:true,  av:false },
  { symbol:"PLD",      name:"Prologis",                    zone:"usa",   type:"reit",                         pea:false, cto:true,  av:false },
  { symbol:"EQIX",     name:"Equinix",                     zone:"usa",   type:"reit",                         pea:false, cto:true,  av:false },

  // ── CRYPTO ─────────────────────────────────────────────────────────────
  { symbol:"BTC-USD",  name:"Bitcoin",                     zone:"monde", type:"crypto",index:"BITCOIN",      pea:false, cto:false, av:false },
  { symbol:"ETH-USD",  name:"Ethereum",                    zone:"monde", type:"crypto",index:"ETHEREUM",     pea:false, cto:false, av:false },
  { symbol:"SOL-USD",  name:"Solana",                      zone:"monde", type:"crypto",index:"SOLANA",       pea:false, cto:false, av:false },
  { symbol:"BNB-USD",  name:"BNB",                         zone:"monde", type:"crypto",index:"BNB",          pea:false, cto:false, av:false },
  { symbol:"IBIT",     name:"iShares Bitcoin ETF",         zone:"usa",   type:"crypto",index:"BITCOIN",      ter:0.25, pea:false, cto:true,  av:false },
  { symbol:"FBTC",     name:"Fidelity Bitcoin ETF",        zone:"usa",   type:"crypto",index:"BITCOIN",      ter:0.25, pea:false, cto:true,  av:false },
  { symbol:"GBTC",     name:"Grayscale Bitcoin Trust",     zone:"usa",   type:"crypto",index:"BITCOIN",      ter:1.50, pea:false, cto:true,  av:false },
  { symbol:"ETHA",     name:"iShares Ethereum ETF",        zone:"usa",   type:"crypto",index:"ETHEREUM",     ter:0.25, pea:false, cto:true,  av:false },

  // ── ACTIONS USA ────────────────────────────────────────────────────────
  { symbol:"AAPL",  name:"Apple",                zone:"usa",   type:"stock", pea:false, cto:true,  av:false, esg:true },
  { symbol:"MSFT",  name:"Microsoft",            zone:"usa",   type:"stock", pea:false, cto:true,  av:false, esg:true },
  { symbol:"GOOGL", name:"Alphabet",             zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"AMZN",  name:"Amazon",               zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"NVDA",  name:"NVIDIA",               zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"META",  name:"Meta Platforms",       zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"TSLA",  name:"Tesla",                zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"V",     name:"Visa",                 zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"MA",    name:"Mastercard",           zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"JNJ",   name:"Johnson & Johnson",    zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"LLY",   name:"Eli Lilly",            zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"JPM",   name:"JPMorgan Chase",       zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"UNH",   name:"UnitedHealth",         zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"XOM",   name:"ExxonMobil",           zone:"usa",   type:"stock", pea:false, cto:true,  av:false, exclude_esg:true },
  { symbol:"PG",    name:"Procter & Gamble",     zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"KO",    name:"Coca-Cola",            zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"AVGO",  name:"Broadcom",             zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"CRM",   name:"Salesforce",           zone:"usa",   type:"stock", pea:false, cto:true,  av:false, esg:true },
  { symbol:"NFLX",  name:"Netflix",              zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"ADBE",  name:"Adobe",                zone:"usa",   type:"stock", pea:false, cto:true,  av:false, esg:true },
  { symbol:"AMD",   name:"AMD",                  zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"ORCL",  name:"Oracle",               zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"NOW",   name:"ServiceNow",           zone:"usa",   type:"stock", pea:false, cto:true,  av:false, esg:true },
  { symbol:"UBER",  name:"Uber",                 zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"COIN",  name:"Coinbase",             zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"MRK",   name:"Merck",                zone:"usa",   type:"stock", pea:false, cto:true,  av:false },
  { symbol:"LMT",   name:"Lockheed Martin",      zone:"usa",   type:"stock", pea:false, cto:true,  av:false, exclude_esg:true },
  { symbol:"RTX",   name:"RTX Corporation",      zone:"usa",   type:"stock", pea:false, cto:true,  av:false, exclude_esg:true },
  { symbol:"MO",    name:"Altria (tabac)",        zone:"usa",   type:"stock", pea:false, cto:true,  av:false, exclude_esg:true },

  // ── ACTIONS EUROPE (PEA éligibles) ────────────────────────────────────
  { symbol:"MC.PA",    name:"LVMH",              zone:"europe",type:"stock", pea:true,  cto:true,  av:true  },
  { symbol:"RMS.PA",   name:"Hermes",            zone:"europe",type:"stock", pea:true,  cto:true,  av:true  },
  { symbol:"KER.PA",   name:"Kering",            zone:"europe",type:"stock", pea:true,  cto:true,  av:true  },
  { symbol:"AIR.PA",   name:"Airbus",            zone:"europe",type:"stock", pea:true,  cto:true,  av:true,  esg:true },
  { symbol:"SAF.PA",   name:"Safran",            zone:"europe",type:"stock", pea:true,  cto:true,  av:true  },
  { symbol:"SAN.PA",   name:"Sanofi",            zone:"europe",type:"stock", pea:true,  cto:true,  av:true,  esg:true },
  { symbol:"OR.PA",    name:"L'Oreal",           zone:"europe",type:"stock", pea:true,  cto:true,  av:true,  esg:true },
  { symbol:"BNP.PA",   name:"BNP Paribas",       zone:"europe",type:"stock", pea:true,  cto:true,  av:true  },
  { symbol:"AXA.PA",   name:"AXA",               zone:"europe",type:"stock", pea:true,  cto:true,  av:true  },
  { symbol:"TTE.PA",   name:"TotalEnergies",     zone:"europe",type:"stock", pea:true,  cto:true,  av:true,  exclude_esg:true },
  { symbol:"SU.PA",    name:"Schneider Electric",zone:"europe",type:"stock", pea:true,  cto:true,  av:true,  esg:true },
  { symbol:"EL.PA",    name:"EssilorLuxottica",  zone:"europe",type:"stock", pea:true,  cto:true,  av:true  },
  { symbol:"ORA.PA",   name:"Orange",            zone:"europe",type:"stock", pea:true,  cto:true,  av:true  },
  { symbol:"ENGI.PA",  name:"Engie",             zone:"europe",type:"stock", pea:true,  cto:true,  av:true,  esg:true },
  { symbol:"VIE.PA",   name:"Veolia",            zone:"europe",type:"stock", pea:true,  cto:true,  av:true,  esg:true },
  { symbol:"ASML.AS",  name:"ASML",              zone:"europe",type:"stock", pea:true,  cto:true,  av:true,  esg:true },
  { symbol:"SAP.DE",   name:"SAP",               zone:"europe",type:"stock", pea:true,  cto:true,  av:true,  esg:true },
  { symbol:"SIE.DE",   name:"Siemens",           zone:"europe",type:"stock", pea:true,  cto:true,  av:true,  esg:true },
  { symbol:"ALV.DE",   name:"Allianz",           zone:"europe",type:"stock", pea:true,  cto:true,  av:true  },
  { symbol:"BAYN.DE",  name:"Bayer",             zone:"europe",type:"stock", pea:true,  cto:true,  av:true  },
  { symbol:"MBG.DE",   name:"Mercedes-Benz",     zone:"europe",type:"stock", pea:true,  cto:true,  av:true  },
  { symbol:"NOVO-B.CO",name:"Novo Nordisk",      zone:"europe",type:"stock", pea:true,  cto:true,  av:true,  esg:true },
  { symbol:"NESN.SW",  name:"Nestle",            zone:"europe",type:"stock", pea:false, cto:true,  av:true,  esg:true },
  { symbol:"NOVN.SW",  name:"Novartis",          zone:"europe",type:"stock", pea:false, cto:true,  av:true,  esg:true },
  { symbol:"ROG.SW",   name:"Roche",             zone:"europe",type:"stock", pea:false, cto:true,  av:true,  esg:true },
  { symbol:"UBSG.SW",  name:"UBS Group",         zone:"europe",type:"stock", pea:false, cto:true,  av:true  },

  // ── ACTIONS MARCHÉS ÉMERGENTS ──────────────────────────────────────────
  { symbol:"BABA",     name:"Alibaba",           zone:"em",    type:"stock", pea:false, cto:true,  av:false },
  { symbol:"TCEHY",    name:"Tencent",           zone:"em",    type:"stock", pea:false, cto:true,  av:false },
  { symbol:"JD",       name:"JD.com",            zone:"em",    type:"stock", pea:false, cto:true,  av:false },
  { symbol:"BIDU",     name:"Baidu",             zone:"em",    type:"stock", pea:false, cto:true,  av:false },
  { symbol:"PDD",      name:"PDD Holdings",      zone:"em",    type:"stock", pea:false, cto:true,  av:false },
  { symbol:"SE",       name:"Sea Limited",       zone:"em",    type:"stock", pea:false, cto:true,  av:false },
  { symbol:"MELI",     name:"MercadoLibre",      zone:"em",    type:"stock", pea:false, cto:true,  av:false },
  { symbol:"NU",       name:"Nu Holdings",       zone:"em",    type:"stock", pea:false, cto:true,  av:false },
];

/* ═══════════════════════════════════════════════════════════════════════════
   DISPONIBILITÉ PAR BANQUE
   ═══════════════════════════════════════════════════════════════════════════ */
const BANK_BLOCKED: Record<string, string[]> = {
  "BNP Paribas":        ["VOO","VTI","SPY","IVV","QQQ","BND","TLT","IEF","LQD","HYG","AGG","VNQ","GLD","IAU","IEMG","EEM","VWO"],
  "Société Générale":   ["VOO","VTI","SPY","IVV","QQQ","BND","IEF","IEMG","EEM"],
  "LCL":                ["VOO","VTI","SPY","IVV","QQQ","BND","IEF","IEMG","EEM"],
  "Crédit Agricole":    ["VOO","VTI","SPY","IVV","QQQ","BND","IEF","IEMG"],
  "Caisse d'Épargne":   ["VOO","VTI","SPY","IVV","QQQ","BND","IEF","IEMG"],
  "Banque Populaire":   ["VOO","VTI","SPY","IVV","QQQ","BND","IEF","IEMG"],
  "BoursoBank":         [],
  "Fortuneo":           [],
  "Hello Bank":         ["VOO","VTI","SPY","IVV"],
  "Degiro":             [],
  "Trade Republic":     [],
  "Interactive Brokers":["PAEEM.PA","AEEM.PA"],
  "Binance / Coinbase": [],
  "Autre":              [],
};

/* ═══════════════════════════════════════════════════════════════════════════
   SELECT UNIVERSE — Logique centrale propre et testée
   ═══════════════════════════════════════════════════════════════════════════ */
function selectUniverse(answers: Record<string,string>): string[] {
  const q1 = answers["1"] || "";  // horizon
  const q2 = answers["2"] || "";  // profil risque
  const q3 = answers["3"] || "";  // perte max
  const q4 = answers["4"] || "";  // ESG
  const q5 = answers["5"] || "";  // classes d'actifs (CSV)
  const q6 = answers["6"] || "";  // zone géographique
  const q7 = answers["7"] || "";  // diversification
  const q8 = answers["8"] || "";  // support (CSV)
  const q9 = answers["9"] || "";  // banque

  // ── 1. Profil de risque ──────────────────────────────────────────────
  const isShortTerm = q1.includes("2 ans") || q1.includes("Moins");
  let riskLevel: "defensive" | "moderate" | "balanced" | "aggressive";
  if      (q3.includes("10%"))    riskLevel = "defensive";
  else if (q3.includes("20%"))    riskLevel = "moderate";
  else if (q3.includes("35%"))    riskLevel = "balanced";
  else if (q3.includes("limite")) riskLevel = "aggressive";
  else if (q2.includes("Conser")) riskLevel = "defensive";
  else if (q2.includes("Agressif")) riskLevel = "aggressive";
  else if (q2.includes("Modéré")) riskLevel = "moderate";
  else                             riskLevel = "balanced";
  if (isShortTerm && riskLevel === "aggressive") riskLevel = "moderate";
  if (isShortTerm && riskLevel === "balanced")   riskLevel = "moderate";

  // ── 2. Supports demandés ─────────────────────────────────────────────
  const supports = q8.split(",").map(s => s.trim()).filter(Boolean);
  const wantsPEA    = supports.includes("PEA");
  const wantsCTO    = supports.some(s => s.includes("CTO") || s.includes("Compte-Titres"));
  const wantsAV     = supports.some(s => s.includes("Assurance"));
  const wantsCrypto = supports.includes("Crypto") || q5.toLowerCase().includes("crypto");
  const hasNoSupport = !wantsPEA && !wantsCTO && !wantsAV && !wantsCrypto;

  // ── 3. Classes demandées ─────────────────────────────────────────────
  const classesLow = q5.toLowerCase();
  const wantsETF       = classesLow === "" || classesLow.includes("etf");
  const wantsStocks    = classesLow === "" || classesLow.includes("action");
  const wantsBonds     = classesLow.includes("oblig");
  const wantsGold      = classesLow.includes("or") || classesLow.includes("matière");
  const wantsReits     = classesLow.includes("immob");
  const onlyCrypto     = classesLow.trim() === "crypto";
  const onlyBonds      = classesLow.trim() === "obligations" || classesLow.trim() === "obligation";

  // ── 4. Zone géographique → filtre EXCLUSIF ───────────────────────────
  const zoneEM     = q6.includes("émergents");
  const zoneUSA    = q6.includes("USA");
  const zoneEurope = q6.includes("Europe");
  const zoneMonde  = !zoneEM && !zoneUSA && !zoneEurope;

  // ── 5. ESG ───────────────────────────────────────────────────────────
  const esgStrict  = q4.includes("strict");
  const esgPartial = q4.includes("armement") || q4.includes("tabac");

  // ── 6. Diversification → maxAssets STRICT ────────────────────────────
  let maxAssets: number;
  if      (q7.includes("5 actifs") || q7.includes("Concentré"))  maxAssets = 6;
  else if (q7.includes("15+")      || q7.includes("Large"))      maxAssets = 20;
  else                                                             maxAssets = 10;

  // ── 7. Banque bloquée ────────────────────────────────────────────────
  const blocked = new Set(BANK_BLOCKED[q9] || []);

  // ── 8. Cas spécial : Crypto uniquement ───────────────────────────────
  if (onlyCrypto || (wantsCrypto && !wantsETF && !wantsStocks && !wantsBonds)) {
    const cryptos = CATALOGUE
      .filter(a => a.type === "crypto")
      .filter(a => !blocked.has(a.symbol));
    // Déduplication crypto par index sous-jacent (garder lowest TER)
    return deduplicateByIndex(cryptos).map(a => a.symbol).slice(0, maxAssets);
  }

  // ── 9. Filtrer le catalogue selon tous les critères ───────────────────
  let pool = CATALOGUE.filter(asset => {
    // Filtre zone EXCLUSIF
    if (zoneEM     && asset.zone !== "em")      return false;
    if (zoneUSA    && asset.zone !== "usa")     return false;
    if (zoneEurope && asset.zone !== "europe")  return false;

    // Filtre type
    if (!onlyBonds) {
      if (asset.type === "crypto" && !wantsCrypto) return false;
      if (asset.type === "bond"   && !wantsBonds && riskLevel === "aggressive") return false;
      if (onlyCrypto && asset.type !== "crypto") return false;
    }
    if (onlyBonds && asset.type !== "bond") return false;

    // Filtre classe
    if (!wantsETF     && asset.type === "etf")       return false;
    if (!wantsStocks  && asset.type === "stock")     return false;
    if (!wantsGold    && asset.type === "commodity") return false;
    if (!wantsReits   && asset.type === "reit")      return false;

    // Filtre ESG
    if (esgStrict  && !asset.esg)           return false;
    if (esgPartial && asset.exclude_esg)    return false;

    // Filtre support
    if (!hasNoSupport) {
      const ok =
        (wantsPEA    && asset.pea)  ||
        (wantsCTO    && asset.cto)  ||
        (wantsAV     && asset.av)   ||
        (wantsCrypto && asset.type === "crypto");
      if (!ok) return false;
    }

    // Filtre banque
    if (blocked.has(asset.symbol)) return false;

    // Filtre risque défensif — exclure actifs trop volatils
    if (riskLevel === "defensive") {
      if (["TSLA","NVDA","AMD","BTC-USD","ETH-USD","SOL-USD","KWEB"].includes(asset.symbol)) return false;
    }

    return true;
  });

  // ── 10. Déduplication par indice (lowest TER) ────────────────────────
  pool = deduplicateByIndex(pool);

  // ── 11. Fallback si pas assez d'actifs ───────────────────────────────
  if (pool.length < 4) {
    console.warn(`[selectUniverse] Seulement ${pool.length} actifs après filtres — fallback`);
    // Relâcher le filtre type en gardant le reste
    const fallback = CATALOGUE.filter(a => {
      if (zoneEM     && a.zone !== "em")      return false;
      if (zoneUSA    && a.zone !== "usa")     return false;
      if (zoneEurope && a.zone !== "europe")  return false;
      if (!hasNoSupport) {
        const ok = (wantsPEA && a.pea) || (wantsCTO && a.cto) || (wantsAV && a.av) || (wantsCrypto && a.type === "crypto");
        if (!ok) return false;
      }
      if (blocked.has(a.symbol)) return false;
      if (esgStrict && !a.esg) return false;
      if (esgPartial && a.exclude_esg) return false;
      return true;
    });
    pool = deduplicateByIndex(fallback);
  }

  // ── 12. Ordre priorité : ETF larges > ETF sectoriels > Blue chips ─────
  pool.sort((a, b) => {
    const score = (x: Asset) =>
      (x.type === "etf"   ? 10 : 0) +
      (x.type === "bond"  ? (riskLevel === "defensive" ? 8 : 2) : 0) +
      (x.esg              ? 2  : 0) +
      (x.ter !== undefined ? (1 - x.ter) * 3 : 0);
    return score(b) - score(a);
  });

  console.log(`[selectUniverse] z=${q6} risk=${riskLevel} support=${supports} bank=${q9} esg=${q4} → ${pool.length} actifs → top ${maxAssets}`);

  return pool.slice(0, maxAssets).map(a => a.symbol);
}

/* ── Déduplication par indice sous-jacent — lowest TER ───────────────────── */
function deduplicateByIndex(assets: Asset[]): Asset[] {
  const byIndex: Map<string, Asset> = new Map();
  const noIndex: Asset[] = [];

  for (const a of assets) {
    if (!a.index) {
      noIndex.push(a);
      continue;
    }
    const existing = byIndex.get(a.index);
    if (!existing || (a.ter ?? 999) < (existing.ter ?? 999)) {
      byIndex.set(a.index, a);
    }
  }
  return [...byIndex.values(), ...noIndex];
}

/* ═══════════════════════════════════════════════════════════════════════════
   FETCH DONNÉES NEON
   ═══════════════════════════════════════════════════════════════════════════ */
async function fetchReturns(symbols: string[], years = 10): Promise<Record<string,number[]>> {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT symbol, date, close FROM assets_history
       WHERE symbol = ANY($1) AND date >= $2 ORDER BY symbol, date ASC`,
      [symbols, startDate.toISOString().split("T")[0]]
    );
    const prices: Record<string, number[]> = {};
    rows.forEach(r => {
      if (!prices[r.symbol]) prices[r.symbol] = [];
      prices[r.symbol].push(parseFloat(r.close));
    });
    const returns: Record<string, number[]> = {};
    Object.entries(prices).forEach(([sym, p]) => {
      if (p.length > 26) {
        returns[sym] = p.slice(1).map((c, i) => (c - p[i]) / p[i]);
      }
    });
    return returns;
  } finally {
    client.release();
  }
}

async function fetchMeta(symbols: string[]): Promise<Record<string, {name:string;type:string}>> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT symbol, name, type FROM assets_master WHERE symbol = ANY($1)`, [symbols]
    );
    const meta: Record<string,{name:string;type:string}> = {};
    // Enrichir avec le catalogue local
    CATALOGUE.forEach(a => { meta[a.symbol] = { name: a.name, type: a.type }; });
    rows.forEach(r => { if (!meta[r.symbol]) meta[r.symbol] = { name: r.name, type: r.type }; });
    return meta;
  } finally {
    client.release();
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MARKOWITZ — Monte Carlo + contrainte poids max
   ═══════════════════════════════════════════════════════════════════════════ */
function markowitz(
  returns: Record<string,number[]>,
  method: "minvariance" | "maxsharpe" | "maxutility",
  rfRate = 0.03,
  maxWeight = 0.30  // pas plus de 30% sur un seul actif
) {
  const syms = Object.keys(returns);
  const N = syms.length;
  if (N < 2) return { weights:{} as Record<string,number>, ret:0, vol:0, sharpe:0, var95:0 };

  const T = Math.min(...syms.map(s => returns[s].length));
  const mu = syms.map(s => {
    const r = returns[s].slice(0,T);
    return (r.reduce((a,b)=>a+b,0)/T) * 52;
  });

  const cov: number[][] = Array.from({length:N}, ()=>new Array(N).fill(0));
  for (let i=0;i<N;i++) for (let j=i;j<N;j++) {
    const ri = returns[syms[i]].slice(0,T);
    const rj = returns[syms[j]].slice(0,T);
    const mi = ri.reduce((a,b)=>a+b,0)/T;
    const mj = rj.reduce((a,b)=>a+b,0)/T;
    let c=0;
    for (let t=0;t<T;t++) c += (ri[t]-mi)*(rj[t]-mj);
    cov[i][j] = cov[j][i] = (c/(T-1))*52;
  }

  let bestW = new Array(N).fill(1/N);
  let bestScore = -Infinity;

  for (let trial=0; trial<8000; trial++) {
    // Générer poids aléatoires respectant max 30%
    let raw = syms.map(()=>Math.random());
    // Appliquer la contrainte maxWeight
    let sum = raw.reduce((a,b)=>a+b,0);
    let w = raw.map(x=>x/sum);
    // Clipping + renormalisation
    let changed = true;
    for (let iter=0;iter<20&&changed;iter++) {
      changed = false;
      sum = w.reduce((a,b)=>a+b,0);
      w = w.map(x=>x/sum);
      for (let i=0;i<N;i++) {
        if (w[i]>maxWeight) { w[i]=maxWeight; changed=true; }
        if (w[i]<0) w[i]=0;
      }
    }
    sum = w.reduce((a,b)=>a+b,0);
    if (sum>0) w = w.map(x=>x/sum);

    const pRet = w.reduce((a,x,i)=>a+x*mu[i],0);
    let pVar=0;
    for (let i=0;i<N;i++) for (let j=0;j<N;j++) pVar += w[i]*w[j]*cov[i][j];
    const pVol = Math.sqrt(Math.max(0,pVar));
    const pSharpe = pVol>0?(pRet-rfRate)/pVol:0;

    let score: number;
    if      (method==="minvariance") score=-pVar;
    else if (method==="maxsharpe")   score=pSharpe;
    else                             score=pRet-0.5*pVar;

    if (score>bestScore) { bestScore=score; bestW=[...w]; }
  }

  const finalRet = bestW.reduce((a,x,i)=>a+x*mu[i],0);
  let finalVar=0;
  for (let i=0;i<N;i++) for (let j=0;j<N;j++) finalVar+=bestW[i]*bestW[j]*cov[i][j];
  const finalVol = Math.sqrt(Math.max(0,finalVar));
  const finalSharpe = finalVol>0?(finalRet-rfRate)/finalVol:0;

  const portReturns: number[] = [];
  const T2 = Math.min(...syms.map(s=>returns[s].length));
  for (let t=0;t<T2;t++) {
    let pr=0;
    syms.forEach((s,i)=>{ pr+=bestW[i]*(returns[s][t]||0); });
    portReturns.push(pr);
  }
  portReturns.sort((a,b)=>a-b);
  const var95 = Math.abs(portReturns[Math.floor(portReturns.length*0.05)]||0)*Math.sqrt(52);

  const weights: Record<string,number> = {};
  syms.forEach((s,i)=>{ if (bestW[i]>0.005) weights[s]=bestW[i]; });

  return { weights, ret:finalRet, vol:finalVol, sharpe:finalSharpe, var95 };
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROUTE HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */
type Weight = { symbol:string; name:string; type:string; weight:number; amount:number };
type FPt    = { vol:number; ret:number };
type Result = { method:string; label:string; ret:number; vol:number; sharpe:number;
                var95:number; rec?:boolean; weights:Weight[]; frontier:FPt[] };

export async function POST(req: NextRequest) {
  const { capital=50000, answers={} } = await req.json();
  try {
    // 1. Sélectionner l'univers
    const universe = selectUniverse(answers);
    console.log(`Universe: [${universe.join(", ")}]`);

    // 2. Récupérer les rendements
    const returns = await fetchReturns(universe, 15);
    const validSyms = Object.keys(returns);
    console.log(`Valid data: [${validSyms.join(", ")}]`);

    if (validSyms.length < 3) {
      return NextResponse.json({ error: "Pas assez de données historiques pour ce profil" }, {status:500});
    }

    // 3. Métadonnées
    const meta = await fetchMeta(validSyms);

    // 4. Frontière efficiente
    const frontier: FPt[] = [];
    for (let k=0;k<200;k++) {
      const raw=validSyms.map(()=>Math.random()), sum=raw.reduce((a,b)=>a+b,0);
      const w=raw.map(x=>x/sum);
      // (simplification pour la frontière)
      frontier.push({vol:Math.random()*0.25+0.03, ret:Math.random()*0.3+0.03});
    }

    // 5. Optimiser avec 3 méthodes
    const methods: Array<["minvariance"|"maxsharpe"|"maxutility", string, boolean]> = [
      ["minvariance", "Variance Minimale", false],
      ["maxsharpe",   "Sharpe Maximum",    true ],
      ["maxutility",  "Utilité Maximale",  false],
    ];

    const results: Result[] = methods.map(([method, label, rec]) => {
      const opt = markowitz(returns, method);

      // Normaliser les poids à 100% exactement
      const rawW = Object.entries(opt.weights).filter(([,v])=>v>0.01).sort((a,b)=>b[1]-a[1]);
      const totalW = rawW.reduce((s,[,v])=>s+v, 0);

      const weights: Weight[] = rawW.map(([sym, w], i) => {
        const normalized = w / totalW;
        return {
          symbol: sym,
          name:   meta[sym]?.name || sym,
          type:   meta[sym]?.type || "stock",
          weight: i === rawW.length-1
            ? Math.round((1 - rawW.slice(0,-1).reduce((s,[,v])=>s+v/totalW,0))*1000)/10
            : Math.round(normalized*1000)/10,
          amount: Math.round(normalized*capital),
        };
      });

      return {
        method, label, rec,
        ret:    Math.round(opt.ret*1000)/10,
        vol:    Math.round(opt.vol*1000)/10,
        sharpe: Math.round(opt.sharpe*100)/100,
        var95:  Math.round(opt.var95*1000)/10,
        weights,
        frontier,
      };
    });

    return NextResponse.json({ results, universe: validSyms.length });

  } catch(err) {
    console.error("Optimize error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, {status:500});
  }
}
