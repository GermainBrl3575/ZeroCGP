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

/* ── Mapping questionnaire → univers d'actifs ──────────── */
const UNIVERSE_BY_PROFILE: Record<string,string[]> = {
  // Profil très défensif (perte max -10%)
  defensive: [
    "AGGH.L","IEAG.L","TLT","BND","LQD","HYG","SHY","IEF","GOVT","AGG",
    "SGLD.L","IGLN.L","GLD","IAU","VCSH","BSV","JPST","SGOV","FLOT","MINT",
    "VWCE.DE","IWDA.AS","CSPX.L","^TNX","^TYX","EURUSD=X",
  ],
  // Profil modéré (perte max -20%)
  moderate: [
    "IWDA.AS","VWCE.DE","CSPX.L","PANX.PA","EUNL.DE","IUSA.L",
    "PAEEM.PA","VFEM.L","IEMG","EEM","EXSA.DE","EXW1.DE",
    "AGGH.L","IEAG.L","TLT","BND","CORP.PA","IHYG.L",
    "SGLD.L","IGLN.L","GLD","VNQ","IPRP.L","REET",
    "EPRE.PA","NOBL","VYM","HDV","SCHD","VIG",
  ],
  // Profil équilibré (perte max -35%)
  balanced: [
    "IWDA.AS","VWCE.DE","CSPX.L","SPY","VOO","QQQ","EQQQ.DE",
    "PAEEM.PA","EEM","IEMG","EXSA.DE","EXW1.DE","EWJ","EWZ",
    "AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA",
    "ASML.AS","MC.PA","RMS.PA","NOVO-B.CO","SAP.DE","NESN.SW",
    "AGGH.L","TLT","BND","LQD","GLD","SGLD.L",
    "VNQ","IPRP.L","AMT","PLD","EQIX",
    "AIR.PA","SAF.PA","SAN.PA","TTE.PA","SU.PA",
  ],
  // Profil agressif (pas de limite)
  aggressive: [
    "QQQ","EQQQ.DE","SPY","NVDA","AAPL","MSFT","GOOGL","AMZN","META","TSLA",
    "ASML.AS","AMD","NFLX","CRM","ADBE","NOW","AVGO","ORCL",
    "SOXX","SMH","ARKK","BOTZ","ROBO","AIQ","ICLN","INRG.L",
    "MC.PA","RMS.PA","KER.PA","NOVO-B.CO","SAP.DE","ASML.AS",
    "PAEEM.PA","EEM","KWEB","MCHI","INDA","SE","MELI",
    "BTC-USD","ETH-USD","IBIT","FBTC","COIN",
    "2330.TW","005930.KS","9984.T","6861.T",
  ],
};

/* ── Sélectionner l'univers selon le profil ────────────── */
function selectUniverse(answers: Record<string,string>): string[] {
  const loss   = answers["3"] || "";
  const assets = answers["5"] || "";

  let profile = "balanced";
  if (loss.includes("10%"))   profile = "defensive";
  else if (loss.includes("20%")) profile = "moderate";
  else if (loss.includes("limite")) profile = "aggressive";

  let universe = [...UNIVERSE_BY_PROFILE[profile]];

  // Filtres ESG
  if (answers["4"]?.includes("strict")) {
    universe = universe.filter(s =>
      ["SUSW.SW","MWRD.L","ESGU","ESGD","ESGE","ERTH"].includes(s) ||
      !["BTC-USD","ETH-USD","COIN","OXY","DVN","APA","EOG"].includes(s)
    );
  }

  // Classes d'actifs demandées
  const wantsCrypto  = assets.includes("crypto") || assets.includes("Crypto");
  const wantsImmo    = assets.includes("immobilier") || assets.includes("Immobilier");
  const wantsMatieres= assets.includes("matière") || assets.includes("Matière");

  if (!wantsCrypto)   universe = universe.filter(s => !["BTC-USD","ETH-USD","IBIT","FBTC","COIN"].includes(s));
  if (wantsImmo)      universe.push("VNQ","IPRP.L","REET","AMT","PLD","EQIX","ARE","WELL");
  if (wantsMatieres)  universe.push("GLD","SGLD.L","USO","BCIT.L","GNR","COPX","LIT");

  // Zones géographiques
  const zone = answers["6"] || "";
  if (zone.includes("USA"))     universe = universe.filter(s => !["EXSA.DE","EXW1.DE","PAEEM.PA","EWJ"].includes(s));
  if (zone.includes("Europe"))  universe = universe.filter(s => !["SPY","VOO","QQQ","EEM","EWJ"].includes(s));
  if (zone.includes("émergents")) universe.push("PAEEM.PA","EEM","IEMG","KWEB","INDA","MCHI","SE","MELI");

  // Diversification
  const diversif = answers["7"] || "";
  const maxAssets = diversif.includes("5") ? 8
                  : diversif.includes("15") ? 30 : 18;

  // Déduplication + limite
  return [...new Set(universe)].slice(0, Math.min(universe.length, 50));
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
      if (p.length > 52) { // au moins 1 an de données
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

      const weights: Weight[] = weightedSyms
        .filter(s => opt.weights[s] > 0.01)
        .sort((a,b) => opt.weights[b] - opt.weights[a])
        .map(s => ({
          symbol: s,
          name:   meta[s]?.name || s,
          type:   meta[s]?.type || "stock",
          weight: Math.round(opt.weights[s] * 1000) / 10,
          amount: Math.round(opt.weights[s] * capital),
        }));

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
