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

/* =======================================================
   CATALOGUE v5 -- corrections finales
   - VOO + CSPX.L + SXR8.DE -> dedup:"SP500" (1 seul survit)
   - VTI -> dedup:"SP500" (march? total US, diff?rent de S&P 500)
   - SGLD.L -> dedup:"GOLD_EU" / GLD -> dedup:"GOLD_US" (2 survivent)
   - PANX.PA pea:true (Amundi MSCI World synth?tique = PEA OK)
   - VOO bloqu? banques fran?aises (UCITS pr?f?rable)
   - Sectorielle US (XLK, XLV, XLF) -> supprim?es (trop sp?cialis?es)
   ======================================================= */
const CAT: Asset[] = [
  // ?? ETF MONDE ?????????????????????????????????????????????????
  {s:"PANX.PA",  n:"ETF MSCI World PEA (PANX)",       zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.13,pea:true, cto:true, av:true },
  // CW8.PA = Amundi MSCI World Swap -- PEA ?ligible, m?me dedup MSCI_WORLD -> garde lowest TER
  {s:"CW8.PA",   n:"Amundi MSCI World Swap PEA",    zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.12,pea:true, cto:true, av:true },
  // EWLD.PA = version distribution de CW8
  {s:"EWLD.PA",  n:"Amundi MSCI World Swap Dist PEA",zone:"monde",type:"etf",dedup:"MSCI_WORLD", ter:0.12,pea:true, cto:true, av:true },
  // ETF S&P 500 PEA synth?tiques
  {s:"PE500.PA", n:"ETF SP500 PEA (PE500)",   zone:"usa",  type:"etf",dedup:"SP500",    ter:0.15,pea:true, cto:true, av:true },
  {s:"PSP5.PA",  n:"Amundi PEA S&P 500 UCITS",      zone:"usa",  type:"etf",dedup:"SP500",    ter:0.15,pea:true, cto:true, av:true },
  {s:"ESE.PA",   n:"BNP Easy S&P 500 UCITS",        zone:"usa",  type:"etf",dedup:"SP500",    ter:0.15,pea:true, cto:true, av:true },
  // ETF NASDAQ PEA
  {s:"PUST.PA",  n:"ETF NASDAQ-100 PEA (PUST)",   zone:"usa",  type:"etf",dedup:"NASDAQ100",   ter:0.23,pea:true, cto:true, av:true },
  {s:"IWDA.AS",  n:"iShares MSCI World",           zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.20,pea:false,cto:true, av:false},
  {s:"EUNL.DE",  n:"iShares MSCI World EUR",       zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.20,pea:false,cto:true, av:true },
  {s:"VWCE.DE",  n:"Vanguard FTSE All-World",      zone:"monde",type:"etf",dedup:"FTSE_ALLWORLD", ter:0.22,pea:false,cto:true, av:true },
  {s:"ACWI",     n:"iShares MSCI ACWI",            zone:"monde",type:"etf",dedup:"MSCI_ACWI",     ter:0.32,pea:false,cto:true, av:false},
  {s:"SUWS.L",   n:"iShares MSCI World ESG Screened",zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.20,pea:false,cto:true,av:false,esg:true},

  // ?? ETF USA -- UCITS prioritaires, VOO/SPY bloqu?s FR ?????????
  // R?gle : CSPX.L + SXR8.DE + VOO + SPY -> m?me dedup SP500 -> 1 seul
  // SXR8.DE (0.07%) est le meilleur pour AV/CTO fran?ais
  {s:"SXR8.DE",  n:"iShares S&P 500 EUR",          zone:"usa",  type:"etf",dedup:"SP500",         ter:0.07,pea:false,cto:true, av:true },
  {s:"CSPX.L",   n:"iShares Core S&P 500",         zone:"usa",  type:"etf",dedup:"SP500",         ter:0.07,pea:false,cto:true, av:false},
  {s:"VOO",      n:"Vanguard S&P 500",             zone:"usa",  type:"etf",dedup:"SP500",         ter:0.03,pea:false,cto:true, av:false},
  {s:"SPY",      n:"SPDR S&P 500",                 zone:"usa",  type:"etf",dedup:"SP500",         ter:0.095,pea:false,cto:true,av:false},
  // VTI = US total (incl. small/mid) -> dedup distinct de SP500
  {s:"VTI",      n:"Vanguard Total US Market",     zone:"usa",  type:"etf",dedup:"SP500",         ter:0.03,pea:false,cto:true, av:false},
  // NASDAQ 100
  {s:"EQQQ.DE",  n:"Invesco NASDAQ 100 EUR",       zone:"usa",  type:"etf",dedup:"NASDAQ100",     ter:0.30,pea:false,cto:true, av:true },
  {s:"QQQ",      n:"Invesco NASDAQ 100",           zone:"usa",  type:"etf",dedup:"NASDAQ100",     ter:0.20,pea:false,cto:true, av:false},

  // ?? ETF EUROPE ????????????????????????????????????????????????
  {s:"MEUD.PA",  n:"Lyxor Euro Stoxx 50 PEA",     zone:"europe",type:"etf",dedup:"EUROSTOXX50",  ter:0.11,pea:true, cto:true, av:true },
  {s:"C50.PA",   n:"Amundi Euro Stoxx 50 PEA",    zone:"europe",type:"etf",dedup:"EUROSTOXX50",  ter:0.10,pea:true, cto:true, av:true },
  {s:"EXSA.DE",  n:"iShares Euro Stoxx 50",        zone:"europe",type:"etf",dedup:"EUROSTOXX50",  ter:0.10,pea:true, cto:true, av:true },
  {s:"SMEA.PA",  n:"Amundi MSCI Europe PEA",       zone:"europe",type:"etf",dedup:"MSCI_EUROPE",  ter:0.15,pea:true, cto:true, av:true },
  {s:"EXW1.DE",  n:"iShares MSCI Europe",          zone:"europe",type:"etf",dedup:"MSCI_EUROPE",  ter:0.12,pea:false,cto:true, av:true },
  {s:"EPRE.PA",  n:"AXA Europe Real Estate PEA",  zone:"europe",type:"reit",dedup:"EU_REITS",    ter:0.40,pea:true, cto:true, av:true },
  {s:"IPRP.L",   n:"iShares Europe Property",      zone:"europe",type:"reit",dedup:"EU_REITS",    ter:0.40,pea:false,cto:true, av:false},

  // ?? ETF MARCH?S ?MERGENTS ?????????????????????????????????????
  {s:"PAEEM.PA", n:"Amundi MSCI EM PEA",           zone:"em",type:"etf",dedup:"MSCI_EM",         ter:0.20,pea:true, cto:true, av:true },
  {s:"AEEM.PA",  n:"Amundi MSCI EM ESG PEA",       zone:"em",type:"etf",dedup:"MSCI_EM",         ter:0.25,pea:true, cto:true, av:true, esg:true},
  {s:"VFEM.L",   n:"Vanguard FTSE EM",             zone:"em",type:"etf",dedup:"FTSE_EM",          ter:0.22,pea:false,cto:true, av:false},
  {s:"IEMG",     n:"iShares Core MSCI EM",         zone:"em",type:"etf",dedup:"FTSE_EM",          ter:0.11,pea:false,cto:true, av:false},
  {s:"VWO",      n:"Vanguard FTSE EM",             zone:"em",type:"etf",dedup:"FTSE_EM",          ter:0.08,pea:false,cto:true, av:false},
  {s:"MCHI",     n:"iShares MSCI China",           zone:"em",type:"etf",dedup:"MSCI_CHINA",      ter:0.19,pea:false,cto:true, av:false},
  {s:"KWEB",     n:"KraneShares China Internet",   zone:"em",type:"etf",dedup:"CHINA_NET",        ter:0.70,pea:false,cto:true, av:false},
  {s:"INDA",     n:"iShares MSCI India",           zone:"em",type:"etf",dedup:"MSCI_INDIA",      ter:0.64,pea:false,cto:true, av:false},
  {s:"EWZ",      n:"iShares MSCI Brazil",          zone:"em",type:"etf",dedup:"MSCI_BRAZIL",     ter:0.59,pea:false,cto:true, av:false},
  {s:"EWY",      n:"iShares MSCI S.Korea",         zone:"em",type:"etf",dedup:"MSCI_KOREA",      ter:0.49,pea:false,cto:true, av:false},
  {s:"EWT",      n:"iShares MSCI Taiwan",          zone:"em",type:"etf",dedup:"MSCI_TAIWAN",     ter:0.59,pea:false,cto:true, av:false},
  {s:"EWH",      n:"iShares MSCI Hong Kong",       zone:"em",type:"etf",dedup:"MSCI_HK",         ter:0.49,pea:false,cto:true, av:false},

  // ?? ACTIONS EM ?????????????????????????????????????????????????
  {s:"BABA", n:"Alibaba",     zone:"em",type:"stock",dedup:"BABA", ter:0,pea:false,cto:true,av:false},
  {s:"TCEHY",n:"Tencent",     zone:"em",type:"stock",dedup:"TCEHY",ter:0,pea:false,cto:true,av:false},
  {s:"JD",   n:"JD.com",      zone:"em",type:"stock",dedup:"JD",   ter:0,pea:false,cto:true,av:false},
  {s:"BIDU", n:"Baidu",       zone:"em",type:"stock",dedup:"BIDU", ter:0,pea:false,cto:true,av:false},
  {s:"SE",   n:"Sea Limited", zone:"em",type:"stock",dedup:"SE",   ter:0,pea:false,cto:true,av:false},
  {s:"MELI", n:"MercadoLibre",zone:"em",type:"stock",dedup:"MELI", ter:0,pea:false,cto:true,av:false},
  {s:"NU",   n:"Nu Holdings", zone:"em",type:"stock",dedup:"NU",   ter:0,pea:false,cto:true,av:false},

  // ?? OBLIGATIONS ???????????????????????????????????????????????
  {s:"XGLE.DE",n:"Xtrackers EUR Gov Bond",      zone:"europe",type:"bond",dedup:"EUR_GOV",    ter:0.09,pea:false,cto:true,av:true },
  {s:"IBGS.L", n:"ETF Oblig Gouv EUR 1-3Y",   zone:"europe",type:"bond",dedup:"EUR_GOV", ter:0.09,pea:false,cto:true,av:true },
  {s:"IEAG.L", n:"iShares EUR Agg Bond",         zone:"europe",type:"bond",dedup:"EUR_AGG",    ter:0.17,pea:false,cto:true,av:false},
  {s:"AGGH.L", n:"ETF Oblig Aggregate Monde (AGGH)",      zone:"any",   type:"bond",dedup:"GLOBAL_AGG", ter:0.10,pea:false,cto:true,av:false},
  {s:"TLT",    n:"iShares 20Y US Treasury",      zone:"usa",   type:"bond",dedup:"US_20Y",     ter:0.15,pea:false,cto:true,av:false},
  {s:"IEF",    n:"iShares 7-10Y Treasury",       zone:"usa",   type:"bond",dedup:"US_7_10Y",   ter:0.15,pea:false,cto:true,av:false},
  {s:"AGG",    n:"iShares US Aggregate Bond",    zone:"usa",   type:"bond",dedup:"US_AGG",     ter:0.03,pea:false,cto:true,av:false},
  {s:"LQD",    n:"iShares USD IG Corp Bond",     zone:"usa",   type:"bond",dedup:"US_IG",      ter:0.14,pea:false,cto:true,av:false},
  {s:"HYG",    n:"iShares USD High Yield",       zone:"usa",   type:"bond",dedup:"US_HY",      ter:0.48,pea:false,cto:true,av:false},
  {s:"VWOB",   n:"Vanguard EM Gov Bond",         zone:"em",    type:"bond",dedup:"EM_GOV",     ter:0.20,pea:false,cto:true,av:false},

  // ?? OR & MATI?RES ?????????????????????????????????????????????
  // Dedup S?PAR?S -> GLD (US, dans Neon) + SGLD.L (EU) peuvent coexister
  {s:"GLD",    n:"SPDR Gold Shares",             zone:"any",type:"gold",     dedup:"GOLD_US",  ter:0.40,pea:false,cto:true,av:false},
  {s:"IAU",    n:"iShares Gold Trust",           zone:"any",type:"gold",     dedup:"GOLD_US",  ter:0.25,pea:false,cto:true,av:false},
  {s:"SGLD.L", n:"Invesco Physical Gold EUR",    zone:"any",type:"gold",     dedup:"GOLD_EU",  ter:0.12,pea:false,cto:true,av:false},
  {s:"GNR",    n:"SPDR Natural Resources",       zone:"any",type:"commodity",dedup:"NAT_RES",  ter:0.46,pea:false,cto:true,av:false},
  {s:"GSG",    n:"iShares Commodities",          zone:"any",type:"commodity",dedup:"CMDTY",    ter:0.75,pea:false,cto:true,av:false},

  // ?? REIT ??????????????????????????????????????????????????????
  {s:"VNQ",   n:"Vanguard US REITs",             zone:"usa",type:"reit",dedup:"US_REITS",      ter:0.12,pea:false,cto:true,av:false},
  {s:"REET",  n:"iShares Global REITs",          zone:"any",type:"reit",dedup:"GLOBAL_REITS",  ter:0.14,pea:false,cto:true,av:false},
  {s:"AMT",   n:"American Tower",               zone:"usa",type:"reit",dedup:"AMT",           ter:0,   pea:false,cto:true,av:false},

  // ?? CRYPTO ????????????????????????????????????????????????????
  {s:"BTC-USD",n:"Bitcoin",            zone:"any",type:"crypto",dedup:"BTC",ter:0,   pea:false,cto:false,av:false},
  {s:"ETH-USD",n:"Ethereum",           zone:"any",type:"crypto",dedup:"ETH",ter:0,   pea:false,cto:false,av:false},
  {s:"SOL-USD",n:"Solana",             zone:"any",type:"crypto",dedup:"SOL",ter:0,   pea:false,cto:false,av:false},
  {s:"BNB-USD",n:"BNB",                zone:"any",type:"crypto",dedup:"BNB",ter:0,   pea:false,cto:false,av:false},
  {s:"IBIT",   n:"iShares Bitcoin ETF",zone:"usa", type:"crypto",dedup:"BTC",ter:0.25,pea:false,cto:true, av:false},
  {s:"ETHA",   n:"iShares Ethereum ETF",zone:"usa",type:"crypto",dedup:"ETH",ter:0.25,pea:false,cto:true, av:false},

  // ?? ACTIONS USA ???????????????????????????????????????????????
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

  // ?? ACTIONS EUROPE PEA ????????????????????????????????????????
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

// Banques -- bloquer VOO/SPY/QQQ pour les banques fran?aises -> utiliser UCITS
const BANK_BLOCKED: Record<string,string[]> = {
  "BNP Paribas":      ["VOO","VTI","SPY","QQQ","AGG","TLT","LQD","HYG","IEF","VNQ","GLD","IAU","IEMG","CSPX.L","VFEM.L","AGGH.L"],
  "Societe Generale": ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG","CSPX.L"],
  "Soci?t? G?n?rale": ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG","CSPX.L"],
  "LCL":              ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG","CSPX.L"],
  "Credit Agricole":  ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG","CSPX.L"],
  "Cr?dit Agricole":  ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG","CSPX.L"],
  "Caisse Epargne":   ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG"],
  "Caisse d'?pargne": ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG"],
  "Banque Populaire": ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG"],
  // BoursoBank : bloquer VOO/VTI/SPY -> utiliser SXR8.DE/EQQQ.DE (UCITS)
  "BoursoBank":       ["VOO","VTI","SPY","QQQ","CSPX.L"],
  "Fortuneo":         ["VOO","VTI","SPY"],
  "Hello Bank":       ["VOO","VTI","SPY"],
  "Degiro":[],
  "Trade Republic":   [],
  "Interactive Brokers":["PAEEM.PA","AEEM.PA"],
  "Binance / Coinbase":[],
  "Autre":[],
};

function norm(s:string){return s.toLowerCase().replace(/[éèêë]/g,"e").replace(/[àâä]/g,"a").replace(/[ùûü]/g,"u").replace(/[îï]/g,"i").replace(/[ôö]/g,"o").replace(/[ç]/g,"c");}

function dedup(assets:Asset[]):Asset[]{
  const m=new Map<string,Asset>();
  for(const a of assets){const ex=m.get(a.dedup);if(!ex||a.ter<ex.ter)m.set(a.dedup,a);}
  return [...m.values()];
}

function selectUniverse(answers:Record<string,string>):{
  symbols:string[];minBondPct:number;minGoldPct:number;minReitPct:number;minCryptoPct:number;minEMPct:number;
}{
  const q1=answers["1"]||"",q2=answers["2"]||"",q3=answers["3"]||"";
  const q4=answers["4"]||"",q5=answers["5"]||"",q6=answers["6"]||"";
  const q7=answers["7"]||"",q8=answers["8"]||"",q9=answers["9"]||"";
  const n5=norm(q5),n6=norm(q6),n4=norm(q4),n7=norm(q7);

  // Risque
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

  // Support
  const sups=q8.split(",").map(s=>s.trim());
  const wPEA   =sups.some(s=>norm(s).includes("pea"));
  const wCTO   =sups.some(s=>norm(s).includes("cto")||norm(s).includes("compte"));
  const wAV    =sups.some(s=>norm(s).includes("assurance")||norm(s).includes("vie"));
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
  let maxAssets=n7.includes("concentre")||n7.includes("5 actifs")?7
               :n7.includes("large")||n7.includes("15")?24:14;

  const blocked=new Set(BANK_BLOCKED[q9]||[]);

  // Cas crypto seule
  if(onlyCrypto||(wCrypto&&!wETF&&!wStocks&&!wBonds)){
    const cr=CAT.filter(a=>a.type==="crypto"&&!blocked.has(a.s));
    return{symbols:dedup(cr).map(a=>a.s).slice(0,maxAssets),
      minBondPct:0,minGoldPct:0,minReitPct:0,minCryptoPct:30,minEMPct:0};
  }

  // Filtre principal
  const filter=(relaxTypes:boolean)=>CAT.filter(a=>{
    if(zEM &&a.zone!=="em" &&a.zone!=="any")return false;
    if(zUSA&&a.zone!=="usa"&&a.zone!=="any")return false;
    if(zEU &&a.zone!=="europe"&&a.zone!=="any")return false;
    // onlyBonds : priorit? absolue
    if(onlyBonds&&a.type!=="bond")return false;
    // Cas normal
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

  let pool=dedup(filter(false));
  // Anti-doublon: si MSCI World present, supprimer les sous-indices US
  const WDEDUPS=["MSCI_WORLD","FTSE_ALLWORLD","MSCI_ACWI","MSCI_WORLD_D"];
  const USDEDUPS=["SP500","NASDAQ100","EUROSTOXX50","MSCI_EUROPE","EU_SMALL_CAP","FR_MID_CAP"];
  const hasW=pool.some(a=>WDEDUPS.includes(a.dedup)&&a.type==="etf");
  if(hasW&&!zUSA&&!zEU){
    const hasWPEA=pool.some(a=>WDEDUPS.includes(a.dedup)&&a.pea&&a.type==="etf");
    pool=pool.filter(a=>!USDEDUPS.includes(a.dedup)||(wPEA&&!hasWPEA&&a.pea));
  }
  // Regle EM: si ETF broad EM present (IEMG/VWO), les single-country sont redondants
  // Exception: zone=EM explicite -> garder les single-country pour diversifier
  const EM_BROAD_DEDUPS=["MSCI_EM","FTSE_EM"];
  const EM_COUNTRY_DEDUPS=["MSCI_CHINA","CHINA_NET","MSCI_INDIA","MSCI_TAIWAN","MSCI_HK","MSCI_KOREA","MSCI_BRAZIL"];
  const hasBroadEM=pool.some(a=>EM_BROAD_DEDUPS.includes(a.dedup)&&a.type==="etf");
  if(hasBroadEM&&!zEM&&risk!=="aggressive"){
    // Broad EM couvre deja les pays -> supprimer single-country (sauf profil agressif qui veut concentrer)
    pool=pool.filter(a=>!EM_COUNTRY_DEDUPS.includes(a.dedup));
  } else if(hasBroadEM&&!zEM&&risk==="aggressive"){
    // Agressif: garder max 2 single-country pour diversifier
    const emCtry=pool.filter(a=>EM_COUNTRY_DEDUPS.includes(a.dedup)&&a.type==="etf");
    if(emCtry.length>2){
      const keep=emCtry.sort((a,b)=>a.ter-b.ter).slice(0,2).map(a=>a.dedup);
      pool=pool.filter(a=>!EM_COUNTRY_DEDUPS.includes(a.dedup)||keep.includes(a.dedup));
    }
  } else {
    // Pas de broad EM ou zone=EM: garder max 3 single-country (les moins chers)
    const emCountryETFs=pool.filter(a=>EM_COUNTRY_DEDUPS.includes(a.dedup)&&a.type==="etf");
    if(emCountryETFs.length>3){
      const keep=emCountryETFs.sort((a,b)=>a.ter-b.ter).slice(0,3).map(a=>a.dedup);
      pool=pool.filter(a=>!EM_COUNTRY_DEDUPS.includes(a.dedup)||keep.includes(a.dedup));
    }
  }
  // Core-satellite par profil pour zone monde
  // Defensif/Modere : ETF monde pur, sous-indices supprimes (deja couverts)
  // Dynamique       : ETF monde + satellite SP500
  // Agressif        : SP500 + NASDAQ directement (plus concentre = plus de rendement potentiel)
  const zMonde=!zEM&&!zUSA&&!zEU;
  if(zMonde){
    const wETFsM=pool.filter(a=>WDEDUPS.includes(a.dedup)&&a.type==="etf");
    if(risk==="aggressive"){
      // Supprimer ETF monde -> laisser SP500+NASDAQ du filtre initial ou les ajouter
      pool=pool.filter(a=>!WDEDUPS.includes(a.dedup)||a.type!=="etf");
      // S assurer que SP500 et NASDAQ sont presents
      const supOk=(a:Asset)=>!blocked.has(a.s)&&(noSup||(wPEA&&a.pea)||(wCTO&&a.cto)||(wAV&&a.av));
      const sp=CAT.find(a=>a.dedup==="SP500"&&supOk(a)&&(!esgStrict||a.esg));
      const nq=CAT.find(a=>a.dedup==="NASDAQ100"&&supOk(a)&&(!esgStrict||a.esg));
      if(sp&&!pool.find(a=>a.s===sp.s))pool.push(sp);
      if(nq&&!pool.find(a=>a.s===nq.s))pool.push(nq);
    } else {
      // Defensif/Modere/Dynamique: 1 seul ETF monde (meilleur TER, PEA si besoin)
      if(wETFsM.length>1){
        const best=wETFsM.reduce((b,a)=>{
          if(wPEA&&a.pea&&!b.pea)return a;
          if(wPEA&&!a.pea&&b.pea)return b;
          return a.ter<b.ter?a:b;
        });
        pool=pool.filter(a=>!WDEDUPS.includes(a.dedup)||a.s===best.s);
      }
      if(risk==="balanced"){
        // Dynamique: ajouter satellite SP500 en complement
        const supOk=(a:Asset)=>!blocked.has(a.s)&&(noSup||(wPEA&&a.pea)||(wCTO&&a.cto)||(wAV&&a.av));
        const sp=CAT.find(a=>a.dedup==="SP500"&&supOk(a)&&(!esgStrict||a.esg));
        if(sp&&!pool.find(a=>a.s===sp.s))pool.push(sp);
      }
    }
  } else {
    // Zone specifique (USA/EU/EM): garder 1 seul ETF monde si present
    const wETFsZ=pool.filter(a=>WDEDUPS.includes(a.dedup)&&a.type==="etf");
    if(wETFsZ.length>1){
      const best=wETFsZ.reduce((b,a)=>{
        if(wPEA&&a.pea&&!b.pea)return a;
        if(wPEA&&!a.pea&&b.pea)return b;
        return a.ter<b.ter?a:b;
      });
      pool=pool.filter(a=>!WDEDUPS.includes(a.dedup)||a.s===best.s);
    }
  }

  // Enrichissement CTO/AV: garantir pool suffisant apres core-satellite
  if(!wPEA&&(wCTO||wAV||noSup)&&!onlyBonds&&!onlyCrypto){
    // Actifs UCITS avec bonnes donnees Neon, toujours disponibles CTO/AV
    const CTO_CORE=["SXR8.DE","EQQQ.DE","VWCE.DE","EXW1.DE","VWO","MCHI","EWY"];
    for(const sym of CTO_CORE){
      const asset=CAT.find(a=>a.s===sym);
      if(!asset||blocked.has(sym)||pool.find(a=>a.s===sym))continue;
      if(wCTO&&!asset.cto)continue;
      if(wAV&&!wCTO&&!asset.av)continue;
      if(esgStrict&&!asset.esg)continue;
      if(zEU&&asset.zone!=="europe"&&asset.zone!=="any")continue;
      if(zUSA&&asset.zone!=="usa"&&asset.zone!=="any")continue;
      if(zEM&&asset.zone!=="em"&&asset.zone!=="any")continue;
      // Ne pas ajouter SP500/NASDAQ si ETF monde present (non-agressif)
      const hasW=pool.some(a=>["MSCI_WORLD","FTSE_ALLWORLD","MSCI_ACWI"].includes(a.dedup)&&a.type==="etf");
      if(hasW&&risk!=="aggressive"&&["SP500","NASDAQ100"].includes(asset.dedup))continue;
      pool.push(asset);
    }
    pool=dedup(pool);
  }

  // ?? Enrichissement PEA -- ETF d'abord, actions seulement si aucun ETF monde
  if(wPEA){
    // 1) Ajouter ETF PEA compl?mentaires s'il en manque
    const PEA_ETF_EXTRA=["PAEEM.PA","PE500.PA","PUST.PA","EESM.PA","SMC.PA","EPRE.PA","C50.PA","MEUD.PA"];
    const WDEDUPS_CHECK=["MSCI_WORLD","FTSE_ALLWORLD","MSCI_ACWI"];
    const hasWorldInPool=pool.some(a=>WDEDUPS_CHECK.includes(a.dedup)&&a.type==="etf");
    for(const sym of PEA_ETF_EXTRA){
      const asset=CAT.find(a=>a.s===sym);
      if(!asset||!asset.pea||pool.find(a=>a.s===sym)||blocked.has(sym))continue;
      if(esgStrict&&!asset.esg)continue;
      if(esgPartial&&asset.excl_esg)continue;
      // Respecter la zone demandee
      if(zEU&&asset.zone==="usa")continue;
      if(zEU&&asset.zone==="em")continue;
      if(zUSA&&asset.zone==="em")continue;
      if(zUSA&&asset.zone==="europe")continue;
      // Ne pas ajouter SP500/NASDAQ si ETF monde deja present (sauf agressif)
      // Evite CW8.PA + PE500.PA + PUST.PA = triple doublon USA
      if(hasWorldInPool&&risk!=="aggressive"&&["SP500","NASDAQ100"].includes(asset.dedup))continue;
      pool.push(asset);
    }
    pool=dedup(pool);
    // 2) Actions PEA UNIQUEMENT si pas d'ETF monde PEA pr?sent
    const WORLD_D=["MSCI_WORLD","FTSE_ALLWORLD","MSCI_ACWI","MSCI_WORLD_D"];
    const hasWorldPEA=pool.some(a=>WORLD_D.includes(a.dedup)&&a.pea&&a.type==="etf");
    if(!hasWorldPEA&&pool.filter(a=>a.type==="etf"&&a.pea).length<3){
      const peaStocks=CAT.filter(a=>
        a.type==="stock"&&a.pea&&!blocked.has(a.s)&&
        (a.zone===(!zEM&&!zUSA?"europe":zEM?"em":zUSA?"usa":"europe")||
         (!zEM&&!zUSA&&!zEU))&&
        (!esgStrict||a.esg)&&(!esgPartial||!a.excl_esg)
      );
      pool=[...pool,...dedup(peaStocks)];
      pool=dedup(pool);
    }
  }

  // Dedup bonds EUR: max 1 bond EUR gov + 1 bond EUR agg pour non-onlyBonds
  // Evite le triplet XGLE.DE + IBGS.L + IEAG.L qui confuse Markowitz
  if(!onlyBonds){
    const eurGovBonds=pool.filter(a=>a.type==="bond"&&(a.dedup==="EUR_GOV"||a.dedup==="EUR_GOV_ST"));
    if(eurGovBonds.length>1){
      // Garder 1 seul EUR gov (le moins cher et av-compatible si besoin)
      const bestGov=eurGovBonds.reduce((b,a)=>{
        if(wAV&&a.av&&!b.av)return a;
        if(wAV&&!a.av&&b.av)return b;
        return a.ter<b.ter?a:b;
      });
      pool=pool.filter(a=>!(a.type==="bond"&&(a.dedup==="EUR_GOV"||a.dedup==="EUR_GOV_ST"))||a.s===bestGov.s);
    }
  }

  // onlyBonds: forcer pool = bonds uniquement
  if(onlyBonds){
    let bp=pool.filter(a=>a.type==="bond");
    if(bp.length<2) bp=dedup(CAT.filter(a=>a.type==="bond"&&!blocked.has(a.s)));
    pool=bp;
  }
  // ?? Auto-add obligations pour d?fensif/mod?r? ?????????????????
  if((risk==="defensive"||risk==="moderate")&&!onlyBonds&&!onlyCrypto&&
     pool.filter(a=>a.type==="bond").length<1){
    const bondFallback=dedup(CAT.filter(a=>
      a.type==="bond"&&!blocked.has(a.s)&&
      (noSup||(wCTO&&a.cto)||(wAV&&a.av))&&
      (!zEM||a.zone==="em"||a.zone==="any")&&
      (!zUSA||a.zone==="usa"||a.zone==="any")
    ));
    pool=[...pool,...bondFallback.slice(0,2)];
    pool=dedup(pool);
  }

  // ?? Fallback g?n?rique si < 4 ?????????????????????????????????
  if(pool.length<4){
    pool=dedup(filter(true));
    if(pool.length<4){
      // Dernier recours : monde entier sans filtre zone
      pool=dedup(CAT.filter(a=>{
        if(a.type==="crypto"&&!wCrypto)return false;
        if(esgStrict&&!a.esg)return false;
        if(!noSup){const ok=(wPEA&&a.pea)||(wCTO&&a.cto)||(wAV&&a.av)||(wCrypto&&a.type==="crypto");if(!ok)return false;}
        if(blocked.has(a.s))return false;
        if(a.type==="gold"&&wAV&&!a.av)return false;
        if(a.type==="bond"&&wAV&&!a.av)return false;
        return true;
      }));
    }
  }

  // ?? Slots mandatoires pour classes demand?es ??????????????????
  const mandatory:Asset[]=[];
  const typeIn=(t:string)=>pool.some(a=>a.type===t);
  if(wGold){const g=pool.find(a=>a.type==="gold"||a.type==="commodity");if(g)mandatory.push(g);}
  // Or fallback : si gold absent du pool mais demand?, ajouter GLD directement
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
  // Zone EM : forcer au moins 40% en actifs EM dans Markowitz
  const minEMPct    =zEM?40:0;

  console.log("[v5] z="+q6+"|r="+risk+"|s="+q8+"|b="+q9+" bonds>="+minBondPct+"%");
  return{symbols,minBondPct,minGoldPct,minReitPct,minCryptoPct,minEMPct};
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
    Object.entries(prices).forEach(([sym,p])=>{if(p.length>150)returns[sym]=p.slice(1).map((c,i)=>(c-p[i])/p[i]);});
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

// ?? Projection sur le simplexe avec contraintes min/max ??????????????
function projectSimplex(w:number[],wMin:number[],wMax:number[]):number[]{
  const N=w.length;
  // Clamp + renormaliser it?rativement (Dykstra-like simplifi?)
  for(let iter=0;iter<50;iter++){
    // 1. Appliquer bornes min
    let excess=0;
    for(let i=0;i<N;i++){if(w[i]<wMin[i]){excess+=wMin[i]-w[i];w[i]=wMin[i];}}
    // 2. Retirer l'exc?s des poids libres (> wMin)
    const free=w.map((v,i)=>v>wMin[i]?i:-1).filter(i=>i>=0);
    if(free.length>0&&excess>0){const e=excess/free.length;free.forEach(i=>{w[i]=Math.max(wMin[i],w[i]-e);});}
    // 3. Appliquer bornes max
    let over=0;
    for(let i=0;i<N;i++){if(w[i]>wMax[i]){over+=w[i]-wMax[i];w[i]=wMax[i];}}
    // 4. Distribuer l'exc?s sur les poids sous le max
    const free2=w.map((v,i)=>v<wMax[i]?i:-1).filter(i=>i>=0);
    if(free2.length>0&&over>0){const e=over/free2.length;free2.forEach(i=>{w[i]=Math.min(wMax[i],w[i]+e);});}
    // 5. Normaliser ? 1
    const s=w.reduce((a,b)=>a+b,0);
    if(s>0)for(let i=0;i<N;i++)w[i]/=s;
    const diff=Math.abs(w.reduce((a,b)=>a+b,0)-1);
    if(diff<1e-9)break;
  }
  return w;
}

function markowitz(returns:Record<string,number[]>,method:"minvariance"|"maxsharpe"|"maxutility",
  minClass:Record<string,number>,maxWeight=0.32,rfRate=0.03){
  const syms=Object.keys(returns);const N=syms.length;
  if(N<2)return{weights:{} as Record<string,number>,ret:0,vol:0,sharpe:0,var95:0};
  const T=Math.min(...syms.map(s=>returns[s].length));

  // ?? Moments historiques annualis?s ???????????????????????????????
  const mu=syms.map(s=>(returns[s].slice(-T).reduce((a,b)=>a+b,0)/T)*52);
  const cov:number[][]=Array.from({length:N},()=>new Array(N).fill(0));
  for(let i=0;i<N;i++)for(let j=i;j<N;j++){
    const ri=returns[syms[i]].slice(-T),rj=returns[syms[j]].slice(-T);
    const mi=ri.reduce((a,b)=>a+b,0)/T,mj=rj.reduce((a,b)=>a+b,0)/T;
    let cv=0;for(let t=0;t<T;t++)cv+=(ri[t]-mi)*(rj[t]-mj);
    cov[i][j]=cov[j][i]=(cv/(T-1))*52;
  }

  // ?? Contraintes de poids ?????????????????????????????????????????
  const wMin=syms.map(s=>(minClass[s]||0)/100);
  const isStock=syms.map(s=>CAT.find(a=>a.s===s)?.type==="stock");
  const wMax=syms.map((_,i)=>isStock[i]?Math.min(maxWeight,0.12):maxWeight);

  // ?? Helpers Markowitz ?????????????????????????????????????????????
  const portRet=(w:number[])=>w.reduce((a,x,i)=>a+x*mu[i],0);
  const portVar=(w:number[])=>{let v=0;for(let i=0;i<N;i++)for(let j=0;j<N;j++)v+=w[i]*w[j]*cov[i][j];return v;};
  const portVol=(w:number[])=>Math.sqrt(Math.max(0,portVar(w)));
  const covW=(w:number[])=>cov.map(row=>row.reduce((a,x,j)=>a+x*w[j],0)); // ?w

  // Score selon m?thode
  const score=(w:number[])=>{
    const r=portRet(w),v=portVar(w),vol=Math.sqrt(Math.max(0,v));
    if(method==="minvariance")return -v;
    if(method==="maxsharpe")return vol>0?(r-rfRate)/vol:-999;
    return r-0.5*v; // maxutility
  };

  // ?? Gradient du score (analytique) ???????????????????????????????
  const gradient=(w:number[])=>{
    const r=portRet(w),v=portVar(w),vol=Math.sqrt(Math.max(0,v));
    const sw=covW(w); // ?w, longueur N
    if(method==="minvariance")return sw.map(x=>-2*x);
    if(method==="maxsharpe"){
      if(vol<1e-10)return mu.map(x=>x-rfRate);
      const sharpe=(r-rfRate)/vol;
      // ?sharpe/?w_i = [?_i - sharpe*(?w)_i/vol] / vol
      return mu.map((m,i)=>(m-sharpe*sw[i]/vol)/vol);
    }
    // maxutility: ?/?w_i = ?_i - (?w)_i
    return mu.map((m,i)=>m-sw[i]);
  };

  // ?? Phase 1 : Monte Carlo (explorer l'espace) ????????????????????
  let bestW=projectSimplex(new Array(N).fill(1/N),wMin,wMax);
  let bestScore=score(bestW);
  const STARTS=30; // points de d?part vari?s
  const candidates:number[][]=[];
  for(let trial=0;trial<Math.max(3000,STARTS*N);trial++){
    const raw=syms.map(()=>Math.random());
    let s=raw.reduce((a,b)=>a+b,0);
    let w=projectSimplex(raw.map(x=>x/s),wMin,wMax);
    const sc=score(w);
    if(sc>bestScore){bestScore=sc;bestW=[...w];}
    if(trial%Math.floor(3000/STARTS)===0)candidates.push([...w]);
  }
  candidates.push([...bestW]);

  // ?? Phase 2 : Gradient Ascent depuis chaque candidat ?????????????
  for(const start of candidates){
    let w=[...start];
    let lr=0.05; // learning rate initial
    let prevScore=score(w);
    for(let step=0;step<300;step++){
      const g=gradient(w);
      // Normaliser le gradient
      const gnorm=Math.sqrt(g.reduce((a,b)=>a+b*b,0));
      if(gnorm<1e-10)break;
      const gn=g.map(x=>x/gnorm);
      // Line search simple
      const wNew=projectSimplex(w.map((x,i)=>x+lr*gn[i]),wMin,wMax);
      const newScore=score(wNew);
      if(newScore>prevScore){
        w=wNew;prevScore=newScore;lr=Math.min(lr*1.1,0.3);
        if(newScore>bestScore){bestScore=newScore;bestW=[...w];}
      } else {
        lr*=0.5;if(lr<1e-6)break;
      }
    }
  }

  // ?? R?sultats finaux ??????????????????????????????????????????????
  const finalRet=portRet(bestW);
  const finalVol=portVol(bestW);
  const finalSharpe=finalVol>0?(finalRet-rfRate)/finalVol:0;
  const portR:number[]=[];
  for(let t=0;t<T;t++){let pr=0;syms.forEach((s,i)=>{pr+=bestW[i]*(returns[s][t]||0);});portR.push(pr);}
  portR.sort((a,b)=>a-b);
  const var95=Math.abs(portR[Math.floor(portR.length*0.05)]||0)*Math.sqrt(52);
  const weights:Record<string,number>={};syms.forEach((s,i)=>{if(bestW[i]>0.01)weights[s]=bestW[i];});
  return{weights,ret:finalRet,vol:finalVol,sharpe:finalSharpe,var95};
}

type Weight={symbol:string;name:string;type:string;weight:number;amount:number};
type FPt={vol:number;ret:number};
type Result={method:string;label:string;ret:number;vol:number;sharpe:number;var95:number;rec?:boolean;weights:Weight[];frontier:FPt[]};

export async function POST(req:NextRequest){
  const{capital=50000,answers={}}=await req.json();
  try{
    const{symbols,minBondPct,minGoldPct,minReitPct,minCryptoPct,minEMPct}=selectUniverse(answers);
    const returns=await fetchReturns(symbols,10);
    // Proxy: si un actif a peu de data, utiliser le meilleur du meme dedup
    const dedupBest:Record<string,string>={};
    CAT.forEach(a=>{
      const cur=dedupBest[a.dedup];
      if(!cur||(returns[a.s]?.length||0)>(returns[cur]?.length||0))dedupBest[a.dedup]=a.s;
    });
    Object.keys(returns).forEach(sym=>{
      const asset=CAT.find(a=>a.s===sym);if(!asset)return;
      const best=dedupBest[asset.dedup];
      if(best&&best!==sym&&(returns[best]?.length||0)>(returns[sym].length*1.5))returns[sym]=returns[best];
    });
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
      const opt=markowitz(returns,method,minClass);
      const rawW=Object.entries(opt.weights).filter(([,v])=>v>0.01).sort((a,b)=>b[1]-a[1]);
      const totalW=rawW.reduce((s,[,v])=>s+v,0);
      // Arrondir tous les poids puis ajuster le dernier pour sum=100%
      const roundedW=rawW.map(([,v])=>Math.round(v/totalW*1000)/10);
      const sumR=roundedW.reduce((a,b)=>a+b,0);
      if(roundedW.length>0)roundedW[roundedW.length-1]=Math.round((roundedW[roundedW.length-1]+(100-sumR))*10)/10;
      const weights:Weight[]=rawW.map(([sym,w],i)=>({
        symbol:sym,name:meta[sym]?.name||sym,type:meta[sym]?.type||"etf",
        weight:roundedW[i],
        amount:Math.round(w/totalW*capital),
      }));
      return{method,label,rec,ret:Math.round(opt.ret*1000)/10,vol:Math.round(opt.vol*1000)/10,sharpe:Math.round(opt.sharpe*100)/100,var95:Math.round(opt.var95*1000)/10,weights,frontier};
    });
    return NextResponse.json({results,universe:validSyms.length});
  }catch(err){console.error("Optimize error:",err);return NextResponse.json({error:"Erreur serveur"},{status:500});}
}
