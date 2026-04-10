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
  dedup:string; ter:number; weeks?:number;
  pea:boolean; cto:boolean; av:boolean;
  esg?:boolean; excl_esg?:boolean;
}

/* =========================================================
   CATALOGUE v6 — Loaded from Neon DB with fallback to static
   ========================================================= */

// Static fallback catalogue (critical assets only)
const CAT_STATIC: Asset[] = [
  // ETF MONDE
  {s:"CW8.PA",   n:"Amundi MSCI World Swap PEA",    zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.12,pea:true, cto:true, av:true },
  {s:"PANX.PA",  n:"ETF MSCI World PEA (PANX)",     zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.13,pea:true, cto:true, av:true },
  {s:"EWLD.PA",  n:"Amundi MSCI World Swap Dist PEA",zone:"monde",type:"etf",dedup:"MSCI_WORLD",   ter:0.12,pea:true, cto:true, av:true },
  {s:"IWDA.AS",  n:"iShares MSCI World",            zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.20,pea:false,cto:true, av:false},
  {s:"EUNL.DE",  n:"iShares MSCI World EUR",        zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.20,pea:false,cto:true, av:false},
  {s:"VWCE.DE",  n:"Vanguard FTSE All-World",       zone:"monde",type:"etf",dedup:"FTSE_ALLWORLD", ter:0.22,pea:false,cto:true, av:false},
  {s:"ACWI",     n:"iShares MSCI ACWI",             zone:"monde",type:"etf",dedup:"MSCI_ACWI",     ter:0.32,pea:false,cto:true, av:false},
  {s:"SUWS.L",   n:"iShares MSCI World ESG",        zone:"monde",type:"etf",dedup:"MSCI_WORLD",    ter:0.20,pea:false,cto:true, av:false,esg:true},
  // ETF SP500
  {s:"PE500.PA", n:"ETF SP500 PEA",                 zone:"usa",  type:"etf",dedup:"SP500",         ter:0.15,pea:true, cto:true, av:true },
  {s:"PSP5.PA",  n:"Amundi PEA S&P 500",            zone:"usa",  type:"etf",dedup:"SP500",         ter:0.15,pea:true, cto:true, av:true },
  {s:"ESE.PA",   n:"BNP Easy S&P 500",              zone:"usa",  type:"etf",dedup:"SP500",         ter:0.15,pea:true, cto:true, av:true },
  {s:"SXR8.DE",  n:"iShares S&P 500 EUR",           zone:"usa",  type:"etf",dedup:"SP500",         ter:0.07,pea:false,cto:true, av:true },
  {s:"CSPX.L",   n:"iShares Core S&P 500",          zone:"usa",  type:"etf",dedup:"SP500",         ter:0.07,pea:false,cto:true, av:false},
  {s:"IVV",      n:"iShares Core S&P 500",            zone:"usa",  type:"etf",dedup:"SP500",         ter:0.04,pea:false,cto:true, av:false},
  {s:"VOO",      n:"Vanguard S&P 500",              zone:"usa",  type:"etf",dedup:"SP500",         ter:0.03,pea:false,cto:true, av:false},
  {s:"SPY",      n:"SPDR S&P 500",                  zone:"usa",  type:"etf",dedup:"SP500",         ter:0.095,pea:false,cto:true,av:false},
  // ETF NASDAQ
  {s:"PUST.PA",  n:"ETF NASDAQ-100 PEA",            zone:"usa",  type:"etf",dedup:"NASDAQ100",     ter:0.23,pea:true, cto:true, av:true },
  {s:"EQQQ.DE",  n:"Invesco NASDAQ 100 EUR",        zone:"usa",  type:"etf",dedup:"NASDAQ100",     ter:0.30,pea:false,cto:true, av:false},
  {s:"QQQ",      n:"Invesco NASDAQ 100",            zone:"usa",  type:"etf",dedup:"NASDAQ100",     ter:0.20,pea:false,cto:true, av:false},
  // ETF EUROPE
  {s:"C50.PA",   n:"Amundi Euro Stoxx 50 PEA",      zone:"europe",type:"etf",dedup:"EUROSTOXX50", ter:0.10,pea:true, cto:true, av:true },
  {s:"EXSA.DE",  n:"iShares Euro Stoxx 50",         zone:"europe",type:"etf",dedup:"EUROSTOXX50", ter:0.10,pea:true, cto:true, av:false},
  {s:"MEUD.PA",  n:"Lyxor Euro Stoxx 50 PEA",       zone:"europe",type:"etf",dedup:"EUROSTOXX50", ter:0.11,pea:true, cto:true, av:true },
  {s:"SMEA.PA",  n:"Amundi MSCI Europe PEA",        zone:"europe",type:"etf",dedup:"MSCI_EUROPE", ter:0.15,pea:true, cto:true, av:true },
  {s:"EXW1.DE",  n:"iShares MSCI Europe",           zone:"europe",type:"etf",dedup:"MSCI_EUROPE", ter:0.12,pea:false,cto:true, av:false},
  {s:"EPRE.PA",  n:"AXA Europe Real Estate PEA",    zone:"europe",type:"reit",dedup:"EU_REITS",   ter:0.40,pea:true, cto:true, av:true },
  {s:"SMC.PA",   n:"ETF CAC Mid 60 PEA",            zone:"europe",type:"etf",dedup:"CAC_MID60",   ter:0.35,pea:true, cto:true, av:true },
  {s:"EESM.PA",  n:"ETF MSCI Europe Small Cap PEA",  zone:"europe",type:"etf",dedup:"MSCI_EU_SMALL",ter:0.28,pea:true, cto:true, av:true },
  {s:"LCWD.PA",  n:"Lyxor MSCI World PEA",           zone:"monde",type:"etf",dedup:"MSCI_WORLD",   ter:0.12,pea:true, cto:true, av:true },
  {s:"IPRP.L",   n:"iShares Europe Property",       zone:"europe",type:"reit",dedup:"EU_REITS",   ter:0.40,pea:false,cto:true, av:false},
  // ETF EM
  {s:"PAEEM.PA", n:"Amundi MSCI EM PEA",            zone:"em",type:"etf",dedup:"MSCI_EM",         ter:0.20,pea:true, cto:true, av:true },
  {s:"AEEM.PA",  n:"Amundi MSCI EM ESG PEA",        zone:"em",type:"etf",dedup:"MSCI_EM",         ter:0.25,pea:true, cto:true, av:true, esg:true},
  {s:"VWO",      n:"Vanguard FTSE EM",              zone:"em",type:"etf",dedup:"FTSE_EM",          ter:0.08,pea:false,cto:true, av:false},
  {s:"IEMG",     n:"iShares Core MSCI EM",          zone:"em",type:"etf",dedup:"FTSE_EM",          ter:0.11,pea:false,cto:true, av:false},
  {s:"VFEM.L",   n:"Vanguard FTSE EM",              zone:"em",type:"etf",dedup:"FTSE_EM",          ter:0.22,pea:false,cto:true, av:false},
  {s:"MCHI",     n:"iShares MSCI China",            zone:"em",type:"etf",dedup:"MSCI_CHINA",       ter:0.19,pea:false,cto:true, av:false},
  {s:"KWEB",     n:"KraneShares China Internet",    zone:"em",type:"etf",dedup:"CHINA_NET",        ter:0.70,pea:false,cto:true, av:false},
  {s:"INDA",     n:"iShares MSCI India",            zone:"em",type:"etf",dedup:"MSCI_INDIA",       ter:0.64,pea:false,cto:true, av:false},
  {s:"EWZ",      n:"iShares MSCI Brazil",           zone:"em",type:"etf",dedup:"MSCI_BRAZIL",      ter:0.59,pea:false,cto:true, av:false},
  {s:"EWY",      n:"iShares MSCI S.Korea",          zone:"em",type:"etf",dedup:"MSCI_KOREA",       ter:0.49,pea:false,cto:true, av:false},
  {s:"EWT",      n:"iShares MSCI Taiwan",           zone:"em",type:"etf",dedup:"MSCI_TAIWAN",      ter:0.59,pea:false,cto:true, av:false},
  {s:"EWH",      n:"iShares MSCI Hong Kong",        zone:"em",type:"etf",dedup:"MSCI_HK",          ter:0.49,pea:false,cto:true, av:false},
  // OBLIGATIONS
  {s:"XGLE.DE",n:"Xtrackers EUR Gov Bond",          zone:"europe",type:"bond",dedup:"EUR_GOV",     ter:0.09,pea:false,cto:true,av:true },
  {s:"IBGS.L", n:"ETF Oblig Gouv EUR 1-3Y",         zone:"europe",type:"bond",dedup:"EUR_GOV_ST",  ter:0.09,pea:false,cto:true,av:true },
  {s:"IEAG.L", n:"iShares EUR Agg Bond",            zone:"europe",type:"bond",dedup:"EUR_AGG",     ter:0.17,pea:false,cto:true,av:false},
  {s:"AGGH.L", n:"ETF Oblig Aggregate Monde",       zone:"any",   type:"bond",dedup:"GLOBAL_AGG",  ter:0.10,pea:false,cto:true,av:false},
  {s:"TLT",    n:"iShares 20Y US Treasury",         zone:"usa",   type:"bond",dedup:"US_20Y",      ter:0.15,pea:false,cto:true,av:false},
  {s:"IEF",    n:"iShares 7-10Y Treasury",          zone:"usa",   type:"bond",dedup:"US_7_10Y",    ter:0.15,pea:false,cto:true,av:false},
  {s:"AGG",    n:"iShares US Aggregate Bond",       zone:"usa",   type:"bond",dedup:"US_AGG",      ter:0.03,pea:false,cto:true,av:false},
  {s:"LQD",    n:"iShares USD IG Corp Bond",        zone:"usa",   type:"bond",dedup:"US_IG",       ter:0.14,pea:false,cto:true,av:false},
  {s:"HYG",    n:"iShares USD High Yield",          zone:"usa",   type:"bond",dedup:"US_HY",       ter:0.48,pea:false,cto:true,av:false},
  {s:"VWOB",   n:"Vanguard EM Gov Bond",            zone:"em",    type:"bond",dedup:"EM_GOV",      ter:0.20,pea:false,cto:true,av:false},
  // OR & MATIERES
  {s:"SGLD.L", n:"Invesco Physical Gold EUR",       zone:"any",type:"gold",     dedup:"GOLD_EU",   ter:0.12,pea:false,cto:true,av:true },
  {s:"IGLN.L", n:"iShares Physical Gold ETC",      zone:"any",type:"gold",     dedup:"GOLD_EU",   ter:0.19,pea:false,cto:true,av:false },
  {s:"GLD",    n:"SPDR Gold Shares",                zone:"any",type:"gold",     dedup:"GOLD_US",   ter:0.40,pea:false,cto:true,av:false},
  {s:"IAU",    n:"iShares Gold Trust",              zone:"any",type:"gold",     dedup:"GOLD_US",   ter:0.25,pea:false,cto:true,av:false},
  {s:"GNR",    n:"SPDR Natural Resources",          zone:"any",type:"commodity",dedup:"NAT_RES",   ter:0.46,pea:false,cto:true,av:false},
  // REIT
  {s:"VNQ",   n:"Vanguard US REITs",                zone:"usa",type:"reit",dedup:"US_REITS",       ter:0.12,pea:false,cto:true,av:false},
  {s:"REET",  n:"iShares Global REITs",             zone:"any",type:"reit",dedup:"GLOBAL_REITS",   ter:0.14,pea:false,cto:true,av:false},
  // CRYPTO
  {s:"BTC-USD",n:"Bitcoin",            zone:"any",type:"crypto",dedup:"BTC",ter:0,   pea:false,cto:false,av:false},
  {s:"ETH-USD",n:"Ethereum",           zone:"any",type:"crypto",dedup:"ETH",ter:0,   pea:false,cto:false,av:false},
  {s:"SOL-USD",n:"Solana",             zone:"any",type:"crypto",dedup:"SOL",ter:0,   pea:false,cto:false,av:false},
  {s:"BNB-USD",n:"BNB",                zone:"any",type:"crypto",dedup:"BNB",ter:0,   pea:false,cto:false,av:false},
  {s:"IBIT",   n:"iShares Bitcoin ETF",zone:"usa", type:"crypto",dedup:"BTC",ter:0.25,pea:false,cto:true, av:false},
  // ACTIONS USA
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
  // ACTIONS EUROPE PEA
  {s:"MC.PA",    n:"LVMH",               zone:"europe",type:"stock",dedup:"MC_PA",   ter:0,pea:true, cto:true,av:true},
  {s:"RMS.PA",   n:"Hermes",             zone:"europe",type:"stock",dedup:"RMS_PA",  ter:0,pea:true, cto:true,av:true},
  {s:"AIR.PA",   n:"Airbus",             zone:"europe",type:"stock",dedup:"AIR_PA",  ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"SAF.PA",   n:"Safran",             zone:"europe",type:"stock",dedup:"SAF_PA",  ter:0,pea:true, cto:true,av:true},
  {s:"SAN.PA",   n:"Sanofi",             zone:"europe",type:"stock",dedup:"SAN_PA",  ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"OR.PA",    n:"LOreal",             zone:"europe",type:"stock",dedup:"OR_PA",   ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"SU.PA",    n:"Schneider Electric", zone:"europe",type:"stock",dedup:"SU_PA",   ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"ENGI.PA",  n:"Engie",              zone:"europe",type:"stock",dedup:"ENGI_PA", ter:0,pea:true, cto:true,av:true},
  {s:"ORA.PA",   n:"Orange",             zone:"europe",type:"stock",dedup:"ORA_PA",  ter:0,pea:true, cto:true,av:true},
  {s:"EL.PA",    n:"EssilorLuxottica",   zone:"europe",type:"stock",dedup:"EL_PA",   ter:0,pea:true, cto:true,av:true},
  {s:"BNP.PA",   n:"BNP Paribas",        zone:"europe",type:"stock",dedup:"BNP_PA",  ter:0,pea:true, cto:true,av:true},
  {s:"ASML.AS",  n:"ASML",               zone:"europe",type:"stock",dedup:"ASML_AS", ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"SAP.DE",   n:"SAP",                zone:"europe",type:"stock",dedup:"SAP_DE",  ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"SIE.DE",   n:"Siemens",            zone:"europe",type:"stock",dedup:"SIE_DE",  ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"NOVO-B.CO",n:"Novo Nordisk",       zone:"europe",type:"stock",dedup:"NOVO_CO", ter:0,pea:true, cto:true,av:true,esg:true},
  {s:"NESN.SW",  n:"Nestle",             zone:"europe",type:"stock",dedup:"NESN_SW", ter:0,pea:false,cto:true,av:true,esg:true},
  {s:"ROG.SW",   n:"Roche",              zone:"europe",type:"stock",dedup:"ROG_SW",  ter:0,pea:false,cto:true,av:true,esg:true},
];

// Dynamic catalogue cache
let CAT_CACHE: Asset[] | null = null;
let CAT_CACHE_TIME = 0;

async function loadCatalogue(): Promise<Asset[]> {
  if (CAT_CACHE && Date.now() - CAT_CACHE_TIME < 60000) return CAT_CACHE; // 60s cache
  const client = await pool.connect();
  try {
    // Only load curated assets (those in dedup_groups) with sufficient data
    const { rows } = await client.query(`
      SELECT
        am.symbol as s, am.name as n, am.type,
        dg.dedup_key as dedup,
        COALESCE(dg.ter, am.ter, 0) as ter,
        COALESCE(am.pea, false) as pea,
        COALESCE(am.cto, true) as cto,
        COALESCE(am.av, false) as av,
        COALESCE(am.zone, 'any') as zone,
        COALESCE(am.excl_esg, false) as excl_esg,
        CASE WHEN er.esg_score >= 7 THEN true ELSE false END as esg,
        (SELECT COUNT(*) FROM assets_history ah WHERE ah.symbol = am.symbol) as weeks
      FROM assets_master am
      INNER JOIN dedup_groups dg ON dg.symbol = am.symbol
      LEFT JOIN esg_ratings er ON er.symbol = am.symbol
      WHERE am.symbol IN (
        SELECT symbol FROM assets_history
        GROUP BY symbol HAVING COUNT(*) >= 200
      )
      ORDER BY am.type, dg.ter ASC, am.symbol
    `);
    // Build lookup from static catalogue for type overrides
    const staticLookup = new Map<string, Asset>();
    CAT_STATIC.forEach(a => staticLookup.set(a.s, a));

    CAT_CACHE = rows.map(r => {
      const staticAsset = staticLookup.get(r.s);
      // Use type from static catalogue (has correct bond/gold/reit/crypto types)
      // Neon DB has type="etf" for everything
      const type = staticAsset?.type || inferType(r.dedup, r.type);
      return {
        s: r.s, n: r.n || r.s,
        type: type as Asset["type"],
        dedup: r.dedup || r.s,
        ter: parseFloat(r.ter) || 0,
        pea: staticAsset?.pea ?? (r.pea === true),
        cto: staticAsset?.cto ?? (r.cto === true),
        av: staticAsset?.av ?? (r.av === true),
        zone: (staticAsset?.zone || r.zone || "any") as Asset["zone"],
        esg: staticAsset?.esg ?? (r.esg === true),
        excl_esg: staticAsset?.excl_esg ?? (r.excl_esg === true),
        weeks: parseInt(r.weeks) || 0,
      };
    });
    CAT_CACHE_TIME = Date.now();
    console.log(`[CAT] Loaded ${CAT_CACHE.length} assets from Neon`);
    return CAT_CACHE;
  } catch (err) {
    console.error("[CAT] Failed to load from Neon, using static fallback:", err);
    return CAT_STATIC;
  } finally {
    client.release();
  }
}

// Infer correct asset type from dedup key (Neon has type="etf" for everything)
function inferType(dedup: string, dbType: string): string {
  const bondKeys = ["EUR_GOV", "EUR_GOV_ST", "EUR_AGG", "GLOBAL_AGG", "US_20Y", "US_7_10Y", "US_AGG", "US_IG", "US_HY", "EM_GOV", "US_1_3Y", "US_TOTAL", "US_TIPS", "EM_BOND_USD"];
  const goldKeys = ["GOLD_EU", "GOLD_US", "GOLD_MINERS"];
  const commodityKeys = ["NAT_RES", "CMDTY"];
  const reitKeys = ["US_REITS", "US_REITS2", "US_REITS3", "GLOBAL_REITS", "EU_REITS", "AMT", "DLR", "PLD"];
  const cryptoKeys = ["BTC", "ETH", "SOL", "BNB"];
  if (bondKeys.includes(dedup)) return "bond";
  if (goldKeys.includes(dedup)) return "gold";
  if (commodityKeys.includes(dedup)) return "commodity";
  if (reitKeys.includes(dedup)) return "reit";
  if (cryptoKeys.includes(dedup)) return "crypto";
  if (dbType === "stock") return "stock";
  return "etf";
}

const BANK_BLOCKED: Record<string, string[]> = {
  "BoursoBank":          ["VOO","VTI","SPY","QQQ","CSPX.L","IVV","AGG","TLT","LQD","HYG","IEF","VNQ","GLD","IAU","IEMG","VWO","ACWI","REET","GNR","MCHI","KWEB","INDA","EWZ","EWY","EWT","EWH","IBIT"],
  "Fortuneo":            ["VOO","VTI","SPY","QQQ","IVV","AGG","TLT","LQD","HYG","IEF","VNQ","GLD","IAU","IEMG","VWO","ACWI","REET","GNR","MCHI","KWEB","INDA","EWZ","EWY","EWT","EWH","IBIT"],
  "Hello Bank":          ["VOO","VTI","SPY"],
  "BNP Paribas":         ["VOO","VTI","SPY","QQQ","AGG","TLT","LQD","HYG","IEF","VNQ","GLD","IAU","IEMG","CSPX.L","VFEM.L","IVV","VWO","ACWI","REET","GNR","IBIT"],
  "Societe Generale":    ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG","CSPX.L"],
  "Credit Agricole":     ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG","CSPX.L"],
  "Caisse Epargne":      ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG"],
  "Banque Populaire":    ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG"],
  "LCL":                 ["VOO","VTI","SPY","QQQ","TLT","IEF","IEMG","CSPX.L"],
  "Degiro":              ["VOO","VTI","SPY","QQQ","AGG","TLT","LQD","HYG","IEF","VNQ","GLD","IAU","IEMG","SHY","BND","TIP","VWOB","EMB","VWO","REET","GNR","GSG","IWM","IJR","IJH","VYM","DVY","SCHD","VIG","MTUM","USMV","VTV","VUG","RSP","EFA","VEA","EWJ","EWA","EWC","IYR","XLRE","AMT","DLR","PLD","GDX","XLK","IGV","SOXX","SMH","XLV","IBB","XLF","XLE","XLI","XLY","XLP","ITA","PPA","ACWI","IVV","IVW","XLB","IDU","FEZ","EWP","EWI","EWG","EWU","MCHI","KWEB","INDA","EWZ","EWY","EWT","EWH","IBIT","VWOB"],
  "Trade Republic":      [],
  "Interactive Brokers": ["PAEEM.PA","AEEM.PA"],
  "Saxo Bank":           ["VOO","VTI","SPY","QQQ","IVV","AGG","TLT","LQD","HYG","IEF","VNQ","GLD","IAU","IEMG","VWO","ACWI","REET","GNR","IBIT"],
  "Bourse Direct":       ["VOO","VTI","SPY","QQQ","IVV","AGG","TLT","LQD","HYG","IEF","VNQ","GLD","IAU","IEMG","VWO","ACWI","REET","GNR","IBIT"],
  "Binance / Coinbase":  [],
  "Autre":               [],
};

function norm(s: string) {
  return s.toLowerCase()
    .replace(/[\u00e9\u00e8\u00ea\u00eb]/g, "e")
    .replace(/[\u00e0\u00e2\u00e4]/g, "a")
    .replace(/[\u00f9\u00fb\u00fc]/g, "u")
    .replace(/[\u00ee\u00ef]/g, "i")
    .replace(/[\u00f4\u00f6]/g, "o")
    .replace(/[\u00e7]/g, "c");
}

function dedupFilter(assets: Asset[]): Asset[] {
  const m = new Map<string, Asset>();
  for (const a of assets) {
    const ex = m.get(a.dedup);
    if (!ex || a.ter < ex.ter) m.set(a.dedup, a);
  }
  return [...m.values()];
}

/* =========================================================
   selectUniverse() — 8-STEP ARCHITECTURE (Section 3)
   ========================================================= */
function selectUniverse(answers: Record<string, string>, CAT: Asset[]): {
  symbols: string[]; minBondPct: number; minGoldPct: number; minReitPct: number;
  minCryptoPct: number; minEMPct: number; maxWt: number;
} {
  const q1 = answers["1"] || "", q2 = answers["2"] || "", q3 = answers["3"] || "";
  const q4 = answers["4"] || "", q5 = answers["5"] || "", q6raw = answers["6"] || "";
  const q7 = answers["7"] || "", q8raw = answers["8"] || "", q9 = answers["9"] || "";
  const n5 = norm(q5), n4 = norm(q4), n7 = norm(q7);

  // ── 3.1 Parse horizon & risk ──
  const isShort = norm(q1).includes("2 ans") || norm(q1).includes("moins");

  const riskFromQ2: Record<string, string> = {
    conservateur: "defensive", modere: "moderate", dynamique: "balanced", agressif: "aggressive"
  };
  const riskFromQ3: Record<string, string> = {
    "10%": "defensive", "20%": "moderate", "35%": "balanced"
  };
  const riskOrder = ["defensive", "moderate", "balanced", "aggressive"];

  let riskQ2 = "balanced";
  for (const [k, v] of Object.entries(riskFromQ2)) { if (norm(q2).includes(k)) { riskQ2 = v; break; } }
  let riskQ3 = "aggressive"; // default if "pas de limite"
  if (norm(q3).includes("limite") || norm(q3).includes("illimite")) riskQ3 = "aggressive";
  else { for (const [k, v] of Object.entries(riskFromQ3)) { if (q3.includes(k)) { riskQ3 = v; break; } } }

  let risk = riskOrder[Math.min(riskOrder.indexOf(riskQ2), riskOrder.indexOf(riskQ3))] as
    "defensive" | "moderate" | "balanced" | "aggressive";
  if (isShort && riskOrder.indexOf(risk) > 1) risk = "moderate";

  // ── 3.3 Parse supports (q8) — JSON format or legacy string ──
  let comptes: Array<{ type: string; banque: string; pct: number }> = [];
  try {
    const parsed = JSON.parse(q8raw);
    if (Array.isArray(parsed)) comptes = parsed;
  } catch {
    // Legacy string format: "PEA", "Compte-Titres (CTO)", "Assurance-Vie"
    const parts = q8raw.split(",").map(s => s.trim());
    for (const p of parts) {
      const np = norm(p);
      if (np.includes("pea")) comptes.push({ type: "PEA", banque: q9 || "Autre", pct: 100 });
      else if (np.includes("cto") || np.includes("compte")) comptes.push({ type: "CTO", banque: q9 || "Autre", pct: 100 });
      else if (np.includes("assurance") || np.includes("vie")) comptes.push({ type: "AV", banque: q9 || "Autre", pct: 100 });
      else if (np.includes("crypto")) comptes.push({ type: "crypto", banque: "Autre", pct: 100 });
    }
  }
  if (comptes.length === 0) comptes.push({ type: "CTO", banque: q9 || "Autre", pct: 100 });

  const wPEA = comptes.some(c => c.type === "PEA");
  const wCTO = comptes.some(c => c.type === "CTO");
  const wAV = comptes.some(c => c.type === "AV");
  const wCrypto = comptes.some(c => c.type === "crypto") || n5.includes("crypto");

  const banquePEA = comptes.find(c => c.type === "PEA")?.banque || "";
  const banqueCTO = comptes.find(c => c.type === "CTO")?.banque || "";
  const banqueAV = comptes.find(c => c.type === "AV")?.banque || "";

  // Build blocked set from all relevant banks
  const allBlocked = new Set<string>();
  const addBlocked = (banque: string) => {
    // Normalize bank name for lookup
    const nb = norm(banque);
    for (const [key, vals] of Object.entries(BANK_BLOCKED)) {
      if (norm(key) === nb || nb.includes(norm(key)) || norm(key).includes(nb)) {
        vals.forEach(v => allBlocked.add(v));
        return;
      }
    }
  };
  if (wPEA) addBlocked(banquePEA);
  if (wCTO) addBlocked(banqueCTO);
  if (wAV) addBlocked(banqueAV);
  // Legacy q9 bank
  if (q9 && BANK_BLOCKED[q9]) BANK_BLOCKED[q9].forEach(v => allBlocked.add(v));

  const blocked = allBlocked;

  // Support eligibility check
  const supOk = (a: Asset) =>
    (wPEA && a.pea && !blocked.has(a.s)) ||
    (wCTO && a.cto && !blocked.has(a.s)) ||
    (wAV && a.av && !blocked.has(a.s)) ||
    (wCrypto && a.type === "crypto");

  // ── 3.4 Parse zones (q6) — JSON format or legacy string ──
  let zones = { monde: true, nordAmerique: false, europe: false, asiePacifique: false, amLatine: false, afriqueMO: false, em: false };
  try {
    const parsed = JSON.parse(q6raw);
    if (typeof parsed === "object" && parsed !== null) {
      zones = { monde: false, nordAmerique: false, europe: false, asiePacifique: false, amLatine: false, afriqueMO: false, em: false, ...parsed };
    }
  } catch {
    // Legacy string format
    const n6 = norm(q6raw);
    if (n6.includes("monde") || n6.includes("world") || n6 === "") {
      zones.monde = true;
    } else {
      zones.monde = false;
      if (n6.includes("usa") || n6.includes("amerique") || n6.includes("nord")) zones.nordAmerique = true;
      if (n6.includes("europe")) zones.europe = true;
      if (n6.includes("asie") || n6.includes("pacifique")) zones.asiePacifique = true;
      if (n6.includes("latine") || n6.includes("bresil")) zones.amLatine = true;
      if (n6.includes("emergent") || n6.includes("em")) zones.em = true;
    }
  }

  const zoneFilter = (a: Asset) => {
    if (zones.monde) return true;
    if (zones.nordAmerique && a.zone === "usa") return true;
    if (zones.europe && a.zone === "europe") return true;
    if (zones.asiePacifique && a.zone === "em" && ["MCHI", "EWH", "EWT", "EWY", "INDA", "EWJ", "EWA"].includes(a.s)) return true;
    if (zones.amLatine && a.zone === "em" && ["EWZ", "MELI"].includes(a.s)) return true;
    if (zones.em && a.zone === "em") return true;
    if (a.zone === "any") return true;
    return false;
  };

  // Convenience booleans
  const zMonde = zones.monde;
  const zUSA = zones.nordAmerique && !zones.monde;
  const zEU = zones.europe && !zones.monde;
  const zEM = zones.em && !zones.monde;

  // ── Parse classes ──
  const wETF = n5 === "" || n5.includes("etf");
  const wStocks = n5 === "" || n5.includes("action");
  const wBonds = n5.includes("oblig");
  const wGold = n5.includes("or") || n5.includes("matier");
  const wReits = n5.includes("immob");
  const onlyCrypto = n5.trim() === "crypto";
  const onlyBonds = n5.trim() === "obligation" || n5.trim() === "obligations";

  // ── ESG ──
  const esgStrict = n4.includes("strict");
  const esgPartial = n4.includes("armement") || n4.includes("tabac") || n4.includes("exclusion");

  // ── MaxAssets ──
  const maxAssets = n7.includes("concentre") || n7.includes("5 actifs") ? 7
    : n7.includes("large") || n7.includes("15") ? 28 : 16;

  // ── Crypto-only shortcut ──
  if (onlyCrypto || (wCrypto && !wETF && !wStocks && !wBonds)) {
    const cr = CAT.filter(a => a.type === "crypto" && !blocked.has(a.s));
    return {
      symbols: dedupFilter(cr).map(a => a.s).slice(0, maxAssets),
      minBondPct: 0, minGoldPct: 0, minReitPct: 0, minCryptoPct: 30, minEMPct: 0,
      maxWt: 0.35,
    };
  }

  // ── Constants ──
  const WDEDUPS = ["MSCI_WORLD", "FTSE_ALLWORLD", "MSCI_ACWI"];
  // ALL sub-indices contained in MSCI_WORLD
  const WORLD_SUBS = ["SP500", "NASDAQ100", "EUROSTOXX50", "MSCI_EUROPE",
    "FTSE_EUR", "MSCI_EMU", "MSCI_EAFE", "FTSE_DEV",
    "US_VALUE", "US_GROWTH", "US_SMALL", "US_SMALL2", "US_MID",
    "US_TECH", "US_SOFTWARE", "US_SEMIS", "US_SEMIS2", "US_HEALTH",
    "US_BIOTECH", "US_FINANCE", "US_ENERGY", "US_INDUS", "US_CONS_D",
    "US_CONS_S", "US_DEFENSE", "US_AERO", "US_DIV", "US_DIV2", "US_DIV3",
    "US_DIVGROW", "US_MOMENTUM", "US_MINVOL", "US_EW",
    "MSCI_JAPAN", "MSCI_CAN", "MSCI_AUS",
    "MSCI_SPAIN", "MSCI_ITALY", "MSCI_GERMANY", "MSCI_UK"];
  const EM_BROAD = ["MSCI_EM", "FTSE_EM"];
  const EM_COUNTRY = ["MSCI_CHINA", "CHINA_NET", "MSCI_INDIA", "MSCI_TAIWAN",
    "MSCI_HK", "MSCI_KOREA", "MSCI_BRAZIL"];

  /* ═══════════════════════════════════════════════════════
     ETAPE 1 : Filtre de base + dedup strict
     ═══════════════════════════════════════════════════════ */
  const baseFilter = (useZone: boolean) => CAT.filter(a => {
    if (!supOk(a)) return false;
    if (useZone && !zoneFilter(a)) return false;
    if (blocked.has(a.s)) return false;
    if (onlyBonds && a.type !== "bond") return false;
    if (a.type === "crypto" && !wCrypto) return false;
    if (!wETF && a.type === "etf") return false;
    if (!wStocks && a.type === "stock") return false;
    if (!wGold && a.type === "gold" && a.type === "gold") return false;
    if (!wGold && a.type === "commodity") return false;
    if (!wReits && a.type === "reit") return false;
    if (!wBonds && a.type === "bond" && risk === "aggressive") return false;
    if (esgStrict && !a.esg) return false;
    if (esgPartial && a.excl_esg) return false;
    if (risk === "defensive" && ["TSLA", "NVDA", "KWEB", "MCHI", "BTC-USD", "ETH-USD", "SOL-USD"].includes(a.s)) return false;
    return true;
  });

  // Dedup strict: 1 asset per dedup group (lowest TER, prefer PEA/AV if needed)
  const smartDedup = (assets: Asset[]): Asset[] => {
    const m = new Map<string, Asset>();
    for (const a of assets) {
      const ex = m.get(a.dedup);
      if (!ex) { m.set(a.dedup, a); continue; }
      // Prefer PEA-eligible if user has PEA
      if (wPEA && a.pea && !ex.pea) { m.set(a.dedup, a); continue; }
      if (wPEA && !a.pea && ex.pea) continue;
      // Prefer AV-eligible if user has AV
      if (wAV && a.av && !ex.av) { m.set(a.dedup, a); continue; }
      if (wAV && !a.av && ex.av) continue;
      // Lowest TER wins, then most weeks (more data = better Markowitz)
      if (a.ter < ex.ter) { m.set(a.dedup, a); continue; }
      if (a.ter === ex.ter && (a.weeks || 0) > (ex.weeks || 0)) m.set(a.dedup, a);
    }
    return [...m.values()];
  };

  let pool2 = smartDedup(baseFilter(true));
  const _log: string[] = [];
  _log.push(`E1:${pool2.length}(${pool2.map(a=>a.dedup).join(',')})`);

  /* ═══════════════════════════════════════════════════════
     ETAPE 2 : Anti-doublon MSCI_WORLD
     Si ETF monde present → retirer TOUS les sous-indices
     ═══════════════════════════════════════════════════════ */
  const hasWorld = pool2.some(a => WDEDUPS.includes(a.dedup) && a.type === "etf");
  if (hasWorld && risk !== "aggressive") {
    const hasWorldPEA = pool2.some(a => WDEDUPS.includes(a.dedup) && a.pea && a.type === "etf");
    pool2 = pool2.filter(a => {
      if (WORLD_SUBS.includes(a.dedup)) {
        // Exception: keep PEA SP500 if user needs PEA and no PEA world ETF
        if (wPEA && !hasWorldPEA && a.pea && a.dedup === "SP500") return true;
        return false;
      }
      return true;
    });
  }

  _log.push();

  /* ═══════════════════════════════════════════════════════
     ETAPE 3 : Anti-doublon EM
     ═══════════════════════════════════════════════════════ */
  const hasBroadEM = pool2.some(a => EM_BROAD.includes(a.dedup) && a.type === "etf");
  if (hasBroadEM) {
    if (risk === "aggressive") {
      const emCtry = pool2.filter(a => EM_COUNTRY.includes(a.dedup));
      if (emCtry.length > 2) {
        const keep = emCtry.sort((a, b) => a.ter - b.ter).slice(0, 2).map(a => a.dedup);
        pool2 = pool2.filter(a => !EM_COUNTRY.includes(a.dedup) || keep.includes(a.dedup));
      }
    } else {
      pool2 = pool2.filter(a => !EM_COUNTRY.includes(a.dedup));
    }
  }

  _log.push();

  /* ═══════════════════════════════════════════════════════
     ETAPE 4 : Core-satellite par profil (zone monde)
     ═══════════════════════════════════════════════════════ */
  const isZoneMonde = zMonde || (!zUSA && !zEU && !zEM);
  if (isZoneMonde) {
    const wETFsM = pool2.filter(a => WDEDUPS.includes(a.dedup) && a.type === "etf");
    if (risk === "aggressive") {
      // AGRESSIF: SP500 + NASDAQ (pas d'ETF monde broad)
      pool2 = pool2.filter(a => !WDEDUPS.includes(a.dedup) || a.type !== "etf");
      const sp = CAT.find(a => a.dedup === "SP500" && supOk(a) && (!esgStrict || a.esg));
      const nq = CAT.find(a => a.dedup === "NASDAQ100" && supOk(a) && (!esgStrict || a.esg));
      if (sp && !pool2.find(a => a.dedup === "SP500")) pool2.push(sp);
      if (nq && !pool2.find(a => a.dedup === "NASDAQ100")) pool2.push(nq);
      // Add EM for geographic diversity + 1 Europe ETF
      const em = CAT.find(a => EM_BROAD.includes(a.dedup) && supOk(a) && (!esgStrict || a.esg));
      if (em && !pool2.find(a => EM_BROAD.includes(a.dedup))) pool2.push(em);
      const euETF = CAT.find(a => ["EUROSTOXX50","MSCI_EUROPE"].includes(a.dedup) && supOk(a) && (!esgStrict || a.esg));
      if (euETF && !pool2.find(a => ["EUROSTOXX50","MSCI_EUROPE"].includes(a.dedup))) pool2.push(euETF);
      // For aggressive monde: remove overlapping sub-regions, keep diversifiers
      const AGGRESSIVE_REMOVE = ["MSCI_EAFE", "FTSE_DEV", "MSCI_JAPAN", "MSCI_CAN", "MSCI_AUS",
        "MSCI_SPAIN", "MSCI_ITALY", "MSCI_GERMANY", "MSCI_UK", "FTSE_EUR", "MSCI_EMU"];
      pool2 = pool2.filter(a => !AGGRESSIVE_REMOVE.includes(a.dedup));
      // Add non-overlapping diversifiers to reach 8+ assets
      const AGG_DIVERSIFIERS = ["SGLD.L", "IGLN.L", "EPRE.PA", "IPRP.L"];
      for (const sym of AGG_DIVERSIFIERS) {
        if (pool2.length >= 10) break;
        const asset = CAT.find(a => a.s === sym);
        if (!asset || blocked.has(sym) || pool2.find(a => a.s === sym || a.dedup === asset.dedup)) continue;
        if (!supOk(asset)) continue;
        pool2.push(asset);
      }
    } else if (risk === "balanced") {
      // DYNAMIQUE: ETF monde + satellite SP500
      if (wETFsM.length > 1) {
        const best = wETFsM.reduce((b, a) => { if (wPEA && a.pea && !b.pea) return a; if (wPEA && !a.pea && b.pea) return b; return a.ter < b.ter ? a : b; });
        pool2 = pool2.filter(a => !WDEDUPS.includes(a.dedup) || a.s === best.s);
      }
      const sp = CAT.find(a => a.dedup === "SP500" && supOk(a) && (!esgStrict || a.esg));
      if (sp && !pool2.find(a => a.dedup === "SP500")) pool2.push(sp);
    } else {
      // DEFENSIF/MODERE: 1 seul ETF monde, pas de SP500/NASDAQ
      if (wETFsM.length > 1) {
        const best = wETFsM.reduce((b, a) => { if (wPEA && a.pea && !b.pea) return a; if (wPEA && !a.pea && b.pea) return b; return a.ter < b.ter ? a : b; });
        pool2 = pool2.filter(a => !WDEDUPS.includes(a.dedup) || a.s === best.s);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════
     ETAPE 4b : Anti-doublon SP500 sub-indices (for aggressive)
     When SP500 present, remove US sector/factor ETFs (subsets)
     ═══════════════════════════════════════════════════════ */
  const SP500_SUBS = ["US_TECH", "US_SOFTWARE", "US_SEMIS", "US_SEMIS2", "US_HEALTH",
    "US_BIOTECH", "US_FINANCE", "US_ENERGY", "US_INDUS", "US_CONS_D", "US_CONS_S",
    "US_DEFENSE", "US_AERO", "US_VALUE", "US_GROWTH", "US_EW", "SP500_GROWTH",
    "US_DIV", "US_DIV2", "US_DIV3", "US_DIVGROW", "US_MOMENTUM", "US_MINVOL",
    "US_SMALL", "US_SMALL2", "US_MID", "US_MATERIALS"];
  if (pool2.some(a => a.dedup === "SP500")) {
    pool2 = pool2.filter(a => !SP500_SUBS.includes(a.dedup));
  }

  // Overlap dedup: keep 1 from each overlap group
  const OVERLAP_GROUPS = [
    ["MSCI_EM", "FTSE_EM"],          // PAEEM.PA vs VWO
    ["US_AGG", "US_TOTAL"],           // AGG vs BND
    ["EUROSTOXX50", "MSCI_EUROPE", "FTSE_EUR", "MSCI_EMU"],
    ["MSCI_EAFE", "FTSE_DEV"],
    ["GOLD_EU", "GOLD_US", "GOLD_MINERS"],  // Max 1 gold exposure
  ];
  for (const group of OVERLAP_GROUPS) {
    const inGroup = pool2.filter(a => group.includes(a.dedup));
    if (inGroup.length > 1) {
      const best = inGroup.reduce((b, a) => {
        if (wPEA && a.pea && !b.pea) return a;
        if (wPEA && !a.pea && b.pea) return b;
        if (wAV && a.av && !b.av) return a;
        if (wAV && !a.av && b.av) return b;
        return a.ter < b.ter ? a : b;
      });
      pool2 = pool2.filter(a => !group.includes(a.dedup) || a.s === best.s);
    }
  }

  _log.push();

  /* ═══════════════════════════════════════════════════════
     ETAPE 5 : Enrichissement CTO/AV
     ═══════════════════════════════════════════════════════ */
  if (!wPEA && (wCTO || wAV) && !onlyBonds && !onlyCrypto) {
    const hasW5 = pool2.some(a => WDEDUPS.includes(a.dedup) && a.type === "etf");
    const CTO_BASE_AGG = ["SXR8.DE", "EQQQ.DE", "VWO", "VFEM.L", "PAEEM.PA", "EXW1.DE", "MCHI", "EWY"];
    const CTO_BASE_STD = ["VWO", "VFEM.L", "PAEEM.PA", "SGLD.L", "IGLN.L"];
    // For "large" profile with stocks requested, add individual stocks
    const CTO_LARGE_STOCKS = wStocks ? ["AAPL","MSFT","GOOGL","AMZN","NVDA","META","V","MA","JNJ","LLY","JPM",
      "MC.PA","RMS.PA","ASML.AS","SAP.DE","NOVO-B.CO","SU.PA","AIR.PA"] : [];
    const CTO_ADD = risk === "aggressive"
      ? [...CTO_BASE_AGG, ...(maxAssets > 12 ? CTO_LARGE_STOCKS : [])]
      : [...CTO_BASE_STD, ...(maxAssets > 12 ? CTO_LARGE_STOCKS.slice(0, 4) : [])];
    for (const sym of CTO_ADD) {
      const asset = CAT.find(a => a.s === sym);
      if (!asset || blocked.has(sym) || pool2.find(a => a.s === sym || a.dedup === asset.dedup)) continue;
      if (wCTO && !asset.cto) continue;
      if (wAV && !wCTO && !asset.av) continue;
      if (esgStrict && !asset.esg) continue;
      if (!zoneFilter(asset)) continue;
      // Respect requested asset classes
      if (!wStocks && asset.type === "stock") continue;
      if (!wGold && (asset.type === "gold" || asset.type === "commodity")) continue;
      if (!wReits && asset.type === "reit") continue;
      if (risk === "aggressive" && WDEDUPS.includes(asset.dedup)) continue;
      if (hasW5 && risk !== "aggressive" && WORLD_SUBS.includes(asset.dedup)) continue;
      pool2.push(asset);
    }
    pool2 = smartDedup(pool2);
  }

  // AV with small pool: add av-eligible diversifiers by dedup key
  if (wAV && pool2.length < 8 && !onlyBonds && !onlyCrypto) {
    const AV_ADD_DEDUPS = risk === "defensive" || risk === "moderate"
      ? ["GOLD_EU", "EUR_GOV", "EUR_GOV_ST", "EU_REITS"]  // Safe diversifiers
      : ["GOLD_EU", "EU_REITS"];
    for (const ded of AV_ADD_DEDUPS) {
      if (pool2.find(a => a.dedup === ded)) continue;
      const asset = CAT.find(a => a.dedup === ded && a.av === true && !blocked.has(a.s));
      if (!asset) continue;
      if (esgStrict && !asset.esg) continue;
      pool2.push(asset);
    }
    // Also add av-eligible stocks for dynamic/aggressive if pool still small
    if (risk !== "defensive" && risk !== "moderate" && pool2.length < 6) {
      const AV_STOCKS = ["MC.PA", "RMS.PA", "ASML.AS", "SAP.DE", "NOVO-B.CO"];
      for (const sym of AV_STOCKS) {
        const asset = CAT.find(a => a.s === sym);
        if (!asset || !asset.av || pool2.find(a => a.s === sym || a.dedup === asset.dedup) || blocked.has(sym)) continue;
        pool2.push(asset);
      }
    }
    pool2 = smartDedup(pool2);
  }

  _log.push();

  /* ═══════════════════════════════════════════════════════
     ETAPE 6 : Enrichissement PEA
     ═══════════════════════════════════════════════════════ */
  if (wPEA) {
    const hasW6 = pool2.some(a => WDEDUPS.includes(a.dedup) && a.type === "etf");
    const PEA_ETF = ["PAEEM.PA", "C50.PA", "MEUD.PA", "EPRE.PA"];
    for (const sym of PEA_ETF) {
      const asset = CAT.find(a => a.s === sym);
      if (!asset || !asset.pea || pool2.find(a => a.s === sym || a.dedup === asset.dedup) || blocked.has(sym)) continue;
      if (esgStrict && !asset.esg) continue;
      if (!zoneFilter(asset)) continue;
      if (hasW6 && risk !== "aggressive" && WORLD_SUBS.includes(asset.dedup)) continue;
      pool2.push(asset);
    }
    pool2 = smartDedup(pool2);

    // Actions PEA if pool < maxAssets (need more for "Large 15+")
    if (pool2.length < Math.min(maxAssets, 12)) {
      const PEA_STOCKS = ["MC.PA","RMS.PA","AIR.PA","SAN.PA","OR.PA","SU.PA","ASML.AS","SAP.DE",
        "NOVO-B.CO","ENGI.PA","BNP.PA","SIE.DE","ALV.DE","IFX.DE","HO.PA","LR.PA","DSY.PA",
        "CAP.PA","SGO.PA","VIE.PA","PUB.PA","KER.PA","GLE.PA","TTE.PA"];
      for (const sym of PEA_STOCKS) {
        const asset = CAT.find(a => a.s === sym);
        if (!asset || !asset.pea || pool2.find(a => a.s === sym) || blocked.has(sym)) continue;
        if (esgStrict && !asset.esg) continue;
        if (esgPartial && asset.excl_esg) continue;
        if (!zoneFilter(asset)) continue;
        pool2.push(asset);
      }
      pool2 = smartDedup(pool2);
    }
  }

  /* ═══════════════════════════════════════════════════════
     ETAPE 7 : Obligations auto-add
     PEA ne peut pas avoir d'obligations (reglementaire)
     ═══════════════════════════════════════════════════════ */
  if ((risk === "defensive" || risk === "moderate") && !onlyBonds && !onlyCrypto && !wPEA) {
    if (pool2.filter(a => a.type === "bond").length < 1) {
      const bondCandidates = CAT.filter(a =>
        a.type === "bond" && !blocked.has(a.s) && supOk(a) && zoneFilter(a)
      ).sort((a, b) => {
        if (wAV && a.av && !b.av) return -1;
        if (wAV && !a.av && b.av) return 1;
        return a.ter - b.ter;
      });
      // Add max 1 EUR_GOV + 1 other bond
      let eurGovAdded = false;
      let bondsAdded = 0;
      for (const b of bondCandidates) {
        if (bondsAdded >= (risk === "defensive" ? 3 : 2)) break;
        if ((b.dedup === "EUR_GOV" || b.dedup === "EUR_GOV_ST") && eurGovAdded) continue;
        if (pool2.find(a => a.dedup === b.dedup)) continue;
        pool2.push(b);
        if (b.dedup === "EUR_GOV" || b.dedup === "EUR_GOV_ST") eurGovAdded = true;
        bondsAdded++;
      }
    }
  }

  // EUR_GOV strict: max 1 (XGLE.DE or IBGS.L, never both)
  if (!onlyBonds) {
    const eurGov = pool2.filter(a => a.type === "bond" && (a.dedup === "EUR_GOV" || a.dedup === "EUR_GOV_ST"));
    if (eurGov.length > 1) {
      const best = eurGov.reduce((b, a) => { if (wAV && a.av && !b.av) return a; if (wAV && !a.av && b.av) return b; return a.ter < b.ter ? a : b; });
      pool2 = pool2.filter(a => !(a.type === "bond" && (a.dedup === "EUR_GOV" || a.dedup === "EUR_GOV_ST")) || a.s === best.s);
    }
  }

  // Cap bonds: max 3 when obligations requested, max 2 otherwise, max 4 for defensive
  if (!onlyBonds) {
    const maxBonds = risk === "defensive" ? 4 : wBonds ? 3 : 2;
    const bonds = pool2.filter(a => a.type === "bond");
    if (bonds.length > maxBonds) {
      // Keep best bonds (prefer av-eligible, then lowest TER)
      const sorted = bonds.sort((a, b) => {
        if (wAV && a.av && !b.av) return -1;
        if (wAV && !a.av && b.av) return 1;
        return a.ter - b.ter;
      });
      const keepBonds = new Set(sorted.slice(0, maxBonds).map(a => a.s));
      pool2 = pool2.filter(a => a.type !== "bond" || keepBonds.has(a.s));
    }
  }

  // Final overlap dedup (after all enrichment)
  for (const group of OVERLAP_GROUPS) {
    const inGroup = pool2.filter(a => group.includes(a.dedup));
    if (inGroup.length > 1) {
      const best = inGroup.reduce((b, a) => {
        if (wPEA && a.pea && !b.pea) return a; if (wPEA && !a.pea && b.pea) return b;
        if (wAV && a.av && !b.av) return a; if (wAV && !a.av && b.av) return b;
        return a.ter < b.ter ? a : b;
      });
      pool2 = pool2.filter(a => !group.includes(a.dedup) || a.s === best.s);
    }
  }
  // Final SP500 sub-cleanup
  if (pool2.some(a => a.dedup === "SP500")) {
    pool2 = pool2.filter(a => !SP500_SUBS.includes(a.dedup));
  }
  // Final world sub-cleanup
  const hasWFinal = pool2.some(a => WDEDUPS.includes(a.dedup) && a.type === "etf");
  if (hasWFinal && risk !== "aggressive") {
    pool2 = pool2.filter(a => !WORLD_SUBS.includes(a.dedup));
  }

  _log.push();

  /* ═══════════════════════════════════════════════════════
     ETAPE 8 : Remplissage doublons faibles si pool < target
     Si pool trop petit après anti-doublons forts,
     réintroduire des doublons faibles (overlap partiel)
     ═══════════════════════════════════════════════════════ */
  // Skip weak-dup for AV (pool is naturally limited to ~5-7 av:true assets)
  // Target 12-14 for equilibre since Markowitz drops 30-40% (<1% weight)
  const targetAssets = maxAssets <= 7 ? 7 : maxAssets <= 16 ? 14 : 20;
  if (pool2.length < targetAssets && !wAV) {
    // Doublons faibles autorisés : sous-ensembles partiels du monde/SP500
    const WEAK_DUPS: string[][] = [
      // World + regional = complément légitime
      ["SP500", "NASDAQ100", "EUROSTOXX50", "MSCI_EUROPE", "CAC_MID60", "MSCI_EU_SMALL"],
      // Broad EM + single country
      ["MSCI_CHINA", "MSCI_KOREA", "MSCI_INDIA", "MSCI_BRAZIL", "MSCI_TAIWAN"],
      // Bond diversification
      ["EUR_AGG", "US_IG", "US_HY", "EM_GOV", "US_7_10Y", "US_20Y", "US_TIPS", "GLOBAL_AGG", "EM_BOND_USD"],
      // Dev ex-US sub-regions
      ["MSCI_EAFE", "FTSE_DEV", "FTSE_EUR", "MSCI_EMU"],
    ];
    // Build candidate pool from full CAT (not just baseFilter which has same anti-doublons)
    const poolSyms = new Set(pool2.map(a => a.s));
    const poolDedups = new Set(pool2.map(a => a.dedup));
    const candidates = CAT.filter(a =>
      !poolSyms.has(a.s) && !poolDedups.has(a.dedup) && // not already in pool (by symbol or dedup)
      supOk(a) && !blocked.has(a.s) &&
      zoneFilter(a) &&
      (!esgStrict || a.esg) && (!esgPartial || !a.excl_esg)
    );
    // Sort candidates: prefer different types, then different zones, then low TER
    const poolTypes = new Set(pool2.map(a => a.type));
    const poolZones = new Set(pool2.map(a => a.zone));
    candidates.sort((a, b) => {
      // Prefer types not yet in pool
      const aNewType = !poolTypes.has(a.type) ? 1 : 0;
      const bNewType = !poolTypes.has(b.type) ? 1 : 0;
      if (aNewType !== bNewType) return bNewType - aNewType;
      // Prefer zones not yet in pool
      const aNewZone = !poolZones.has(a.zone) ? 1 : 0;
      const bNewZone = !poolZones.has(b.zone) ? 1 : 0;
      if (aNewZone !== bNewZone) return bNewZone - aNewZone;
      // Prefer ETF over stock
      if (a.type === "etf" && b.type !== "etf") return -1;
      if (b.type === "etf" && a.type !== "etf") return 1;
      return a.ter - b.ter;
    });
    const hasWorldPool = pool2.some(a => WDEDUPS.includes(a.dedup));
    const hasSP500Pool = pool2.some(a => a.dedup === "SP500");
    for (const c of candidates) {
      if (pool2.length >= targetAssets) break;
      // Never reintroduce strong dups
      if (pool2.find(a => a.dedup === c.dedup)) continue;
      // When MSCI_WORLD present (non-aggressive): don't reintroduce SP500/NASDAQ (strongest overlap)
      if (hasWorldPool && risk !== "aggressive" && ["SP500","NASDAQ100"].includes(c.dedup)) continue;
      // Block developed sub-regions (VEA, EFA, EWJ, EWC) but allow EU complements (C50, EXSA)
      if (hasWorldPool && risk !== "aggressive" && ["MSCI_EAFE","FTSE_DEV","MSCI_JAPAN","MSCI_CAN","MSCI_AUS","MSCI_SPAIN","MSCI_ITALY","MSCI_GERMANY","MSCI_UK"].includes(c.dedup)) continue;
      // Max 1 EU sub-index as complement to World
      const EU_SUBS = ["EUROSTOXX50","MSCI_EUROPE","FTSE_EUR","MSCI_EMU","CAC_MID60","MSCI_EU_SMALL"];
      if (hasWorldPool && EU_SUBS.includes(c.dedup) && pool2.filter(a => EU_SUBS.includes(a.dedup)).length >= 1) continue;
      // When SP500 or WORLD present: don't reintroduce SP500 sub-indices
      if ((hasSP500Pool || hasWorldPool) && SP500_SUBS.includes(c.dedup)) continue;
      // Check it's a legitimate weak dup (in one of the WEAK_DUPS groups)
      const isWeakDup = WEAK_DUPS.some(group => group.includes(c.dedup));
      // Or it's a completely new type/zone
      const isNewDiversifier = !poolTypes.has(c.type) || !poolZones.has(c.zone);
      if (isWeakDup || isNewDiversifier) {
        // Respect class filters
        if (!wStocks && c.type === "stock") continue;
        if (!wGold && (c.type === "gold" || c.type === "commodity")) continue;
        if (!wReits && c.type === "reit") continue;
        if (!wBonds && c.type === "bond" && risk === "aggressive") continue;
        pool2.push(c);
        poolTypes.add(c.type);
        poolZones.add(c.zone);
      }
    }
  }

  // Hard fallback if still < 4
  if (pool2.length < 4) {
    pool2 = smartDedup(baseFilter(false)); // relax zone
    if (pool2.length < 4) {
      pool2 = smartDedup(CAT.filter(a => {
        if (a.type === "crypto" && !wCrypto) return false;
        if (esgStrict && !a.esg) return false;
        if (!supOk(a)) return false;
        if (blocked.has(a.s)) return false;
        return true;
      }));
    }
  }

  // ── Only bonds mode ──
  if (onlyBonds) {
    let bp = pool2.filter(a => a.type === "bond");
    if (bp.length < 2) bp = smartDedup(CAT.filter(a => a.type === "bond" && supOk(a) && !blocked.has(a.s)));
    pool2 = bp;
  }

  // ── Mandatory slots for requested classes ──
  const mandatory: Asset[] = [];
  // If ETF requested, ensure at least 1 ETF is mandatory
  if (wETF) {
    const etfs = pool2.filter(a => a.type === "etf");
    if (etfs.length > 0) mandatory.push(etfs[0]);
  }
  if (wGold) {
    const g = pool2.find(a => a.type === "gold" || a.type === "commodity");
    if (g) mandatory.push(g);
    else { const gf = CAT.find(a => a.type === "gold" && supOk(a) && !blocked.has(a.s)); if (gf) mandatory.push(gf); }
  }
  if (wReits) { const r = pool2.find(a => a.type === "reit"); if (r) mandatory.push(r); }
  if (wBonds || ((risk === "defensive" || risk === "moderate") && !wPEA)) {
    const bonds = pool2.filter(a => a.type === "bond").slice(0, risk === "defensive" ? 3 : 2);
    bonds.forEach(b => { if (!mandatory.find(m => m.s === b.s)) mandatory.push(b); });
  }
  if (wCrypto) { const cr = pool2.find(a => a.type === "crypto"); if (cr) mandatory.push(cr); }

  const mandSet = new Set(mandatory.map(a => a.s));
  const rest = pool2.filter(a => !mandSet.has(a.s)).sort((a, b) => {
    const sc = (x: Asset) => (x.type === "etf" ? 20 : x.type === "stock" ? 10 : 5) + (x.esg ? 2 : 0) + (1 - Math.min(x.ter, 1)) * 3;
    return sc(b) - sc(a);
  });

  const universe = [...mandatory, ...rest].slice(0, maxAssets);
  const symbols = universe.map(a => a.s);

  // minBondPct: 0 for PEA (can't have bonds)
  const minBondPct = wPEA ? 0 : onlyBonds ? 80 : risk === "defensive" && wBonds ? 30 : risk === "defensive" ? 15 : wBonds ? 12 : 0;
  const minGoldPct = wGold ? 6 : 0;
  const minReitPct = wReits ? 5 : 0;
  const minCryptoPct = wCrypto && !onlyCrypto ? 5 : 0;
  const minEMPct = (zEM && !zMonde) ? 40 : 0;

  // maxWt adapté au nombre d'actifs dans le pool
  const baseMaxWt = n7.includes("concentre") || n7.includes("5 actifs") ? 0.35
    : n7.includes("large") || n7.includes("15") ? 0.28 : 0.25;
  // If pool is small, allow higher concentration to avoid equal-weight trap
  const maxWt = symbols.length <= 5 ? Math.max(baseMaxWt, 0.35)
    : symbols.length <= 8 ? Math.max(baseMaxWt, 0.30) : baseMaxWt;

  _log.push(`E8:${pool2.length}`);
  _log.push(`final:${symbols.length}(${symbols.join(',')})`);
  console.log(`[SELECT] ${_log.join(' | ')} | risk=${risk} maxWt=${maxWt}`);

  return { symbols, minBondPct, minGoldPct, minReitPct, minCryptoPct, minEMPct, maxWt };
}

/* =========================================================
   fetchReturns / fetchMeta / markowitz — KEPT FROM v5
   ========================================================= */

async function fetchReturns(symbols: string[], years = 10): Promise<Record<string, number[]>> {
  const start = new Date(); start.setFullYear(start.getFullYear() - years);
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT symbol,date,close FROM assets_history WHERE symbol=ANY($1) AND date>=$2 ORDER BY symbol,date ASC`,
      [symbols, start.toISOString().split("T")[0]]
    );
    const prices: Record<string, number[]> = {};
    rows.forEach(r => { if (!prices[r.symbol]) prices[r.symbol] = []; prices[r.symbol].push(parseFloat(r.close)); });
    const returns: Record<string, number[]> = {};
    Object.entries(prices).forEach(([sym, p]) => {
      if (p.length > 100) returns[sym] = p.slice(1).map((c, i) => (c - p[i]) / p[i]);
    });
    return returns;
  } finally { client.release(); }
}

async function fetchMeta(symbols: string[], CAT: Asset[]): Promise<Record<string, { name: string; type: string }>> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT symbol,name,type FROM assets_master WHERE symbol=ANY($1)`, [symbols]);
    const meta: Record<string, { name: string; type: string }> = {};
    CAT.forEach(a => { meta[a.s] = { name: a.n, type: a.type }; });
    rows.forEach(r => { if (!meta[r.symbol]) meta[r.symbol] = { name: r.name, type: r.type }; });
    return meta;
  } finally { client.release(); }
}

function projectSimplex(w: number[], wMin: number[], wMax: number[]): number[] {
  const N = w.length;
  for (let iter = 0; iter < 50; iter++) {
    let excess = 0;
    for (let i = 0; i < N; i++) { if (w[i] < wMin[i]) { excess += wMin[i] - w[i]; w[i] = wMin[i]; } }
    const free = w.map((v, i) => v > wMin[i] ? i : -1).filter(i => i >= 0);
    if (free.length > 0 && excess > 0) { const e = excess / free.length; free.forEach(i => { w[i] = Math.max(wMin[i], w[i] - e); }); }
    let over = 0;
    for (let i = 0; i < N; i++) { if (w[i] > wMax[i]) { over += w[i] - wMax[i]; w[i] = wMax[i]; } }
    const free2 = w.map((v, i) => v < wMax[i] ? i : -1).filter(i => i >= 0);
    if (free2.length > 0 && over > 0) { const e = over / free2.length; free2.forEach(i => { w[i] = Math.min(wMax[i], w[i] + e); }); }
    const s = w.reduce((a, b) => a + b, 0);
    if (s > 0) for (let i = 0; i < N; i++) w[i] /= s;
    if (Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9) break;
  }
  return w;
}

function markowitz(
  returns: Record<string, number[]>, CAT: Asset[],
  method: "minvariance" | "maxsharpe" | "maxutility",
  minClass: Record<string, number>, maxWeight = 0.32, rfRate = 0.03
) {
  const syms = Object.keys(returns); const N = syms.length;
  if (N < 2) return { weights: {} as Record<string, number>, ret: 0, vol: 0, sharpe: 0, var95: 0 };
  const T = Math.min(...syms.map(s => returns[s].length));
  const perSym = syms.map(s => `${s}:${returns[s].length}w`);
  console.log(`[MARKOWITZ] ${method} N=${N} T=${T} syms=[${perSym.join(',')}]`);

  // Moments (annualized) — use slice(-T) for alignment
  const mu = syms.map(s => (returns[s].slice(-T).reduce((a, b) => a + b, 0) / T) * 52);
  const cov: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) for (let j = i; j < N; j++) {
    const ri = returns[syms[i]].slice(-T), rj = returns[syms[j]].slice(-T);
    const mi = ri.reduce((a, b) => a + b, 0) / T, mj = rj.reduce((a, b) => a + b, 0) / T;
    let cv = 0; for (let t = 0; t < T; t++) cv += (ri[t] - mi) * (rj[t] - mj);
    cov[i][j] = cov[j][i] = (cv / (T - 1)) * 52;
  }

  const wMin = syms.map(s => (minClass[s] || 0) / 100);
  const isStock = syms.map(s => CAT.find(a => a.s === s)?.type === "stock");
  const wMax = syms.map((_, i) => isStock[i] ? Math.min(maxWeight, 0.12) : maxWeight);

  const portRet = (w: number[]) => w.reduce((a, x, i) => a + x * mu[i], 0);
  const portVar = (w: number[]) => { let v = 0; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) v += w[i] * w[j] * cov[i][j]; return v; };
  const portVol = (w: number[]) => Math.sqrt(Math.max(0, portVar(w)));
  const covW = (w: number[]) => cov.map(row => row.reduce((a, x, j) => a + x * w[j], 0));

  const score = (w: number[]) => {
    const r = portRet(w), v = portVar(w), vol = Math.sqrt(Math.max(0, v));
    if (method === "minvariance") return -v;
    if (method === "maxsharpe") return vol > 0 ? (r - rfRate) / vol : -999;
    return r - 0.5 * v;
  };

  const gradient = (w: number[]) => {
    const r = portRet(w), v = portVar(w), vol = Math.sqrt(Math.max(0, v));
    const sw = covW(w);
    if (method === "minvariance") return sw.map(x => -2 * x);
    if (method === "maxsharpe") {
      if (vol < 1e-10) return mu.map(x => x - rfRate);
      const sharpe = (r - rfRate) / vol;
      return mu.map((m, i) => (m - sharpe * sw[i] / vol) / vol);
    }
    return mu.map((m, i) => m - sw[i]);
  };

  // Phase 1: Monte Carlo
  let bestW = projectSimplex(new Array(N).fill(1 / N), wMin, wMax);
  let bestScore = score(bestW);
  const STARTS = 30;
  const candidates: number[][] = [];
  for (let trial = 0; trial < Math.max(3000, STARTS * N); trial++) {
    const raw = syms.map(() => Math.random());
    const s = raw.reduce((a, b) => a + b, 0);
    const w = projectSimplex(raw.map(x => x / s), wMin, wMax);
    const sc = score(w);
    if (sc > bestScore) { bestScore = sc; bestW = [...w]; }
    if (trial % Math.floor(3000 / STARTS) === 0) candidates.push([...w]);
  }
  candidates.push([...bestW]);

  // Phase 2: Gradient Ascent
  for (const start of candidates) {
    let w = [...start];
    let lr = 0.05;
    let prevScore = score(w);
    for (let step = 0; step < 300; step++) {
      const g = gradient(w);
      const gnorm = Math.sqrt(g.reduce((a, b) => a + b * b, 0));
      if (gnorm < 1e-10) break;
      const gn = g.map(x => x / gnorm);
      const wNew = projectSimplex(w.map((x, i) => x + lr * gn[i]), wMin, wMax);
      const newScore = score(wNew);
      if (newScore > prevScore) {
        w = wNew; prevScore = newScore; lr = Math.min(lr * 1.1, 0.3);
        if (newScore > bestScore) { bestScore = newScore; bestW = [...w]; }
      } else {
        lr *= 0.5; if (lr < 1e-6) break;
      }
    }
  }

  const finalRet = portRet(bestW);
  const finalVol = portVol(bestW);
  const finalSharpe = finalVol > 0 ? (finalRet - rfRate) / finalVol : 0;
  const portR: number[] = [];
  for (let t = 0; t < T; t++) { let pr = 0; syms.forEach((s, i) => { pr += bestW[i] * (returns[s].slice(-T)[t] || 0); }); portR.push(pr); }
  portR.sort((a, b) => a - b);
  const var95 = Math.abs(portR[Math.floor(portR.length * 0.05)] || 0) * Math.sqrt(52);
  const weights: Record<string, number> = {}; syms.forEach((s, i) => { if (bestW[i] > 0.01) weights[s] = bestW[i]; });
  return { weights, ret: finalRet, vol: finalVol, sharpe: finalSharpe, var95 };
}

type Weight = { symbol: string; name: string; type: string; weight: number; amount: number };
type FPt = { vol: number; ret: number };
type Result = { method: string; label: string; ret: number; vol: number; sharpe: number; var95: number; rec?: boolean; weights: Weight[]; frontier: FPt[] };

export async function POST(req: NextRequest) {
  const { capital = 50000, answers = {} } = await req.json();
  try {
    const CAT = await loadCatalogue();
    const { symbols, minBondPct, minGoldPct, minReitPct, minCryptoPct, minEMPct, maxWt } = selectUniverse(answers, CAT);
    const returns = await fetchReturns(symbols, 10);

    // Proxy substitution: if an asset has little data, use best from same dedup group
    const dedupBest: Record<string, string> = {};
    CAT.forEach(a => {
      const cur = dedupBest[a.dedup];
      if (!cur || (returns[a.s]?.length || 0) > (returns[cur]?.length || 0)) dedupBest[a.dedup] = a.s;
    });
    Object.keys(returns).forEach(sym => {
      const asset = CAT.find(a => a.s === sym); if (!asset) return;
      const best = dedupBest[asset.dedup];
      if (best && best !== sym && (returns[best]?.length || 0) > returns[sym].length * 1.5) returns[sym] = returns[best];
    });

    const validSyms = Object.keys(returns);
    console.log(`[POST] requested=${symbols.length} valid=${validSyms.length} dropped=[${symbols.filter(s=>!returns[s]).join(',')}] weeks=[${validSyms.map(s=>s+':'+returns[s].length+'w').join(',')}]`);
    if (validSyms.length < 3) return NextResponse.json({ error: "Pas assez de donnees historiques pour ce profil" }, { status: 500 });

    const meta = await fetchMeta(validSyms, CAT);
    const bondSyms = validSyms.filter(s => CAT.find(a => a.s === s)?.type === "bond");
    const goldSyms = validSyms.filter(s => CAT.find(a => a.s === s && (a.type === "gold" || a.type === "commodity")));
    const reitSyms = validSyms.filter(s => CAT.find(a => a.s === s && a.type === "reit"));
    const cryptoSyms = validSyms.filter(s => CAT.find(a => a.s === s && a.type === "crypto"));
    const emSyms = validSyms.filter(s => CAT.find(a => a.s === s && a.zone === "em"));
    const distrib = (syms: string[], pct: number) => { if (!syms.length || !pct) return {}; const r: Record<string, number> = {}; syms.forEach(s => { r[s] = pct / syms.length; }); return r; };
    // Force minimum ETF weight when ETF class requested alongside stocks
    const etfSyms = validSyms.filter(s => CAT.find(a => a.s === s)?.type === "etf");
    const stockSyms = validSyms.filter(s => CAT.find(a => a.s === s)?.type === "stock");
    const q5n = (answers["5"] || "").toLowerCase();
    const minETFPct = (q5n.includes("etf") && etfSyms.length > 0 && stockSyms.length > 0) ? 15 : 0;
    const minClass = { ...distrib(bondSyms, minBondPct), ...distrib(goldSyms, minGoldPct), ...distrib(reitSyms, minReitPct), ...distrib(cryptoSyms, minCryptoPct), ...distrib(emSyms, minEMPct), ...distrib(etfSyms, minETFPct) };

    const frontier: FPt[] = [];
    const methods: Array<["minvariance" | "maxsharpe" | "maxutility", string, boolean]> = [
      ["minvariance", "Variance Minimale", false],
      ["maxsharpe", "Sharpe Maximum", true],
      ["maxutility", "Utilite Maximale", false],
    ];
    const results: Result[] = methods.map(([method, label, rec]) => {
      const opt = markowitz(returns, CAT, method, minClass, maxWt);
      const rawW = Object.entries(opt.weights).filter(([, v]) => v > 0.01).sort((a, b) => b[1] - a[1]);
      const totalW = rawW.reduce((s, [, v]) => s + v, 0);
      const roundedW = rawW.map(([, v]) => Math.round(v / totalW * 1000) / 10);
      const sumR = roundedW.reduce((a, b) => a + b, 0);
      if (roundedW.length > 0) roundedW[roundedW.length - 1] = Math.round((roundedW[roundedW.length - 1] + (100 - sumR)) * 10) / 10;
      const weights: Weight[] = rawW.map(([sym, w], i) => ({
        symbol: sym, name: meta[sym]?.name || sym, type: meta[sym]?.type || "etf",
        weight: roundedW[i],
        amount: Math.round(w / totalW * capital),
      }));
      return { method, label, rec, ret: Math.round(opt.ret * 1000) / 10, vol: Math.round(opt.vol * 1000) / 10, sharpe: Math.round(opt.sharpe * 100) / 100, var95: Math.round(opt.var95 * 1000) / 10, weights, frontier };
    });
    // Include debug info in response
    const msResult = results.find(r => r.method === "maxsharpe");
    const debugInfo = {
      requested: symbols.length,
      valid: validSyms.length,
      dropped: symbols.filter(s => !returns[s]),
      weeks: Object.fromEntries(validSyms.map(s => [s, returns[s].length])),
    };
    return NextResponse.json({ results, universe: validSyms.length, debug: debugInfo });
  } catch (err) {
    console.error("Optimize error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// zone fixes for EWJ/EWA/EWC
