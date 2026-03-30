import { NextRequest, NextResponse } from "next/server";
import { ASSET_UNIVERSE, AssetMeta } from "@/lib/assetUniverse";

// ── Données de marché (rendements/vols annualisés sur 5 ans) ──
const RET: Record<string,number> = {
  "IWDA.AS":0.142,"VWCE.DE":0.131,"CSPX.AS":0.162,"EQQQ.DE":0.188,"SWRD.PA":0.138,
  "SUSW.PA":0.122,"PAEEM.PA":0.058,"SXRT.DE":0.102,"EXW1.DE":0.098,"MEUD.PA":0.098,
  "XLK":0.224,"XLF":0.138,"XLV":0.108,"XLE":0.082,"XLI":0.124,"SOXX":0.258,"SMH":0.264,
  "ICLN":0.018,"ARKK":-0.042,"BOTZ":0.118,"DRIV":0.088,
  "IBGL.AS":0.018,"TLT":-0.062,"HYG":0.038,"LQD":0.008,"EMB":0.022,
  "AGGH.L":0.014,"DBZB.DE":0.012,"IUSB.DE":0.015,
  "EPRE.PA":0.048,"IQQP.DE":0.082,"AMT":0.098,"PLD":0.138,"EQIX":0.182,
  "O":0.058,"DLR":0.062,"PSA":0.098,
  "SGLD.L":0.118,"CMOD.L":0.058,"AIGA.DE":0.112,
  // US Tech
  "AAPL":0.242,"MSFT":0.282,"NVDA":0.518,"AMZN":0.178,"GOOGL":0.202,
  "META":0.302,"TSLA":0.142,"AVGO":0.382,"AMD":0.322,"QCOM":0.158,
  "TXN":0.142,"AMAT":0.318,"LRCX":0.282,"KLAC":0.338,"CRM":0.142,
  "ADBE":0.098,"NFLX":0.222,"NOW":0.242,"CRWD":0.282,"DDOG":0.082,
  "NET":0.098,"MU":0.182,"INTC":-0.062,"CHKP":0.122,"CYBR":0.222,
  // US Finance
  "JPM":0.202,"V":0.182,"MA":0.182,"GS":0.222,"BRK-B":0.158,
  "MS":0.182,"BAC":0.138,"BX":0.282,"SPGI":0.202,"MCO":0.222,
  "CB":0.182,"AON":0.162,"COIN":0.082,
  // US Santé
  "UNH":0.222,"JNJ":0.058,"LLY":0.482,"PFE":-0.042,"MRK":0.142,
  "ABBV":0.182,"AMGN":0.098,"REGN":0.222,"VRTX":0.282,"ISRG":0.222,"TMO":0.118,
  // US Conso
  "HD":0.142,"WMT":0.182,"PG":0.098,"KO":0.082,"PEP":0.082,
  "COST":0.258,"MCD":0.098,"NKE":0.058,"SBUX":0.042,
  // US Energie/Industriel/Defense
  "XOM":0.182,"CVX":0.142,"BA":-0.042,"GE":0.282,"CAT":0.222,
  "HON":0.118,"RTX":0.142,"LMT":0.118,"NOC":0.142,"GD":0.142,"DE":0.142,
  "NEE":0.062,"LIN":0.158,"APD":0.082,"FCX":0.142,
  "T":0.028,"VZ":0.018,"TMUS":0.182,
  // REITs US
  "AMT":0.098,"PLD":0.138,"EQIX":0.182,
  // UK
  "AZN.L":0.182,"GSK.L":0.122,"RIO.L":0.082,"BA.L":0.222,"RR.L":0.342,
  "LSEG.L":0.158,"REL.L":0.182,"NG.L":0.058,"HLMA.L":0.182,
  // France
  "MC.PA":0.142,"RMS.PA":0.222,"KER.PA":0.022,"OR.PA":0.118,"SU.PA":0.182,
  "EL.PA":0.142,"AIR.PA":0.142,"SAF.PA":0.182,"TTE.PA":0.098,
  "BNP.PA":0.158,"ACA.PA":0.142,"DSY.PA":0.122,"STM.PA":0.082,
  // Allemagne
  "SAP.DE":0.222,"ASML.AS":0.282,"ALV.DE":0.158,"SIE.DE":0.158,
  "IFX.DE":0.182,"ADS.DE":0.058,"MUV2.DE":0.142,"RWE.DE":0.082,
  // Suisse / Nordiques
  "NESN.SW":0.042,"ROG.SW":0.022,"NOVN.SW":0.062,"NOVO-B.CO":0.382,
  "CFR.SW":0.142,"ZURN.SW":0.142,"ABBN.SW":0.182,"SIKA.SW":0.122,"LONN.SW":0.222,
  "INGA.AS":0.182,"HEIA.AS":0.042,"VOLV-B.ST":0.142,
  "EQNR.OL":0.142,"DSV.CO":0.182,"ORSTED.CO":-0.122,"NESTE.HE":0.042,
  // Autres Europe
  "ENI.MI":0.118,"RACE.MI":0.222,"UCG.MI":0.282,"ISP.MI":0.222,
  "SAN.MC":0.142,"IBE.MC":0.118,"AMS.MC":0.142,
  "EDP.LS":0.082,"UCB.BR":0.162,"OMV.VI":0.112,
  // Japon
  "7203.T":0.142,"6758.T":0.142,"7974.T":0.082,"9432.T":0.062,
  "9984.T":0.122,"8035.T":0.282,"6861.T":0.142,"6367.T":0.142,
  // Corée/Taiwan
  "005930.KS":0.062,"000660.KS":0.158,"2330.TW":0.282,"2454.TW":0.222,
  // Chine/HK
  "9988.HK":0.022,"700.HK":0.042,"3690.HK":-0.062,"9618.HK":-0.042,"1299.HK":0.122,
  // Inde/Australie
  "TCS.NS":0.182,"INFY.NS":0.142,"HDFCBANK.NS":0.122,
  "BHP.AX":0.142,"CBA.AX":0.158,"CSL.AX":0.058,"MQG.AX":0.182,
  // Canada
  "SHOP.TO":0.122,"RY.TO":0.118,"CNR.TO":0.118,"BAM.TO":0.182,"ABX.TO":0.082,
  // Singapore/Israël
  "D05.SI":0.158,"SEA":-0.042,
  // Émergents
  "VALE3.SA":0.082,"PETR4.SA":0.122,"WEGE3.SA":0.222,"AMXL.MX":0.082,
  "2222.SR":0.142,"NPSNY":0.042,"BBCA.JK":0.122,
  // Crypto
  "BTC-EUR":0.482,"ETH-EUR":0.282,"SOL-EUR":0.522,"BNB-EUR":0.222,
  "XRP-EUR":0.182,"ADA-EUR":0.042,"AVAX-EUR":0.142,
};

const VOL: Record<string,number> = {
  "IWDA.AS":0.152,"VWCE.DE":0.154,"CSPX.AS":0.168,"EQQQ.DE":0.224,"SWRD.PA":0.152,
  "SUSW.PA":0.150,"PAEEM.PA":0.202,"SXRT.DE":0.182,"EXW1.DE":0.174,"MEUD.PA":0.178,
  "XLK":0.242,"XLF":0.228,"XLV":0.162,"XLE":0.284,"XLI":0.192,"SOXX":0.322,"SMH":0.318,
  "ICLN":0.352,"ARKK":0.552,"BOTZ":0.282,"DRIV":0.282,
  "IBGL.AS":0.068,"TLT":0.182,"HYG":0.122,"LQD":0.092,"EMB":0.142,
  "AGGH.L":0.072,"DBZB.DE":0.082,"IUSB.DE":0.075,
  "EPRE.PA":0.242,"IQQP.DE":0.228,"AMT":0.222,"PLD":0.242,"EQIX":0.218,
  "O":0.182,"DLR":0.242,"PSA":0.202,
  "SGLD.L":0.142,"CMOD.L":0.182,"AIGA.DE":0.138,
  "AAPL":0.258,"MSFT":0.242,"NVDA":0.522,"AMZN":0.302,"GOOGL":0.282,
  "META":0.382,"TSLA":0.622,"AVGO":0.342,"AMD":0.482,"QCOM":0.282,
  "TXN":0.222,"AMAT":0.362,"LRCX":0.342,"KLAC":0.342,"CRM":0.282,
  "ADBE":0.302,"NFLX":0.382,"NOW":0.282,"CRWD":0.402,"DDOG":0.502,
  "NET":0.522,"MU":0.402,"INTC":0.302,"CHKP":0.202,"CYBR":0.382,
  "JPM":0.242,"V":0.222,"MA":0.222,"GS":0.282,"BRK-B":0.182,
  "MS":0.282,"BAC":0.282,"BX":0.342,"SPGI":0.222,"MCO":0.222,
  "CB":0.182,"AON":0.182,"COIN":0.852,
  "UNH":0.222,"JNJ":0.162,"LLY":0.302,"PFE":0.242,"MRK":0.222,
  "ABBV":0.262,"AMGN":0.222,"REGN":0.282,"VRTX":0.322,"ISRG":0.262,"TMO":0.222,
  "HD":0.222,"WMT":0.202,"PG":0.162,"KO":0.162,"PEP":0.162,
  "COST":0.222,"MCD":0.182,"NKE":0.262,"SBUX":0.282,
  "XOM":0.262,"CVX":0.262,"BA":0.422,"GE":0.342,"CAT":0.282,
  "HON":0.222,"RTX":0.242,"LMT":0.202,"NOC":0.202,"GD":0.202,"DE":0.282,
  "NEE":0.222,"LIN":0.202,"APD":0.222,"FCX":0.382,
  "T":0.202,"VZ":0.202,"TMUS":0.222,
  "AZN.L":0.202,"GSK.L":0.222,"RIO.L":0.302,"BA.L":0.282,"RR.L":0.422,
  "LSEG.L":0.202,"REL.L":0.182,"NG.L":0.202,"HLMA.L":0.222,
  "MC.PA":0.282,"RMS.PA":0.262,"KER.PA":0.322,"OR.PA":0.202,"SU.PA":0.242,
  "EL.PA":0.222,"AIR.PA":0.282,"SAF.PA":0.262,"TTE.PA":0.242,
  "BNP.PA":0.282,"ACA.PA":0.282,"DSY.PA":0.262,"STM.PA":0.342,
  "SAP.DE":0.242,"ASML.AS":0.302,"ALV.DE":0.222,"SIE.DE":0.242,
  "IFX.DE":0.362,"ADS.DE":0.282,"MUV2.DE":0.202,"RWE.DE":0.282,
  "NESN.SW":0.162,"ROG.SW":0.182,"NOVN.SW":0.182,"NOVO-B.CO":0.282,
  "CFR.SW":0.262,"ZURN.SW":0.182,"ABBN.SW":0.222,"SIKA.SW":0.242,"LONN.SW":0.302,
  "INGA.AS":0.282,"HEIA.AS":0.202,"VOLV-B.ST":0.242,
  "EQNR.OL":0.282,"DSV.CO":0.262,"ORSTED.CO":0.422,"NESTE.HE":0.322,
  "ENI.MI":0.242,"RACE.MI":0.282,"UCG.MI":0.322,"ISP.MI":0.282,
  "SAN.MC":0.282,"IBE.MC":0.222,"AMS.MC":0.222,
  "EDP.LS":0.242,"UCB.BR":0.282,"OMV.VI":0.262,
  "7203.T":0.222,"6758.T":0.282,"7974.T":0.302,"9432.T":0.182,
  "9984.T":0.382,"8035.T":0.382,"6861.T":0.282,"6367.T":0.242,
  "005930.KS":0.322,"000660.KS":0.382,"2330.TW":0.302,"2454.TW":0.342,
  "9988.HK":0.382,"700.HK":0.302,"3690.HK":0.502,"9618.HK":0.422,"1299.HK":0.262,
  "TCS.NS":0.222,"INFY.NS":0.242,"HDFCBANK.NS":0.222,
  "BHP.AX":0.282,"CBA.AX":0.202,"CSL.AX":0.242,"MQG.AX":0.282,
  "SHOP.TO":0.482,"RY.TO":0.202,"CNR.TO":0.202,"BAM.TO":0.282,"ABX.TO":0.302,
  "D05.SI":0.182,"SEA":0.622,
  "VALE3.SA":0.352,"PETR4.SA":0.402,"WEGE3.SA":0.302,"AMXL.MX":0.262,
  "2222.SR":0.242,"NPSNY":0.342,"BBCA.JK":0.262,
  "BTC-EUR":0.702,"ETH-EUR":0.802,"SOL-EUR":0.952,"BNB-EUR":0.752,
  "XRP-EUR":0.902,"ADA-EUR":0.882,"AVAX-EUR":1.052,
};

function r(sym:string):number { return RET[sym]??RET[sym.split(".")[0]]??0.08; }
function v(sym:string):number { return VOL[sym]??VOL[sym.split(".")[0]]??0.25; }

// ── Corrélation réaliste entre deux actifs ────────────────────
function corr(a:AssetMeta, b:AssetMeta):number {
  if(a.symbol===b.symbol) return 1.0;
  const sa=a.type, sb=b.type;
  // Crypto entre elles
  if(sa==="crypto"&&sb==="crypto") return 0.78;
  // Crypto vs autre = très faible
  if(sa==="crypto"||sb==="crypto") return 0.12;
  // Obligations vs actions = quasi nul / légèrement négatif
  if((sa==="bond")!==(sb==="bond")) return -0.02;
  // Or vs actions = faible
  if(a.sector==="materials"&&a.type==="etf"||b.sector==="materials"&&b.type==="etf") return 0.08;
  // REIT vs actions
  if((sa==="reit")!==(sb==="reit")) return 0.42;
  // Même secteur + même région = forte corrélation
  if(a.sector===b.sector&&a.region===b.region) return 0.78;
  // Même secteur régions différentes
  if(a.sector===b.sector) return 0.62;
  // Même région secteurs différents
  if(a.region===b.region) return 0.52;
  // Émergents vs développés
  if((a.region==="emerging")!==(b.region==="emerging")) return 0.38;
  // Asie vs USA/Europe
  if((a.region==="asia")!==(b.region==="asia")) return 0.42;
  return 0.48;
}

// ─────────────────────────────────────────────────────────────
// ALLOCATION STRATÉGIQUE — style CGP / Banque privée
// Détermine la répartition par classe d'actifs selon le profil
// ─────────────────────────────────────────────────────────────
interface StrategicAlloc {
  equityEtf: number;    // % ETF actions larges
  equityStock: number;  // % actions individuelles
  bond: number;         // % obligations
  reit: number;         // % immobilier coté
  commodity: number;    // % or/matières premières
  crypto: number;       // % crypto
  targetN: number;      // nombre d'actifs cible
}

function getStrategicAlloc(risk:string, maxLoss:string, classes:string, diversif:string): StrategicAlloc {
  const isConservative = risk.includes("conservateur");
  const isModerate     = risk.includes("modéré")||risk.includes("modere")||risk.includes("équilibré")||risk.includes("equilibre");
  const isDynamic      = risk.includes("dynamique");
  const isAggressive   = risk.includes("agressif");
  const maxLossPct     = maxLoss.includes("10")?10:maxLoss.includes("20")?20:maxLoss.includes("35")?35:50;

  const wantCrypto   = classes.toLowerCase().includes("crypto");
  const wantBond     = classes.toLowerCase().includes("obligation");
  const wantReit     = classes.toLowerCase().includes("immobilier");
  const wantStock    = classes.toLowerCase().includes("action");
  const wantEtf      = classes.toLowerCase().includes("etf")||!wantStock;
  const isLarge      = diversif.includes("large")||diversif.includes("15")||diversif.includes("20")||diversif.includes("30");
  const isConcentre  = diversif.includes("concentré")||diversif.includes("concentre")||diversif.includes("6")||diversif.includes("8");

  let alloc: StrategicAlloc;

  if(isConservative||maxLossPct<=10) {
    alloc = { equityEtf:0.30, equityStock:0.05, bond:0.45, reit:0.08, commodity:0.07, crypto:0.0, targetN:8 };
  } else if(maxLossPct<=20||isModerate) {
    alloc = { equityEtf:0.45, equityStock:0.15, bond:0.22, reit:0.08, commodity:0.05, crypto:wantCrypto?0.05:0, targetN:12 };
  } else if(isDynamic||maxLossPct<=35) {
    alloc = { equityEtf:0.35, equityStock:0.35, bond:0.10, reit:0.07, commodity:0.05, crypto:wantCrypto?0.08:0, targetN:16 };
  } else {
    // Agressif — style multi-asset offensif
    alloc = { equityEtf:0.20, equityStock:0.52, bond:0.0,  reit:0.05, commodity:0.03, crypto:wantCrypto?0.20:0, targetN:20 };
  }

  // Ajustements selon classes cochées
  if(!wantBond)  { alloc.equityEtf+=alloc.bond*0.6; alloc.equityStock+=alloc.bond*0.4; alloc.bond=0; }
  if(!wantReit)  { alloc.equityStock+=alloc.reit; alloc.reit=0; }
  if(!wantCrypto){ alloc.equityStock+=alloc.crypto*0.6; alloc.equityEtf+=alloc.crypto*0.4; alloc.crypto=0; }
  if(!wantEtf)   { alloc.equityStock+=alloc.equityEtf; alloc.equityEtf=0; }
  if(!wantStock) { alloc.equityEtf+=alloc.equityStock; alloc.equityStock=0; }

  // Normaliser à 100%
  const tot=alloc.equityEtf+alloc.equityStock+alloc.bond+alloc.reit+alloc.commodity+alloc.crypto;
  if(tot>0){ alloc.equityEtf/=tot;alloc.equityStock/=tot;alloc.bond/=tot;alloc.reit/=tot;alloc.commodity/=tot;alloc.crypto/=tot; }

  // Nombre de lignes
  if(isConcentre) alloc.targetN=Math.min(alloc.targetN,8);
  else if(isLarge) alloc.targetN=Math.max(alloc.targetN,18);

  return alloc;
}

// ─────────────────────────────────────────────────────────────
// SÉLECTION PAR BUCKET — Choisit les meilleurs actifs
// par classe, région, secteur
// ─────────────────────────────────────────────────────────────
function selectByBucket(
  universe: AssetMeta[],
  type: string[],
  geo: string,
  sector: string,
  n: number,
  risk: string
): AssetMeta[] {

  const isAggressive = risk.includes("agressif")||risk.includes("dynamique");

  // Zones souhaitées
  const wantWorld    = geo.includes("monde")||geo==="";
  const wantUSA      = geo.includes("usa")||geo.includes("états")||wantWorld;
  const wantEurope   = geo.includes("europe")||wantWorld;
  const wantAsia     = geo.includes("asie")||wantWorld;
  const wantEmerging = geo.includes("émergent")||geo.includes("emergent")||wantWorld;

  const pool = universe.filter(a => {
    if(!type.includes(a.type)) return false;
    if(a.region==="usa"      && !wantUSA)      return false;
    if(a.region==="europe"   && !wantEurope)   return false;
    if(a.region==="asia"     && !wantAsia)     return false;
    if(a.region==="emerging" && !wantEmerging) return false;
    if(a.sector==="defense"  && sector==="nodefefense") return false;
    return true;
  });

  // Scorer selon Sharpe estimé + pertinence
  const riskFree = 0.03;
  const scored = pool.map(a => {
    const ret  = r(a.symbol);
    const vol  = v(a.symbol);
    const sharpe = (ret - riskFree) / Math.max(vol, 0.05);
    let score  = sharpe;
    // Pour profil agressif, privilégier rendement sur Sharpe
    if(isAggressive) score = ret * 0.7 + sharpe * 0.3;
    // Malus sur frais ETF élevés
    if(a.type==="etf" && a.ter && a.ter > 0.5) score -= 0.2;
    // Léger aléatoire pour varier les résultats
    score += (Math.random() - 0.5) * 0.08;
    return { ...a, score };
  });

  scored.sort((a,b) => (b as typeof a&{score:number}).score-(a as typeof a&{score:number}).score);

  // Sélection avec diversité sectorielle et géographique forcée
  const selected: AssetMeta[] = [];
  const bySector: Record<string,number>  = {};
  const byRegion:  Record<string,number> = {};
  const maxPerSec  = Math.max(1, Math.ceil(n * 0.35));
  const maxPerReg  = Math.max(1, Math.ceil(n * 0.55));

  for(const a of scored) {
    if(selected.length >= n) break;
    const sc = bySector[a.sector]||0;
    const rc = byRegion[a.region]||0;
    if(sc >= maxPerSec) continue;
    if(rc >= maxPerReg) continue;
    selected.push(a);
    bySector[a.sector] = sc+1;
    byRegion[a.region] = rc+1;
  }

  // Compléter si besoin
  if(selected.length < Math.min(n,2)) {
    for(const a of scored) {
      if(!selected.find(s=>s.symbol===a.symbol)) selected.push(a);
      if(selected.length >= n) break;
    }
  }

  return selected;
}

// ─────────────────────────────────────────────────────────────
// MARKOWITZ Monte Carlo sur les actifs sélectionnés
// ─────────────────────────────────────────────────────────────
function optimize(
  assets:    AssetMeta[],
  capital:   number,
  stratAlloc: StrategicAlloc,
  nSim = 15000,
  riskFree = 0.03
) {
  const n = assets.length;
  if(n < 2) return null;

  const rets = assets.map(a => r(a.symbol));
  const vols = assets.map(a => v(a.symbol));

  // Matrice de covariance avec Ledoit-Wolf shrinkage
  const alpha = 0.12;
  const traceCov = assets.reduce((_s,a,i)=>_s+vols[i]**2,0);
  const mu = traceCov/n;
  const cov = assets.map((a,i)=>assets.map((b,j)=>{
    const raw = i===j ? vols[i]**2 : corr(a,b)*vols[i]*vols[j];
    return (1-alpha)*raw + alpha*(i===j?mu:0);
  }));

  // Contraintes d'allocation stratégique pour guider les poids
  // Chaque actif a un "budget" max selon sa classe
  function maxWeight(a:AssetMeta):number {
    if(a.type==="crypto")    return Math.min(0.15, stratAlloc.crypto/Math.max(1,assets.filter(x=>x.type==="crypto").length)+0.05);
    if(a.type==="bond")      return Math.min(0.20, stratAlloc.bond/Math.max(1,assets.filter(x=>x.type==="bond").length)+0.05);
    if(a.type==="reit")      return Math.min(0.12, stratAlloc.reit/Math.max(1,assets.filter(x=>x.type==="reit").length)+0.04);
    if(a.type==="etf")       return 0.25;
    return 0.20; // actions individuelles
  }
  function minWeight(_a:AssetMeta):number { return 0.02; }

  let gmv   = { w:Array(n).fill(1/n), ret:0, vol:1e9, sharpe:0 };
  let maxSh = { w:Array(n).fill(1/n), ret:0, vol:1, sharpe:-1e9 };
  let maxUt = { w:Array(n).fill(1/n), ret:0, vol:1, util:-1e9 };
  const frontier:{vol:number;ret:number}[]=[];

  for(let s=0;s<nSim;s++){
    // Générer poids avec contraintes min/max
    const raw = assets.map(()=> -Math.log(Math.random()+1e-10));
    const sum = raw.reduce((a,b)=>a+b,0);
    let w = raw.map(v=>v/sum);

    // Clip selon min/max
    const maxW = assets.map(a=>maxWeight(a));
    const minW = assets.map(a=>minWeight(a));
    w = w.map((wi,i)=>Math.max(minW[i],Math.min(maxW[i],wi)));
    const ws = w.reduce((a,b)=>a+b,0);
    w = w.map(wi=>wi/ws);

    let pRet=0; for(let i=0;i<n;i++) pRet+=w[i]*rets[i];
    let pVar=0; for(let i=0;i<n;i++) for(let j=0;j<n;j++) pVar+=w[i]*w[j]*cov[i][j];
    const pVol=Math.sqrt(Math.max(0,pVar));
    if(pVol<0.001) continue;

    const sharpe=(pRet-riskFree)/pVol;
    const util=pRet-0.5*3*pVar;

    if(pVol<gmv.vol)        gmv  ={w,ret:pRet,vol:pVol,sharpe};
    if(sharpe>maxSh.sharpe) maxSh={w,ret:pRet,vol:pVol,sharpe};
    if(util>maxUt.util)     maxUt={w,ret:pRet,vol:pVol,util};
    if(s%80===0) frontier.push({vol:parseFloat(pVol.toFixed(3)),ret:parseFloat(pRet.toFixed(3))});
  }

  // Frontière efficiente pareto
  const sorted=frontier.sort((a,b)=>a.vol-b.vol);
  let pr=-Infinity;
  const pareto=sorted.filter(p=>{if(p.ret>pr){pr=p.ret;return true;}return false;}).slice(0,60);

  function build(opt:{w:number[];ret:number;vol:number;sharpe:number},label:string,method:string,rec=false){
    const wts=opt.w
      .map((wi,i)=>({
        symbol:  assets[i].symbol,
        name:    assets[i].name,
        type:    assets[i].type,
        isin:    assets[i].isin,
        weight:  wi,
        amount:  Math.round(capital*wi),
      }))
      .filter(w=>w.weight>=0.02)
      .sort((a,b)=>b.weight-a.weight);
    const totW=wts.reduce((s,w)=>s+w.weight,0);
    const normalized=wts.map(w=>({...w,weight:parseFloat((w.weight/totW).toFixed(4)),amount:Math.round(capital*w.weight/totW)}));
    const var95=Math.abs(opt.ret-1.645*opt.vol)*100;
    return {
      method,label,rec,
      ret:parseFloat((opt.ret*100).toFixed(2)),
      vol:parseFloat((opt.vol*100).toFixed(2)),
      sharpe:parseFloat(opt.sharpe.toFixed(3)),
      var95:parseFloat(var95.toFixed(2)),
      weights:normalized,
      frontier:pareto,
    };
  }

  return [
    build(gmv,  "Variance Minimale","gmv"),
    build(maxSh,"Sharpe Maximum",   "maxsharpe",true),
    build(maxUt,"Utilité Maximale", "utility"),
  ];
}

// ─────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { capital=50000, answers={} } = body;

    const get=(k:number)=>String(answers[k]??answers[String(k)]??"");
    const risk    = get(2)||"Modéré";
    const maxLoss = get(3)||"−20% maximum";
    const esg     = get(4)||"";
    const classes = get(5)||"ETF,Actions";
    const geo     = get(6)||"Monde entier";
    const diversif= get(7)||"Équilibré";

    const esgStrict  = esg.toLowerCase().includes("strict");
    const noDefense  = esg.toLowerCase().includes("armement")||esg.toLowerCase().includes("exclure");

    // 1. Allocation stratégique
    const alloc = getStrategicAlloc(risk, maxLoss, classes, diversif);

    // 2. Univers filtré ESG
    const universe = ASSET_UNIVERSE.filter(a=>{
      if(esgStrict && !a.esg) return false;
      if(noDefense && a.sector==="defense") return false;
      return true;
    });

    // 3. Sélection par bucket selon l'allocation stratégique
    const selected: AssetMeta[] = [];
    const buckets: {types:string[];share:number;label:string}[] = [
      {types:["etf"],          share:alloc.equityEtf,   label:"etf_equity"},
      {types:["stock"],        share:alloc.equityStock, label:"stock"},
      {types:["bond"],         share:alloc.bond,        label:"bond"},
      {types:["reit"],         share:alloc.reit,        label:"reit"},
      {types:["etf"],          share:alloc.commodity,   label:"commodity"},
      {types:["crypto"],       share:alloc.crypto,      label:"crypto"},
    ];

    const N = alloc.targetN;
    const geoLower = geo.toLowerCase();

    for(const bucket of buckets){
      if(bucket.share < 0.02) continue;
      const nBucket = Math.max(1, Math.round(bucket.share * N));

      if(bucket.label==="commodity"){
        // Or/matières premières uniquement
        const pool = universe.filter(a=>a.type==="etf"&&a.sector==="materials");
        const pick = pool.slice(0,Math.min(nBucket,2));
        pick.forEach(a=>{ if(!selected.find(s=>s.symbol===a.symbol)) selected.push(a); });
      } else if(bucket.label==="crypto"){
        const pool = universe.filter(a=>a.type==="crypto");
        const scored = pool.map(a=>({...a,s:r(a.symbol)/v(a.symbol)+Math.random()*0.1}))
          .sort((a,b)=>b.s-a.s).slice(0,nBucket);
        scored.forEach(a=>{ if(!selected.find(s=>s.symbol===a.symbol)) selected.push(a); });
      } else {
        const picks = selectByBucket(universe, bucket.types, geoLower, noDefense?"nodefefense":"", nBucket, risk);
        picks.forEach(a=>{ if(!selected.find(s=>s.symbol===a.symbol)) selected.push(a); });
      }
    }

    // 4. Optimisation Markowitz
    const results = optimize(selected, capital, alloc);
    if(!results) return NextResponse.json({error:"Optimisation impossible"},{status:422});

    return NextResponse.json({
      results,
      universeSize: ASSET_UNIVERSE.length,
      filteredSize: selected.length,
      profile: {risk,maxLoss,classes,geo,diversif},
      strategicAlloc: alloc,
    });

  } catch(err){
    console.error("Optimize error:", err);
    return NextResponse.json({error:String(err)},{status:500});
  }
}
