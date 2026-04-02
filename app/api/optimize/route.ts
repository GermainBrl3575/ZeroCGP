import { NextRequest, NextResponse } from "next/server";
import { ASSET_UNIVERSE, AssetMeta } from "@/lib/assetUniverse";

// ── Données marché (rendements/volatilités annualisés 5 ans) ─
const RET: Record<string,number> = {
  "IWDA.AS":0.142,"VWCE.DE":0.131,"CSPX.AS":0.162,"EQQQ.DE":0.188,
  "MEUD.PA":0.098,"SXRT.DE":0.102,"EXW1.DE":0.098,"LYPS.DE":0.095,
  "XDWD.DE":0.138,"SUSW.PA":0.122,"PAEEM.PA":0.058,"IEMM.L":0.062,
  "XLK":0.224,"XLF":0.138,"XLV":0.108,"XLE":0.082,"XLI":0.124,
  "SOXX":0.258,"SMH":0.264,"ARKK":-0.042,"BOTZ":0.118,"ICLN":0.018,
  "IBGL.AS":0.018,"AGGH.L":0.014,"TLT":-0.062,"HYG":0.038,
  "LQD":0.008,"EMB":0.022,"DBZB.DE":0.012,
  "EPRE.PA":0.048,"IQQP.DE":0.082,"IUSP.L":0.062,
  "SGLD.L":0.118,"CMOD.L":0.058,"AIGA.DE":0.112,
  "AAPL":0.242,"MSFT":0.282,"NVDA":0.518,"AMZN":0.178,"GOOGL":0.202,
  "META":0.302,"TSLA":0.142,"AVGO":0.382,"AMD":0.322,"QCOM":0.158,
  "TXN":0.142,"AMAT":0.318,"LRCX":0.282,"KLAC":0.338,"CRM":0.142,
  "ADBE":0.098,"NFLX":0.222,"NOW":0.242,"CRWD":0.282,"DDOG":0.082,
  "NET":0.098,"MU":0.182,"INTC":-0.062,"CHKP":0.122,"CYBR":0.222,
  "JPM":0.202,"V":0.182,"MA":0.182,"GS":0.222,"BRK-B":0.158,
  "MS":0.182,"BAC":0.138,"BX":0.282,"SPGI":0.202,"MCO":0.222,
  "UNH":0.222,"JNJ":0.058,"LLY":0.482,"PFE":-0.042,"MRK":0.142,
  "ABBV":0.182,"AMGN":0.098,"REGN":0.222,"VRTX":0.282,
  "ISRG":0.222,"TMO":0.118,"CI":0.182,
  "HD":0.142,"WMT":0.182,"PG":0.098,"KO":0.082,"PEP":0.082,
  "COST":0.258,"MCD":0.098,"NKE":0.058,"SBUX":0.042,
  "XOM":0.182,"CVX":0.142,"NEE":0.062,"T":0.028,"VZ":0.018,
  "BA":-0.042,"GE":0.282,"CAT":0.222,"HON":0.118,
  "RTX":0.142,"LMT":0.118,"NOC":0.142,"GD":0.142,
  "LIN":0.158,"APD":0.082,"FCX":0.142,
  "MC.PA":0.142,"RMS.PA":0.222,"KER.PA":0.022,"OR.PA":0.118,
  "SU.PA":0.182,"EL.PA":0.142,"AIR.PA":0.142,"SAF.PA":0.182,
  "TTE.PA":0.098,"BNP.PA":0.158,"ACA.PA":0.142,"DSY.PA":0.122,
  "STM.MI":0.082,"SGO.PA":0.082,"ORA.PA":0.042,"ML.PA":0.108,
  "SAP.DE":0.222,"ASML.AS":0.282,"ALV.DE":0.158,"SIE.DE":0.158,
  "IFX.DE":0.182,"ADS.DE":0.058,"MUV2.DE":0.142,"RWE.DE":0.082,
  "BAS.DE":0.042,"MRK.DE":0.162,"DBK.DE":0.188,
  "NESN.SW":0.042,"ROG.SW":0.022,"NOVN.SW":0.062,"NOVO-B.CO":0.382,
  "CFR.SW":0.142,"ZURN.SW":0.142,"ABBN.SW":0.182,
  "SIKA.SW":0.122,"LONN.SW":0.222,"GIVN.SW":0.148,
  "INGA.AS":0.182,"HEIA.AS":0.042,"WKL.AS":0.162,"PHIA.AS":0.022,
  "VOLV-B.ST":0.142,"ERIC-B.ST":-0.062,"ATCO-A.ST":0.182,
  "HM-B.ST":0.028,"INVE-B.ST":0.148,
  "EQNR.OL":0.142,"DNB.OL":0.148,"DSV.CO":0.182,
  "ORSTED.CO":-0.122,"NESTE.HE":0.042,"KNEBV.HE":0.108,
  "ENI.MI":0.118,"RACE.MI":0.222,"UCG.MI":0.282,"ISP.MI":0.222,
  "SAN.MC":0.142,"IBE.MC":0.118,"AMS.MC":0.142,"TEF.MC":0.062,
  "UCB.BR":0.162,"ABI.BR":0.042,"EDP.LS":0.082,
  "OMV.VI":0.112,"EBS.VI":0.148,"PKN.WA":0.122,
  "AZN.L":0.182,"GSK.L":0.122,"RIO.L":0.082,"BA.L":0.222,
  "RR.L":0.342,"LSEG.L":0.158,"REL.L":0.182,"NG.L":0.058,
  "HLMA.L":0.182,"LLOY.L":0.142,"NWG.L":0.182,
  "7203.T":0.142,"6758.T":0.142,"7974.T":0.082,"8035.T":0.282,
  "6861.T":0.142,"6367.T":0.142,"9984.T":0.122,
  "005930.KS":0.062,"000660.KS":0.158,"2330.TW":0.282,"2454.TW":0.222,
  "9988.HK":0.022,"0700.HK":0.042,"BIDU":0.022,"PDD":0.082,
  "TCS.NS":0.182,"INFY.NS":0.142,"HDFCBANK.NS":0.122,
  "BHP.AX":0.142,"CBA.AX":0.158,"CSL.AX":0.058,"MQG.AX":0.182,
  "SHOP.TO":0.122,"RY.TO":0.118,"CNR.TO":0.118,"BAM.TO":0.182,
  "VALE3.SA":0.082,"PETR4.SA":0.122,"WEGE3.SA":0.222,
  "D05.SI":0.158,"SEA":-0.042,
  "BTC-EUR":0.482,"ETH-EUR":0.282,"SOL-EUR":0.522,
  "BNB-EUR":0.222,"XRP-EUR":0.182,"ADA-EUR":0.042,"AVAX-EUR":0.142,
};

const VOL: Record<string,number> = {
  "IWDA.AS":0.152,"VWCE.DE":0.154,"CSPX.AS":0.168,"EQQQ.DE":0.224,
  "MEUD.PA":0.178,"SXRT.DE":0.182,"EXW1.DE":0.174,"LYPS.DE":0.172,
  "XDWD.DE":0.152,"SUSW.PA":0.150,"PAEEM.PA":0.202,"IEMM.L":0.208,
  "XLK":0.242,"XLF":0.228,"XLV":0.162,"XLE":0.284,"XLI":0.192,
  "SOXX":0.322,"SMH":0.318,"ARKK":0.552,"BOTZ":0.282,"ICLN":0.352,
  "IBGL.AS":0.068,"AGGH.L":0.072,"TLT":0.182,"HYG":0.122,
  "LQD":0.092,"EMB":0.142,"DBZB.DE":0.082,
  "EPRE.PA":0.242,"IQQP.DE":0.228,"IUSP.L":0.222,
  "SGLD.L":0.142,"CMOD.L":0.182,"AIGA.DE":0.138,
  "AAPL":0.258,"MSFT":0.242,"NVDA":0.522,"AMZN":0.302,"GOOGL":0.282,
  "META":0.382,"TSLA":0.622,"AVGO":0.342,"AMD":0.482,"QCOM":0.282,
  "TXN":0.222,"AMAT":0.362,"LRCX":0.342,"KLAC":0.342,"CRM":0.282,
  "ADBE":0.302,"NFLX":0.382,"NOW":0.282,"CRWD":0.402,"DDOG":0.502,
  "NET":0.522,"MU":0.402,"INTC":0.302,"CHKP":0.202,"CYBR":0.382,
  "JPM":0.242,"V":0.222,"MA":0.222,"GS":0.282,"BRK-B":0.182,
  "MS":0.282,"BAC":0.282,"BX":0.342,"SPGI":0.222,"MCO":0.222,
  "UNH":0.222,"JNJ":0.162,"LLY":0.302,"PFE":0.242,"MRK":0.222,
  "ABBV":0.262,"AMGN":0.222,"REGN":0.282,"VRTX":0.322,
  "ISRG":0.262,"TMO":0.222,"CI":0.242,
  "HD":0.222,"WMT":0.202,"PG":0.162,"KO":0.162,"PEP":0.162,
  "COST":0.222,"MCD":0.182,"NKE":0.262,"SBUX":0.282,
  "XOM":0.262,"CVX":0.262,"NEE":0.222,"T":0.202,"VZ":0.202,
  "BA":0.422,"GE":0.342,"CAT":0.282,"HON":0.222,
  "RTX":0.242,"LMT":0.202,"NOC":0.202,"GD":0.202,
  "LIN":0.202,"APD":0.222,"FCX":0.382,
  "MC.PA":0.282,"RMS.PA":0.262,"KER.PA":0.322,"OR.PA":0.202,
  "SU.PA":0.242,"EL.PA":0.222,"AIR.PA":0.282,"SAF.PA":0.262,
  "TTE.PA":0.242,"BNP.PA":0.282,"ACA.PA":0.282,"DSY.PA":0.262,
  "STM.MI":0.342,"SGO.PA":0.242,"ORA.PA":0.202,"ML.PA":0.222,
  "SAP.DE":0.242,"ASML.AS":0.302,"ALV.DE":0.222,"SIE.DE":0.242,
  "IFX.DE":0.362,"ADS.DE":0.282,"MUV2.DE":0.202,"RWE.DE":0.282,
  "BAS.DE":0.262,"MRK.DE":0.242,"DBK.DE":0.322,
  "NESN.SW":0.162,"ROG.SW":0.182,"NOVN.SW":0.182,"NOVO-B.CO":0.282,
  "CFR.SW":0.262,"ZURN.SW":0.182,"ABBN.SW":0.222,
  "SIKA.SW":0.242,"LONN.SW":0.302,"GIVN.SW":0.222,
  "INGA.AS":0.282,"HEIA.AS":0.202,"WKL.AS":0.202,"PHIA.AS":0.262,
  "VOLV-B.ST":0.242,"ERIC-B.ST":0.342,"ATCO-A.ST":0.242,
  "HM-B.ST":0.282,"INVE-B.ST":0.202,
  "EQNR.OL":0.282,"DNB.OL":0.222,"DSV.CO":0.262,
  "ORSTED.CO":0.422,"NESTE.HE":0.322,"KNEBV.HE":0.202,
  "ENI.MI":0.242,"RACE.MI":0.282,"UCG.MI":0.322,"ISP.MI":0.282,
  "SAN.MC":0.282,"IBE.MC":0.222,"AMS.MC":0.222,"TEF.MC":0.242,
  "UCB.BR":0.282,"ABI.BR":0.242,"EDP.LS":0.242,
  "OMV.VI":0.262,"EBS.VI":0.242,"PKN.WA":0.282,
  "AZN.L":0.202,"GSK.L":0.222,"RIO.L":0.302,"BA.L":0.282,
  "RR.L":0.422,"LSEG.L":0.202,"REL.L":0.182,"NG.L":0.202,
  "HLMA.L":0.222,"LLOY.L":0.282,"NWG.L":0.282,
  "7203.T":0.222,"6758.T":0.282,"7974.T":0.302,"8035.T":0.382,
  "6861.T":0.282,"6367.T":0.242,"9984.T":0.382,
  "005930.KS":0.322,"000660.KS":0.382,"2330.TW":0.302,"2454.TW":0.342,
  "9988.HK":0.382,"0700.HK":0.302,"BIDU":0.422,"PDD":0.482,
  "TCS.NS":0.222,"INFY.NS":0.242,"HDFCBANK.NS":0.222,
  "BHP.AX":0.282,"CBA.AX":0.202,"CSL.AX":0.242,"MQG.AX":0.282,
  "SHOP.TO":0.482,"RY.TO":0.202,"CNR.TO":0.202,"BAM.TO":0.282,
  "VALE3.SA":0.352,"PETR4.SA":0.402,"WEGE3.SA":0.302,
  "D05.SI":0.182,"SEA":0.622,
  "BTC-EUR":0.702,"ETH-EUR":0.802,"SOL-EUR":0.952,
  "BNB-EUR":0.752,"XRP-EUR":0.902,"ADA-EUR":0.882,"AVAX-EUR":1.052,
};

function getRet(sym:string):number {
  return RET[sym] ?? RET[sym.split(".")[0]] ?? RET[sym.split("-")[0]] ?? 0.08;
}
function getVol(sym:string):number {
  return VOL[sym] ?? VOL[sym.split(".")[0]] ?? VOL[sym.split("-")[0]] ?? 0.22;
}

// ── Corrélation estimée entre deux actifs ────────────────────
function estCorr(a:AssetMeta, b:AssetMeta):number {
  if(a.symbol===b.symbol) return 1.0;
  if(a.type==="crypto" && b.type==="crypto") return 0.78;
  if(a.type==="crypto" || b.type==="crypto") return 0.12;
  if((a.type==="bond") !== (b.type==="bond")) return -0.02;
  if(a.sector==="materials" && a.type==="etf") return 0.08;
  if(b.sector==="materials" && b.type==="etf") return 0.08;
  if(a.type==="reit" || b.type==="reit") return 0.42;
  if(a.sector===b.sector && a.region===b.region) return 0.78;
  if(a.sector===b.sector) return 0.62;
  if(a.region===b.region) return 0.52;
  if(a.region==="emerging" || b.region==="emerging") return 0.38;
  return 0.45;
}

// ── Allocation stratégique par profil ────────────────────────
interface StrategicAlloc {
  equityEtf:number; equityStock:number; bond:number;
  reit:number; commodity:number; crypto:number; targetN:number;
}

function getStrategicAlloc(
  risk:string, maxLoss:string, classes:string, diversif:string
): StrategicAlloc {
  const r  = risk.toLowerCase().trim();
  const ml = maxLoss.toLowerCase().trim();
  const cl = classes.toLowerCase().trim();
  const dv = diversif.toLowerCase().trim();

  const isConservative = r.includes("conserv");
  const isModerate     = r.includes("modér") || r.includes("moder");
  const isDynamic      = r.includes("dynam");
  const isAggressive   = r.includes("agressi");

  const maxLossPct = ml.includes("10") ? 10
    : ml.includes("20") ? 20
    : ml.includes("35") ? 35
    : ml.includes("pas") ? 100 : 50;

  const wantCrypto = cl.includes("crypto");
  const wantBond   = cl.includes("obligation");
  const wantReit   = cl.includes("immobilier");
  const wantStock  = cl.includes("action");
  const wantEtf    = cl.includes("etf") || !wantStock;

  const isConcentre = dv.includes("concentr") || dv.includes("5 actif");
  const isLarge     = dv.includes("large") || dv.includes("15");

  // Résoudre contradiction profil/perte max
  let effectiveRisk = isAggressive ? "agressif"
    : isDynamic ? "dynamique"
    : isModerate ? "modere"
    : "conservateur";

  if(isAggressive && maxLossPct <= 20) effectiveRisk = "dynamique";
  if(isAggressive && maxLossPct <= 10) effectiveRisk = "modere";
  if(isDynamic    && maxLossPct <= 10) effectiveRisk = "conservateur";

  let alloc: StrategicAlloc;
  if(effectiveRisk === "conservateur" || maxLossPct <= 10) {
    alloc = {equityEtf:0.30,equityStock:0.05,bond:0.45,reit:0.08,commodity:0.07,crypto:0.00,targetN:8};
  } else if(effectiveRisk === "modere" || maxLossPct <= 20) {
    alloc = {equityEtf:0.45,equityStock:0.15,bond:0.22,reit:0.08,commodity:0.05,crypto:wantCrypto?0.05:0.00,targetN:12};
  } else if(effectiveRisk === "dynamique" || maxLossPct <= 35) {
    alloc = {equityEtf:0.30,equityStock:0.38,bond:0.10,reit:0.07,commodity:0.05,crypto:wantCrypto?0.10:0.00,targetN:16};
  } else {
    // Agressif sans contrainte de perte
    alloc = {equityEtf:0.18,equityStock:0.52,bond:0.00,reit:0.05,commodity:0.03,crypto:wantCrypto?0.22:0.00,targetN:20};
  }

  // Ajuster selon classes sélectionnées
  if(!wantBond)   { alloc.equityStock+=alloc.bond*0.6; alloc.equityEtf+=alloc.bond*0.4; alloc.bond=0; }
  if(!wantReit)   { alloc.equityStock+=alloc.reit; alloc.reit=0; }
  if(!wantCrypto) { alloc.equityStock+=alloc.crypto*0.6; alloc.equityEtf+=alloc.crypto*0.4; alloc.crypto=0; }
  if(!wantEtf)    { alloc.equityStock+=alloc.equityEtf; alloc.equityEtf=0; }
  if(!wantStock)  { alloc.equityEtf+=alloc.equityStock; alloc.equityStock=0; }

  // Normaliser à 100%
  const tot = alloc.equityEtf+alloc.equityStock+alloc.bond+alloc.reit+alloc.commodity+alloc.crypto;
  if(tot > 0) {
    alloc.equityEtf/=tot; alloc.equityStock/=tot; alloc.bond/=tot;
    alloc.reit/=tot; alloc.commodity/=tot; alloc.crypto/=tot;
  }

  if(isConcentre) alloc.targetN = Math.min(alloc.targetN, 8);
  else if(isLarge) alloc.targetN = Math.max(alloc.targetN, 18);

  return alloc;
}

// ── Sélection des actifs par bucket ──────────────────────────
function selectBucket(
  universe: AssetMeta[], types: string[],
  geo: string, nPick: number,
  isAggProf: boolean, esgOnly: boolean, noDefense: boolean
): AssetMeta[] {
  const g = geo.toLowerCase().trim();
  const strictEurope  = g.includes("europ")   && !g.includes("monde");
  const strictUSA     = g.includes("usa")      && !g.includes("monde");
  const strictEmerge  = g.includes("émerg")    && !g.includes("monde");
  const strictAsia    = g.includes("asie")     && !g.includes("monde");
  const wantWorld     = g === "" || g.includes("monde");
  const wantUSA       = g.includes("usa") || g.includes("états") || wantWorld;
  const wantEurope    = g.includes("europ") || wantWorld;
  const wantAsia      = g.includes("asie") || wantWorld;
  const wantEmerging  = g.includes("émerg") || g.includes("march") || wantWorld;

  const pool = universe.filter(a => {
    if(!types.includes(a.type)) return false;
    if(esgOnly && !a.esg) return false;
    if(noDefense && a.sector==="defense") return false;
    // Filtres géographiques STRICTS
    if(strictEurope && a.region !== "europe") return false;
    if(strictUSA    && a.region !== "usa" && a.region !== "world") return false;
    if(strictEmerge && a.region !== "emerging") return false;
    if(strictAsia   && a.region !== "asia") return false;
    // Filtres inclusifs
    if(!wantUSA      && a.region==="usa")      return false;
    if(!wantEurope   && a.region==="europe")   return false;
    if(!wantAsia     && a.region==="asia")     return false;
    if(!wantEmerging && a.region==="emerging") return false;
    return true;
  });

  if(pool.length === 0) return [];

  const riskFree = 0.03;
  const scored = pool.map(a => {
    const ret = getRet(a.symbol);
    const vol = getVol(a.symbol);
    const sharpe = vol > 0 ? (ret - riskFree) / vol : 0;
    let score = isAggProf ? ret * 0.65 + sharpe * 0.35 : sharpe;
    if(a.type==="etf" && a.ter && a.ter <= 0.15) score += 0.08;
    if(a.isin) score += 0.04;
    // Pénaliser l'or si profil offensif
    if(a.sector==="materials" && isAggProf) score -= 0.5;
    score += (Math.random() - 0.5) * 0.06;
    return {...a, score};
  });

  scored.sort((a,b) => (b as typeof a & {score:number}).score - (a as typeof a & {score:number}).score);

  // Diversité sectorielle et géographique forcée
  const selected: AssetMeta[] = [];
  const bySec: Record<string,number> = {};
  const byReg: Record<string,number> = {};
  const maxSec = Math.max(1, Math.ceil(nPick * 0.40));
  const maxReg = Math.max(2, Math.ceil(nPick * 0.60));

  for(const a of scored) {
    if(selected.length >= nPick) break;
    const sc = bySec[a.sector] || 0;
    const rc = byReg[a.region] || 0;
    if(sc >= maxSec) continue;
    if(rc >= maxReg) continue;
    selected.push(a);
    bySec[a.sector] = sc + 1;
    byReg[a.region] = rc + 1;
  }

  // Compléter si pas assez
  for(const a of scored) {
    if(selected.length >= nPick) break;
    if(!selected.find(s=>s.symbol===a.symbol)) selected.push(a);
  }

  return selected;
}

// ── Markowitz Monte Carlo avec contraintes ───────────────────
function optimize(assets:AssetMeta[], capital:number, alloc:StrategicAlloc, nSim=12000) {
  const n = assets.length;
  if(n < 2) return null;

  const rets = assets.map(a => getRet(a.symbol));
  const vols = assets.map(a => getVol(a.symbol));
  const riskFree = 0.03;
  const isAggProf = alloc.equityStock > 0.40;

  // Matrice covariance + Ledoit-Wolf shrinkage (alpha=0.12)
  const alpha = 0.12;
  const traceCov = vols.reduce((s,v)=>s+v*v,0);
  const mu = traceCov/n;
  const cov = assets.map((a,i)=>assets.map((b,j)=>{
    const raw = i===j ? vols[i]**2 : estCorr(a,b)*vols[i]*vols[j];
    return (1-alpha)*raw + alpha*(i===j?mu:0);
  }));

  // ── Contraintes de poids par type ────────────────────────
  const nCrypto = assets.filter(x=>x.type==="crypto").length||1;
  const nBond   = assets.filter(x=>x.type==="bond"  ).length||1;
  const nReit   = assets.filter(x=>x.type==="reit"  ).length||1;

  function maxW(a:AssetMeta):number {
    if(a.sector==="materials") return isAggProf ? 0.05 : 0.08; // Or plafonné
    if(a.type==="crypto")  return Math.min(0.15, alloc.crypto/nCrypto + 0.04);
    if(a.type==="bond")    return Math.min(0.18, alloc.bond/nBond + 0.04);
    if(a.type==="reit")    return Math.min(0.10, alloc.reit/nReit + 0.03);
    if(a.type==="etf" && a.sector==="broad") return 0.22;
    if(a.type==="etf")     return 0.16;
    return 0.13; // actions individuelles : max 13% par ligne
  }

  let best = {
    gmv:    {w:Array(n).fill(1/n), ret:0, vol:1e9, sharpe:0},
    maxSh:  {w:Array(n).fill(1/n), ret:0, vol:1,   sharpe:-1e9},
    maxUt:  {w:Array(n).fill(1/n), ret:0, vol:1,   util:-1e9},
  };
  const frontier:{vol:number;ret:number}[]=[];

  for(let s=0;s<nSim;s++){
    // Générer poids aléatoires respectant les contraintes min/max
    const raw = assets.map(()=> -Math.log(Math.random()+1e-9));
    let w = raw.map((v,i)=>Math.min(maxW(assets[i]), Math.max(0.02, v/raw.reduce((a,b)=>a+b,0))));
    const ws = w.reduce((a,b)=>a+b,0);
    w = w.map(wi=>wi/ws);

    // Rendement et variance portefeuille
    let pRet=0; for(let i=0;i<n;i++) pRet+=w[i]*rets[i];
    let pVar=0; for(let i=0;i<n;i++) for(let j=0;j<n;j++) pVar+=w[i]*w[j]*cov[i][j];

    if(!isFinite(pVar) || pVar<=0) continue;
    const pVol = Math.sqrt(pVar);
    const sharpe = (pRet-riskFree)/pVol;
    const util   = pRet - 0.5*3*pVar;

    if(pVol < best.gmv.vol)          best.gmv   = {w,ret:pRet,vol:pVol,sharpe};
    if(sharpe > best.maxSh.sharpe)   best.maxSh = {w,ret:pRet,vol:pVol,sharpe};
    if(util > (best.maxUt as typeof best.maxUt & {util:number}).util)
                                     (best.maxUt as typeof best.maxUt & {util:number}).util=util,
                                     best.maxUt={w,ret:pRet,vol:pVol,sharpe};

    if(s%80===0) frontier.push({
      vol: parseFloat(pVol.toFixed(3)),
      ret: parseFloat(pRet.toFixed(3))
    });
  }

  // Frontière efficiente (pareto)
  const sorted = frontier.sort((a,b)=>a.vol-b.vol);
  let pr=-Infinity;
  const pareto = sorted.filter(p=>{if(p.ret>pr){pr=p.ret;return true;}return false;}).slice(0,60);

  function build(
    opt:{w:number[];ret:number;vol:number;sharpe:number},
    label:string, method:string, rec=false
  ) {
    const weights = opt.w
      .map((wi,i)=>({
        symbol: assets[i].symbol,
        name:   assets[i].name,
        type:   assets[i].type,
        isin:   assets[i].isin ?? "",
        weight: wi,
        amount: Math.round(capital*wi),
      }))
      .filter(w=>w.weight>=0.02)
      .sort((a,b)=>b.weight-a.weight);

    const totW = weights.reduce((s,w)=>s+w.weight,0)||1;
    const normalized = weights.map(w=>({
      ...w,
      weight: parseFloat((w.weight/totW).toFixed(4)),
      amount: Math.round(capital*w.weight/totW),
    }));

    const ret   = parseFloat(((opt.ret||0)*100).toFixed(2));
    const vol   = parseFloat(((opt.vol||0)*100).toFixed(2));
    const sharpe= parseFloat((opt.sharpe||0).toFixed(3));
    const var95 = parseFloat((Math.abs((opt.ret||0)-1.645*(opt.vol||0))*100).toFixed(2));

    return {method,label,rec,ret,vol,sharpe,var95,weights:normalized,frontier:pareto};
  }

  return [
    build(best.gmv,   "Variance Minimale", "gmv"),
    build(best.maxSh, "Sharpe Maximum",    "maxsharpe", true),
    build(best.maxUt, "Utilité Maximale",  "utility"),
  ];
}

// ── Handler principal ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const {capital=50000, answers={}} = await req.json();
    const get = (k:number) => String(answers[k]??answers[String(k)]??"");

    const risk    = get(2) || "Modéré";
    const maxLoss = get(3) || "−20% maximum";
    const esg     = get(4) || "";
    const classes = get(5) || "ETF,Actions";
    const geo     = get(6) || "Monde entier";
    const diversif= get(7) || "Équilibré (8–10 actifs)";

    console.log("📊 Profil:", {risk, maxLoss, geo, diversif, classes});

    const esgOnly   = esg.toLowerCase().includes("strict");
    const noDefense = esg.toLowerCase().includes("armement") || esg.toLowerCase().includes("exclure");
    const alloc     = getStrategicAlloc(risk, maxLoss, classes, diversif);
    const isAggProf = alloc.equityStock > 0.38;

    // Univers filtré ESG
    const universe = ASSET_UNIVERSE.filter(a => {
      if(esgOnly && !a.esg) return false;
      if(noDefense && a.sector==="defense") return false;
      return true;
    });

    // Sélection par bucket
    const selected: AssetMeta[] = [];
    const addUniq = (arr:AssetMeta[]) => arr.forEach(a=>{
      if(!selected.find(s=>s.symbol===a.symbol)) selected.push(a);
    });

    const N = alloc.targetN;

    // Bucket ETF actions
    if(alloc.equityEtf > 0.02) {
      const n = Math.max(1, Math.round(alloc.equityEtf * N));
      addUniq(selectBucket(universe,["etf"],geo,n,isAggProf,esgOnly,noDefense));
    }
    // Bucket actions individuelles
    if(alloc.equityStock > 0.02) {
      const n = Math.max(1, Math.round(alloc.equityStock * N));
      addUniq(selectBucket(universe,["stock"],geo,n,isAggProf,esgOnly,noDefense));
    }
    // Bucket obligations
    if(alloc.bond > 0.02) {
      const n = Math.max(1, Math.round(alloc.bond * N));
      addUniq(selectBucket(universe,["bond"],"Monde entier",n,false,esgOnly,noDefense));
    }
    // Bucket REIT
    if(alloc.reit > 0.02) {
      const n = Math.max(1, Math.round(alloc.reit * N));
      addUniq(selectBucket(universe,["reit"],geo,n,false,esgOnly,noDefense));
    }
    // Bucket or/matières premières (toujours limité)
    if(alloc.commodity > 0.02) {
      const goldPool = universe.filter(a=>a.type==="etf"&&a.sector==="materials").slice(0,2);
      addUniq(goldPool);
    }
    // Bucket crypto
    if(alloc.crypto > 0.02) {
      const n = Math.max(1, Math.round(alloc.crypto * N));
      const cryptoPool = universe.filter(a=>a.type==="crypto");
      const cryptoScored = cryptoPool
        .map(a=>({...a, s:getRet(a.symbol)/getVol(a.symbol)+Math.random()*0.1}))
        .sort((a,b)=>b.s-a.s).slice(0,n);
      addUniq(cryptoScored);
    }

    if(selected.length < 2) {
      // Fallback : prendre les actifs les mieux notés de l'univers
      const fallback = universe
        .filter(a=>a.type==="etf"&&a.sector==="broad")
        .slice(0,5);
      addUniq(fallback);
    }

    console.log(`✅ ${selected.length} actifs sélectionnés (cible ${N})`);

    const results = optimize(selected, capital, alloc);
    if(!results) return NextResponse.json({error:"Optimisation impossible"},{status:422});

    return NextResponse.json({
      results,
      universeSize: ASSET_UNIVERSE.length,
      filteredSize: selected.length,
      profile: {risk,maxLoss,classes,geo,diversif},
    });

  } catch(err) {
    console.error("Optimize error:", err);
    return NextResponse.json({error:String(err)},{status:500});
  }
}
