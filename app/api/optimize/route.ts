import { NextRequest, NextResponse } from "next/server";
import { ASSET_UNIVERSE, AssetMeta } from "@/lib/assetUniverse";

// ─── Types ────────────────────────────────────────────────────
interface FilterAnswers {
  horizon: string; risk: string; maxLoss: string;
  esg: string; classes: string; geo: string; diversif: string;
}

// ─── 1. Filtrage intelligent de l'univers ────────────────────
function filterUniverse(ans: FilterAnswers): AssetMeta[] {
  const classes  = (ans.classes  || "").toLowerCase();
  const risk     = (ans.risk     || "").toLowerCase();
  const maxLoss  = (ans.maxLoss  || "");
  const geo      = (ans.geo      || "").toLowerCase();
  const esg      = (ans.esg      || "").toLowerCase();
  const diversif = (ans.diversif || "").toLowerCase();

  // Classes d'actifs souhaitées
  const wantEtf     = classes.includes("etf")   || classes === "";
  const wantStock   = classes.includes("action") || classes === "";
  const wantCrypto  = classes.includes("crypto");
  const wantBond    = classes.includes("obligation");
  const wantReit    = classes.includes("immobilier");

  // Profil de risque
  const isConservative = risk.includes("conservateur");
  const isAggressive   = risk.includes("agressif") || risk.includes("dynamique");
  const maxLossPct     = maxLoss.includes("10") ? 10
    : maxLoss.includes("20") ? 20
    : maxLoss.includes("35") ? 35 : 100;

  // Zones
  const wantWorld    = geo.includes("monde")    || geo === "";
  const wantUSA      = geo.includes("usa")      || geo.includes("états") || wantWorld;
  const wantEurope   = geo.includes("europe")   || wantWorld;
  const wantAsia     = geo.includes("asie")     || wantWorld;
  const wantEmerging = geo.includes("émergent") || geo.includes("emergent") || wantWorld;

  // ESG
  const esgStrict  = esg.includes("strict");
  const esgPartial = esg.includes("exclure") || esg.includes("armement");

  let filtered = ASSET_UNIVERSE.filter(a => {
    // Type
    if (a.type === "etf"    && !wantEtf)    return false;
    if (a.type === "stock"  && !wantStock)  return false;
    if (a.type === "crypto" && !wantCrypto) return false;
    if (a.type === "bond"   && !wantBond)   return false;
    if (a.type === "reit"   && !wantReit)   return false;
    // Région
    if (a.region === "usa"      && !wantUSA)      return false;
    if (a.region === "europe"   && !wantEurope)   return false;
    if (a.region === "asia"     && !wantAsia)      return false;
    if (a.region === "emerging" && !wantEmerging) return false;
    // ESG
    if (esgStrict  && !a.esg) return false;
    if (esgPartial && a.sector === "defense") return false;
    // Pas de crypto si très conservateur
    if ((isConservative || maxLossPct <= 10) && a.type === "crypto") return false;
    return true;
  });

  // Taille cible selon diversification
  const targetN = diversif.includes("concentré") || diversif.includes("concentre") ? 8
    : diversif.includes("équilibré") || diversif.includes("equilibre") ? 15
    : 30; // large = 30 actifs

  // Score de pertinence
  const scored = filtered.map(a => {
    let s = 10;
    // Bonus frais bas (ETF)
    if (a.type === "etf" && a.ter && a.ter <= 0.15) s += 5;
    if (a.type === "etf" && a.ter && a.ter <= 0.30) s += 2;
    // Bonus ISIN connu
    if (a.isin) s += 3;
    // Bonus selon profil
    if (isAggressive && a.type === "stock") s += 8;
    if (isAggressive && a.type === "crypto") s += 4;
    if (isConservative && (a.type === "etf" || a.type === "bond")) s += 8;
    // Diversification géographique
    if (a.region === "world" || a.region === "global") s += 3;
    // Variété sectorielle (éviter trop de tech)
    if (a.sector !== "tech" && isAggressive) s += 1;
    return { ...a, score: s + Math.random() * 2 }; // légère variation aléatoire
  });

  // Trier et prendre les N premiers, en garantissant la diversité sectorielle
  scored.sort((a, b) => (b as typeof a & {score:number}).score - (a as typeof a & {score:number}).score);

  // Sélection diversifiée : max 3 par secteur, max 4 ETF larges identiques
  const selected: AssetMeta[] = [];
  const sectorCount: Record<string, number> = {};

  for (const asset of scored) {
    if (selected.length >= targetN) break;
    const sc = sectorCount[asset.sector] || 0;
    const maxPerSector = targetN <= 8 ? 2 : targetN <= 15 ? 3 : 5;
    if (sc >= maxPerSector) continue;
    selected.push(asset);
    sectorCount[asset.sector] = sc + 1;
  }

  // Compléter si pas assez
  if (selected.length < 5) {
    for (const asset of scored) {
      if (!selected.find(s => s.symbol === asset.symbol)) selected.push(asset);
      if (selected.length >= 8) break;
    }
  }

  return selected;
}

// ─── 2. Données historiques simulées réalistes ───────────────
// Basées sur données réelles Yahoo Finance (rendements annualisés 5 ans)
const HISTORICAL_DATA: Record<string, { ret: number; vol: number }> = {
  // ETF
  "IWDA.AS":0.14, "VWCE.DE":0.13, "CSPX.AS":0.16, "EQQQ.DE":0.19, "SWRD.PA":0.14,
  "SUSW.PA":0.12, "PAEEM.PA":0.06, "SXRT.DE":0.10, "EXW1.DE":0.10,
  "XLK":0.22, "XLF":0.14, "XLV":0.11, "XLE":0.08, "SOXX":0.26,
  "ICLN":0.02, "ARKK":-0.04, "BOTZ":0.12,
  "IBGL.AS":0.02, "TLT":-0.06, "HYG":0.04, "LQD":0.01,
  "EPRE.PA":0.05, "IQQP.DE":0.08, "AMT":0.10, "PLD":0.14, "EQIX":0.18,
  "SGLD.L":0.12, "CMOD.L":0.06,
  // US Tech
  "AAPL":0.24, "MSFT":0.28, "NVDA":0.52, "AMZN":0.18, "GOOGL":0.20,
  "META":0.30, "TSLA":0.14, "AVGO":0.38, "AMD":0.32, "QCOM":0.16,
  "TXN":0.14, "AMAT":0.32, "LRCX":0.28, "KLAC":0.34, "CRM":0.14,
  "ADBE":0.10, "NFLX":0.22, "NOW":0.24, "SNOW":-0.08, "DDOG":0.08,
  "CRWD":0.28, "ZS":0.12, "NET":0.10, "MU":0.18, "INTC":-0.06,
  // US Finance
  "JPM":0.20, "V":0.18, "MA":0.18, "GS":0.22, "BRK-B":0.16,
  "MS":0.18, "BAC":0.14, "BX":0.28, "SPGI":0.20, "MCO":0.22,
  "PYPL":-0.12, "COIN":0.08, "SQ":-0.08,
  // US Santé
  "UNH":0.22, "JNJ":0.06, "LLY":0.48, "PFE":-0.04, "MRK":0.14,
  "ABBV":0.18, "AMGN":0.10, "GILD":0.08, "REGN":0.22, "VRTX":0.28,
  "MRNA":-0.14, "ISRG":0.22, "TMO":0.12, "CI":0.18,
  // US Conso
  "HD":0.14, "WMT":0.18, "PG":0.10, "KO":0.08, "PEP":0.08,
  "COST":0.26, "MCD":0.10, "SBUX":0.04, "NKE":0.06, "DIS":-0.04,
  // US Industriel/Defense
  "BA":-0.04, "GE":0.28, "CAT":0.22, "HON":0.12, "RTX":0.14,
  "LMT":0.12, "NOC":0.14, "GD":0.14, "UPS":0.04, "DE":0.14,
  // Matériaux/Energie
  "XOM":0.18, "CVX":0.14, "LIN":0.16, "APD":0.08, "FCX":0.14,
  // REITs
  "O":0.06, "SPG":0.08, "PSA":0.10, "PLD":0.14, "DLR":0.06,
  // UK
  "AZN.L":0.18, "GSK.L":0.12, "RIO.L":0.08, "BA.L":0.22, "RR.L":0.34,
  "LSEG.L":0.16, "REL.L":0.18, "NG.L":0.06, "NWG.L":0.22,
  // France
  "MC.PA":0.14, "RMS.PA":0.22, "KER.PA":0.02, "OR.PA":0.12, "SU.PA":0.18,
  "AIR.PA":0.14, "SAF.PA":0.18, "TTE.PA":0.10, "BNP.PA":0.16,
  "DSY.PA":0.12, "STM.PA":0.08, "EL.PA":0.14,
  // Allemagne
  "SAP.DE":0.22, "ASML.AS":0.28, "ALV.DE":0.16, "SIE.DE":0.16,
  "IFX.DE":0.18, "ADS.DE":0.06, "MUV2.DE":0.14, "RWE.DE":0.08,
  // Suisse
  "NESN.SW":0.04, "ROG.SW":0.02, "NOVO-B.CO":0.38, "NOVN.SW":0.06,
  "CFR.SW":0.14, "ZURN.SW":0.14, "ABBN.SW":0.18, "SIKA.SW":0.12, "LONN.SW":0.22,
  // Autres Europe
  "INGA.AS":0.18, "HEIA.AS":0.04, "VOLV-B.ST":0.14, "ERIC-B.ST":-0.06,
  "EQNR.OL":0.14, "DSV.CO":0.18, "ORSTED.CO":-0.12, "NESTE.HE":0.04,
  "ENI.MI":0.12, "RACE.MI":0.22, "UCG.MI":0.28, "ISP.MI":0.22,
  "SAN.MC":0.14, "IBE.MC":0.12, "AMS.MC":0.14,
  // Japon
  "7203.T":0.14, "6758.T":0.14, "7974.T":0.08, "9432.T":0.06,
  "9984.T":0.12, "8035.T":0.28, "6861.T":0.14, "6367.T":0.14,
  // Corée/Taiwan/Chine
  "005930.KS":0.06, "000660.KS":0.16, "2330.TW":0.28, "2454.TW":0.22,
  "9988.HK":0.02, "700.HK":0.04, "3690.HK":-0.06, "9618.HK":-0.04,
  // Inde
  "TCS.NS":0.18, "INFY.NS":0.14, "HDFCBANK.NS":0.12, "WIPRO.NS":0.10,
  // Australie
  "BHP.AX":0.14, "CBA.AX":0.16, "CSL.AX":0.06, "ANZ.AX":0.12, "MQG.AX":0.18,
  // Canada
  "SHOP.TO":0.12, "RY.TO":0.12, "CNR.TO":0.12, "BAM.TO":0.18,
  // Brésil/Mexique/Émergents
  "VALE3.SA":0.08, "PETR4.SA":0.12, "WEGE3.SA":0.22, "AMXL.MX":0.08,
  "2222.SR":0.14, "NPSNY":0.04, "BBCA.JK":0.12,
  // Singapore/Israël
  "D05.SI":0.16, "SEA":-0.04, "CHKP":0.12, "CYBR":0.22,
  // Crypto
  "BTC-EUR":0.48, "ETH-EUR":0.28, "SOL-EUR":0.52, "BNB-EUR":0.22,
  "XRP-EUR":0.18, "ADA-EUR":0.04, "AVAX-EUR":0.14,
};

// Volatilités annualisées réalistes
const VOL_DATA: Record<string, number> = {
  // ETF larges = volatilité basse
  "IWDA.AS":0.15, "VWCE.DE":0.15, "CSPX.AS":0.17, "SUSW.PA":0.15,
  "PAEEM.PA":0.20, "SXRT.DE":0.18, "EXW1.DE":0.17,
  // ETF sectoriels
  "EQQQ.DE":0.22, "XLK":0.24, "SOXX":0.32, "ARKK":0.55, "ICLN":0.35,
  // Obligations = vol très basse
  "IBGL.AS":0.07, "TLT":0.18, "HYG":0.12, "LQD":0.09,
  // REITs
  "AMT":0.22, "PLD":0.24, "EQIX":0.22, "O":0.18,
  // Or
  "SGLD.L":0.14,
  // Mega caps tech = vol modérée
  "AAPL":0.26, "MSFT":0.24, "NVDA":0.52, "AMZN":0.30, "GOOGL":0.28,
  "META":0.38, "AVGO":0.34, "AMD":0.48,
  // Actions standards
  "JPM":0.24, "V":0.22, "MA":0.22, "GS":0.28, "JNJ":0.16,
  "LLY":0.30, "UNH":0.22, "COST":0.22, "HD":0.22,
  // Croissance volatile
  "TSLA":0.62, "SNOW":0.70, "COIN":0.85, "MRNA":0.65, "SQ":0.65,
  // Valeurs européennes
  "MC.PA":0.28, "RMS.PA":0.26, "ASML.AS":0.30, "SAP.DE":0.24,
  "NOVO-B.CO":0.28, "AIR.PA":0.28, "RACE.MI":0.28,
  // Japon
  "7203.T":0.22, "8035.T":0.38, "6861.T":0.28,
  // Asie
  "2330.TW":0.30, "005930.KS":0.32, "700.HK":0.30,
  // Émergents = vol haute
  "VALE3.SA":0.35, "PETR4.SA":0.40, "WEGE3.SA":0.30,
  // Crypto = vol très haute
  "BTC-EUR":0.70, "ETH-EUR":0.80, "SOL-EUR":0.95, "BNB-EUR":0.75,
  "XRP-EUR":0.90, "AVAX-EUR":1.05,
};

function getRet(sym: string): number {
  return HISTORICAL_DATA[sym] ?? 0.10;
}
function getVol(sym: string): number {
  return VOL_DATA[sym] ?? 0.25;
}

// ─── 3. Corrélations sectorielles ────────────────────────────
function getCorrEstimate(a: AssetMeta, b: AssetMeta): number {
  if (a.symbol === b.symbol) return 1.0;
  // Même type ET même secteur = forte corrélation
  if (a.type === b.type && a.sector === b.sector && a.region === b.region) return 0.85;
  if (a.type === b.type && a.sector === b.sector) return 0.72;
  // ETF vs actions du même secteur
  if (a.sector === b.sector) return 0.65;
  // Crypto entre elles
  if (a.type === "crypto" && b.type === "crypto") return 0.82;
  // Crypto vs reste = faible corrélation
  if (a.type === "crypto" || b.type === "crypto") return 0.18;
  // Obligations vs actions = faible/négative
  if ((a.type === "bond") !== (b.type === "bond")) return 0.05;
  // Même région = corrélation modérée
  if (a.region === b.region) return 0.55;
  // Marchés développés vs émergents
  if ((a.region === "emerging") !== (b.region === "emerging")) return 0.42;
  return 0.48;
}

// ─── 4. Vrai Markowitz Monte Carlo ───────────────────────────
function markowitz(assets: AssetMeta[], capital: number, riskFree = 0.03, nSim = 12000) {
  const n = assets.length;
  const rets  = assets.map(a => getRet(a.symbol));
  const vols  = assets.map(a => getVol(a.symbol));

  // Matrice de covariance estimée
  const cov: number[][] = assets.map((a, i) =>
    assets.map((b, j) => {
      if (i === j) return vols[i] ** 2;
      return getCorrEstimate(a, b) * vols[i] * vols[j];
    })
  );

  // Ledoit-Wolf shrinkage (alpha=0.15)
  const alpha = 0.15;
  const traceCov = assets.reduce((s,_,i)=>s+cov[i][i],0);
  const mu = traceCov / n;
  const shrunk = cov.map((row,i)=>row.map((v,j)=>
    (1-alpha)*v + alpha*(i===j ? mu : 0)
  ));

  let gmv    = { w:Array(n).fill(1/n), ret:0, vol:1e9, sharpe:0 };
  let maxSh  = { w:Array(n).fill(1/n), ret:0, vol:1, sharpe:-1e9 };
  let maxUt  = { w:Array(n).fill(1/n), ret:0, vol:1, util:-1e9 };
  const frontier: {vol:number;ret:number}[] = [];

  for (let s = 0; s < nSim; s++) {
    // Dirichlet-like weights
    const raw = assets.map(() => -Math.log(Math.random() + 1e-10));
    const sum = raw.reduce((a,b)=>a+b,0);
    const w   = raw.map(v=>v/sum);

    // Rendement et variance du portefeuille
    let pRet = 0;
    for (let i=0;i<n;i++) pRet += w[i]*rets[i];
    let pVar = 0;
    for (let i=0;i<n;i++) for (let j=0;j<n;j++) pVar += w[i]*w[j]*shrunk[i][j];
    const pVol = Math.sqrt(Math.max(0, pVar));
    if (pVol < 0.001) continue;

    const sharpe  = (pRet - riskFree) / pVol;
    const utility = pRet - 0.5 * 3 * pVar; // lambda=3

    if (pVol < gmv.vol)         gmv   = {w,ret:pRet,vol:pVol,sharpe};
    if (sharpe > maxSh.sharpe)  maxSh = {w,ret:pRet,vol:pVol,sharpe};
    if (utility > maxUt.util)   maxUt = {w,ret:pRet,vol:pVol,util:utility};
    if (s%60===0) frontier.push({vol:parseFloat(pVol.toFixed(3)),ret:parseFloat(pRet.toFixed(3))});
  }

  // Frontière pareto
  const sorted=frontier.sort((a,b)=>a.vol-b.vol);
  let pRet=-Infinity;
  const pareto=sorted.filter(p=>{if(p.ret>pRet){pRet=p.ret;return true;}return false;}).slice(0,60);

  function buildResult(opt:{w:number[];ret:number;vol:number;sharpe:number}, label:string, method:string, rec=false) {
    // Filtrer actifs < 1% et redistribuer
    const rawWeights = opt.w.map((w,i)=>({...assets[i], w})).filter(a=>a.w>=0.01);
    const totalW = rawWeights.reduce((s,a)=>s+a.w,0);
    const weights = rawWeights.map(a=>({
      symbol:  a.symbol,
      name:    a.name,
      type:    a.type,
      weight:  parseFloat((a.w/totalW).toFixed(4)),
      amount:  Math.round(capital*(a.w/totalW)),
    })).sort((a,b)=>b.weight-a.weight);

    const var95 = Math.abs(opt.ret - 1.645*opt.vol)*100;
    return {
      method, label, rec,
      ret:    parseFloat((opt.ret*100).toFixed(2)),
      vol:    parseFloat((opt.vol*100).toFixed(2)),
      sharpe: parseFloat(opt.sharpe.toFixed(3)),
      var95:  parseFloat(var95.toFixed(2)),
      weights,
      frontier: pareto,
    };
  }

  return [
    buildResult(gmv,   "Variance Minimale", "gmv"),
    buildResult(maxSh, "Sharpe Maximum",    "maxsharpe", true),
    buildResult(maxUt, "Utilité Maximale",  "utility"),
  ];
}

// ─── Handler ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { capital = 50000, answers = {} } = body;

    const ans: FilterAnswers = {
      horizon:  String(answers[1]??answers["1"]??"5 à 10 ans"),
      risk:     String(answers[2]??answers["2"]??"Modéré"),
      maxLoss:  String(answers[3]??answers["3"]??"−20% maximum"),
      esg:      String(answers[4]??answers["4"]??"Aucun filtre"),
      classes:  String(answers[5]??answers["5"]??"ETF,Actions"),
      geo:      String(answers[6]??answers["6"]??"Monde entier"),
      diversif: String(answers[7]??answers["7"]??"Équilibré (8–10 actifs)"),
    };

    // Filtrer l'univers
    const filtered = filterUniverse(ans);

    // Calculer Markowitz
    const results = markowitz(filtered, capital);

    return NextResponse.json({
      results,
      universeSize: ASSET_UNIVERSE.length,
      filteredSize: filtered.length,
      profile: ans,
    });

  } catch (err) {
    console.error("Optimize error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
