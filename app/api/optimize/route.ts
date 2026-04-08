import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

/* ── Types ─────────────────────────────────────────────── */
interface Weight  { symbol:string; name:string; type:string; weight:number; amount:number }
interface FPt     { vol:number; ret:number }
interface Result  { method:string; label:string; ret:number; vol:number; sharpe:number;
                    var95:number; rec?:boolean; weights:Weight[]; frontier:FPt[] }


/* ══════════════════════════════════════════════════════════════════════════
   DONNÉES ETF — indice sous-jacent, TER, éligibilité, émetteur
   Utilisé pour : déduplication (même indice = garder le moins cher)
                  filtrage PEA / AV / CTO
══════════════════════════════════════════════════════════════════════════ */
interface ETFInfo {
  index: string;      // Indice répliqué (clé de déduplication)
  ter: number;        // Total Expense Ratio en %
  issuer: string;     // Émetteur (iShares, Vanguard, Amundi, etc.)
  pea: boolean;       // Éligible PEA
  av: boolean;        // Disponible en Assurance-Vie (général)
  cto: boolean;       // Éligible CTO (toujours true pour les ETF cotés)
}

const ETF_DATABASE: Record<string, ETFInfo> = {
  // ── MSCI World ──────────────────────────────────────────────────────────
  "IWDA.AS":  { index:"MSCI_WORLD",    ter:0.20, issuer:"iShares",  pea:false, av:true,  cto:true },
  "EUNL.DE":  { index:"MSCI_WORLD",    ter:0.20, issuer:"iShares",  pea:false, av:true,  cto:true },
  "PANX.PA":  { index:"MSCI_WORLD",    ter:0.12, issuer:"Amundi",   pea:false, av:true,  cto:true },
  "SWRD.SW":  { index:"MSCI_WORLD",    ter:0.12, issuer:"SPDR",     pea:false, av:false, cto:true },
  "XDWD.DE":  { index:"MSCI_WORLD",    ter:0.19, issuer:"Xtrackers", pea:false, av:true, cto:true },
  "HMWO.L":   { index:"MSCI_WORLD",    ter:0.15, issuer:"HSBC",     pea:false, av:false, cto:true },
  "LCWD.PA":  { index:"MSCI_WORLD",    ter:0.10, issuer:"Lyxor",    pea:false, av:true,  cto:true },
  "MWRD.L":   { index:"MSCI_WORLD_SRI",ter:0.20, issuer:"iShares",  pea:false, av:true,  cto:true },
  "SUSW.SW":  { index:"MSCI_WORLD_SRI",ter:0.20, issuer:"iShares",  pea:false, av:true,  cto:true },

  // ── S&P 500 ────────────────────────────────────────────────────────────
  "CSPX.L":   { index:"SP500",         ter:0.07, issuer:"iShares",  pea:false, av:true,  cto:true },
  "SXR8.DE":  { index:"SP500",         ter:0.07, issuer:"iShares",  pea:false, av:true,  cto:true },
  "IUSA.L":   { index:"SP500",         ter:0.07, issuer:"iShares",  pea:false, av:true,  cto:true },
  "CSP1.PA":  { index:"SP500",         ter:0.07, issuer:"iShares",  pea:false, av:true,  cto:true },
  "SPY":      { index:"SP500",         ter:0.095,issuer:"SPDR",     pea:false, av:false, cto:true },
  "VOO":      { index:"SP500",         ter:0.03, issuer:"Vanguard", pea:false, av:false, cto:true },
  "IVV":      { index:"SP500",         ter:0.03, issuer:"iShares",  pea:false, av:false, cto:true },
  "500X.PA":  { index:"SP500",         ter:0.15, issuer:"Amundi",   pea:true,  av:true,  cto:true },
  "VUSD.L":   { index:"SP500",         ter:0.07, issuer:"Vanguard", pea:false, av:true,  cto:true },

  // ── NASDAQ 100 ─────────────────────────────────────────────────────────
  "QQQ":      { index:"NASDAQ100",     ter:0.20, issuer:"Invesco",  pea:false, av:false, cto:true },
  "EQQQ.DE":  { index:"NASDAQ100",     ter:0.30, issuer:"Invesco",  pea:false, av:true,  cto:true },
  "QDVE.DE":  { index:"SP500_IT",      ter:0.15, issuer:"iShares",  pea:false, av:true,  cto:true },
  "IQQQ.DE":  { index:"NASDAQ100",     ter:0.30, issuer:"iShares",  pea:false, av:true,  cto:true },

  // ── FTSE All-World ─────────────────────────────────────────────────────
  "VWCE.DE":  { index:"FTSE_ALLWORLD", ter:0.22, issuer:"Vanguard", pea:false, av:true,  cto:true },
  "ACWI":     { index:"MSCI_ACWI",     ter:0.32, issuer:"iShares",  pea:false, av:false, cto:true },
  "VT":       { index:"FTSE_ALLWORLD", ter:0.07, issuer:"Vanguard", pea:false, av:false, cto:true },

  // ── Euro Stoxx 50 ──────────────────────────────────────────────────────
  "EXSA.DE":  { index:"EUROSTOXX50",   ter:0.10, issuer:"iShares",  pea:true,  av:true,  cto:true },
  "C50.PA":   { index:"EUROSTOXX50",   ter:0.10, issuer:"Amundi",   pea:true,  av:true,  cto:true },
  "MEUD.PA":  { index:"EUROSTOXX50",   ter:0.10, issuer:"Lyxor",    pea:true,  av:true,  cto:true },
  "FEZ":      { index:"EUROSTOXX50",   ter:0.29, issuer:"SPDR",     pea:false, av:false, cto:true },

  // ── MSCI Europe ────────────────────────────────────────────────────────
  "EXW1.DE":  { index:"MSCI_EUROPE",   ter:0.12, issuer:"iShares",  pea:false, av:true,  cto:true },
  "SMEA.PA":  { index:"MSCI_EUROPE",   ter:0.15, issuer:"Amundi",   pea:true,  av:true,  cto:true },
  "IEUR":     { index:"MSCI_EUROPE",   ter:0.12, issuer:"iShares",  pea:false, av:false, cto:true },
  "VGK":      { index:"FTSE_EUROPE",   ter:0.11, issuer:"Vanguard", pea:false, av:false, cto:true },

  // ── Marchés Émergents ──────────────────────────────────────────────────
  "PAEEM.PA": { index:"MSCI_EM",       ter:0.20, issuer:"Amundi",   pea:true,  av:true,  cto:true },
  "VFEM.L":   { index:"FTSE_EM",       ter:0.22, issuer:"Vanguard", pea:false, av:true,  cto:true },
  "IEMG":     { index:"MSCI_EM_IMI",   ter:0.11, issuer:"iShares",  pea:false, av:false, cto:true },
  "EEM":      { index:"MSCI_EM",       ter:0.68, issuer:"iShares",  pea:false, av:false, cto:true },
  "VWO":      { index:"FTSE_EM",       ter:0.08, issuer:"Vanguard", pea:false, av:false, cto:true },
  "AEEM.PA":  { index:"MSCI_EM_ESG",   ter:0.25, issuer:"Amundi",   pea:true,  av:true,  cto:true },
  "EMIM.L":   { index:"MSCI_EM_IMI",   ter:0.18, issuer:"iShares",  pea:false, av:true,  cto:true },

  // ── Obligations ────────────────────────────────────────────────────────
  "AGGH.L":   { index:"GLOBAL_AGG",    ter:0.10, issuer:"iShares",  pea:false, av:true,  cto:true },
  "IEAG.L":   { index:"EUR_AGG",       ter:0.17, issuer:"iShares",  pea:false, av:true,  cto:true },
  "TLT":      { index:"US_20Y_TREAS",  ter:0.15, issuer:"iShares",  pea:false, av:false, cto:true },
  "BND":      { index:"US_TOT_BOND",   ter:0.03, issuer:"Vanguard", pea:false, av:false, cto:true },
  "LQD":      { index:"US_IG_CORP",    ter:0.14, issuer:"iShares",  pea:false, av:false, cto:true },
  "XGLE.DE":  { index:"EUR_GOV",       ter:0.09, issuer:"Xtrackers", pea:false, av:true, cto:true },

  // ── Or ─────────────────────────────────────────────────────────────────
  "SGLD.L":   { index:"GOLD_PHYSICAL", ter:0.12, issuer:"Invesco",  pea:false, av:false, cto:true },
  "IGLN.L":   { index:"GOLD_PHYSICAL", ter:0.19, issuer:"iShares",  pea:false, av:false, cto:true },
  "GLD":      { index:"GOLD_PHYSICAL", ter:0.40, issuer:"SPDR",     pea:false, av:false, cto:true },
  "IAU":      { index:"GOLD_PHYSICAL", ter:0.25, issuer:"iShares",  pea:false, av:false, cto:true },

  // ── Immobilier ─────────────────────────────────────────────────────────
  "EPRE.PA":  { index:"EUROPE_REITS",  ter:0.40, issuer:"AXA",      pea:true,  av:true,  cto:true },
  "IPRP.L":   { index:"EUROPE_REITS",  ter:0.40, issuer:"iShares",  pea:false, av:true,  cto:true },
  "VNQ":      { index:"US_REITS",      ter:0.12, issuer:"Vanguard", pea:false, av:false, cto:true },
  "REET":     { index:"GLOBAL_REITS",  ter:0.14, issuer:"iShares",  pea:false, av:false, cto:true },
};

/* ── Actions éligibles PEA ───────────────────────────────────────────────── */
// Actions cotées sur marchés européens = PEA éligible
const PEA_ELIGIBLE_STOCKS = new Set([
  // CAC 40
  "AI.PA","AIR.PA","ALO.PA","BN.PA","BNP.PA","CA.PA","CAP.PA","CS.PA",
  "DG.PA","DSY.PA","ENGI.PA","EL.PA","EN.PA","GLE.PA","HO.PA","KER.PA",
  "LR.PA","MC.PA","ML.PA","ORA.PA","PUB.PA","RI.PA","RMS.PA","RNO.PA",
  "SAF.PA","SAN.PA","SGO.PA","STM.PA","SU.PA","TTE.PA","URW.PA","VIE.PA","VIV.PA",
  // DAX
  "ADS.DE","ALV.DE","BAYN.DE","BMW.DE","BAS.DE","CON.DE","DAI.DE","DB1.DE",
  "DBK.DE","DPW.DE","DTE.DE","EOAN.DE","FME.DE","FRE.DE","HEI.DE","HEN3.DE",
  "IFX.DE","LIN.DE","MRK.DE","MUV2.DE","RWE.DE","SAP.DE","SIE.DE","VOW3.DE",
  // AEX
  "ASML.AS","MT.AS","INGA.AS","PHIA.AS","ADYEN.AS",
  // SMI
  "NESN.SW","NOVN.SW","ROG.SW","UBSG.SW","ZURN.SW","ABB.ST",
  // FTSE (non PEA mais cotées en Europe — via CTO)
  // Nordiques
  "ERIC-B.ST","VOLV-B.ST","ATCO-A.ST","SAND.ST","NOVO-B.CO",
  // Italie
  "ISP.MI","UCG.MI","ENEL.MI","ENI.MI","RACE.MI","STLAM.MI","PRY.MI",
]);

/* ── Disponibilité par banque ────────────────────────────────────────────── */
// Banques FR = accès ETF UCITS Euro. Courtiers en ligne = accès plus large.
const BANK_UNIVERSE: Record<string, {
  hasPEA: boolean;
  hasAV: boolean;
  hasCTO: boolean;
  hasCrypto: boolean;
  custoFeeETF: boolean;  // frais de garde sur ETF
  preferredExchange: string; // bourse préférée
  blockedSymbols: string[]; // actifs non disponibles
}> = {
  "BNP Paribas":       { hasPEA:true,  hasAV:true,  hasCTO:true,  hasCrypto:false, custoFeeETF:true,  preferredExchange:"PA", blockedSymbols:["QQQ","VOO","VTI","IVV","BND","TLT"] },
  "Société Générale":  { hasPEA:true,  hasAV:true,  hasCTO:true,  hasCrypto:false, custoFeeETF:true,  preferredExchange:"PA", blockedSymbols:["QQQ","VOO","VTI","IVV"] },
  "LCL":               { hasPEA:true,  hasAV:true,  hasCTO:true,  hasCrypto:false, custoFeeETF:true,  preferredExchange:"PA", blockedSymbols:["QQQ","VOO","VTI","IVV","BND"] },
  "Crédit Agricole":   { hasPEA:true,  hasAV:true,  hasCTO:true,  hasCrypto:false, custoFeeETF:true,  preferredExchange:"PA", blockedSymbols:["QQQ","VOO","VTI","IVV"] },
  "BoursoBank":        { hasPEA:true,  hasAV:true,  hasCTO:true,  hasCrypto:false, custoFeeETF:false, preferredExchange:"PA", blockedSymbols:[] },
  "Fortuneo":          { hasPEA:true,  hasAV:true,  hasCTO:true,  hasCrypto:false, custoFeeETF:false, preferredExchange:"PA", blockedSymbols:[] },
  "Degiro":            { hasPEA:false, hasAV:false, hasCTO:true,  hasCrypto:false, custoFeeETF:false, preferredExchange:"AS", blockedSymbols:[] },
  "Interactive Brokers":{ hasPEA:false,hasAV:false, hasCTO:true,  hasCrypto:true,  custoFeeETF:false, preferredExchange:"US", blockedSymbols:[] },
  "Binance / Coinbase":{ hasPEA:false, hasAV:false, hasCTO:false, hasCrypto:true,  custoFeeETF:false, preferredExchange:"CRYPTO", blockedSymbols:[] },
};

/* ── Déduplication ETF par indice — garde le moins cher éligible ────────── */
function deduplicateETFs(
  symbols: string[],
  allowedSupports: string[],
  bank: string
): string[] {
  const bankConfig = BANK_UNIVERSE[bank];
  const hasPEA  = allowedSupports.includes("PEA");
  const hasCTO  = allowedSupports.includes("Compte-Titres (CTO)") || allowedSupports.includes("CTO");
  const hasAV   = allowedSupports.includes("Assurance-Vie");
  const hasCrypto = allowedSupports.includes("Crypto");

  // Pour chaque indice unique, garder le seul ETF le moins cher ET éligible
  const byIndex: Record<string, { symbol:string; ter:number }[]> = {};
  const nonETF: string[] = [];

  symbols.forEach(sym => {
    const info = ETF_DATABASE[sym];
    if (!info) {
      // Pas un ETF connu → action ou crypto
      nonETF.push(sym);
      return;
    }

    // Vérifier éligibilité support
    const eligible =
      (hasPEA  && info.pea)  ||
      (hasCTO  && info.cto)  ||
      (hasAV   && info.av)   ||
      (!hasPEA && !hasCTO && !hasAV); // si aucun support précisé → tout garder

    if (!eligible) return;

    // Vérifier disponibilité banque
    if (bankConfig?.blockedSymbols.includes(sym)) return;

    if (!byIndex[info.index]) byIndex[info.index] = [];
    byIndex[info.index].push({ symbol: sym, ter: info.ter });
  });

  // Pour chaque indice → garder uniquement l'ETF avec le TER le plus bas
  const bestETFs = Object.values(byIndex).map(candidates => {
    candidates.sort((a, b) => a.ter - b.ter);
    return candidates[0].symbol;
  });

  // Filtrer les actions non-ETF selon le support
  const filteredNonETF = nonETF.filter(sym => {
    // Crypto
    if (["BTC-USD","ETH-USD","BNB-USD","SOL-USD","IBIT","FBTC","GBTC","BITO"].includes(sym)) {
      return hasCrypto;
    }
    // Actions PEA
    if (hasPEA && !hasCTO) {
      return PEA_ELIGIBLE_STOCKS.has(sym);
    }
    // CTO ou AV → tout
    return true;
  });

  return [...bestETFs, ...filteredNonETF];
}

/* ── Bibliothèques d'actifs par zone et type ──────────────────────────────── */

// Actifs mondiaux diversifiés (défaut "Monde entier")
const WORLD_CORE = [
  "IWDA.AS","VWCE.DE","CSPX.L","PANX.PA","EUNL.DE",
  "PAEEM.PA","VFEM.L","IEMG",
  "EXSA.DE","EXW1.DE","MEUD.PA",
  "AGGH.L","TLT","BND","LQD","SGLD.L","GLD",
];

// Actifs USA
const USA_ASSETS = [
  "SPY","VOO","QQQ","IVV","VTI","CSPX.L",
  "AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA",
  "JPM","JNJ","V","MA","UNH","LLY","XOM","PG","KO",
  "SOXX","SMH","IBB","XLK","XLV","XLF","XLE","XLP","XLY",
  "VNQ","EQIX","AMT","PLD",
  "TLT","BND","LQD","HYG","AGG","SHY","IEF",
  "GLD","IAU","USO",
];

// Actifs Europe
const EUROPE_ASSETS = [
  "EXSA.DE","EXW1.DE","MEUD.PA","C50.PA","SMEA.PA","IEUR","VGK","EZU",
  "MC.PA","RMS.PA","KER.PA","AIR.PA","SAF.PA","SAN.PA","TTE.PA","SU.PA",
  "OR.PA","EL.PA","BN.PA","BNP.PA","AXA.PA","VIE.PA","ENGI.PA",
  "ASML.AS","SAP.DE","SIE.DE","BAYN.DE","ALV.DE","MUV2.DE","LIN.DE",
  "AZN.L","HSBA.L","SHEL.L","BP.L","GSK.L","RIO.L","DGE.L",
  "NOVO-B.CO","ABB.ST","NESN.SW","NOVN.SW","ROG.SW","UBSG.SW",
  "IEAG.L","AGGH.L","XGLE.DE","IHYG.L",
  "EPRE.PA","IPRP.L","SGLD.L",
];

// Actifs Marchés Émergents UNIQUEMENT
const EM_ASSETS = [
  // ETF EM diversifiés — dont PEA-éligibles (PAEEM.PA, AEEM.PA, GWT.PA)
  "PAEEM.PA","AEEM.PA","VFEM.L","IEMG","EEM","VWO","EMIM.L","EMXC",
  // ETF EM sectoriels cotés à Paris (PEA-éligibles)
  "PAAEM.PA","LEME.PA","AMEM.PA",
  // Asie
  "MCHI","KWEB","INDA","EWZ","EWY","EWT","EWH",
  // Actions EM
  "BABA","TCEHY","JD","BIDU","PDD","NTES",
  "2330.TW","005930.KS","000660.KS",
  "RELIANCE.NS","TCS.NS","INFY.NS","HDFCBANK.NS",
  "0700.HK","9988.HK","3690.HK","1810.HK",
  "7203.T","6758.T","6861.T","9984.T",
  "SE","MELI","STNE","NU",
  // Matières premières liées aux EM
  "GLD","SGLD.L","FCX","VALE","BHP",
];

// Actifs défensifs (obligations + or + faible vol)
const DEFENSIVE_EXTRA = [
  "TLT","BND","LQD","SHY","IEF","AGG","GOVT","BSV",
  "VTIP","TIP","STIP","VWOB","EMB",
  "GLD","IAU","SGLD.L","IGLN.L",
  "USMV","SPLV","MVOL.L","EFAV",
  "VYM","HDV","SCHD","NOBL","DVY",
];

// Classes d'actifs optionnelles
const ASSET_CLASSES: Record<string, string[]> = {
  actions:    ["IWDA.AS","VWCE.DE","SPY","QQQ","EXSA.DE","PAEEM.PA","EWJ"],
  obligations:["TLT","BND","LQD","HYG","AGG","AGGH.L","IEAG.L","VCIT","VCSH"],
  immobilier: ["VNQ","IPRP.L","REET","AMT","PLD","EQIX","ARE","WELL","SPG","EXR"],
  matieres:   ["GLD","SGLD.L","IAU","USO","BCIT.L","GNR","COPX","LIT","PDBC","GSG"],
  crypto:     ["BTC-USD","ETH-USD","IBIT","FBTC","GBTC","BITO"],
  etf_monde:  ["IWDA.AS","VWCE.DE","PANX.PA","ACWI","VT","EUNL.DE"],
};

// Actifs ESG
const ESG_ASSETS = [
  "SUSW.SW","MWRD.L","ESGU","ESGD","ESGE","ERTH",
  "IWDA.AS","VWCE.DE","PAEEM.PA", // ETF monde globalement propres
  "NESN.SW","NOVN.SW","ROG.SW","OR.PA","SAN.PA", // Santé/Alimentation
  "NEE","BEP","BEPC","CWEN","FSLR","ENPH","SEDG","TAN", // Energie propre
  "MSFT","AAPL","GOOGL","ADBE","CRM","NOW", // Tech ESG+
  "AGGH.L","IEAG.L","TLT","BND","GLD","SGLD.L", // Obligations + Or
];

// Exclusions ESG stricts
const ESG_EXCLUSIONS = [
  "BTC-USD","ETH-USD","COIN","GBTC","BITO", // Crypto (impact carbone)
  "OXY","DVN","APA","EOG","COP","XOM","CVX","SLB","HAL","BKR", // Pétrole
  "MO","BTI","PM","LO", // Tabac
  "LMT","RTX","NOC","GD","BA","HII", // Armement
  "CCL","RCL","NCLH", // Croisières (fort impact CO2)
];

/* ── Fonction selectUniverse — entièrement réécrite ────────────────────────── */
function selectUniverse(answers: Record<string,string>): string[] {

  // ── Q1 : Horizon → ajuste le risque acceptable
  const horizon = answers["1"] || "";
  const isShortTerm = horizon.includes("2 ans") || horizon.includes("Moins");

  // ── Q2 : Profil de risque
  const riskProfile = answers["2"] || "";

  // ── Q3 : Perte max acceptée → détermine le profil
  const lossStr = answers["3"] || "";
  let riskLevel: "defensive" | "moderate" | "balanced" | "aggressive";
  if      (lossStr.includes("−10%") || lossStr.includes("10%"))  riskLevel = "defensive";
  else if (lossStr.includes("−20%") || lossStr.includes("20%"))  riskLevel = "moderate";
  else if (lossStr.includes("−35%") || lossStr.includes("35%"))  riskLevel = "balanced";
  else if (lossStr.includes("limite"))                            riskLevel = "aggressive";
  else if (riskProfile.includes("Conservateur"))                  riskLevel = "defensive";
  else if (riskProfile.includes("Modéré"))                       riskLevel = "moderate";
  else if (riskProfile.includes("Agressif"))                      riskLevel = "aggressive";
  else                                                             riskLevel = "balanced";

  // Court terme → toujours défensif
  if (isShortTerm) riskLevel = "defensive";

  // ── Q4 : ESG
  const esgPref = answers["4"] || "";
  const esgStrict  = esgPref.includes("strict");
  const esgPartial = esgPref.includes("armement") || esgPref.includes("tabac");

  // ── Q5 : Classes d'actifs souhaitées (multi-select CSV)
  const classesStr = answers["5"] || "";
  const wantsActions     = classesStr === "" || classesStr.toLowerCase().includes("action");
  const wantsOblig       = classesStr.toLowerCase().includes("obligation");
  const wantsImmo        = classesStr.toLowerCase().includes("immobilier");
  const wantsMatieres    = classesStr.toLowerCase().includes("matière") || classesStr.toLowerCase().includes("or");
  const wantsCrypto      = classesStr.toLowerCase().includes("crypto")
                        || (answers["8"]||"").toLowerCase().includes("crypto");
  const wantsETF         = classesStr === "" || classesStr.toLowerCase().includes("etf");

  // ── Q6 : Zone géographique → détermine l'UNIVERS DE BASE
  const zone = answers["6"] || "Monde entier";
  let baseUniverse: string[];

  if (zone.includes("Marchés émergents")) {
    // EXCLUSIVEMENT des actifs marchés émergents
    baseUniverse = [...EM_ASSETS];
  } else if (zone.includes("USA")) {
    // Prédominance USA
    baseUniverse = [...USA_ASSETS];
  } else if (zone.includes("Europe")) {
    // Prédominance Europe
    baseUniverse = [...EUROPE_ASSETS];
  } else {
    // Monde entier — univers diversifié
    baseUniverse = [...WORLD_CORE, ...USA_ASSETS.slice(0,15), ...EUROPE_ASSETS.slice(0,15)];
  }

  // ── Ajustement selon niveau de risque ───────────────────────────────────
  // Défensif : garder surtout obligations, or, low-vol
  if (riskLevel === "defensive") {
    // Garder ETF monde larges + obligations + or, enlever actions individuelles volatiles
    baseUniverse = baseUniverse.filter(s =>
      !["TSLA","NVDA","AMD","RIVN","LCID","COIN","BTC-USD","ETH-USD",
        "ARKK","ARKG","TQQQ","SQQQ","LABU","TECL"].includes(s)
    );
    // Ajouter actifs défensifs
    baseUniverse.push(...DEFENSIVE_EXTRA);
  }

  // ── Filtre par classes d'actifs (Q5) ───────────────────────────────────
  // Si l'utilisateur a sélectionné des classes spécifiques, on filtre
  if (classesStr !== "") {
    let filtered: string[] = [];

    if (wantsActions || wantsETF) {
      filtered.push(...baseUniverse.filter(s =>
        !ASSET_CLASSES.obligations.includes(s) &&
        !ASSET_CLASSES.matieres.includes(s) &&
        !ASSET_CLASSES.crypto.includes(s) &&
        !ASSET_CLASSES.immobilier.includes(s)
      ));
    }
    if (wantsOblig)    filtered.push(...ASSET_CLASSES.obligations);
    if (wantsImmo)     filtered.push(...ASSET_CLASSES.immobilier);
    if (wantsMatieres) filtered.push(...ASSET_CLASSES.matieres);
    if (wantsCrypto)   filtered.push(...ASSET_CLASSES.crypto);

    baseUniverse = filtered.length > 0 ? filtered : baseUniverse;
  } else {
    // Pas de filtre classes → enlever crypto par défaut
    baseUniverse = baseUniverse.filter(s => !ASSET_CLASSES.crypto.includes(s));
  }

  // ── Filtre ESG ──────────────────────────────────────────────────────────
  if (esgStrict) {
    // Garder UNIQUEMENT les actifs ESG validés
    baseUniverse = baseUniverse.filter(s => ESG_ASSETS.includes(s));
    if (baseUniverse.length < 5) baseUniverse = [...ESG_ASSETS]; // fallback
  } else if (esgPartial) {
    // Exclure armement & tabac & pétrole lourd
    baseUniverse = baseUniverse.filter(s => !ESG_EXCLUSIONS.includes(s));
  }

  // ── Q7 : Diversification → nombre max d'actifs ─────────────────────────
  const diversif = answers["7"] || "";
  let maxAssets: number;
  if      (diversif.includes("5 actifs") || diversif.includes("Concentré"))  maxAssets = 8;
  else if (diversif.includes("15+")      || diversif.includes("Large"))      maxAssets = 35;
  else                                                                         maxAssets = 18; // Équilibré

  // Ajuster selon le risque (défensif → plus diversifié)
  if (riskLevel === "defensive") maxAssets = Math.max(maxAssets, 15);
  if (riskLevel === "aggressive") maxAssets = Math.min(maxAssets, 25);

  // ── Déduplication + filtrage support/banque ─────────────────────────────
  const supportsStr = answers["8"] || "";
  const supports = supportsStr ? supportsStr.split(",").map(s => s.trim()) : ["Compte-Titres (CTO)"];
  const bank     = answers["9"] || "BoursoBank";

  const deduped = deduplicateETFs([...new Set(baseUniverse)], supports, bank);

  console.log(`[selectUniverse] zone=${zone} risk=${riskLevel} support=${supports} bank=${bank} → ${deduped.length} actifs → limite ${maxAssets}`);

  // Si trop peu d'actifs après filtrage (ex: PEA+EM strict) → fallback intelligent
  if (deduped.length < 4) {
    console.warn(`[selectUniverse] Seulement ${deduped.length} actifs après filtres — fallback`);

    // PEA + EM : utiliser actions EM cotées en Europe (éligibles PEA)
    if (zone.includes("émergents") && supports.includes("PEA")) {
      const pea_em_fallback = [
        "PAEEM.PA","AEEM.PA","LEME.PA", // ETF EM PEA
        "MC.PA","RMS.PA","KER.PA",       // Luxe = exposition Asie indirecte
        "AIR.PA","SAF.PA",               // Aéronautique = Asie
        "EXSA.DE","SMEA.PA",             // Actions Europe larges PEA
      ];
      return [...new Set([...deduped, ...pea_em_fallback])].slice(0, maxAssets);
    }

    // Fallback générique : univers monde PEA-compatible
    const generic_fallback = [
      "PANX.PA","PAEEM.PA","EXSA.DE","SMEA.PA","MEUD.PA",
      "MC.PA","RMS.PA","ASML.AS","SAP.DE","NESN.SW",
      "IEAG.L","AGGH.L","SGLD.L",
    ];
    return [...new Set([...deduped, ...generic_fallback])].slice(0, maxAssets);
  }

  // Respecter STRICTEMENT maxAssets
  return deduped.slice(0, maxAssets);
}


/* ── Récupérer les historiques depuis Neon ─────────────── */
async function fetchReturns(
  symbols: string[],
  years: number = 5
): Promise<Record<string,number[]>> {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT symbol, date, close
       FROM assets_history
       WHERE symbol = ANY($1) AND date >= $2
       ORDER BY symbol, date ASC`,
      [symbols, startDate.toISOString().split("T")[0]]
    );

    // Grouper par symbole et calculer les rendements
    const grouped: Record<string, number[]> = {};
    const prices:  Record<string, number[]> = {};

    rows.forEach(r => {
      if (!prices[r.symbol]) prices[r.symbol] = [];
      prices[r.symbol].push(parseFloat(r.close));
    });

    Object.entries(prices).forEach(([sym, p]) => {
      if (p.length > 26) { // au moins 6 mois de données
        grouped[sym] = p.slice(1).map((c, i) => (c - p[i]) / p[i]);
      }
    });

    return grouped;
  } finally {
    client.release();
  }
}

/* ── Récupérer les métadonnées des actifs ──────────────── */
async function fetchMeta(symbols: string[]): Promise<Record<string,{name:string;type:string}>> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT symbol, name, type FROM assets_master WHERE symbol = ANY($1)`,
      [symbols]
    );
    const meta: Record<string,{name:string;type:string}> = {};
    rows.forEach(r => { meta[r.symbol] = { name: r.name, type: r.type }; });
    return meta;
  } finally {
    client.release();
  }
}

/* ── Markowitz core ─────────────────────────────────────── */
function markowitz(
  returns:  Record<string,number[]>,
  capital:  number,
  method:   "minvariance" | "maxsharpe" | "maxutility",
  rfRate:   number = 0.03
): { weights: Record<string,number>; ret: number; vol: number; sharpe: number; var95: number } {
  const syms = Object.keys(returns);
  const N    = syms.length;
  if (N < 2) return { weights:{}, ret:0, vol:0, sharpe:0, var95:0 };

  const T = Math.min(...syms.map(s => returns[s].length));

  // Rendements moyens annualisés (×52 pour hebdo)
  const mu = syms.map(s => {
    const r = returns[s].slice(0, T);
    return (r.reduce((a,b) => a+b, 0) / T) * 52;
  });

  // Matrice de covariance annualisée
  const cov: number[][] = Array.from({length:N}, () => new Array(N).fill(0));
  for (let i=0; i<N; i++) {
    for (let j=i; j<N; j++) {
      const ri = returns[syms[i]].slice(0,T);
      const rj = returns[syms[j]].slice(0,T);
      const mui = ri.reduce((a,b)=>a+b,0)/T;
      const muj = rj.reduce((a,b)=>a+b,0)/T;
      let c = 0;
      for (let t=0; t<T; t++) c += (ri[t]-mui)*(rj[t]-muj);
      cov[i][j] = cov[j][i] = (c/(T-1))*52;
    }
  }

  // Optimisation par gradient projeté simplifié (Monte Carlo + optimisation)
  let bestW  = new Array(N).fill(1/N);
  let bestScore = -Infinity;

  // 5000 portefeuilles Monte Carlo
  for (let trial=0; trial<5000; trial++) {
    // Générer des poids aléatoires avec contrainte long-only
    const raw = syms.map(() => Math.random());
    const sum = raw.reduce((a,b)=>a+b,0);
    const w   = raw.map(x => x/sum);

    const pRet = w.reduce((a,x,i) => a + x*mu[i], 0);
    let pVar = 0;
    for (let i=0;i<N;i++) for (let j=0;j<N;j++) pVar += w[i]*w[j]*cov[i][j];
    const pVol    = Math.sqrt(Math.max(0, pVar));
    const pSharpe = pVol > 0 ? (pRet - rfRate) / pVol : 0;

    let score: number;
    if (method === "minvariance") score = -pVar;
    else if (method === "maxsharpe") score = pSharpe;
    else score = pRet - 0.5 * pVar; // maxutility

    if (score > bestScore) {
      bestScore = score;
      bestW     = w;
    }
  }

  // Calculer les stats finales
  const finalRet = bestW.reduce((a,x,i) => a + x*mu[i], 0);
  let finalVar = 0;
  for (let i=0;i<N;i++) for (let j=0;j<N;j++) finalVar += bestW[i]*bestW[j]*cov[i][j];
  const finalVol    = Math.sqrt(Math.max(0, finalVar));
  const finalSharpe = finalVol > 0 ? (finalRet - rfRate) / finalVol : 0;

  // VaR 95% historique — simulation sur les rendements réels
  const portReturns: number[] = [];
  const T2 = Math.min(...syms.map(s => returns[s].length));
  for (let t=0; t<T2; t++) {
    let pr = 0;
    syms.forEach((s,i) => { pr += bestW[i] * (returns[s][t] || 0); });
    portReturns.push(pr);
  }
  portReturns.sort((a,b) => a-b);
  const var95 = Math.abs(portReturns[Math.floor(portReturns.length * 0.05)] || 0) * Math.sqrt(52);

  const weights: Record<string,number> = {};
  syms.forEach((s,i) => { if (bestW[i] > 0.005) weights[s] = bestW[i]; });

  return { weights, ret: finalRet, vol: finalVol, sharpe: finalSharpe, var95 };
}

/* ── Frontière efficiente ───────────────────────────────── */
function computeFrontier(
  returns: Record<string,number[]>
): FPt[] {
  const frontier: FPt[] = [];
  // Simuler 200 portefeuilles pour tracer la frontière
  const syms = Object.keys(returns);
  const N    = syms.length;
  const T    = Math.min(...syms.map(s => returns[s].length));
  const mu   = syms.map(s => (returns[s].slice(0,T).reduce((a,b)=>a+b,0)/T)*52);
  const cov: number[][] = Array.from({length:N},()=>new Array(N).fill(0));
  for (let i=0;i<N;i++) for (let j=i;j<N;j++) {
    const ri=returns[syms[i]].slice(0,T), rj=returns[syms[j]].slice(0,T);
    const mi=ri.reduce((a,b)=>a+b,0)/T, mj=rj.reduce((a,b)=>a+b,0)/T;
    let c=0; for(let t=0;t<T;t++) c+=(ri[t]-mi)*(rj[t]-mj);
    cov[i][j]=cov[j][i]=(c/(T-1))*52;
  }
  for (let k=0;k<300;k++) {
    const raw=syms.map(()=>Math.random()), sum=raw.reduce((a,b)=>a+b,0);
    const w=raw.map(x=>x/sum);
    const r=w.reduce((a,x,i)=>a+x*mu[i],0);
    let v=0; for(let i=0;i<N;i++) for(let j=0;j<N;j++) v+=w[i]*w[j]*cov[i][j];
    frontier.push({ vol:Math.sqrt(Math.max(0,v)), ret:r });
  }
  return frontier.sort((a,b)=>a.vol-b.vol);
}

/* ── Handler principal ──────────────────────────────────── */
export async function POST(req: NextRequest) {
  const { capital = 50000, answers = {} } = await req.json();

  try {
    // 1. Sélectionner l'univers selon le profil
    const universe = selectUniverse(answers);
    console.log(`Univers sélectionné: ${universe.length} actifs`);

    // 2. Récupérer les historiques depuis Neon (20 ans)
    const returns = await fetchReturns(universe, 20);
    const validSyms = Object.keys(returns);
    console.log(`Données disponibles: ${validSyms.length} actifs`);

    if (validSyms.length < 3) {
      return NextResponse.json({ error: "Pas assez de données" }, { status: 500 });
    }

    // 3. Récupérer les métadonnées
    const meta = await fetchMeta(validSyms);

    // 4. Optimiser avec 3 méthodes
    const methods: Array<["minvariance"|"maxsharpe"|"maxutility", string, boolean]> = [
      ["minvariance",  "Variance Minimale",  false],
      ["maxsharpe",    "Sharpe Maximum",     true ],
      ["maxutility",   "Utilité Maximale",   false],
    ];

    // Calculer la frontière une seule fois (partagée)
    const frontier = computeFrontier(returns);

    const results: Result[] = methods.map(([method, label, rec]) => {
      const opt = markowitz(returns, capital, method);
      const weightedSyms = Object.keys(opt.weights);

      // Filtrer les poids significatifs et normaliser à exactement 100%
      const rawWeights = weightedSyms
        .filter(s => opt.weights[s] > 0.01)
        .sort((a,b) => opt.weights[b] - opt.weights[a]);

      const totalW = rawWeights.reduce((s, sym) => s + opt.weights[sym], 0);

      const weights: Weight[] = rawWeights.map((s, i) => {
        const normalized = opt.weights[s] / totalW; // normaliser à 1.0
        return {
          symbol: s,
          name:   meta[s]?.name || s,
          type:   meta[s]?.type || "stock",
          // Arrondir à 1 décimale mais garantir que le total = 100%
          weight: i === rawWeights.length - 1
            ? Math.round((1 - rawWeights.slice(0,-1).reduce((s,x) => s + opt.weights[x]/totalW, 0)) * 1000) / 10
            : Math.round(normalized * 1000) / 10,
          amount: Math.round(normalized * capital),
        };
      });

      return {
        method,
        label,
        ret:     Math.round(opt.ret * 1000) / 10,
        vol:     Math.round(opt.vol * 1000) / 10,
        sharpe:  Math.round(opt.sharpe * 100) / 100,
        var95:   Math.round(opt.var95 * 1000) / 10,
        rec,
        weights,
        frontier,
      };
    });

    return NextResponse.json({ results, universe: validSyms.length });

  } catch (err) {
    console.error("Optimize error:", err);
    // Fallback mock si Neon échoue
    return NextResponse.json({
      error: "Optimisation temporairement indisponible",
      results: [],
    }, { status: 500 });
  }
}
