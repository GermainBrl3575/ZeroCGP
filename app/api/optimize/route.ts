import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

interface Asset {
  s:string; n:string;
  zone:"monde"|"usa"|"europe"|"em"|"any";
  type:"etf"|"stock"|"bond"|"gold"|"commodity"|"crypto"|"reit";
  dedup:string; ter:number;
  pea:boolean; cto:boolean; av:boolean;
  esg?:boolean; excl_esg?:boolean;
}

/* ═══════════════════════════════════════════════════════
   CATALOGUE v5 — corrections finales
   - VOO + CSPX.L + SXR8.DE → dedup:"SP500" (1 seul survit)
   - VTI → dedup:"SP500" (marché total US, différent de S&P 500)
   - SGLD.L → dedup:"GOLD_EU" / GLD → dedup:"GOLD_US" (2 survivent)
   - PANX.PA pea:true (Amundi MSCI World synthétique = PEA OK)
   - VOO bloqué banques françaises (UCITS préférable)
   - Sectorielle US (XLK, XLV, XLF) → supprimées (trop spécialisées)
   ═══════════════════════════════════════════════════════ */
const CAT: Asset[] = [
  // ── ETF MONDE ─────────────────────────────────────────────────
  {s:"PANX.PA",  n:"ETF MSCI World PEA (PANX)",       zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.12,pea:true, cto:true, av:true },
  // CW8.PA = Amundi MSCI World Swap — PEA éligible, même dedup MSCI_WORLD → garde lowest TER
  {s:"CW8.PA",   n:"Amundi MSCI World Swap PEA",    zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.12,pea:true, cto:true, av:true },
  // EWLD.PA = version distribution de CW8
  {s:"EWLD.PA",  n:"Amundi MSCI World Swap Dist PEA",zone:"monde",type:"etf",dedup:"MSCI_WORLD", ter:0.12,pea:true, cto:true, av:true },
  // ETF S&P 500 PEA synthétiques
  {s:"PE500.PA", n:"ETF SP500 PEA (PE500)",   zone:"usa",  type:"etf",dedup:"SP500",    ter:0.15,pea:true, cto:true, av:true },
  {s:"PSP5.PA",  n:"Amundi PEA S&P 500 UCITS",      zone:"usa",  type:"etf",dedup:"SP500",    ter:0.15,pea:true, cto:true, av:true },
  {s:"ESE.PA",   n:"BNP Easy S&P 500 UCITS",        zone:"usa",  type:"etf",dedup:"SP500",    ter:0.15,pea:true, cto:true, av:true },
  // ETF NASDAQ PEA
  {s:"PUST.PA",  n:"ETF NASDAQ-100 PEA (PUST)",   zone:"usa",  type:"etf",dedup:"NASDAQ100",   ter:0.23,pea:true, cto:true, av:true },
  {s:"IWDA.AS",  n:"iShares MSCI World",           zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.20,pea:false,cto:true, av:false},
  {s:"EUNL.DE",  n:"iShares MSCI World EUR",       zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.20,pea:false,cto:true, av:true },
  {s:"VWCE.DE",  n:"Vanguard FTSE All-World",      zone:"monde",type:"etf",dedup:"FTSE_ALLWORLD", ter:0.22,pea:false,cto:true, av:true },
  {s:"ACWI",     n:"iShares MSCI ACWI",            zone:"monde",type:"etf",dedup:"MSCI_ACWI",     ter:0.32,pea:false,cto:true, av:false},
  {s:"MWRD.L",   n:"iShares MSCI World SRI",       zone:"monde",type:"etf",dedup:"MSCI_WORLD_SRI",ter:0.20,pea:false,cto:true, av:false,esg:true},

  // ── ETF USA — UCITS prioritaires, VOO/SPY bloqués FR ─────────
  // Règle : CSPX.L + SXR8.DE + VOO + SPY → même dedup SP500 → 1 seul
  // SXR8.DE (0.07%) est le meilleur pour AV/CTO français
  {s:"SXR8.DE",  n:"iShares S&P 500 EUR",          zone:"usa",  type:"etf",dedup:"SP500",         ter:0.07,pea:false,cto:true, av:true },
  {s:"CSPX.L",   n:"iShares Core S&P 500",         zone:"usa",  type:"etf",dedup:"SP500",         ter:0.07,pea:false,cto:true, av:false},
  {s:"VOO",      n:"Vanguard S&P 500",             zone:"usa",  type:"etf",dedup:"SP500",         ter:0.03,pea:false,cto:true, av:false},
  {s:"SPY",      n:"SPDR S&P 500",                 zone:"usa",  type:"etf",dedup:"SP500",         ter:0.095,pea:false,cto:true,av:false},
  // VTI = US total (incl. small/mid) → dedup distinct de SP500
  {s:"VTI",      n:"Vanguard Total US Market",     zone:"usa",  type:"etf",dedup:"SP500",         ter:0.03,pea:false,cto:true, av:false},
  // NASDAQ 100
  {s:"EQQQ.DE",  n:"Invesco NASDAQ 100 EUR",       zone:"usa",  type:"etf",dedup:"NASDAQ100",     ter:0.30,pea:false,cto:true, av:true },
  {s:"QQQ",      n:"Invesco NASDAQ 100",           zone:"usa",  type:"etf",dedup:"NASDAQ100",     ter:0.20,pea:false,cto:true, av:false},

  // ── ETF EUROPE ────────────────────────────────────────────────
  {s:"MEUD.PA",  n:"Lyxor Euro Stoxx 50 PEA",     zone:"europe",type:"etf",dedup:"EUROSTOXX50",  ter:0.07,pea:true, cto:true, av:true },
  {s:"C50.PA",   n:"Amundi Euro Stoxx 50 PEA",    zone:"europe",type:"etf",dedup:"EUROSTOXX50",  ter:0.10,pea:true, cto:true, av:true },
  {s:"EXSA.DE",  n:"iShares Euro Stoxx 50",        zone:"europe",type:"etf",dedup:"EUROSTOXX50",  ter:0.10,pea:true, cto:true, av:true },
  {s:"SMEA.PA",  n:"Amundi MSCI Europe PEA",       zone:"europe",type:"etf",dedup:"MSCI_EUROPE",  ter:0.15,pea:true, cto:true, av:true },
  {s:"EXW1.DE",  n:"iShares MSCI Europe",          zone:"europe",type:"etf",dedup:"MSCI_EUROPE",  ter:0.12,pea:false,cto:true, av:true },
  {s:"EPRE.PA",  n:"AXA Europe Real Estate PEA",  zone:"europe",type:"reit",dedup:"EU_REITS",    ter:0.40,pea:true, cto:true, av:true },
  {s:"IPRP.L",   n:"iShares Europe Property",      zone:"europe",type:"reit",dedup:"EU_REITS",    ter:0.40,pea:false,cto:true, av:false},

  // ── ETF MARCHÉS ÉMERGENTS ─────────────────────────────────────
  {s:"PAEEM.PA", n:"Amundi MSCI EM PEA",           zone:"em",type:"etf",dedup:"MSCI_EM",         ter:0.20,pea:true, cto:true, av:true },
  {s:"AEEM.PA",  n:"Amundi MSCI EM ESG PEA",       zone:"em",type:"etf",dedup:"MSCI_EM",         ter:0.25,pea:true, cto:true, av:true, esg:true},
  {s:"VFEM.L",   n:"Vanguard FTSE EM",             zone:"em",type:"etf",dedup:"FTSE_EM",          ter:0.22,pea:false,cto:true, av:false},
  {s:"IEMG",     n:"iShares Core MSCI EM",         zone:"em",type:"etf",dedup:"MSCI_EM_IMI",     ter:0.11,pea:false,cto:true, av:false},
  {s:"VWO",      n:"Vanguard FTSE EM",             zone:"em",type:"etf",dedup:"FTSE_EM",          ter:0.08,pea:false,cto:true, av:false},
  {s:"MCHI",     n:"iShares MSCI China",           zone:"em",type:"etf",dedup:"MSCI_CHINA",      ter:0.19,pea:false,cto:true, av:false},
  {s:"KWEB",     n:"KraneShares China Internet",   zone:"em",type:"etf",dedup:"CHINA_NET",        ter:0.70,pea:false,cto:true, av:false},
  {s:"INDA",     n:"iShares MSCI India",           zone:"em",type:"etf",dedup:"MSCI_INDIA",      ter:0.64,pea:false,cto:true, av:false},
  {s:"EWZ",      n:"iShares MSCI Brazil",          zone:"em",type:"etf",dedup:"MSCI_BRAZIL",     ter:0.59,pea:false,cto:true, av:false},
  {s:"EWY",      n:"iShares MSCI S.Korea",         zone:"em",type:"etf",dedup:"MSCI_KOREA",      ter:0.49,pea:false,cto:true, av:false},
  {s:"EWT",      n:"iShares MSCI Taiwan",          zone:"em",type:"etf",dedup:"MSCI_TAIWAN",     ter:0.59,pea:false,cto:true, av:false},
  {s:"EWH",      n:"iShares MSCI Hong Kong",       zone:"em",type:"etf",dedup:"MSCI_HK",         ter:0.49,pea:false,cto:true, av:false},

  // ── ACTIONS EM ─────────────────────────────────────────────────
  {s:"BABA", n:"Alibaba",     zone:"em",type:"stock",dedup:"BABA", ter:0,pea:false,cto:true,av:false},
  {s:"TCEHY",n:"Tencent",     zone:"em",type:"stock",dedup:"TCEHY",ter:0,pea:false,cto:true,av:false},
  {s:"JD",   n:"JD.com",      zone:"em",type:"stock",dedup:"JD",   ter:0,pea:false,cto:true,av:false},
  {s:"BIDU", n:"Baidu",       zone:"em",type:"stock",dedup:"BIDU", ter:0,pea:false,cto:true,av:false},
  {s:"SE",   n:"Sea Limited", zone:"em",type:"stock",dedup:"SE",   ter:0,pea:false,cto:true,av:false},
  {s:"MELI", n:"MercadoLibre",zone:"em",type:"stock",dedup:"MELI", ter:0,pea:false,cto:true,av:false},
  {s:"NU",   n:"Nu Holdings", zone:"em",type:"stock",dedup:"NU",   ter:0,pea:false,cto:true,av:false},

  // ── OBLIGATIONS ───────────────────────────────────────────────
  {s:"XGLE.DE",n:"Xtrackers EUR Gov Bond",      zone:"europe",type:"bond",dedup:"EUR_GOV",    ter:0.09,pea:false,cto:true,av:true },
  {s:"IEAG.L", n:"iShares EUR Agg Bond",         zone:"europe",type:"bond",dedup:"EUR_AGG",    ter:0.17,pea:false,cto:true,av:false},
  {s:"AGGH.L", n:"ETF Oblig Aggregate Monde (AGGH)",      zone:"any",   type:"bond",dedup:"GLOBAL_AGG", ter:0.10,pea:false,cto:true,av:false},
  {s:"TLT",    n:"iShares 20Y US Treasury",      zone:"usa",   type:"bond",dedup:"US_20Y",     ter:0.15,pea:false,cto:true,av:false},
  {s:"IEF",    n:"iShares 7-10Y Treasury",       zone:"usa",   type:"bond",dedup:"US_7_10Y",   ter:0.15,pea:false,cto:true,av:false},
  {s:"AGG",    n:"iShares US Aggregate Bond",    zone:"usa",   type:"bond",dedup:"US_AGG",     ter:0.03,pea:false,cto:true,av:false},
  {s:"LQD",    n:"iShares USD IG Corp Bond",     zone:"usa",   type:"bond",dedup:"US_IG",      ter:0.14,pea:false,cto:true,av:false},
  {s:"HYG",    n:"iShares USD High Yield",       zone:"usa",   type:"bond",dedup:"US_HY",      ter:0.48,pea:false,cto:true,av:false},
  {s:"VWOB",   n:"Vanguard EM Gov Bond",         zone:"em",    type:"bond",dedup:"EM_GOV",     ter:0.20,pea:false,cto:true,av:false},

  // ── OR & MATIÈRES ─────────────────────────────────────────────
  // Dedup SÉPARÉS → GLD (US, dans Neon) + SGLD.L (EU) peuvent coexister
  {s:"GLD",    n:"SPDR Gold Shares",             zone:"any",type:"gold",     dedup:"GOLD_US",  ter:0.40,pea:false,cto:true,av:false},
  {s:"IAU",    n:"iShares Gold Trust",           zone:"any",type:"gold",     dedup:"GOLD_US",  ter:0.25,pea:false,cto:true,av:false},
  {s:"SGLD.L", n:"Invesco Physical Gold EUR",    zone:"any",type:"gold",     dedup:"GOLD_EU",  ter:0.12,pea:false,cto:true,av:false},
  {s:"GNR",    n:"SPDR Natural Resources",       zone:"any",type:"commodity",dedup:"NAT_RES",  ter:0.46,pea:false,cto:true,av:false},
  {s:"GSG",    n:"iShares Commodities",          zone:"any",type:"commodity",dedup:"CMDTY",    ter:0.75,pea:false,cto:true,av:false},

  // ── REIT ──────────────────────────────────────────────────────
  {s:"VNQ",   n:"Vanguard US REITs",             zone:"usa",type:"reit",dedup:"US_REITS",      ter:0.12,pea:false,cto:true,av:false},
  {s:"REET",  n:"iShares Global REITs",          zone:"any",type:"reit",dedup:"GLOBAL_REITS",  ter:0.14,pea:false,cto:true,av:false},
  {s:"AMT",   n:"American Tower",               zone:"usa",type:"reit",dedup:"AMT",           ter:0,   pea:false,cto:true,av:false},

  // ── CRYPTO ────────────────────────────────────────────────────
  {s:"BTC-USD",n:"Bitcoin",            zone:"any",type:"crypto",dedup:"BTC",ter:0,   pea:false,cto:false,av:false},
  {s:"ETH-USD",n:"Ethereum",           zone:"any",type:"crypto",dedup:"ETH",ter:0,   pea:false,cto:false,av:false},
  {s:"SOL-USD",n:"Solana",             zone:"any",type:"crypto",dedup:"SOL",ter:0,   pea:false,cto:false,av:false},
  {s:"BNB-USD",n:"BNB",                zone:"any",type:"crypto",dedup:"BNB",ter:0,   pea:false,cto:false,av:false},
  {s:"IBIT",   n:"iShares Bitcoin ETF",zone:"usa", type:"crypto",dedup:"BTC",ter:0.25,pea:false,cto:true, av:false},
  {s:"ETHA",   n:"iShares Ethereum ETF",zone:"usa",type:"crypto",dedup:"ETH",ter:0.25,pea:false,cto:true, av:false},

  // ── ACTIONS USA ───────────────────────────────────────────────
  {s:"AAPL",  n:"Apple",            zone:"usa",type:"stock",dedup:"AAPL", ter:0,pea:false,cto:true,av:false,esg:true},
  {s:"MSFT",  n:"Microsoft",        zone:"usa",type:"stock",dedup:"MSFT", ter:0,pea:false,cto:true,av:false,esg:true},
  {s:"GOOGL", n:"Alphabet",         zone:"usa",type:"stock",dedup:"GOOGL",ter:0,pea:false,cto:true,av:false},
  {s:"AMZN",  n:"Amazon",           zone:"usa",type:"stock",dedup:"AMZN", ter:0,pea:false,cto:true,av:false},
  {s:"NVDA",  n:"NVIDIA",           zone:"usa",type:"stock",dedup:"NVDA", ter:0,pea:false,cto:true,av:false},
  {s:"META",  n:"Meta",             zone:"usa",type:"stock",dedup:"META", ter:0,pea:false,cto:true,av:false},
  {s:"TSLA",  n:"Tesla",            zone:"usa",type:"stock",dedup:"TSLA", ter:0,pea:false,cto:true,av:false},
  {s:"V",     n:"Visa",             zone:"usa",type:"stock",dedup:"V",    ter:0,pea:false,cto:true,av:false},
  {s:"MA",    n:"Mastercard",       zone:"usa",type:"stock",dedup:"MA",   ter:0,pea:false,cto:true,av:false},
  {s:"JNJ",   n:"J&J",              zone:"usa",type:"stock",dedup:"JNJ",  ter:0,pea:false,cto:true,av:false},
  {s:"LLY",   n:"Eli Lilly",        zone:"usa",type:"stock",dedup:"LLY",  ter:0,pea:false,cto:true,av:false},
  {s:"JPM",   n:"JPMorgan",         zone:"usa",type:"stock",dedup:"JPM",  ter:0,pea:false,cto:true,av:false},
  {s:"AVGO",  n:"Broadcom",         zone:"usa",type:"stock",dedup:"AVGO", ter:0,pea:false,cto:true,av:false},
  {s:"ADBE",  n:"Adobe",            zone:"usa",type:"stock",dedup:"ADBE", ter:0,pea:false,cto:true,av:false,esg:true},
  {s:"NOW",   n:"ServiceNow",       zone:"usa",type:"stock",dedup:"NOW",  ter:0,pea:false,cto:true,av:false,esg:true},
  {s:"CRM",   n:"Salesforce",       zone:"usa",type:"stock",dedup:"CRM",  ter:0,pea:false,cto:true,av:false,esg:true},
  {s:"NFLX",  n:"Netflix",          zone:"usa",type:"stock",dedup:"NFLX", ter:0,pea:false,cto:true,av:false},
  {s:"PG",    n:"Procter Gamble",   zone:"usa",type:"stock",dedup:"PG",   ter:0,pea:false,cto:true,av:false},
  {s:"KO",    n:"Coca-Cola",        zone:"usa",type:"stock",dedup:"KO",   ter:0,pea:false,cto:true,av:false},
  {s:"LMT",   n:"Lockheed Martin",  zone:"usa",type:"stock",dedup:"LMT",  ter:0,pea:false,cto:true,av:false,excl_esg:true},
  {s:"XOM",   n:"ExxonMobil",       zone:"usa",type:"stock",dedup:"XOM",  ter:0,pea:false,cto:true,av:false,excl_esg:true},
  {s:"MO",    n:"Altria",           zone:"usa",type:"stock",dedup:"MO",   ter:0,pea:false,cto:true,av:false,excl_esg:true},

  // ── ACTIONS EUROPE PEA ────────────────────────────────────────
  {s:"MC.PA",    n:"LVMH",               zone:"europe",type:"stock",dedup:"MC_PA",   ter:0,pea:true, cto:true,av:true},
  {s:"RMS.PA",   n:"Hermes",             zone:"europe",type:"stock",dedup:"RMS_PA",  ter:0,pea:true, cto:true,av:true},
  {s:"KER.PA",   n:"Kering",             zone:"europe",type:"stock",dedup:"KER_PA",  ter:0,pea:true, cto:true,av:true},
  {s:"AIR.PA",   n:"Airbus",             zone:"europe",type:"stock",dedup:"AIR_PA",  ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"SAF.PA",   n:"Safran",             zone:"europe",type:"stock",dedup:"SAF_PA",  ter:0,pea:true, cto:true,av:true},
  {s:"SAN.PA",   n:"Sanofi",             zone:"europe",type:"stock",dedup:"SAN_PA",  ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"OR.PA",    n:"LOreal",             zone:"europe",type:"stock",dedup:"OR_PA",   ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"SU.PA",    n:"Schneider Electric", zone:"europe",type:"stock",dedup:"SU_PA",   ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"ENGI.PA",  n:"Engie",              zone:"europe",type:"stock",dedup:"ENGI_PA", ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"VIE.PA",   n:"Veolia",             zone:"europe",type:"stock",dedup:"VIE_PA",  ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"ORA.PA",   n:"Orange",             zone:"europe",type:"stock",dedup:"ORA_PA",  ter:0,pea:true, cto:true,av:true},
  {s:"EL.PA",    n:"EssilorLuxottica",   zone:"europe",type:"stock",dedup:"EL_PA",   ter:0,pea:true, cto:true,av:true},
  {s:"BNP.PA",   n:"BNP Paribas",        zone:"europe",type:"stock",dedup:"BNP_PA",  ter:0,pea:true, cto:true,av:true},
  {s:"ASML.AS",  n:"ASML",               zone:"europe",type:"stock",dedup:"ASML_AS", ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"SAP.DE",   n:"SAP",                zone:"europe",type:"stock",dedup:"SAP_DE",  ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"SIE.DE",   n:"Siemens",            zone:"europe",type:"stock",dedup:"SIE_DE",  ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"ALV.DE",   n:"Allianz",            zone:"europe",type:"stock",dedup:"ALV_DE",  ter:0,pea:true, cto:true,av:true},
  {s:"MBG.DE",   n:"Mercedes-Benz",      zone:"europe",type:"stock",dedup:"MBG_DE",  ter:0,pea:true, cto:true,av:true},
  {s:"NOVO-B.CO",n:"Novo Nordisk",       zone:"europe",type:"stock",dedup:"NOVO_CO", ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"NESN.SW",  n:"Nestle",             zone:"europe",type:"stock",dedup:"NESN_SW", ter:0,pea:false,cto:true,av:true,esg:true},
  {s:"NOVN.SW",  n:"Novartis",           zone:"europe",type:"stock",dedup:"NOVN_SW", ter:0,pea:false,cto:true,av:true,esg:true},
  {s:"ROG.SW",   n:"Roche",              zone:"europe",type:"stock",dedup:"ROG_SW",  ter:0,pea:false,cto:true,av:true,esg:true},
];

// Banques — bloquer VOO/SPY/QQQ pour les banques françaises → utiliser UCITS
const BANK_BLOCKED: Record<string,string[]> = {
  "BNP Paribas":      ["VOO","VTI","SPY","QQQ","AGG","TLT","LQD","HYG","IEF","VNQ","GLD","IAU","IEMG","CSPX.L","VFEM.L","AGGH.L"],
  "Societe Generale": ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG","CSPX.L"],
  "Société Générale": ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG","CSPX.L"],
  "LCL":              ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG","CSPX.L"],
  "Credit Agricole":  ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG","CSPX.L"],
  "Crédit Agricole":  ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG","CSPX.L"],
  "Caisse Epargne":   ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG"],
  "Caisse d'Épargne": ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG"],
  "Banque Populaire": ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG"],
  // BoursoBank : bloquer VOO/VTI/SPY → utiliser SXR8.DE/EQQQ.DE (UCITS)
  "BoursoBank":       ["VOO","VTI","SPY","QQQ","CSPX.L"],
  "Fortuneo":         ["VOO","VTI","SPY"],
  "Hello Bank":       ["VOO","VTI","SPY"],
  "Degiro":[],
  "Trade Republic":   [],
  "Interactive Brokers":["PAEEM.PA","AEEM.PA"],
  "Binance / Coinbase":[],
  "Autre":[],
};

function norm(s:string){
  return s.toLowerCase()
    .replace(/[éèêë]/g,"e").replace(/[àâä]/g,"a")
    .replace(/[ùûü]/g,"u").replace(/[îï]/g,"i")
    .replace(/[ôö]/g,"o").replace(/ç/g,"c");
}

function dedup(assets:Asset[]):Asset[]{
  const m=new Map<string,Asset>();
  for(const a of assets){const ex=m.get(a.dedup);if(!ex||a.ter<ex.ter)m.set(a.dedup,a);}
  return [...m.values()];
}

// ══════════════════════════════════════════════════════════════════════
// SÉLECTION UNIVERS v3 — Approche Core-Satellite
// Principe : 1 ETF flagship par zone → jamais 2 ETFs qui se chevauchent
// ══════════════════════════════════════════════════════════════════════
function selectUniverse(answers:Record<string,string>):{
  symbols:string[];minBondPct:number;minGoldPct:number;minReitPct:number;
  minCryptoPct:number;minEMPct:number;riskProfile:string;
}{
  const q1=answers["1"]||"",q2=answers["2"]||"",q3=answers["3"]||"";
  const q4=answers["4"]||"",q5=answers["5"]||"",q6=answers["6"]||"";
  const q7=answers["7"]||"",q8=answers["8"]||"",q9=answers["9"]||"";
  const n5=norm(q5),n6=norm(q6),n4=norm(q4),n7=norm(q7);

  // ── Risque ────────────────────────────────────────────────────────
  const isShort=norm(q1).includes("2 ans")||norm(q1).includes("moins");
  let risk:"defensive"|"moderate"|"balanced"|"aggressive";
  if(q3.includes("10%"))                     risk="defensive";
  else if(q3.includes("20%"))                risk="moderate";
  else if(q3.includes("35%"))                risk="balanced";
  else if(norm(q3).includes("limite"))       risk="aggressive";
  else if(norm(q2).includes("conservateur")) risk="defensive";
  else if(norm(q2).includes("modere"))       risk="moderate";
  else if(norm(q2).includes("agressif"))     risk="aggressive";
  else risk="balanced";
  if(isShort&&(risk==="aggressive"||risk==="balanced"))risk="moderate";

  // ── Support ───────────────────────────────────────────────────────
  const sups=q8.split(",").map(s=>s.trim());
  const wPEA   =sups.some(s=>norm(s).includes("pea"));
  const wCTO   =sups.some(s=>norm(s).includes("cto")||norm(s).includes("compte"));
  const wAV    =sups.some(s=>norm(s).includes("assurance")||norm(s).includes("vie"));
  const wCrypto=sups.some(s=>norm(s).includes("crypto"))||n5.includes("crypto");
  const noSup  =!wPEA&&!wCTO&&!wAV&&!wCrypto;

  // ── Zone ─────────────────────────────────────────────────────────
  const zEM =n6.includes("emergent");
  const zUSA=n6.includes("usa");
  const zEU =n6.includes("europe");
  const zMonde=!zEM&&!zUSA&&!zEU;

  // ── Classes ───────────────────────────────────────────────────────
  const wETF    =n5===""||n5.includes("etf");
  const wStocks =n5.includes("action");
  const wBonds  =n5.includes("oblig");
  const wGold   =n5.includes("or")||n5.includes("matier");
  const wReits  =n5.includes("immob");
  const onlyCrypto=n5.trim()==="crypto";
  const onlyBonds =n5.trim().startsWith("obligation");

  // ── ESG ───────────────────────────────────────────────────────────
  const esgStrict =n4.includes("strict");
  const esgPartial=n4.includes("armement")||n4.includes("tabac");

  // ── Taille cible ──────────────────────────────────────────────────
  const targetN=n7.includes("concentre")||n7.includes("5 actifs")?5
               :n7.includes("large")||n7.includes("15")?16:9;

  const blocked=new Set<string>(BANK_BLOCKED[q9]||[]);

  // ── Helper : choisir le premier actif disponible ──────────────────
  const pick=(...syms:string[]):Asset|null=>{
    for(const s of syms){
      const a=CAT.find(x=>x.s===s);
      if(!a||blocked.has(s))continue;
      if(esgStrict&&!a.esg)continue;
      if(esgPartial&&a.excl_esg)continue;
      if(!noSup){
        const ok=(wPEA&&a.pea)||(wCTO&&a.cto)||(wAV&&a.av)||(wCrypto&&a.type==="crypto");
        if(!ok)continue;
      }
      return a;
    }
    return null;
  };

  const universe:Asset[]=[];
  const add=(a:Asset|null)=>{if(a&&!universe.find(u=>u.s===a.s))universe.push(a);};

  // ══════════════════════════════════════════════════════════════════
  // CAS 1 : CRYPTO SEULE
  // ══════════════════════════════════════════════════════════════════
  if(onlyCrypto||(wCrypto&&!wETF&&!wStocks&&!wBonds&&!wGold&&!wReits)){
    const cr=dedup(CAT.filter(a=>a.type==="crypto"&&!blocked.has(a.s)));
    const syms=cr.map(a=>a.s).slice(0,targetN);
    return{symbols:syms,minBondPct:0,minGoldPct:0,minReitPct:0,
           minCryptoPct:30,minEMPct:0,riskProfile:risk};
  }

  // ══════════════════════════════════════════════════════════════════
  // CAS 2 : OBLIGATIONS SEULES
  // ══════════════════════════════════════════════════════════════════
  if(onlyBonds){
    // Obligations EUR prioritaires pour AV/PEA, USD si CTO seul
    const eurBonds=["XGLE.DE","IEAG.L","IBGS.L","IEGE.L","VGOV.L","AGGH.L"];
    const usdBonds=["AGG","IEF","TLT","LQD","VWOB"];
    const useUSD=wCTO&&!wPEA&&!wAV&&!zEU&&!zMonde;
    const preferred=zEM?["VWOB","IEAG.L","XGLE.DE"]:useUSD?usdBonds:eurBonds;
    for(const s of preferred){const a=pick(s);if(a)universe.push(a);}
    if(universe.length<3){
      for(const s of [...eurBonds,...usdBonds]){const a=pick(s);add(a);}
    }
    const syms=universe.slice(0,targetN).map(a=>a.s);
    return{symbols:syms,minBondPct:60,minGoldPct:0,minReitPct:0,
           minCryptoPct:0,minEMPct:0,riskProfile:risk};
  }

  // ══════════════════════════════════════════════════════════════════
  // CAS 3 : PORTEFEUILLE STANDARD
  // ══════════════════════════════════════════════════════════════════

  // ── CORE : 1 ETF flagship par zone ────────────────────────────────
  // Règle absolue : jamais deux ETFs sur le même sous-jacent
  if(wETF||(!wStocks&&!wBonds)){
    let flagship:Asset|null=null;

    if(zEM){
      if(esgStrict) flagship=pick("ESGE","AEEM.PA");
      else flagship=pick(
        wPEA?"PAEEM.PA":"x",  // PEA EM
        "IEMG","PAEEM.PA","VWO"  // CTO EM
      );
    } else if(zUSA){
      if(esgStrict) flagship=pick("SUSL");
      else flagship=pick(
        wPEA?"PE500.PA":"x",wPEA?"PSP5.PA":"x",wPEA?"ESE.PA":"x",
        "SXR8.DE","CSPX.L","VOO"
      );
    } else if(zEU){
      if(esgStrict) flagship=pick("IUES.L","SUWS.L");
      else flagship=pick(
        wPEA?"MEUD.PA":"x",wPEA?"C50.PA":"x",wPEA?"SMEA.PA":"x",
        "EXW1.DE","MEUD.PA"
      );
    } else { // monde — logique core-satellite selon profil
      if(esgStrict){
        flagship=pick(wPEA?"PANX.PA":"x","MWRD.L","HMWO.L","SUWS.L");
      } else if(risk==="aggressive"){
        // Agressif : sous-indices directs, plus de rendement, moins de dilution
        // Pas d'ETF monde — on va chercher SP500 + NASDAQ + EM
        flagship=pick(
          wPEA?"PE500.PA":"x",   // SP500 PEA
          "SXR8.DE","CSPX.L","VOO" // SP500 CTO/AV
        );
      } else if(risk==="balanced"){
        // Dynamique : ETF monde + 1 satellite SP500
        flagship=pick(
          wPEA?"PANX.PA":"x",wPEA?"CW8.PA":"x",
          wAV?"VWCE.DE":"x","VWCE.DE","PANX.PA","EUNL.DE"
        );
      } else {
        // Défensif/Modéré : ETF monde pur, large diversification, faible coût
        flagship=pick(
          wPEA?"PANX.PA":"x",wPEA?"CW8.PA":"x",
          wAV?"VWCE.DE":"x","VWCE.DE","PANX.PA","EUNL.DE"
        );
      }
    }

    add(flagship);

    // ── SATELLITE 1 : Complément EM pour zone monde ────────────────
    if(zMonde&&!esgStrict&&targetN>=8){
      const emComp=pick(wPEA?"PAEEM.PA":"x","IEMG","PAEEM.PA","VWO");
      if(emComp&&flagship&&emComp.dedup!==flagship.dedup)add(emComp);
    }

    // ── SATELLITE 2 : SP500 ou NASDAQ pour profil agressif monde ───
    // Agressif : flagship=SP500, on ajoute NASDAQ comme satellite
    if(zMonde&&risk==="aggressive"&&!esgStrict&&targetN>=8){
      const nasdaq=pick(wPEA?"PUST.PA":"x","EQQQ.DE","QQQ");
      if(nasdaq&&flagship&&nasdaq.dedup!==flagship.dedup)add(nasdaq);
    }
    // Dynamique monde : ETF monde + satellite SP500 pour surpondérer USA
    if(zMonde&&risk==="balanced"&&!esgStrict&&targetN>=8){
      const sp=pick(wPEA?"PE500.PA":"x","SXR8.DE","VOO");
      if(sp&&flagship&&sp.dedup!==flagship.dedup)add(sp);
    }

    // ── SATELLITE 3 : NASDAQ pour zone USA ───────────────────────────
    if(zUSA&&risk!=="defensive"&&risk!=="moderate"&&targetN>=8&&!esgStrict){
      const nasdaq=pick(wPEA?"PUST.PA":"x","EQQQ.DE","QQQ");
      if(nasdaq&&flagship&&nasdaq.dedup!==flagship.dedup)add(nasdaq);
    }

    // ── SATELLITE 3 : Compléments pour large diversification ──────
    if(targetN>=15&&!esgStrict){
      // Small cap Europe
      const sc=pick(wPEA?"EESM.PA":"x","ZPRX.DE","WSML.L");
      add(sc);
      // Dividendes monde (seulement CTO)
      if(!wPEA){
        const div=pick("VHYL.L","IDVY.L","WQDV.L");
        add(div);
      }
    }
  }

  // ── OBLIGATIONS ───────────────────────────────────────────────────
  // Ajout selon profil : defensif→3 bonds, moderate→1-2, agressif→0 sauf si demandé
  const nBonds=onlyBonds?targetN
    :risk==="defensive"?Math.min(3,targetN-universe.length)
    :risk==="moderate"&&(wBonds||targetN>=8)?Math.min(2,targetN-universe.length)
    :wBonds?Math.min(2,targetN-universe.length):0;

  if(nBonds>0){
    // Sélection bonds adaptée au contexte
    const isEurContext=wPEA||wAV||zEU||zMonde;
    const isUSDContext=wCTO&&!wAV&&!wPEA&&(zUSA||!isEurContext);

    if(zEM){
      add(pick("VWOB"));if(universe.filter(a=>a.type==="bond").length<nBonds)add(pick("IEAG.L","XGLE.DE"));
    } else if(isUSDContext){
      const us=["AGG","IEF","TLT","LQD"];for(const s of us){if(universe.filter(a=>a.type==="bond").length<nBonds)add(pick(s));}
    } else {
      // EUR bonds prioritaires
      const eu=risk==="defensive"
        ?["IBGS.L","IEGE.L","XGLE.DE","IEAG.L"]
        :["XGLE.DE","IEAG.L","IBGS.L"];
      for(const s of eu){if(universe.filter(a=>a.type==="bond").length<nBonds)add(pick(s));}
    }
  }

  // ── OR ────────────────────────────────────────────────────────────
  if(wGold){
    add(pick(wPEA?"x":"SGLD.L",wCTO&&!wPEA?"IAU":"x","GLD"));
  }

  // ── IMMOBILIER ────────────────────────────────────────────────────
  if(wReits){
    add(pick(wPEA?"EPRE.PA":"x","REET",zUSA?"VNQ":"REET"));
  }

  // ── CRYPTO ────────────────────────────────────────────────────────
  if(wCrypto){
    const cr=dedup(CAT.filter(a=>a.type==="crypto"&&!blocked.has(a.s)));
    cr.slice(0,2).forEach(a=>{add(a);});
  }

  // ── ACTIONS INDIVIDUELLES ─────────────────────────────────────────
  // Seulement si explicitement demandées ET si elles n'overlappent pas le flagship
  if(wStocks&&universe.length<targetN){
    // Stocks exclus car déjà dans l'ETF flagship
    const OVERLAP:Record<string,string[]>={
      "PANX.PA":["AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA"],
      "CW8.PA": ["AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA"],
      "VWCE.DE":["AAPL","MSFT","NVDA","GOOGL","AMZN","META"],
      "EUNL.DE":["ASML.AS","SAP.DE","SIE.DE","NOVO-B.CO","ROG.SW"],
      "MEUD.PA":["ASML.AS","SAP.DE","SIE.DE","AIR.PA","OR.PA","SAN.PA","ALV.DE","MC.PA"],
      "C50.PA": ["ASML.AS","SAP.DE","SIE.DE","AIR.PA","OR.PA","SAN.PA","ALV.DE","MC.PA"],
      "EXW1.DE":["ASML.AS","SAP.DE","SIE.DE","NOVO-B.CO","ROG.SW","NESN.SW"],
      "SXR8.DE":["AAPL","MSFT","NVDA","GOOGL","AMZN","META"],
      "PE500.PA":["AAPL","MSFT","NVDA","GOOGL","AMZN","META"],
      "IEMG":   ["TCEHY","BABA","SE","BIDU","NU"],
      "VWO":    ["TCEHY","BABA","SE"],
      "PAEEM.PA":["TCEHY","BABA"],
    };
    const excluded=new Set<string>();
    universe.forEach(a=>{(OVERLAP[a.s]||[]).forEach(s=>excluded.add(s));});

    const stocks=CAT.filter(a=>{
      if(a.type!=="stock")return false;
      if(universe.find(u=>u.s===a.s))return false;
      if(excluded.has(a.s))return false;
      if(blocked.has(a.s))return false;
      if(esgStrict&&!a.esg)return false;
      if(esgPartial&&a.excl_esg)return false;
      if(!noSup){const ok=(wPEA&&a.pea)||(wCTO&&a.cto)||(wAV&&a.av);if(!ok)return false;}
      // Zone matching
      if(zEM &&a.zone!=="em") return false;
      if(zUSA&&a.zone!=="usa")return false;
      if(zEU &&a.zone!=="europe")return false;
      // Défensif : pas d'actions volatiles
      if(risk==="defensive"&&["TSLA","NVDA","META","KWEB","BABA","SE"].includes(a.s))return false;
      return true;
    });

    const maxStocks=Math.min(targetN-universe.length, targetN>=15?10:6);
    stocks.slice(0,maxStocks).forEach(a=>add(a));
  }

  // ── FALLBACK si trop peu d'actifs ─────────────────────────────────
  if(universe.length<3){
    ["PANX.PA","VWCE.DE","SXR8.DE","MEUD.PA","XGLE.DE"].forEach(s=>{
      const a=CAT.find(x=>x.s===s);if(a&&!blocked.has(s)&&!universe.find(u=>u.s===s))universe.push(a);
    });
  }

  const symbols=universe.slice(0,targetN).map(a=>a.s);

  // ── Contraintes Markowitz ─────────────────────────────────────────
  const minBondPct=onlyBonds?70:risk==="defensive"?30:risk==="moderate"&&wBonds?15:wBonds?10:0;
  const minGoldPct=wGold?6:0;
  const minReitPct=wReits?5:0;
  const minCryptoPct=wCrypto&&!onlyCrypto?5:0;
  const minEMPct=zEM?35:0;

  // ── Disclaimer ESG ──────────────────────────────────────────────
  let disclaimer:string|undefined;
  if(esgStrict){
    const hasESGEtf=universe.some(a=>a.esg&&a.type==="etf");
    if(!hasESGEtf&&wPEA){
      disclaimer="AVERTISSEMENT: Aucun ETF MSCI World SRI éligible PEA n'existe à ce jour. Ce portefeuille applique un filtre ESG sur les actions individuelles PEA disponibles. Pour une exposition ETF ESG pure, un CTO avec MWRD.L ou SUWS.L serait plus adapté.";
    } else if(!hasESGEtf){
      disclaimer="AVERTISSEMENT: Le filtre ESG strict est applique sur les actions disponibles. Les criteres ESG varient selon les emetteurs - ce portefeuille exclut les secteurs armement, tabac et combustibles fossiles.";
    }
  }
  console.log("[v3] z="+q6+"|risk="+risk+"|esg="+q4+" -> ["+symbols.join(",")+"]");
  return{symbols,minBondPct,minGoldPct,minReitPct,minCryptoPct,minEMPct,riskProfile:risk,disclaimer};
}

async function fetchReturns(symbols:string[],years=10):Promise<Record<string,number[]>>{
  const start=new Date();start.setFullYear(start.getFullYear()-years);
  const client=await pool.connect();
  try{
    const{rows}=await client.query(
      `SELECT symbol,date,close FROM assets_history WHERE symbol=ANY($1) AND date>=$2 ORDER BY symbol,date ASC`,
      [symbols,start.toISOString().split("T")[0]]
    );
    const prices:Record<string,number[]>={};
    rows.forEach(r=>{if(!prices[r.symbol])prices[r.symbol]=[];prices[r.symbol].push(parseFloat(r.close));});
    const returns:Record<string,number[]>={};
    Object.entries(prices).forEach(([sym,p])=>{if(p.length>20)returns[sym]=p.slice(1).map((c,i)=>(c-p[i])/p[i]);});
    return returns;
  }finally{client.release();}
}

async function fetchMeta(symbols:string[]):Promise<Record<string,{name:string;type:string}>>{
  const client=await pool.connect();
  try{
    const{rows}=await client.query(`SELECT symbol,name,type FROM assets_master WHERE symbol=ANY($1)`,[symbols]);
    const meta:Record<string,{name:string;type:string}>={};
    CAT.forEach(a=>{meta[a.s]={name:a.n,type:a.type};});
    rows.forEach(r=>{if(!meta[r.symbol])meta[r.symbol]={name:r.name,type:r.type};});
    return meta;
  }finally{client.release();}
}

// ════════════════════════════════════════════════════════════════════
// OPTIMISEUR MARKOWITZ v3 — Monte Carlo + Gradient Ascent
// Contraintes dures : bonds selon profil, stocks max 12%, geo max 55%
// ════════════════════════════════════════════════════════════════════

function projectSimplex(w:number[],wMin:number[],wMax:number[]):number[]{
  const N=w.length;w=[...w];
  for(let iter=0;iter<80;iter++){
    // Appliquer bornes min
    let ex=0;for(let i=0;i<N;i++){if(w[i]<wMin[i]){ex+=wMin[i]-w[i];w[i]=wMin[i];}}
    const f1=w.map((v,i)=>v>wMin[i]?i:-1).filter(i=>i>=0);
    if(f1.length>0&&ex>0){const e=ex/f1.length;f1.forEach(i=>{w[i]=Math.max(wMin[i],w[i]-e);});}
    // Appliquer bornes max
    let ov=0;for(let i=0;i<N;i++){if(w[i]>wMax[i]){ov+=w[i]-wMax[i];w[i]=wMax[i];}}
    const f2=w.map((v,i)=>v<wMax[i]?i:-1).filter(i=>i>=0);
    if(f2.length>0&&ov>0){const e=ov/f2.length;f2.forEach(i=>{w[i]=Math.min(wMax[i],w[i]+e);});}
    // Normaliser
    const s=w.reduce((a,b)=>a+b,0);if(s>0)for(let i=0;i<N;i++)w[i]/=s;
    if(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-9)break;
  }
  return w;
}

function markowitz(
  returns:Record<string,number[]>,
  method:"minvariance"|"maxsharpe"|"maxutility",
  minClass:Record<string,number>,
  maxWeight=0.28,
  rfRate=0.03,
  riskProfile="balanced"
){
  const syms=Object.keys(returns);const N=syms.length;
  if(N<2)return{weights:{} as Record<string,number>,ret:0,vol:0,sharpe:0,var95:0};
  const T=Math.min(...syms.map(s=>returns[s].length));

  // ── Moments historiques annualisés ──────────────────────────────
  const mu=syms.map(s=>(returns[s].slice(0,T).reduce((a,b)=>a+b,0)/T)*52);
  const cov:number[][]=Array.from({length:N},()=>new Array(N).fill(0));
  for(let i=0;i<N;i++)for(let j=i;j<N;j++){
    const ri=returns[syms[i]].slice(0,T),rj=returns[syms[j]].slice(0,T);
    const mi=ri.reduce((a,b)=>a+b,0)/T,mj=rj.reduce((a,b)=>a+b,0)/T;
    let cv=0;for(let t=0;t<T;t++)cv+=(ri[t]-mi)*(rj[t]-mj);
    cov[i][j]=cov[j][i]=(cv/(T-1))*52;
  }

  // ── Contraintes de poids ─────────────────────────────────────────
  const wMin=syms.map(s=>(minClass[s]||0)/100);
  const assetTypes=syms.map(s=>CAT.find(a=>a.s===s)?.type||"etf");
  const wMax=syms.map((_,i)=>{
    if(assetTypes[i]==="stock")return Math.min(maxWeight,0.12);
    if(assetTypes[i]==="crypto")return Math.min(maxWeight,0.25);
    return maxWeight;
  });

  // Contraintes bonds selon profil
  const bondIdxs=syms.map((s,i)=>assetTypes[i]==="bond"?i:-1).filter(i=>i>=0);
  if(bondIdxs.length>0){
    const minBondShare=riskProfile==="defensive"?0.30:riskProfile==="moderate"?0.12:0;
    const sharePerBond=minBondShare/bondIdxs.length;
    bondIdxs.forEach(i=>{if(wMin[i]<sharePerBond)wMin[i]=sharePerBond;});
    // Cap bonds pour profil agressif
    if(riskProfile==="aggressive"){
      bondIdxs.forEach(i=>{wMax[i]=Math.min(wMax[i],0.08);});
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────
  const pRet=(w:number[])=>w.reduce((a,x,i)=>a+x*mu[i],0);
  const pVar=(w:number[])=>{let v=0;for(let i=0;i<N;i++)for(let j=0;j<N;j++)v+=w[i]*w[j]*cov[i][j];return v;};
  const pVol=(w:number[])=>Math.sqrt(Math.max(0,pVar(w)));
  const covW=(w:number[])=>cov.map(row=>row.reduce((a,x,j)=>a+x*w[j],0));

  const score=(w:number[])=>{
    const r=pRet(w),v=pVar(w),vol=Math.sqrt(Math.max(0,v));
    if(method==="minvariance")return -v;
    if(method==="maxsharpe")return vol>0?(r-rfRate)/vol:-999;
    return r-0.5*v;
  };

  const gradient=(w:number[])=>{
    const r=pRet(w),v=pVar(w),vol=Math.sqrt(Math.max(0,v));
    const sw=covW(w);
    if(method==="minvariance")return sw.map(x=>-2*x);
    if(method==="maxsharpe"){
      if(vol<1e-10)return mu.map(x=>x-rfRate);
      const sh=(r-rfRate)/vol;
      return mu.map((m,i)=>(m-sh*sw[i]/vol)/vol);
    }
    return mu.map((m,i)=>m-sw[i]);
  };

  // ── Initialisations intelligentes ────────────────────────────────
  const inits:number[][]=[];
  // 1. Uniforme
  inits.push(projectSimplex(new Array(N).fill(1/N),wMin,wMax));
  // 2. Pondéré par mu positif
  const muP=mu.map(m=>Math.max(m,0.01));const muS=muP.reduce((a,b)=>a+b,0);
  inits.push(projectSimplex(muP.map(x=>x/muS),wMin,wMax));
  // 3. Min variance (inverse vol)
  const vols=syms.map((_,i)=>Math.sqrt(Math.max(0,cov[i][i]))||0.1);
  const invV=vols.map(v=>1/v);const ivS=invV.reduce((a,b)=>a+b,0);
  inits.push(projectSimplex(invV.map(x=>x/ivS),wMin,wMax));

  // ── Monte Carlo : 5000 trials ─────────────────────────────────────
  let bestW=inits[0],bestScore=score(bestW);
  const topK:number[][]=[];
  inits.forEach(w=>{const s=score(w);if(s>bestScore){bestScore=s;bestW=[...w];}topK.push([...w]);});

  for(let t=0;t<5000;t++){
    let w:number[];
    if(t<2500){
      const raw=syms.map(()=>Math.random());const s=raw.reduce((a,b)=>a+b,0);
      w=projectSimplex(raw.map(x=>x/s),wMin,wMax);
    } else {
      // Perturbation des meilleurs
      const base=topK[t%Math.min(topK.length,15)];
      const noisy=base.map(x=>Math.max(0,x+(Math.random()-0.5)*0.15));
      const s=noisy.reduce((a,b)=>a+b,0);
      w=projectSimplex(noisy.map(x=>x/s),wMin,wMax);
    }
    const sc=score(w);
    if(sc>bestScore){bestScore=sc;bestW=[...w];}
    if(topK.length<20||sc>score(topK[topK.length-1])){
      topK.push([...w]);topK.sort((a,b)=>score(b)-score(a));
      if(topK.length>20)topK.pop();
    }
  }

  // ── Gradient Ascent : 10 départs × 200 steps ─────────────────────
  const starts=[...topK.slice(0,10),[...bestW],...inits];
  for(const start of starts){
    let w=[...start],lr=0.04,prev=score(w);
    for(let s=0;s<200;s++){
      const g=gradient(w);
      const gn=Math.sqrt(g.reduce((a,b)=>a+b*b,0));
      if(gn<1e-9)break;
      const step=g.map(x=>x/gn);
      const wNew=projectSimplex(w.map((x,i)=>x+lr*step[i]),wMin,wMax);
      const ns=score(wNew);
      if(ns>prev){w=wNew;prev=ns;lr=Math.min(lr*1.05,0.25);if(ns>bestScore){bestScore=ns;bestW=[...w];}}
      else{lr*=0.55;if(lr<1e-6)break;}
    }
  }

  // ── Pruning positions < 1.5% ─────────────────────────────────────
  const pruned=bestW.map(x=>x<0.008?0:x);
  const ps=pruned.reduce((a,b)=>a+b,0);
  const finalW=ps>0.5?projectSimplex(pruned.map(x=>x/ps),wMin,wMax):bestW;

  // ── Résultats ────────────────────────────────────────────────────
  const fRet=pRet(finalW),fVol=pVol(finalW);
  const fSharpe=fVol>0?(fRet-rfRate)/fVol:0;
  const portR:number[]=[];
  for(let t=0;t<T;t++){let pr=0;syms.forEach((s,i)=>{pr+=finalW[i]*(returns[s][t]||0);});portR.push(pr);}
  portR.sort((a,b)=>a-b);
  const var95=Math.abs(portR[Math.floor(portR.length*0.05)]||0)*Math.sqrt(52);
  const weights:Record<string,number>={};
  syms.forEach((s,i)=>{if(finalW[i]>0.005)weights[s]=finalW[i];});
  return{weights,ret:fRet,vol:fVol,sharpe:fSharpe,var95};
}

type Result={method:string;label:string;ret:number;vol:number;sharpe:number;var95:number;rec?:boolean;weights:Weight[];frontier:FPt[]};

export async function POST(req:NextRequest){
  const{capital=50000,answers={}}=await req.json();
  try{
    const{symbols,minBondPct,minGoldPct,minReitPct,minCryptoPct,minEMPct,riskProfile,disclaimer}=selectUniverse(answers);
    const returns=await fetchReturns(symbols,15);
    const validSyms=Object.keys(returns);
    if(validSyms.length<3)return NextResponse.json({error:"Pas assez de donnees historiques pour ce profil"},{status:500});
    const meta=await fetchMeta(validSyms);
    const bondSyms  =validSyms.filter(s=>CAT.find(a=>a.s===s)?.type==="bond");
    const goldSyms  =validSyms.filter(s=>CAT.find(a=>a.s===s&&(a.type==="gold"||a.type==="commodity")));
    const reitSyms  =validSyms.filter(s=>CAT.find(a=>a.s===s&&a.type==="reit"));
    const cryptoSyms=validSyms.filter(s=>CAT.find(a=>a.s===s&&a.type==="crypto"));
    const distrib=(syms:string[],pct:number)=>{if(!syms.length||!pct)return{};const r:Record<string,number>={};syms.forEach(s=>{r[s]=pct/syms.length;});return r;};
    const emSyms=validSyms.filter(s=>CAT.find(a=>a.s===s&&(a.zone==="em")));
    const minClass={...distrib(bondSyms,minBondPct),...distrib(goldSyms,minGoldPct),...distrib(reitSyms,minReitPct),...distrib(cryptoSyms,minCryptoPct),...distrib(emSyms,minEMPct)};
    const frontier:FPt[]=[];
    const methods:Array<["minvariance"|"maxsharpe"|"maxutility",string,boolean]>=[["minvariance","Variance Minimale",false],["maxsharpe","Sharpe Maximum",true],["maxutility","Utilite Maximale",false]];
    const results:Result[]=methods.map(([method,label,rec])=>{
      const opt=markowitz(returns,method,minClass,0.32,0.03,riskProfile);
      const rawW=Object.entries(opt.weights).filter(([,v])=>v>0.005).sort((a,b)=>b[1]-a[1]);
      const totalW=rawW.reduce((s,[,v])=>s+v,0);
      const weights:Weight[]=rawW.map(([sym,w],i)=>({
        symbol:sym,name:meta[sym]?.name||sym,type:meta[sym]?.type||"etf",
        weight:i===rawW.length-1?Math.round((1-rawW.slice(0,-1).reduce((s,[,v])=>s+v/totalW,0))*1000)/10:Math.round(w/totalW*1000)/10,
        amount:Math.round(w/totalW*capital),
      }));
      return{method,label,rec,ret:Math.round(opt.ret*1000)/10,vol:Math.round(opt.vol*1000)/10,sharpe:Math.round(opt.sharpe*100)/100,var95:Math.round(opt.var95*1000)/10,weights,frontier};
    });
    return NextResponse.json({results,universe:validSyms.length,...(disclaimer?{disclaimer}:{})});
  }catch(err){console.error("Optimize error:",err);return NextResponse.json({error:"Erreur serveur"},{status:500});}
}
