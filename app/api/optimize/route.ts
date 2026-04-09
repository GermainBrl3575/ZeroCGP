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
   CATALOGUE v5 — (inchangé, copié tel quel)
   ═══════════════════════════════════════════════════════ */
const CAT: Asset[] = [
  // ── ETF MONDE ─────────────────────────────────────────────────
  {s:"PANX.PA",  n:"ETF MSCI World PEA (PANX)",       zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.12,pea:true, cto:true, av:true },
  {s:"CW8.PA",   n:"Amundi MSCI World Swap PEA",    zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.12,pea:true, cto:true, av:true },
  {s:"EWLD.PA",  n:"Amundi MSCI World Swap Dist PEA",zone:"monde",type:"etf",dedup:"MSCI_WORLD", ter:0.12,pea:true, cto:true, av:true },
  {s:"PE500.PA", n:"ETF SP500 PEA (PE500)",   zone:"usa",  type:"etf",dedup:"SP500",    ter:0.15,pea:true, cto:true, av:true },
  {s:"PSP5.PA",  n:"Amundi PEA S&P 500 UCITS",      zone:"usa",  type:"etf",dedup:"SP500",    ter:0.15,pea:true, cto:true, av:true },
  {s:"ESE.PA",   n:"BNP Easy S&P 500 UCITS",        zone:"usa",  type:"etf",dedup:"SP500",    ter:0.15,pea:true, cto:true, av:true },
  {s:"PUST.PA",  n:"ETF NASDAQ-100 PEA (PUST)",   zone:"usa",  type:"etf",dedup:"NASDAQ100",   ter:0.23,pea:true, cto:true, av:true },
  {s:"IWDA.AS",  n:"iShares MSCI World",           zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.20,pea:false,cto:true, av:false},
  {s:"EUNL.DE",  n:"iShares MSCI World EUR",       zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.20,pea:false,cto:true, av:true },
  {s:"VWCE.DE",  n:"Vanguard FTSE All-World",      zone:"monde",type:"etf",dedup:"FTSE_ALLWORLD", ter:0.22,pea:false,cto:true, av:true },
  {s:"ACWI",     n:"iShares MSCI ACWI",            zone:"monde",type:"etf",dedup:"MSCI_ACWI",     ter:0.32,pea:false,cto:true, av:false},
  {s:"MWRD.L",   n:"iShares MSCI World SRI",       zone:"monde",type:"etf",dedup:"MSCI_WORLD_SRI",ter:0.20,pea:false,cto:true, av:false,esg:true},
  {s:"SXR8.DE",  n:"iShares S&P 500 EUR",          zone:"usa",  type:"etf",dedup:"SP500",         ter:0.07,pea:false,cto:true, av:true },
  {s:"CSPX.L",   n:"iShares Core S&P 500",         zone:"usa",  type:"etf",dedup:"SP500",         ter:0.07,pea:false,cto:true, av:false},
  {s:"VOO",      n:"Vanguard S&P 500",             zone:"usa",  type:"etf",dedup:"SP500",         ter:0.03,pea:false,cto:true, av:false},
  {s:"SPY",      n:"SPDR S&P 500",                 zone:"usa",  type:"etf",dedup:"SP500",         ter:0.095,pea:false,cto:true,av:false},
  {s:"VTI",      n:"Vanguard Total US Market",     zone:"usa",  type:"etf",dedup:"SP500",         ter:0.03,pea:false,cto:true, av:false},
  {s:"EQQQ.DE",  n:"Invesco NASDAQ 100 EUR",       zone:"usa",  type:"etf",dedup:"NASDAQ100",     ter:0.30,pea:false,cto:true, av:true },
  {s:"QQQ",      n:"Invesco NASDAQ 100",           zone:"usa",  type:"etf",dedup:"NASDAQ100",     ter:0.20,pea:false,cto:true, av:false},
  {s:"MEUD.PA",  n:"Lyxor Euro Stoxx 50 PEA",     zone:"europe",type:"etf",dedup:"EUROSTOXX50",  ter:0.07,pea:true, cto:true, av:true },
  {s:"C50.PA",   n:"Amundi Euro Stoxx 50 PEA",    zone:"europe",type:"etf",dedup:"EUROSTOXX50",  ter:0.10,pea:true, cto:true, av:true },
  {s:"EXSA.DE",  n:"iShares Euro Stoxx 50",        zone:"europe",type:"etf",dedup:"EUROSTOXX50",  ter:0.10,pea:true, cto:true, av:true },
  {s:"SMEA.PA",  n:"Amundi MSCI Europe PEA",       zone:"europe",type:"etf",dedup:"MSCI_EUROPE",  ter:0.15,pea:true, cto:true, av:true },
  {s:"EXW1.DE",  n:"iShares MSCI Europe",          zone:"europe",type:"etf",dedup:"MSCI_EUROPE",  ter:0.12,pea:false,cto:true, av:true },
  {s:"EPRE.PA",  n:"AXA Europe Real Estate PEA",  zone:"europe",type:"reit",dedup:"EU_REITS",    ter:0.40,pea:true, cto:true, av:true },
  {s:"IPRP.L",   n:"iShares Europe Property",      zone:"europe",type:"reit",dedup:"EU_REITS",    ter:0.40,pea:false,cto:true, av:false},
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
  {s:"BABA", n:"Alibaba",     zone:"em",type:"stock",dedup:"BABA", ter:0,pea:false,cto:true,av:false},
  {s:"TCEHY",n:"Tencent",     zone:"em",type:"stock",dedup:"TCEHY",ter:0,pea:false,cto:true,av:false},
  {s:"JD",   n:"JD.com",      zone:"em",type:"stock",dedup:"JD",   ter:0,pea:false,cto:true,av:false},
  {s:"BIDU", n:"Baidu",       zone:"em",type:"stock",dedup:"BIDU", ter:0,pea:false,cto:true,av:false},
  {s:"SE",   n:"Sea Limited", zone:"em",type:"stock",dedup:"SE",   ter:0,pea:false,cto:true,av:false},
  {s:"MELI", n:"MercadoLibre",zone:"em",type:"stock",dedup:"MELI", ter:0,pea:false,cto:true,av:false},
  {s:"NU",   n:"Nu Holdings", zone:"em",type:"stock",dedup:"NU",   ter:0,pea:false,cto:true,av:false},
  {s:"XGLE.DE",n:"Xtrackers EUR Gov Bond",      zone:"europe",type:"bond",dedup:"EUR_GOV",    ter:0.09,pea:false,cto:true,av:true },
  {s:"IEAG.L", n:"iShares EUR Agg Bond",         zone:"europe",type:"bond",dedup:"EUR_AGG",    ter:0.17,pea:false,cto:true,av:false},
  {s:"AGGH.L", n:"ETF Oblig Aggregate Monde (AGGH)",      zone:"any",   type:"bond",dedup:"GLOBAL_AGG", ter:0.10,pea:false,cto:true,av:false},
  {s:"TLT",    n:"iShares 20Y US Treasury",      zone:"usa",   type:"bond",dedup:"US_20Y",     ter:0.15,pea:false,cto:true,av:false},
  {s:"IEF",    n:"iShares 7-10Y Treasury",       zone:"usa",   type:"bond",dedup:"US_7_10Y",   ter:0.15,pea:false,cto:true,av:false},
  {s:"AGG",    n:"iShares US Aggregate Bond",    zone:"usa",   type:"bond",dedup:"US_AGG",     ter:0.03,pea:false,cto:true,av:false},
  {s:"LQD",    n:"iShares USD IG Corp Bond",     zone:"usa",   type:"bond",dedup:"US_IG",      ter:0.14,pea:false,cto:true,av:false},
  {s:"HYG",    n:"iShares USD High Yield",       zone:"usa",   type:"bond",dedup:"US_HY",      ter:0.48,pea:false,cto:true,av:false},
  {s:"VWOB",   n:"Vanguard EM Gov Bond",         zone:"em",    type:"bond",dedup:"EM_GOV",     ter:0.20,pea:false,cto:true,av:false},
  {s:"GLD",    n:"SPDR Gold Shares",             zone:"any",type:"gold",     dedup:"GOLD_US",  ter:0.40,pea:false,cto:true,av:false},
  {s:"IAU",    n:"iShares Gold Trust",           zone:"any",type:"gold",     dedup:"GOLD_US",  ter:0.25,pea:false,cto:true,av:false},
  {s:"SGLD.L", n:"Invesco Physical Gold EUR",    zone:"any",type:"gold",     dedup:"GOLD_EU",  ter:0.12,pea:false,cto:true,av:false},
  {s:"GNR",    n:"SPDR Natural Resources",       zone:"any",type:"commodity",dedup:"NAT_RES",  ter:0.46,pea:false,cto:true,av:false},
  {s:"GSG",    n:"iShares Commodities",          zone:"any",type:"commodity",dedup:"CMDTY",    ter:0.75,pea:false,cto:true,av:false},
  {s:"VNQ",   n:"Vanguard US REITs",             zone:"usa",type:"reit",dedup:"US_REITS",      ter:0.12,pea:false,cto:true,av:false},
  {s:"REET",  n:"iShares Global REITs",          zone:"any",type:"reit",dedup:"GLOBAL_REITS",  ter:0.14,pea:false,cto:true,av:false},
  {s:"AMT",   n:"American Tower",               zone:"usa",type:"reit",dedup:"AMT",           ter:0,   pea:false,cto:true,av:false},
  {s:"BTC-USD",n:"Bitcoin",            zone:"any",type:"crypto",dedup:"BTC",ter:0,   pea:false,cto:false,av:false},
  {s:"ETH-USD",n:"Ethereum",           zone:"any",type:"crypto",dedup:"ETH",ter:0,   pea:false,cto:false,av:false},
  {s:"SOL-USD",n:"Solana",             zone:"any",type:"crypto",dedup:"SOL",ter:0,   pea:false,cto:false,av:false},
  {s:"BNB-USD",n:"BNB",                zone:"any",type:"crypto",dedup:"BNB",ter:0,   pea:false,cto:false,av:false},
  {s:"IBIT",   n:"iShares Bitcoin ETF",zone:"usa", type:"crypto",dedup:"BTC",ter:0.25,pea:false,cto:true, av:false},
  {s:"ETHA",   n:"iShares Ethereum ETF",zone:"usa",type:"crypto",dedup:"ETH",ter:0.25,pea:false,cto:true, av:false},
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

// ═══════════════════════════════════════════════════════════════════
// OVERLAP MAP — Quels stocks sont contenus dans quels ETF
// Pénalité : si on a PANX.PA (MSCI World) et AAPL en même temps,
// on ne doit pas additionner leurs poids naïvement
// ═══════════════════════════════════════════════════════════════════
const OVERLAP_GROUPS: Record<string, string[]> = {
  // ETF Monde contient tout (US, EU, EM en partie)
  "MSCI_WORLD":     ["AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","V","MA","JNJ","LLY","JPM","AVGO","ADBE","NOW","CRM","NFLX","PG","KO","LMT","XOM","MO","MC.PA","RMS.PA","KER.PA","AIR.PA","SAF.PA","SAN.PA","OR.PA","SU.PA","ASML.AS","SAP.DE","SIE.DE","NESN.SW","NOVN.SW","ROG.SW","NOVO-B.CO","EL.PA","BNP.PA","ALV.DE","MBG.DE"],
  "FTSE_ALLWORLD":  ["AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","V","MA","JNJ","LLY","JPM","AVGO","ADBE","NOW","CRM","NFLX","PG","KO","MC.PA","RMS.PA","AIR.PA","SAN.PA","OR.PA","ASML.AS","SAP.DE","NESN.SW","NOVN.SW","ROG.SW","NOVO-B.CO","BABA","TCEHY","JD","SE"],
  "MSCI_ACWI":      ["AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","V","MA","JNJ","LLY","JPM","AVGO","ADBE","NOW","CRM","MC.PA","RMS.PA","AIR.PA","OR.PA","ASML.AS","SAP.DE","NESN.SW"],
  // S&P 500 / NASDAQ
  "SP500":          ["AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","V","MA","JNJ","LLY","JPM","AVGO","ADBE","NOW","CRM","NFLX","PG","KO","LMT","XOM","MO"],
  "NASDAQ100":      ["AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","AVGO","ADBE","NOW","CRM","NFLX","KO"],
  // Euro Stoxx 50
  "EUROSTOXX50":    ["MC.PA","AIR.PA","SAF.PA","SAN.PA","OR.PA","SU.PA","ASML.AS","SAP.DE","SIE.DE","ALV.DE","BNP.PA","ENGI.PA"],
  "MSCI_EUROPE":    ["MC.PA","RMS.PA","KER.PA","AIR.PA","SAF.PA","SAN.PA","OR.PA","SU.PA","ASML.AS","SAP.DE","SIE.DE","ALV.DE","MBG.DE","NESN.SW","NOVN.SW","ROG.SW","NOVO-B.CO","EL.PA","BNP.PA","VIE.PA","ORA.PA","ENGI.PA"],
  // EM
  "MSCI_EM":        ["BABA","TCEHY","JD","BIDU","SE","MELI","NU"],
  "MSCI_EM_IMI":    ["BABA","TCEHY","JD","BIDU","SE","MELI","NU"],
  "FTSE_EM":        ["BABA","TCEHY","JD","BIDU","SE","MELI"],
  "MSCI_CHINA":     ["BABA","TCEHY","JD","BIDU"],
};

// Sector mapping for concentration limits
const SECTOR_MAP: Record<string, string> = {
  "AAPL":"tech","MSFT":"tech","GOOGL":"tech","AMZN":"tech","NVDA":"tech","META":"tech",
  "TSLA":"tech","AVGO":"tech","ADBE":"tech","NOW":"tech","CRM":"tech","NFLX":"tech",
  "ASML.AS":"tech","SAP.DE":"tech",
  "V":"finance","MA":"finance","JPM":"finance","BNP.PA":"finance","ALV.DE":"finance",
  "JNJ":"health","LLY":"health","SAN.PA":"health","NOVN.SW":"health","ROG.SW":"health","NOVO-B.CO":"health",
  "PG":"consumer","KO":"consumer","MC.PA":"luxury","RMS.PA":"luxury","KER.PA":"luxury","OR.PA":"luxury","EL.PA":"luxury",
  "AIR.PA":"industrial","SAF.PA":"industrial","SU.PA":"industrial","SIE.DE":"industrial","MBG.DE":"industrial",
  "ENGI.PA":"utility","VIE.PA":"utility","ORA.PA":"telecom",
  "XOM":"energy","LMT":"defense","MO":"consumer",
  "BABA":"tech","TCEHY":"tech","JD":"tech","BIDU":"tech","SE":"tech","MELI":"tech","NU":"finance",
  "NESN.SW":"consumer",
};

// ═══════════════════════════════════════════════════════════════════
// RISK PROFILE ALLOCATION BOUNDS
// Enforce min/max by asset class based on risk profile
// ═══════════════════════════════════════════════════════════════════
interface ClassBounds {
  equity:   [number, number]; // [min%, max%] — stocks + equity ETFs
  bonds:    [number, number];
  gold:     [number, number];
  crypto:   [number, number];
  reit:     [number, number];
  maxSingleStock: number;     // max weight for any single stock
  maxSingleETF:   number;     // max weight for any single ETF
  maxTop3:        number;     // max combined weight of top 3 positions
  maxSectorPct:   number;     // max % in any single sector
  minPositions:   number;     // minimum number of positions with weight > 1%
}

const RISK_BOUNDS: Record<string, ClassBounds> = {
  defensive: {
    equity: [10, 35], bonds: [40, 80], gold: [0, 15], crypto: [0, 0], reit: [0, 15],
    maxSingleStock: 0.06, maxSingleETF: 0.30, maxTop3: 0.65, maxSectorPct: 0.25, minPositions: 5,
  },
  moderate: {
    equity: [30, 60], bonds: [20, 50], gold: [0, 15], crypto: [0, 5], reit: [0, 15],
    maxSingleStock: 0.08, maxSingleETF: 0.28, maxTop3: 0.55, maxSectorPct: 0.30, minPositions: 6,
  },
  balanced: {
    equity: [50, 80], bonds: [5, 30], gold: [0, 15], crypto: [0, 10], reit: [0, 15],
    maxSingleStock: 0.10, maxSingleETF: 0.25, maxTop3: 0.50, maxSectorPct: 0.35, minPositions: 7,
  },
  aggressive: {
    equity: [70, 100], bonds: [0, 15], gold: [0, 10], crypto: [0, 20], reit: [0, 10],
    maxSingleStock: 0.12, maxSingleETF: 0.25, maxTop3: 0.45, maxSectorPct: 0.40, minPositions: 8,
  },
};

// ═══════════════════════════════════════════════════════════════════
// NEW MARKOWITZ — Constrained Monte Carlo + Gradient Refinement
// ═══════════════════════════════════════════════════════════════════

function isEquity(s: string): boolean {
  const a = CAT.find(x => x.s === s);
  return !!a && (a.type === "etf" || a.type === "stock");
}

function getType(s: string): string {
  return CAT.find(x => x.s === s)?.type || "etf";
}

function getDedup(s: string): string {
  return CAT.find(x => x.s === s)?.dedup || s;
}

function getSector(s: string): string {
  return SECTOR_MAP[s] || "broad";
}

function getZone(s: string): string {
  return CAT.find(x => x.s === s)?.zone || "any";
}

/** Compute overlap penalty: if ETF X contains stock Y, penalize holding both */
function overlapPenalty(syms: string[], w: number[]): number {
  let penalty = 0;
  for (let i = 0; i < syms.length; i++) {
    const dedup_i = getDedup(syms[i]);
    const overlaps = OVERLAP_GROUPS[dedup_i];
    if (!overlaps || w[i] < 0.01) continue;
    for (let j = 0; j < syms.length; j++) {
      if (i === j || w[j] < 0.01) continue;
      if (overlaps.includes(syms[j])) {
        // Both ETF and its constituent stock are present — penalize
        penalty += w[i] * w[j] * 4; // Strong penalty
      }
    }
  }
  return penalty;
}

/** Check and enforce class allocation bounds */
function classAllocation(syms: string[], w: number[]): Record<string, number> {
  const alloc: Record<string, number> = { equity: 0, bonds: 0, gold: 0, crypto: 0, reit: 0 };
  for (let i = 0; i < syms.length; i++) {
    const t = getType(syms[i]);
    if (t === "etf" || t === "stock") alloc.equity += w[i];
    else if (t === "bond") alloc.bonds += w[i];
    else if (t === "gold" || t === "commodity") alloc.gold += w[i];
    else if (t === "crypto") alloc.crypto += w[i];
    else if (t === "reit") alloc.reit += w[i];
  }
  return alloc;
}

/** Count positions with weight > 1% */
function countPositions(w: number[]): number {
  return w.filter(x => x > 0.01).length;
}

/** Get sector concentration */
function maxSectorConcentration(syms: string[], w: number[]): number {
  const sectorW: Record<string, number> = {};
  for (let i = 0; i < syms.length; i++) {
    if (w[i] < 0.005) continue;
    const t = getType(syms[i]);
    // Only count stocks for sector concentration (ETFs are "broad")
    if (t !== "stock") continue;
    const sec = getSector(syms[i]);
    sectorW[sec] = (sectorW[sec] || 0) + w[i];
  }
  return Math.max(0, ...Object.values(sectorW));
}

/** Smart initial weight generation that respects class bounds */
function generateSmartWeights(
  syms: string[],
  bounds: ClassBounds,
  minClass: Record<string, number>
): number[] {
  const N = syms.length;
  const types = syms.map(s => getType(s));

  // Target allocation for each class (midpoint of bounds)
  const targetEquity = (bounds.equity[0] + bounds.equity[1]) / 200;
  const targetBonds = (bounds.bonds[0] + bounds.bonds[1]) / 200;
  const targetGold = (bounds.gold[0] + bounds.gold[1]) / 200;
  const targetCrypto = (bounds.crypto[0] + bounds.crypto[1]) / 200;
  const targetReit = (bounds.reit[0] + bounds.reit[1]) / 200;

  const classTarget: Record<string, number> = {
    etf: targetEquity, stock: targetEquity,
    bond: targetBonds, gold: targetGold, commodity: targetGold,
    crypto: targetCrypto, reit: targetReit,
  };

  // Count assets per class
  const classCounts: Record<string, number> = {};
  types.forEach(t => { classCounts[t] = (classCounts[t] || 0) + 1; });

  // Assign base weights
  const w = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const t = types[i];
    const classW = classTarget[t] || 0.05;
    const count = classCounts[t] || 1;
    w[i] = classW / count;
    // Apply minClass floors
    const minPct = (minClass[syms[i]] || 0) / 100;
    if (w[i] < minPct) w[i] = minPct;
  }

  // Add randomness (±30%)
  for (let i = 0; i < N; i++) {
    w[i] *= 0.7 + Math.random() * 0.6;
  }

  // Normalize
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / (sum || 1));
}

function markowitz(
  returns: Record<string, number[]>,
  method: "minvariance" | "maxsharpe" | "maxutility",
  minClass: Record<string, number>,
  risk: "defensive" | "moderate" | "balanced" | "aggressive" = "balanced",
  maxWeight = 0.28,
  rfRate = 0.03
) {
  const syms = Object.keys(returns);
  const N = syms.length;
  if (N < 2) return { weights: {} as Record<string, number>, ret: 0, vol: 0, sharpe: 0, var95: 0 };

  const bounds = RISK_BOUNDS[risk];
  const T = Math.min(...syms.map(s => returns[s].length));
  const mu = syms.map(s => (returns[s].slice(0, T).reduce((a, b) => a + b, 0) / T) * 52);

  // Covariance matrix (annualized)
  const cov: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) for (let j = i; j < N; j++) {
    const ri = returns[syms[i]].slice(0, T), rj = returns[syms[j]].slice(0, T);
    const mi = ri.reduce((a, b) => a + b, 0) / T, mj = rj.reduce((a, b) => a + b, 0) / T;
    let c = 0; for (let t = 0; t < T; t++) c += (ri[t] - mi) * (rj[t] - mj);
    cov[i][j] = cov[j][i] = (c / (T - 1)) * 52;
  }

  // Per-asset weight limits
  const wMin = syms.map(s => (minClass[s] || 0) / 100);
  const wMax = syms.map(s => {
    const t = getType(s);
    if (t === "stock") return bounds.maxSingleStock;
    if (t === "crypto") return 0.15;
    return bounds.maxSingleETF;
  });

  /** Score a weight vector — higher is better */
  function score(w: number[]): number {
    const pRet = w.reduce((a, x, i) => a + x * mu[i], 0);
    let pVar = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) pVar += w[i] * w[j] * cov[i][j];
    const pVol = Math.sqrt(Math.max(0, pVar));
    const pSharpe = pVol > 0 ? (pRet - rfRate) / pVol : 0;

    // Base objective
    let obj = method === "minvariance" ? -pVar
            : method === "maxsharpe"   ? pSharpe
            : pRet - 0.5 * pVar;

    // ── PENALTY 1: Class allocation violations ──
    const alloc = classAllocation(syms, w);
    const violate = (val: number, min: number, max: number) =>
      Math.max(0, min / 100 - val) + Math.max(0, val - max / 100);

    const classViolation =
      violate(alloc.equity, bounds.equity[0], bounds.equity[1]) +
      violate(alloc.bonds, bounds.bonds[0], bounds.bonds[1]) +
      violate(alloc.gold, bounds.gold[0], bounds.gold[1]) +
      violate(alloc.crypto, bounds.crypto[0], bounds.crypto[1]) +
      violate(alloc.reit, bounds.reit[0], bounds.reit[1]);
    obj -= classViolation * 5; // Heavy penalty

    // ── PENALTY 2: Overlap (ETF + constituent stock) ──
    obj -= overlapPenalty(syms, w) * 2;

    // ── PENALTY 3: Sector concentration ──
    const maxSec = maxSectorConcentration(syms, w);
    if (maxSec > bounds.maxSectorPct) {
      obj -= (maxSec - bounds.maxSectorPct) * 3;
    }

    // ── PENALTY 4: Top-3 concentration ──
    const sorted = [...w].sort((a, b) => b - a);
    const top3 = sorted[0] + (sorted[1] || 0) + (sorted[2] || 0);
    if (top3 > bounds.maxTop3) {
      obj -= (top3 - bounds.maxTop3) * 3;
    }

    // ── PENALTY 5: Too few positions ──
    const nPos = countPositions(w);
    if (nPos < bounds.minPositions) {
      obj -= (bounds.minPositions - nPos) * 0.5;
    }

    // ── PENALTY 6: Geographic over-concentration ──
    const geoW: Record<string, number> = {};
    syms.forEach((s, i) => {
      if (w[i] < 0.005) return;
      const z = getZone(s);
      // For world ETFs, split exposure roughly 60% USA / 25% EU / 15% other
      const dedup = getDedup(s);
      if (["MSCI_WORLD","FTSE_ALLWORLD","MSCI_ACWI"].includes(dedup)) {
        geoW["usa"] = (geoW["usa"] || 0) + w[i] * 0.60;
        geoW["europe"] = (geoW["europe"] || 0) + w[i] * 0.25;
        geoW["em"] = (geoW["em"] || 0) + w[i] * 0.10;
      } else {
        geoW[z] = (geoW[z] || 0) + w[i];
      }
    });
    // Max 55% effective exposure to any single region
    Object.values(geoW).forEach(g => {
      if (g > 0.55) obj -= (g - 0.55) * 2;
    });

    return obj;
  }

  /** Clamp and normalize weights */
  function clamp(w: number[]): number[] {
    const clamped = w.map((v, i) => Math.max(wMin[i], Math.min(wMax[i], Math.max(0, v))));
    const sum = clamped.reduce((a, b) => a + b, 0);
    return sum > 0 ? clamped.map(x => x / sum) : new Array(N).fill(1 / N);
  }

  // ── Phase 1: Smart Monte Carlo (15000 trials) ──
  let bestW = new Array(N).fill(1 / N);
  let bestScore = -Infinity;

  for (let trial = 0; trial < 15000; trial++) {
    // Use smart initialization 70% of the time, random 30%
    let w: number[];
    if (trial < 10500) {
      w = generateSmartWeights(syms, bounds, minClass);
    } else {
      const raw = syms.map(() => Math.random());
      const sum = raw.reduce((a, b) => a + b, 0);
      w = raw.map(x => x / sum);
    }
    w = clamp(w);

    const s = score(w);
    if (s > bestScore) { bestScore = s; bestW = [...w]; }
  }

  // ── Phase 2: Local gradient refinement (hill climbing) ──
  const step = 0.005;
  for (let iter = 0; iter < 3000; iter++) {
    const i = Math.floor(Math.random() * N);
    const j = Math.floor(Math.random() * N);
    if (i === j) continue;

    const candidate = [...bestW];
    const delta = step * (0.5 + Math.random());
    candidate[i] = Math.max(wMin[i], candidate[i] + delta);
    candidate[j] = Math.max(wMin[j], candidate[j] - delta);

    const clamped = clamp(candidate);
    const s = score(clamped);
    if (s > bestScore) {
      bestScore = s;
      bestW = clamped;
    }
  }

  // ── Phase 3: Prune tiny positions & redistribute ──
  const minWeight = 0.015; // 1.5%
  for (let i = 0; i < N; i++) {
    if (bestW[i] > 0 && bestW[i] < minWeight && bestW[i] <= wMin[i]) {
      // Keep if it's a minimum class requirement
    } else if (bestW[i] > 0 && bestW[i] < minWeight) {
      bestW[i] = 0;
    }
  }
  const pruneSum = bestW.reduce((a, b) => a + b, 0);
  if (pruneSum > 0) bestW = bestW.map(x => x / pruneSum);

  // ── Compute final stats ──
  const finalRet = bestW.reduce((a, x, i) => a + x * mu[i], 0);
  let finalVar = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) finalVar += bestW[i] * bestW[j] * cov[i][j];
  const finalVol = Math.sqrt(Math.max(0, finalVar));
  const finalSharpe = finalVol > 0 ? (finalRet - rfRate) / finalVol : 0;

  // Historical VaR
  const portR: number[] = [];
  const T2 = Math.min(...syms.map(s => returns[s].length));
  for (let t = 0; t < T2; t++) {
    let pr = 0;
    syms.forEach((s, i) => { pr += bestW[i] * (returns[s][t] || 0); });
    portR.push(pr);
  }
  portR.sort((a, b) => a - b);
  const var95 = Math.abs(portR[Math.floor(portR.length * 0.05)] || 0) * Math.sqrt(52);

  const weights: Record<string, number> = {};
  syms.forEach((s, i) => { if (bestW[i] > 0.01) weights[s] = bestW[i]; });

  return { weights, ret: finalRet, vol: finalVol, sharpe: finalSharpe, var95 };
}

// ═══════════════════════════════════════════════════════════════════
// BANK BLOCKED, norm, dedup, selectUniverse — UNCHANGED
// (copy from original file lines 173-419)
// ═══════════════════════════════════════════════════════════════════

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

function dedupFn(assets:Asset[]):Asset[]{
  const m=new Map<string,Asset>();
  for(const a of assets){const ex=m.get(a.dedup);if(!ex||a.ter<ex.ter)m.set(a.dedup,a);}
  return [...m.values()];
}

// ═══════════════════════════════════════════════════════════════════
// selectUniverse — COPY EXACTLY FROM ORIGINAL (lines 208-419)
// Only change: rename local `dedup` calls to `dedupFn`
// (You must paste your original selectUniverse here,
//  replacing `dedup(` with `dedupFn(`)
// ═══════════════════════════════════════════════════════════════════

function selectUniverse(answers:Record<string,string>):{
  symbols:string[];minBondPct:number;minGoldPct:number;minReitPct:number;minCryptoPct:number;minEMPct:number;risk:string;
}{
  const q1=answers["1"]||"",q2=answers["2"]||"",q3=answers["3"]||"";
  const q4=answers["4"]||"",q5=answers["5"]||"",q6=answers["6"]||"";
  const q7=answers["7"]||"",q8=answers["8"]||"",q9=answers["9"]||"";
  const n5=norm(q5),n6=norm(q6),n4=norm(q4),n7=norm(q7);

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
  if(isShort&&(risk==="aggressive"||risk==="balanced")) risk="moderate";

  const wCrypto=sups.some(s=>norm(s).includes("crypto"))||n5.includes("crypto");
  const noSup  =!wPEA&&!wCTO&&!wAV&&!wCrypto;

  // Zone
  const zEM   =n6.includes("emergent");
  const zUSA  =n6.includes("usa");
  const zEU   =n6.includes("europe");

  // Classes
  const wETF   =n5===""||n5.includes("etf");
  const wStocks=n5===""||n5.includes("action");
  const wBonds =n5.includes("oblig");
  const wGold  =n5.includes("or")||n5.includes("matier");
  const wReits =n5.includes("immob");
  const onlyCrypto=n5.trim()==="crypto";
  const onlyBonds =n5.trim()==="obligation"||n5.trim()==="obligations";

  // ESG
  const esgStrict =n4.includes("strict");
  const esgPartial=n4.includes("armement")||n4.includes("tabac");

  // MaxAssets
  let maxAssets=n7.includes("concentre")||n7.includes("5 actifs")?6
               :n7.includes("large")||n7.includes("15")?20:10;

  const blocked=new Set(BANK_BLOCKED[q9]||[]);

  // Cas crypto seule
  if(onlyCrypto||(wCrypto&&!wETF&&!wStocks&&!wBonds)){
    const cr=CAT.filter(a=>a.type==="crypto"&&!blocked.has(a.s));
    return{symbols:dedupFn(cr).map(a=>a.s).slice(0,maxAssets),
      minBondPct:0,minGoldPct:0,minReitPct:0,minCryptoPct:30,minEMPct:0,risk};
  }

  // Filtre principal
  const filter=(relaxTypes:boolean)=>CAT.filter(a=>{
    if(zEM &&a.zone!=="em" &&a.zone!=="any")return false;
    if(zUSA&&a.zone!=="usa"&&a.zone!=="any")return false;
    if(zEU &&a.zone!=="europe"&&a.zone!=="any")return false;
    if(onlyBonds&&a.type!=="bond")return false;
    if(a.type==="crypto"&&!wCrypto)return false;
    if(!relaxTypes){
      if(!wETF   &&a.type==="etf")      return false;
      if(!wStocks&&a.type==="stock")    return false;
      if(!wGold  &&a.type==="gold")     return false;
      if(!wGold  &&a.type==="commodity")return false;
      if(!wReits &&a.type==="reit")     return false;
    }
    if(!wBonds&&a.type==="bond"&&risk==="aggressive")return false;
    if(esgStrict&&!a.esg)return false;
    if(esgPartial&&a.excl_esg)return false;
    if(!noSup){
      const ok=(wPEA&&a.pea)||(wCTO&&a.cto)||(wAV&&a.av)||(wCrypto&&a.type==="crypto");
      if(!ok)return false;
    }
    if(blocked.has(a.s))return false;
    if(risk==="defensive"&&["TSLA","NVDA","AMD","BTC-USD","ETH-USD","SOL-USD","KWEB","MCHI"].includes(a.s))return false;
    return true;
  });

  let pool=dedupFn(filter(false));
  const WDEDUPS=["MSCI_WORLD","FTSE_ALLWORLD","MSCI_ACWI","MSCI_WORLD_D"];
  const USDEDUPS=["SP500","NASDAQ100","EUROSTOXX50","MSCI_EUROPE","EU_SMALL_CAP","FR_MID_CAP"];
  const hasW=pool.some(a=>WDEDUPS.includes(a.dedup)&&a.type==="etf");
  if(hasW&&!zUSA&&!zEU){
    const hasWPEA=pool.some(a=>WDEDUPS.includes(a.dedup)&&a.pea&&a.type==="etf");
    pool=pool.filter(a=>!USDEDUPS.includes(a.dedup)||(wPEA&&!hasWPEA&&a.pea));
  }
  const EM_COUNTRY_DEDUPS=["MSCI_CHINA","CHINA_NET","MSCI_INDIA","MSCI_TAIWAN","MSCI_HK","MSCI_KOREA","MSCI_BRAZIL"];
  const emCountryETFs=pool.filter(a=>EM_COUNTRY_DEDUPS.includes(a.dedup)&&a.type==="etf");
  if(emCountryETFs.length>3){
    const keep=emCountryETFs.sort((a,b)=>a.ter-b.ter).slice(0,3).map(a=>a.dedup);
    pool=pool.filter(a=>!EM_COUNTRY_DEDUPS.includes(a.dedup)||keep.includes(a.dedup));
  }
  const wETFs=pool.filter(a=>WDEDUPS.includes(a.dedup)&&a.type==="etf");
  if(wETFs.length>1){
    const best=wETFs.reduce((b,a)=>{
      if(wPEA&&a.pea&&!b.pea)return a;
      if(wPEA&&!a.pea&&b.pea)return b;
      return a.ter<b.ter?a:b;
    });
    pool=pool.filter(a=>!WDEDUPS.includes(a.dedup)||a.s===best.s);
  }

  if(wPEA){
    const PEA_ETF_EXTRA=["PAEEM.PA","PE500.PA","PUST.PA","EESM.PA","SMC.PA","EPRE.PA","C50.PA","MEUD.PA"];
    for(const sym of PEA_ETF_EXTRA){
      const asset=CAT.find(a=>a.s===sym);
      if(asset&&asset.pea&&!pool.find(a=>a.s===sym)&&!blocked.has(sym)&&
         (!esgStrict||asset.esg)&&(!esgPartial||!asset.excl_esg)){
        pool.push(asset);
      }
    }
    pool=dedupFn(pool);
    const WORLD_D=["MSCI_WORLD","FTSE_ALLWORLD","MSCI_ACWI","MSCI_WORLD_D"];
    const hasWorldPEA=pool.some(a=>WORLD_D.includes(a.dedup)&&a.pea&&a.type==="etf");
    if(!hasWorldPEA&&pool.filter(a=>a.type==="etf"&&a.pea).length<3){
      const peaStocks=CAT.filter(a=>
        a.type==="stock"&&a.pea&&!blocked.has(a.s)&&
        (a.zone===(!zEM&&!zUSA?"europe":zEM?"em":zUSA?"usa":"europe")||
         (!zEM&&!zUSA&&!zEU))&&
        (!esgStrict||a.esg)&&(!esgPartial||!a.excl_esg)
      );
      pool=[...pool,...dedupFn(peaStocks)];
      pool=dedupFn(pool);
    }
  }

  if(onlyBonds){
    let bp=pool.filter(a=>a.type==="bond");
    if(bp.length<2) bp=dedupFn(CAT.filter(a=>a.type==="bond"&&!blocked.has(a.s)));
    pool=bp;
  }
  if((risk==="defensive"||risk==="moderate")&&!onlyBonds&&!onlyCrypto&&
     pool.filter(a=>a.type==="bond").length<1){
    const bondFallback=dedupFn(CAT.filter(a=>
      a.type==="bond"&&!blocked.has(a.s)&&
      (noSup||(wCTO&&a.cto)||(wAV&&a.av))&&
      (!zEM||a.zone==="em"||a.zone==="any")&&
      (!zUSA||a.zone==="usa"||a.zone==="any")
    ));
    pool=[...pool,...bondFallback.slice(0,2)];
    pool=dedupFn(pool);
  }

  if(pool.length<4){
    pool=dedupFn(filter(true));
    if(pool.length<4){
      pool=dedupFn(CAT.filter(a=>{
        if(a.type==="crypto"&&!wCrypto)return false;
        if(esgStrict&&!a.esg)return false;
        if(!noSup){const ok=(wPEA&&a.pea)||(wCTO&&a.cto)||(wAV&&a.av)||(wCrypto&&a.type==="crypto");if(!ok)return false;}
        if(blocked.has(a.s))return false;
        return true;
      }));
    }
  }

  const mandatory:Asset[]=[];
  if(wGold){const g=pool.find(a=>a.type==="gold"||a.type==="commodity");if(g)mandatory.push(g);}
  if(wGold&&mandatory.filter(a=>a.type==="gold"||a.type==="commodity").length===0){
    const goldFb=CAT.find(a=>a.s==="GLD"&&!blocked.has("GLD"));
    if(goldFb)mandatory.push(goldFb);
  }
  if(wReits){const r=pool.find(a=>a.type==="reit");if(r)mandatory.push(r);}
  if(wBonds||(risk==="defensive"||risk==="moderate")){
    const bonds=pool.filter(a=>a.type==="bond").slice(0,risk==="defensive"?3:2);
    bonds.forEach(b=>{if(!mandatory.find(m=>m.s===b.s))mandatory.push(b);});
  }
  if(wCrypto){const cr=pool.find(a=>a.type==="crypto");if(cr)mandatory.push(cr);}

  const mandSet=new Set(mandatory.map(a=>a.s));
  const rest=pool.filter(a=>!mandSet.has(a.s)).sort((a,b)=>{
    const sc=(x:Asset)=>(x.type==="etf"?20:x.type==="stock"?10:5)+(x.esg?2:0)+(1-Math.min(x.ter,1))*3;
    return sc(b)-sc(a);
  });

  const universe=[...mandatory,...rest].slice(0,maxAssets);
  const symbols=universe.map(a=>a.s);

  const minBondPct  =onlyBonds?80:risk==="defensive"&&wBonds?30:risk==="defensive"?15:wBonds?12:0;
  const minGoldPct  =wGold?6:0;
  const minReitPct  =wReits?5:0;
  const minCryptoPct=wCrypto&&!onlyCrypto?5:0;
  const minEMPct    =zEM?40:0;

  console.log(`[v6] z=${q6}|r=${risk}|s=${q8}|b=${q9}|esg=${q4} → [${symbols.join(",")}] bonds>=${minBondPct}% em>=${minEMPct}%`);
  return{symbols,minBondPct,minGoldPct,minReitPct,minCryptoPct,minEMPct,risk};
}

// ═══════════════════════════════════════════════════════════════════
// fetchReturns, fetchMeta — UNCHANGED from original
// ═══════════════════════════════════════════════════════════════════

async function fetchReturns(symbols:string[],years=10):Promise<Record<string,number[]>>{
  const start=new Date();start.setFullYear(start.getFullYear()-years);
  const client=await pool.connect();
  try{
    const{rows}=await client.query(
      `SELECT symbol,date,close FROM assets_history WHERE symbol=ANY($1) AND date>=$2 ORDER BY symbol,date ASC`,
      [symbols,start.toISOString().split("T")[0]]
    );
    const prices:Record<string,number[]>={};
    rows.forEach((r: any)=>{if(!prices[r.symbol])prices[r.symbol]=[];prices[r.symbol].push(parseFloat(r.close));});
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
    rows.forEach((r: any)=>{if(!meta[r.symbol])meta[r.symbol]={name:r.name,type:r.type};});
    return meta;
  }finally{client.release();}
}

// ═══════════════════════════════════════════════════════════════════
// REAL EFFICIENT FRONTIER (replaces random points)
// ═══════════════════════════════════════════════════════════════════

function computeFrontier(
  returns: Record<string, number[]>,
  minClass: Record<string, number>,
  risk: "defensive" | "moderate" | "balanced" | "aggressive",
  nPoints = 30
): Array<{ vol: number; ret: number }> {
  const points: Array<{ vol: number; ret: number }> = [];
  // Generate frontier by varying risk aversion parameter
  for (let k = 0; k < nPoints; k++) {
    const riskAversion = 0.5 + k * 0.5; // From aggressive to defensive
    // Use utility method with varying A parameter
    const opt = markowitz(returns, "maxutility", minClass, risk, 0.28, 0.03);
    points.push({ vol: opt.vol * 100, ret: opt.ret * 100 });
  }
  // Also add minvariance and maxsharpe
  const mv = markowitz(returns, "minvariance", minClass, risk);
  points.push({ vol: mv.vol * 100, ret: mv.ret * 100 });
  const ms = markowitz(returns, "maxsharpe", minClass, risk);
  points.push({ vol: ms.vol * 100, ret: ms.ret * 100 });

  // Sort by volatility and deduplicate
  return points.sort((a, b) => a.vol - b.vol);
}

// ═══════════════════════════════════════════════════════════════════
// POST HANDLER — Now passes risk profile to markowitz
// ═══════════════════════════════════════════════════════════════════

type Weight = { symbol: string; name: string; type: string; weight: number; amount: number };
type FPt = { vol: number; ret: number };
type Result = { method: string; label: string; ret: number; vol: number; sharpe: number; var95: number; rec?: boolean; weights: Weight[]; frontier: FPt[] };

export async function POST(req: NextRequest) {
  const { capital = 50000, answers = {} } = await req.json();
  try {
    const { symbols, minBondPct, minGoldPct, minReitPct, minCryptoPct, minEMPct, risk } = selectUniverse(answers);
    const returns = await fetchReturns(symbols, 15);
    const validSyms = Object.keys(returns);
    if (validSyms.length < 3) return NextResponse.json({ error: "Pas assez de donnees historiques pour ce profil" }, { status: 500 });

    const meta = await fetchMeta(validSyms);
    const bondSyms = validSyms.filter(s => CAT.find(a => a.s === s)?.type === "bond");
    const goldSyms = validSyms.filter(s => CAT.find(a => a.s === s && (a.type === "gold" || a.type === "commodity")));
    const reitSyms = validSyms.filter(s => CAT.find(a => a.s === s && a.type === "reit"));
    const cryptoSyms = validSyms.filter(s => CAT.find(a => a.s === s && a.type === "crypto"));
    const distrib = (syms: string[], pct: number) => {
      if (!syms.length || !pct) return {};
      const r: Record<string, number> = {};
      syms.forEach(s => { r[s] = pct / syms.length; });
      return r;
    };
    const emSyms = validSyms.filter(s => CAT.find(a => a.s === s && (a.zone === "em")));
    const minClass = {
      ...distrib(bondSyms, minBondPct),
      ...distrib(goldSyms, minGoldPct),
      ...distrib(reitSyms, minReitPct),
      ...distrib(cryptoSyms, minCryptoPct),
      ...distrib(emSyms, minEMPct),
    };

    // ── REAL FRONTIER (was fake random before) ──
    // Simplified: compute a few key points
    const frontier: FPt[] = [];
    const mvOpt = markowitz(returns, "minvariance", minClass, risk as any);
    const msOpt = markowitz(returns, "maxsharpe", minClass, risk as any);
    frontier.push({ vol: Math.round(mvOpt.vol * 1000) / 10, ret: Math.round(mvOpt.ret * 1000) / 10 });
    frontier.push({ vol: Math.round(msOpt.vol * 1000) / 10, ret: Math.round(msOpt.ret * 1000) / 10 });
    // Interpolate 10 points between them
    for (let k = 1; k <= 10; k++) {
      const t = k / 11;
      frontier.push({
        vol: Math.round((mvOpt.vol + t * (msOpt.vol - mvOpt.vol)) * 1000) / 10,
        ret: Math.round((mvOpt.ret + t * (msOpt.ret - mvOpt.ret)) * 1000) / 10,
      });
    }
    frontier.sort((a, b) => a.vol - b.vol);

    const methods: Array<["minvariance" | "maxsharpe" | "maxutility", string, boolean]> = [
      ["minvariance", "Variance Minimale", false],
      ["maxsharpe", "Sharpe Maximum", true],
      ["maxutility", "Utilite Maximale", false],
    ];

    const results: Result[] = methods.map(([method, label, rec]) => {
      // ── KEY CHANGE: pass `risk` to markowitz ──
      const opt = markowitz(returns, method, minClass, risk as any);
      const rawW = Object.entries(opt.weights).filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1]);
      const totalW = rawW.reduce((s, [, v]) => s + v, 0);
      const weights: Weight[] = rawW.map(([sym, w], i) => ({
        symbol: sym,
        name: meta[sym]?.name || sym,
        type: meta[sym]?.type || "etf",
        weight: i === rawW.length - 1
          ? Math.round((1 - rawW.slice(0, -1).reduce((s, [, v]) => s + v / totalW, 0)) * 1000) / 10
          : Math.round(w / totalW * 1000) / 10,
        amount: Math.round(w / totalW * capital),
      }));
      return {
        method, label, rec,
        ret: Math.round(opt.ret * 1000) / 10,
        vol: Math.round(opt.vol * 1000) / 10,
        sharpe: Math.round(opt.sharpe * 100) / 100,
        var95: Math.round(opt.var95 * 1000) / 10,
        weights, frontier,
      };
    });

    return NextResponse.json({ results, universe: validSyms.length });
  } catch (err) {
    console.error("Optimize error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
