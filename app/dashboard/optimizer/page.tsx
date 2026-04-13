"use client";
import dynamic from "next/dynamic";
import AssetCard from "@/components/AssetCard";
import SupportBuilder from "@/components/ui/SupportBuilder";
import Sheet from "@/components/ui/Sheet";
import { Q1Timeline, Q2RiskCards, Q3LossBar, Q4EsgCards, Q5AssetGrid, Q7DivCards, InfoTip } from "@/components/ui/QuestionCards";
const MarkowitzAnim = dynamic(() => import("@/components/MarkowitzAnim"), { ssr: false });
const WorldMapExposure = dynamic(() => import("@/components/WorldMapExposure"), { ssr: false });
import { useState, Suspense, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAssetInfo, getAssetHistory } from "@/lib/assetInfo";
import { eur } from "@/lib/utils";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const NAVY = "#0A1628";
const NAVY_MID = "#1E3A6E";
const TYPE_COLOR: Record<string, string> = {
  etf: "#2563EB", stock: "#16A34A", crypto: "#D97706",
};

// ─── Normalise le symbole pour le lookup (retire l'extension bourse) ──────────
function baseSymbol(sym: string): string {
  return sym.split(".")[0].toUpperCase();
}

// ─── Base de données actifs enrichie ──────────────────────────────────────────
const ASSET_DB: Record<string, {
  desc: string; sector: string; isin: string;
  history: Record<string, number>;
}> = {
  "IWDA":  { isin:"IE00B4L5Y983", sector:"ETF Actions Monde",      desc:"ETF qui réplique plus de 1 600 grandes et moyennes entreprises des pays développés (USA, Europe, Japon…). La référence mondiale pour investir simplement.", history:{"1M":1.6,"6M":4.0,"1A":17.2,"5A":95.0,"10A":232.0} },
  "VWCE":  { isin:"IE00BK5BQT80", sector:"ETF Actions Monde",      desc:"ETF 'total world' qui investit dans plus de 3 700 entreprises de 50 pays. La diversification ultime en un seul actif.", history:{"1M":1.5,"6M":3.8,"1A":15.2,"5A":82.0,"10A":198.0} },
  "PANX":  { isin:"LU1681048804", sector:"ETF Actions Monde",      desc:"ETF Amundi répliquant le MSCI World, cotée à Paris. Alternative économique aux ETF iShares avec un TER compétitif.", history:{"1M":1.5,"6M":3.7,"1A":16.8,"5A":90.0,"10A":220.0} },
  "CSPX":  { isin:"IE00B5BMR087", sector:"ETF Actions USA",        desc:"ETF qui réplique les 500 plus grandes entreprises américaines (Apple, Microsoft, Amazon…). L'indice de référence mondial.", history:{"1M":1.8,"6M":4.2,"1A":18.5,"5A":98.0,"10A":241.0} },
  "QDVE":  { isin:"IE00B3RBWM25", sector:"ETF Tech USA",           desc:"ETF S&P 500 sectoriel focalisé sur les technologies de l'information. Exposé à Apple, Microsoft, Nvidia, Broadcom.", history:{"1M":2.8,"6M":6.2,"1A":24.1,"5A":148.0,"10A":420.0} },
  "EQQQ":  { isin:"IE0032077012", sector:"ETF Tech USA",           desc:"ETF qui suit les 100 plus grandes valeurs technologiques du Nasdaq (Nvidia, Meta, Google…). Plus volatile mais très performant.", history:{"1M":2.4,"6M":5.1,"1A":22.3,"5A":132.0,"10A":389.0} },
  "PAEEM": { isin:"LU1681045370", sector:"ETF Marchés Émergents",  desc:"ETF exposé aux marchés émergents : Chine, Inde, Brésil, Taïwan… Fort potentiel de croissance mais plus risqué.", history:{"1M":-0.8,"6M":2.1,"1A":8.4,"5A":21.0,"10A":52.0} },
  "EPRE":  { isin:"FR0010686099", sector:"ETF Immobilier Europe",  desc:"ETF immobilier coté européen (REITs). Accès à l'immobilier commercial, bureaux et logistique sans acheter directement.", history:{"1M":-1.2,"6M":1.4,"1A":6.8,"5A":12.0,"10A":38.0} },
  "SUSW":  { isin:"IE00BYX2JD69", sector:"ETF Monde ESG",         desc:"ETF MSCI World filtré selon des critères environnementaux, sociaux et de gouvernance (ESG). Exclut les entreprises controversées.", history:{"1M":1.4,"6M":3.5,"1A":15.8,"5A":78.0,"10A":185.0} },
  "MC":    { isin:"FR0000121014", sector:"Luxe / Consommation",    desc:"LVMH est le premier groupe mondial de luxe (Louis Vuitton, Dior, Moët…). CA 2023 : 86 Mds €, présent dans 75 pays.", history:{"1M":-2.1,"6M":-8.4,"1A":-12.0,"5A":68.0,"10A":285.0} },
  "AIR":   { isin:"NL0000235190", sector:"Aéronautique / Défense", desc:"Airbus est le leader mondial de la construction aéronautique civile. Carnet de commandes record en 2024 avec plus de 8 600 avions.", history:{"1M":0.6,"6M":3.2,"1A":4.8,"5A":38.0,"10A":142.0} },
  "ASML":  { isin:"NL0010273215", sector:"Semi-conducteurs",       desc:"ASML est le seul fabricant mondial de machines lithographiques EUV, indispensables pour produire les puces les plus avancées. Monopole absolu.", history:{"1M":-3.2,"6M":-12.0,"1A":5.0,"5A":178.0,"10A":1820.0} },
  "AAPL":  { isin:"US0378331005", sector:"Tech / Consumer",        desc:"Apple est la première capitalisation mondiale (~3 000 Mds$). Très diversifié entre iPhone, Mac, services (App Store, iCloud) et wearables.", history:{"1M":3.1,"6M":8.4,"1A":26.0,"5A":198.0,"10A":832.0} },
  "MSFT":  { isin:"US5949181045", sector:"Cloud / IA / Software",  desc:"Microsoft est le leader mondial du cloud (Azure) et de la productivité (Office 365). Investisseur majeur dans OpenAI / ChatGPT.", history:{"1M":2.2,"6M":6.8,"1A":18.0,"5A":182.0,"10A":742.0} },
  "NOVO":  { isin:"DK0060534915", sector:"Santé / Pharma",         desc:"Novo Nordisk est le leader mondial de l'insuline et des traitements contre l'obésité (Ozempic, Wegovy). Plus grande capitalisation européenne.", history:{"1M":-4.1,"6M":-18.0,"1A":12.0,"5A":288.0,"10A":980.0} },
  "BTC":   { isin:"N/A",          sector:"Crypto-actif",           desc:"Le Bitcoin est la première cryptomonnaie mondiale par capitalisation (~1 400 Mds$). Réserve de valeur numérique, offre limitée à 21 millions d'unités.", history:{"1M":8.2,"6M":28.0,"1A":62.0,"5A":890.0,"10A":18400.0} },
  "ETH":   { isin:"N/A",          sector:"Crypto-actif",           desc:"Ethereum est la blockchain de référence pour les smart contracts et les DApps. Passé au Proof of Stake en 2022, réduisant sa conso énergétique de 99,95%.", history:{"1M":4.1,"6M":12.0,"1A":28.0,"5A":420.0,"10A":6800.0} },
};

const NEWS_DB: Record<string, string[]> = {
  "IWDA":  ["Les marchés développés progressent portés par la tech américaine","L'ETF MSCI World bat les fonds actifs sur 15 ans dans 92% des cas","Les flux vers les ETF monde atteignent un record historique en 2024"],
  "VWCE":  ["Les marchés mondiaux progressent malgré l'incertitude géopolitique","Les ETF monde battent à nouveau les fonds actifs sur 10 ans","L'Europe et l'Asie soutiennent la performance du MSCI All World"],
  "PANX":  ["Amundi confirme sa position de leader européen des ETF","L'ETF PANX dépasse les 10 Mds€ d'encours","Amundi lance une nouvelle gamme d'ETF à faible coût sur le MSCI World"],
  "CSPX":  ["Le S&P 500 atteint de nouveaux sommets portés par les valeurs tech","La Fed maintient ses taux, les marchés américains en hausse","Bonne saison de résultats pour les grandes capitalisations américaines"],
  "QDVE":  ["L'IA générative booste les valeurs tech du S&P 500 IT","Nvidia intègre l'indice et représente désormais 6% du secteur","Les semi-conducteurs surperforment le marché global en 2024"],
  "EQQQ":  ["Nvidia dépasse les 3 000 Mds$ de capitalisation","L'intelligence artificielle propulse le Nasdaq à la hausse","Les valeurs semi-conducteurs en forte progression sur l'année"],
  "PAEEM": ["L'Inde devient le 3ème marché boursier mondial","Reprise en Chine : le CSI 300 rebondit de 25% en un mois","Les émergents profitent d'un dollar plus faible et de la baisse des taux Fed"],
  "EPRE":  ["La baisse des taux relance l'immobilier côté européen","Les REITs logistiques affichent une croissance de loyers de +8%","Le segment résidentiel européen résiste mieux que prévu"],
  "SUSW":  ["Les fonds ESG affichent une collecte record en Europe","L'ESMA renforce les critères anti-greenwashing pour les ETF","Les valeurs ESG surperforment en périodes de volatilité selon Morningstar"],
  "MC":    ["LVMH : résultats T1 2024 légèrement en retrait sur le luxe en Chine","Bernard Arnault confirme la stratégie long terme du groupe","Le segment Sephora et DFS affichent une forte croissance organique"],
  "AIR":   ["Airbus confirme son objectif de 800 livraisons en 2024","La montée en cadence de l'A320neo rassure les investisseurs","Airbus remporte un méga-contrat de 100 avions avec Air India"],
  "ASML":  ["Commandes record pour les machines EUV next-gen (High-NA)","TSMC et Samsung commandent de nouvelles machines ASML pour 2025","Les États-Unis restreignent l'export vers la Chine, impact limité sur ASML"],
  "AAPL":  ["Apple Intelligence déployé dans iOS 18, fort intérêt des analystes","iPhone 16 : ventes solides aux USA malgré un marché chinois difficile","Apple rachète des actions pour 110 Mds$, record absolu en 2024"],
  "MSFT":  ["Azure dépasse 40% de croissance grâce à l'IA et à OpenAI","Microsoft Copilot intégré dans 365, adoption massive en entreprise","Résultats Q2 2024 en hausse de 17%, au-dessus des attentes des analystes"],
  "NOVO":  ["Ozempic : pénurie mondiale confirmée, Novo Nordisk triple sa production","Wegovy approuvé pour de nouvelles indications cardiovasculaires","Novo Nordisk investit 6 Mds$ dans une nouvelle usine de production"],
  "BTC":   ["Bitcoin consolide après son ATH historique à 73 500$","Les ETF Bitcoin spot américains franchissent 50 Mds$ d'encours en 6 mois","Le halving d'avril 2024 réduit l'offre, pression haussière maintenue"],
  "ETH":   ["Ethereum post-Merge : consommation énergétique -99,95%","L'essor du restaking (EigenLayer) booste la demande d'ETH","Les Layer 2 Ethereum (Arbitrum, Base) battent des records de volumes"],
};

// ─── Explications pédagogiques ─────────────────────────────────────────────────
const METHOD_INFO: Record<string, string> = {
  gmv: "Le portefeuille à Variance Minimale est le plus prudent possible. Il choisit la combinaison d'actifs qui fait le moins trembler votre patrimoine, même si le rendement est plus faible. Idéal si vous voulez éviter les fortes secousses.",
  maxsharpe: "Le portefeuille Sharpe Maximum est le plus efficace : il vous donne le meilleur rendement possible pour le niveau de risque pris. C'est celui que la plupart des experts recommandent comme point de départ.",
  utility: "Le portefeuille Utilité Maximale est personnalisé selon votre tolérance au risque. Il équilibre rendement et sécurité selon votre profil, entre la prudence totale et l'optimisme maximal.",
};

const METRIC_INFO: Record<string, string> = {
  rendement: "C'est le gain annuel moyen attendu. +10% veut dire que 10 000 € deviennent environ 11 000 € en un an en moyenne, sur la base des données historiques.",
  volatilite: "C'est la mesure des 'secousses' de votre portefeuille. 15% de volatilité signifie que votre portefeuille peut varier de ±15% autour de sa tendance. Plus c'est bas, plus c'est stable.",
  sharpe: "Le ratio de Sharpe mesure si le jeu en vaut la chandelle. Sharpe > 0.7 est bon, > 1 est excellent. Plus il est élevé, mieux vous êtes rémunéré pour chaque unité de risque prise.",
  var95: "La VaR à 95% est votre pire scénario probable. -18% signifie que dans 95% des cas, votre perte annuelle sera inférieure à 18%. C'est une 'limite basse' statistique de confiance.",
};

// ─── InfoBubble: uses shared portal-based component ──────────────────────────
import InfoBubble from "@/components/ui/InfoBubble";

// ─── Accordéon actif ────────────────────────────────────────────────────────────



const ASSET_CLASSES = ["ETF", "Actions", "Crypto", "Obligations", "Immobilier coté"];

const QUESTIONS = [
  { id:"Q1", q:"Quel est votre horizon d'investissement ?",    opts:["Moins de 2 ans","2 à 5 ans","5 à 10 ans","10 ans et plus"] },
  { id:"Q2", q:"Quel est votre profil de risque ?",           opts:["Conservateur","Modéré","Dynamique","Agressif"] },
  { id:"Q3", q:"Quelle perte annuelle pouvez-vous accepter ?",opts:["−10% maximum","−20% maximum","−35% maximum","Pas de limite"] },
  { id:"Q4", q:"Souhaitez-vous des filtres ESG ?",             opts:["Aucun filtre","Exclure armement & tabac","ESG strict uniquement"] },
  { id:"Q5", q:"Quelles classes d'actifs souhaitez-vous ?",   opts:[], isMulti:true },
  { id:"Q6", q:"Quelles zones géographiques privilégiez-vous ?", opts:[], isMulti:true },
  { id:"Q7", q:"Quel niveau de diversification visez-vous ?", opts:[
    {label:"Simple à suivre (3-5 actifs)",value:"Concentre"},
    {label:"Équilibré (6-10 actifs)",value:"Equilibre"},
    {label:"Maximum de diversification (10-15 actifs)",value:"Large"},
  ] },
  { id:"Q8", q:"Quels comptes d'investissement possédez-vous ?", opts:[], isMulti:true },
];

const CALC_STEPS = [
  "Connexion aux données de marché","Récupération des historiques (5 ans)",
  "Construction de la matrice de covariance","Application du shrinkage Ledoit-Wolf",
  "Calcul de la frontière efficiente","Maximisation du ratio de Sharpe",
  "Calcul VaR 95% et CVaR","Validation des contraintes","Génération du rapport final",
];
const CALC_DURATION = 5500;

type Weight = { symbol:string; name:string; type:string; weight:number; amount:number };
type FrontierPt = { vol:number; ret:number };
type OptResult = { method:string; label:string; ret:number; vol:number; sharpe:number; var95:number; rec?:boolean; weights:Weight[]; frontier:FrontierPt[]; };

// ─── Normalise les résultats API (champs différents du mock) ──────────────────
function normalizeResult(r: Record<string, unknown>, capital: number): OptResult {
  // Récupérer les poids depuis différents formats possibles de l'API
  const rawWeights = (r.weights ?? r.capitalAllocation ?? []) as Array<Record<string, unknown>>;
  const weights: Weight[] = rawWeights
    .filter(w => w && ((w.weight as number) ?? 0) >= 0.01)
    .map(w => ({
      symbol: String(w.symbol ?? ""),
      name:   String(w.name ?? w.symbol ?? ""),
      type:   String(w.type ?? "etf") as "etf"|"stock"|"crypto"|"bond"|"reit",
      isin:   String(w.isin ?? ""),
      weight: Number(w.weight ?? 0),
      amount: Number(w.amount ?? Math.round(capital * Number(w.weight ?? 0))),
    }))
    .sort((a, b) => b.weight - a.weight);

  const ret    = Number(r.ret    ?? r.expectedReturn ?? r.annualReturn ?? 0);
  const vol    = Number(r.vol    ?? r.volatility     ?? r.annualVol   ?? 0);
  const sharpe = Number(r.sharpe ?? r.sharpeRatio    ?? 0);
  const var95  = Number(r.var95  ?? r.valueAtRisk    ?? 0);

  return {
    method:   String(r.method   ?? "maxsharpe"),
    label:    String(r.label    ?? "Optimisé"),
    ret,
    vol,
    sharpe,
    var95,
    rec:      Boolean(r.rec     ?? false),
    weights,
    frontier: (r.frontier as FrontierPt[]) ?? [],
  };
}

function buildMockResults(capital: number): OptResult[] {
  console.error("⚠️ FALLBACK MOCK — L'API /api/optimize n'a pas répondu correctement");
  const syms = [
    {symbol:"CSPX.AS",name:"iShares Core S&P 500",type:"etf"},
    {symbol:"VWCE.DE",name:"Vanguard All-World",type:"etf"},
    {symbol:"EQQQ.DE",name:"Invesco NASDAQ-100",type:"etf"},
    {symbol:"PAEEM.PA",name:"MSCI Emerging Markets",type:"etf"},
    {symbol:"MC.PA",name:"LVMH",type:"stock"},
    {symbol:"BTC-EUR",name:"Bitcoin",type:"crypto"},
  ];
  const alloc = (ws:number[]): Weight[] => syms.map((s,i)=>({...s,weight:ws[i],amount:Math.round(capital*ws[i])}));
  const frontier: FrontierPt[] = Array.from({length:40},(_,i)=>({vol:parseFloat((8+i*0.7).toFixed(1)),ret:parseFloat((4+Math.sqrt(i)*2.2).toFixed(1))}));
  return [
    {method:"gmv",      label:"Variance Minimale", ret:8.2, vol:11.4,sharpe:0.69,var95:18.8, weights:alloc([0.35,0.28,0.15,0.12,0.07,0.03]),frontier},
    {method:"maxsharpe",label:"Sharpe Maximum",    ret:12.7,vol:14.2,sharpe:0.87,var95:23.4,rec:true,weights:alloc([0.30,0.22,0.20,0.10,0.12,0.06]),frontier},
    {method:"utility",  label:"Utilité Maximale",  ret:10.4,vol:12.8,sharpe:0.76,var95:21.1, weights:alloc([0.32,0.25,0.18,0.11,0.09,0.05]),frontier},
  ];
}

function FrontierTooltip({ active, payload }: { active?: boolean; payload?: {value:number;name:string}[] }) {
  if (!active || !payload?.length) return null;
  const vol = payload.find(p=>p.name==="vol")?.value;
  const ret = payload.find(p=>p.name==="ret")?.value;
  return (
    <div style={{background:NAVY,borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 16px rgba(0,0,0,.2)"}}>
      <div style={{color:"rgba(255,255,255,.4)",fontSize:10,marginBottom:5}}>Point de la frontière</div>
      <div style={{color:"white",fontSize:12,fontWeight:500}}>Rendement : <span style={{color:"#6EE7B7"}}>+{ret}%</span></div>
      <div style={{color:"white",fontSize:12,fontWeight:500}}>Volatilité : <span style={{color:"#FCA5A5"}}>{vol}%</span></div>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes cardIn { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
  .op{padding:0;min-height:100%;font-family:'Inter',sans-serif;font-weight:300;animation:fadeIn .4s ease}
  .op-ey{font-size:10px;font-weight:500;letter-spacing:.15em;color:rgba(26,58,106,.65);margin-bottom:32px;text-transform:uppercase}
  .op-h1{font-family:'Inter',sans-serif;font-size:38px;font-weight:500;color:rgba(5,11,20,.88);letter-spacing:-.03em;line-height:1.15;margin-bottom:14px}
  .op-sub{font-size:14.5px;font-weight:400;color:rgba(5,11,20,.78);line-height:1.8;margin-bottom:40px;max-width:500px}
  .op-metrics{display:flex;gap:12px;margin-bottom:44px}
  .op-mn{font-family:'Inter',sans-serif;font-size:32px;font-weight:500;color:rgba(5,11,20,.88);letter-spacing:-.02em;line-height:1;font-variant-numeric:tabular-nums}
  .op-ml{font-size:9px;color:rgba(5,11,20,.36);margin-top:8px;letter-spacing:.12em;text-transform:uppercase;font-weight:500}
  .stat-box{flex:1;padding:22px 20px;border-radius:8px;text-align:center;background:rgba(255,255,255,.65);border:0.5px solid rgba(5,11,20,.09);box-shadow:0 2px 12px rgba(0,0,0,.018),0 1px 2px rgba(0,0,0,.01)}
  .btn-cta{font-family:'Inter',sans-serif;font-size:11.5px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;padding:15px 40px;border:none;border-radius:6px;position:relative;overflow:hidden;background:linear-gradient(145deg,#050B14,#0c1a2e);color:rgba(255,255,255,.92);box-shadow:0 3px 14px rgba(5,11,20,.1);transition:box-shadow 0.8s cubic-bezier(.16,1,.3,1),transform 0.7s cubic-bezier(.16,1,.3,1)}
  .btn-cta:hover{transform:translateY(-0.5px);box-shadow:0 6px 28px rgba(5,11,20,.18),0 0 20px rgba(26,58,106,.25)}
  .btn-cta::after{content:'';position:absolute;inset:0;border-radius:6px;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.08) 40%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.08) 60%,transparent 100%);background-size:200% 100%;background-position:-100% 0;transition:background-position 2s cubic-bezier(.16,1,.3,1)}
  .btn-cta:hover::after{background-position:100% 0}
  .btn-cta:disabled{opacity:.3;cursor:not-allowed}
  .fl label{font-size:10px;font-weight:500;letter-spacing:.1em;color:rgba(5,11,20,.36);display:block;margin-bottom:10px;text-transform:uppercase}
  .fl input{background:rgba(255,255,255,.72);border:0.5px solid rgba(5,11,20,.09);border-radius:6px;padding:17px 22px;font-size:16px;color:rgba(5,11,20,.88);outline:none;transition:border 0.7s cubic-bezier(.16,1,.3,1),box-shadow 0.7s cubic-bezier(.16,1,.3,1);font-family:'Inter',sans-serif;font-weight:500;width:280px;font-variant-numeric:tabular-nums;box-shadow:0 1px 2px rgba(0,0,0,.015)}
  .fl input:focus{border-color:rgba(26,58,106,.3);box-shadow:0 0 0 3px rgba(26,58,106,.05)}
  .btn-navy{font-family:'Inter',sans-serif;font-size:10px;font-weight:400;letter-spacing:.18em;background:#050B14;color:white;border:none;padding:18px 44px;cursor:pointer;transition:all 0.7s cubic-bezier(.16,1,.3,1);display:inline-block;text-transform:uppercase}
  .btn-navy:hover{background:#1a2a42}.btn-navy:disabled{opacity:.3;cursor:not-allowed}
  .btn-out{font-family:'Inter',sans-serif;font-size:10px;font-weight:400;letter-spacing:.16em;background:transparent;color:#050B14;border:1px solid rgba(5,11,20,.12);padding:14px 28px;cursor:pointer;border-radius:6px;transition:all 0.7s cubic-bezier(.16,1,.3,1);text-transform:uppercase}
  .btn-out:hover{background:#050B14;color:white;border-color:#050B14}
  .q-btn{width:100%;text-align:left;display:flex;align-items:center;justify-content:space-between;border-radius:8px;padding:18px 22px;border:1px solid;font-size:14px;cursor:pointer;transition:all 0.2s;font-family:'Inter',sans-serif;font-weight:300;margin-bottom:10px;letter-spacing:.01em}
  .q-btn:hover{border-color:#050B14;background:rgba(5,11,20,.02)}
  .m-card{border-radius:12px;padding:28px 24px;cursor:pointer;transition:all 0.25s;position:relative;border:1px solid}
  .m-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(5,11,20,.06)}
  .card-white{background:white;border-radius:10px;padding:28px;margin-bottom:18px;border:1px solid rgba(5,11,20,.04)}
  .ac-chip{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:6px;border:1px solid;cursor:pointer;transition:all 0.2s;font-size:13px;font-family:'Inter',sans-serif;font-weight:300;margin:5px}
  .ac-chip.on{background:#050B14;color:white;border-color:#050B14}
  .ac-chip.off{background:white;color:#050B14;border-color:rgba(5,11,20,.08)}
  .ac-chip.off:hover{border-color:rgba(5,11,20,.3)}
  .q-section{animation:fadeUp .5s ease both}
  .result-card{animation:fadeUp .5s ease both}
  .fadeUp1{animation:fadeUp .5s ease both;animation-delay:.1s}
  .fadeUp2{animation:fadeUp .5s ease both;animation-delay:.2s}
  .fadeUp3{animation:fadeUp .5s ease both;animation-delay:.3s}
`;

function OptimizerInner() {
  const router = useRouter();
  const [assetHistories, setAssetHistories] = useState<Record<string,Record<string,string>>>({});
  const [assetMeta, setAssetMeta] = useState<Record<string,{name:string;sector:string;type:string}>>({});
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [multiSel, setMultiSel] = useState<string[]>(["ETF","Actions"]);
  const [capital, setCapital] = useState("");
  const [flash, setFlash] = useState<string|null>(null);
  const [calcPct, setCalcPct] = useState(0);
  const [calcStepIdx, setCalcStepIdx] = useState(0);
  const [results, setResults] = useState<OptResult[]>([]);
  const [sel, setSel] = useState("maxsharpe");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("Portefeuille Zero CGP");
  const [saveStatus, setSaveStatus] = useState<"simulated"|"active">("simulated");
  const [bubbleOpenCard, setBubbleOpenCard] = useState<string|null>(null);
  const [geoExposure, setGeoExposure] = useState<Record<string,{countries:Record<string,number>;desc:string}>>({});
  const [geoLoading, setGeoLoading] = useState(false);
  const [tab, setTab] = useState<"allocation"|"geo"|"apply">("allocation");
  const [assetPrices, setAssetPrices] = useState<Record<string,number>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [checkedOrders, setCheckedOrders] = useState<Set<string>>(new Set());
  const [copiedIsin, setCopiedIsin] = useState<string|null>(null);

  // Fetch asset prices when apply tab is selected
  useEffect(() => {
    if (tab !== "apply" || step !== 200 || !results || results.length === 0) return;
    if (Object.keys(assetPrices).length > 0) return;
    const selR = results.find(r => r.method === sel) ?? results[0];
    if (!selR?.weights || selR.weights.length === 0) return;
    setPricesLoading(true);
    fetch("/api/asset-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: selR.weights.map(w => w.symbol) }),
    })
      .then(r => r.json())
      .then(data => { if (data.prices) setAssetPrices(data.prices); })
      .catch(() => {})
      .finally(() => setPricesLoading(false));
  }, [tab, step, sel, results]);

  // Fetch geo exposure only when geo tab is selected
  useEffect(() => {
    if (tab !== "geo" || step !== 200 || !results || results.length === 0) return;
    if (Object.keys(geoExposure).length > 0) return;
    const selR = results.find(r => r.method === sel) ?? results[0];
    if (!selR?.weights || selR.weights.length === 0) return;
    setGeoLoading(true);
    fetch("/api/geo-exposure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weights: selR.weights }),
    })
      .then(r => r.json())
      .then(data => { if (!data.error) setGeoExposure(data); })
      .catch(() => {})
      .finally(() => setGeoLoading(false));
  }, [tab, step, sel, results]);

  function toggleClass(c: string) {
    setMultiSel(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev,c]);
  }

  function answer(opt: string) {
    setFlash(opt);
    setTimeout(() => {
      setAnswers(p=>({...p,[step]:opt}));setFlash(null);
      if(step<QUESTIONS.length) setStep(s=>s+1); else startCalc();
    }, 250);
  }

  function advanceQ5() {
    if(multiSel.length===0) return;
    setAnswers(p=>({...p,[step]:multiSel.join(",")}));
    setStep(s=>s+1);
  }

  function startCalc() {
    setStep(100);
    const cap = parseFloat(capital)||50000;
    // API lancée IMMÉDIATEMENT en parallèle avec l'animation
    const apiPromise: Promise<OptResult[]> = (async () => {
      try {
        const r = await fetch("/api/optimize",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({capital:cap,answers:{"1":answers[1]??"","2":answers[2]??"","3":answers[3]??"","4":answers[4]??"","5":answers[5]||multiSel.join(","),"6":answers[6]??"","7":answers[7]??"","8":answers[8]??"","9":answers[9]??""}}
        )});
        if(r.ok){const d=await r.json();if(Array.isArray(d.results)&&d.results.length>0)return d.results.map((x:Record<string,unknown>)=>normalizeResult(x,cap));}
      } catch {}
      return buildMockResults(cap);
    })();
    // Animation : 8 étapes sur CALC_DURATION, 9e étape attend l'API
    const stepDur = CALC_DURATION/(CALC_STEPS.length-1);
    let si=0;
    const iv=setInterval(()=>{
      si+=1;setCalcStepIdx(si-1);
      setCalcPct(Math.round((si/CALC_STEPS.length)*88));
      if(si>=CALC_STEPS.length-1){
        clearInterval(iv);
        apiPromise.then(finalResults=>{
          setCalcStepIdx(CALC_STEPS.length-1);setCalcPct(95);
          setTimeout(()=>{setResults(finalResults);setSel(finalResults.find(r=>r.rec)?.method??finalResults[0]?.method??"maxsharpe");setCalcPct(100);setTimeout(()=>setStep(200),400);},600);
        });
      }
    },stepDur);
  }

  async function handleSave(name?: string, status?: string){
    setSaving(true);setSaveError("");
    const selR = results.find(r=>r.method===sel);
    if(!selR){setSaveError("Aucun résultat.");setSaving(false);return;}
    try{
      const{data:{user}}=await supabase.auth.getUser();
      if(!user){router.push("/auth/login");return;}
      const pfName = name || saveName || "Portefeuille Zero CGP";
      const pfType = status === "active" ? "active" : "optimized";
      const{data:pf,error:pfErr}=await supabase.from("portfolios").insert({user_id:user.id,name:pfName,type:pfType}).select().single();
      if(pfErr||!pf)throw new Error();
      // Fetch real prices to compute accurate quantities
      let prices: Record<string,number> = {};
      try {
        const pr=await fetch("/api/asset-prices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({symbols:selR.weights.map(w=>w.symbol)})});
        const pd=await pr.json();
        if(pd.prices) prices=pd.prices;
      } catch {}
      const assets=selR.weights.filter(w=>w.weight>0).map(w=>({portfolio_id:pf.id,symbol:w.symbol,name:w.name,type:w.type,quantity:parseFloat((prices[w.symbol]>0?w.amount/prices[w.symbol]:0).toFixed(6)),weight:w.weight,target_amount:w.amount}));
      if(assets.length>0){const{error:ae}=await supabase.from("portfolio_assets").insert(assets);if(ae)throw new Error();}
      router.push(`/dashboard/portfolio?id=${pf.id}`);
      router.refresh();
    }catch{setSaveError("Erreur enregistrement. Réessayez.");setSaving(false);}
  }

  // ── Écran 0 ──
  if(step===0)return(<><style>{css}</style><div className="op">
    <Sheet>
    <div className="op-ey">Optimiseur Markowitz</div>
    <h1 className="op-h1">Créez votre portefeuille optimal.</h1>
    <p className="op-sub">En 9 questions, notre algorithme calcule le portefeuille qui maximise votre rendement ajusté du risque selon la théorie moderne du portefeuille.</p>
    <div className="op-metrics">
      {[["9","Questions"],["3","Méthodes"],["700+","Actifs"]].map(([n,l])=>(<div key={l} className="stat-box"><div className="op-mn">{n}</div><div className="op-ml">{l}</div></div>))}
    </div>
    <div className="fl" style={{marginBottom:32}}><label>Capital à investir (€)</label><input type="number" value={capital} onChange={e=>setCapital(e.target.value)} placeholder="50 000"/></div>
    <button onClick={()=>setStep(1)} className="btn-cta">Créer un portefeuille</button>
    </Sheet>
  </div></>);

  // ── Questions ──
  if(step>=1&&step<=QUESTIONS.length){
    const q=QUESTIONS[step-1];
    const progress=(step/QUESTIONS.length)*100;
    const isMulti=q.isMulti;
    return(<><style>{css}</style><div className="op">
      <Sheet>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
        <span style={{fontFamily:"'Inter',sans-serif",fontSize:10.5,fontWeight:500,letterSpacing:".06em",color:"rgba(5,11,20,.36)"}}>{q.id} — Question {step} sur {QUESTIONS.length}</span>
        <span style={{fontFamily:"'Inter',sans-serif",fontSize:10.5,fontWeight:500,color:"#1a3a6a",fontVariantNumeric:"tabular-nums",opacity:.7}}>{Math.round(progress)}%</span>
      </div>
      <div style={{position:"relative",height:4,marginBottom:44}}>
        <div style={{position:"absolute",top:1,left:0,right:0,height:1.5,background:"rgba(5,11,20,.04)",borderRadius:1}}/>
        <div style={{position:"absolute",top:1,left:0,height:1.5,borderRadius:1,width:`${progress}%`,background:"linear-gradient(90deg,rgba(5,11,20,.21),rgba(26,58,106,.9))",boxShadow:"0 0 6px rgba(26,58,106,.25)",transition:"width 0.7s cubic-bezier(.34,1.56,.64,1)"}}/>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:32}}>
        <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:30,fontWeight:500,color:"rgba(5,11,20,.88)",letterSpacing:"-.03em",lineHeight:1.25,textAlign:"center",margin:0}}>{q.q}</h2>
        {q.id==="Q1"&&<InfoTip text={"Votre horizon détermine le niveau de risque que l'algorithme peut prendre. Plus il est long, plus on peut investir en actions."} />}
        {q.id==="Q2"&&<InfoTip text={"Votre profil de risque détermine comment votre argent sera réparti :\n\nConservateur — Comme un livret A amélioré. Votre argent croît lentement (environ +3%/an) mais vous ne risquez pas de grosses pertes (max -10%).\n\nModéré — Le meilleur compromis. Vous acceptez des baisses passagères de -20% pour un rendement de +6%/an en moyenne. C'est le choix le plus courant.\n\nDynamique — Vous visez +8%/an. En contrepartie, votre portefeuille peut temporairement perdre -35%. Il faut être patient.\n\nAgressif — Rendement maximum (+10%/an) mais les montagnes russes : votre portefeuille peut baisser de -50% certaines années avant de remonter.\n\nCes chiffres sont des moyennes historiques sur 20 ans, pas des garanties."} />}
        {q.id==="Q7"&&<InfoTip text={"La diversification, c'est ne pas mettre tous ses œufs dans le même panier.\n\nSimple (3-5 actifs) — Facile à comprendre et à suivre. Mais si un actif baisse fortement, ça se sent sur tout le portefeuille. Adapté aux petits budgets.\n\nÉquilibré (6-10 actifs) — Le meilleur compromis entre simplicité et protection. Recommandé pour la majorité des investisseurs.\n\nMaximum (10-15 actifs) — Protection maximale : si un actif chute, les autres compensent. Idéal pour les patrimoines importants. Plus complexe à suivre."} />}
      </div>
      {q.id==="Q1" ? (
        <div>
          <Q1Timeline value={answers[step]} onSelect={v=>answer(v)} />
          {step>1&&<div style={{textAlign:"center"}}><button onClick={()=>setStep(s=>s-1)} style={{marginTop:16,background:"none",border:"none",color:"rgba(5,11,20,.25)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:300}}>← Précédent</button></div>}
        </div>
      ) : q.id==="Q2" ? (
        <div>
          <Q2RiskCards value={answers[step]} onSelect={v=>answer(v)} />
          {step>1&&<div style={{textAlign:"center"}}><button onClick={()=>setStep(s=>s-1)} style={{marginTop:16,background:"none",border:"none",color:"rgba(5,11,20,.25)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:300}}>← Précédent</button></div>}
        </div>
      ) : q.id==="Q3" ? (
        <div>
          <Q3LossBar value={answers[step]} onSelect={v=>answer(v)} />
          {step>1&&<div style={{textAlign:"center"}}><button onClick={()=>setStep(s=>s-1)} style={{marginTop:16,background:"none",border:"none",color:"rgba(5,11,20,.25)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:300}}>← Précédent</button></div>}
        </div>
      ) : q.id==="Q4" ? (
        <div>
          <Q4EsgCards value={answers[step]} onSelect={v=>answer(v)} />
          {step>1&&<div style={{textAlign:"center"}}><button onClick={()=>setStep(s=>s-1)} style={{marginTop:16,background:"none",border:"none",color:"rgba(5,11,20,.25)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:300}}>← Précédent</button></div>}
        </div>
      ) : q.id==="Q5" ? (
        <div style={{maxWidth:560,margin:"0 auto"}}>
          <p style={{fontSize:12,color:"rgba(5,11,20,.35)",marginBottom:20,fontWeight:300,textAlign:"center"}}>Sélectionnez une ou plusieurs classes d'actifs</p>
          <Q5AssetGrid selected={multiSel} onToggle={toggleClass} />
          <button onClick={advanceQ5} disabled={multiSel.length===0} className="btn-cta" style={{marginTop:24,width:"100%",opacity:multiSel.length===0?0.4:1}}>
            Confirmer ({multiSel.length} sélectionnée{multiSel.length>1?"s":""}) →
          </button>
          {step>1&&<div style={{textAlign:"center"}}><button onClick={()=>setStep(s=>s-1)} style={{marginTop:16,background:"none",border:"none",color:"rgba(5,11,20,.25)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:300}}>← Précédent</button></div>}
        </div>
      ) : q.id==="Q6" ? (
        /* ── Q6 : Zones géographiques — toggle exclusif ── */
        <div style={{maxWidth:540,margin:"0 auto"}}>
          {(() => {
            const ZONES = ["Monde entier","Amérique du Nord","Europe","Asie-Pacifique","Marchés Émergents","Amérique Latine","Afrique & Moyen-Orient"];
            const raw = answers[step];
            const cur = raw === undefined ? ["Monde entier"] : raw === "" ? [] : raw.split(",").filter(Boolean);
            const isMonde = cur.includes("Monde entier");
            const toggle = (z: string) => {
              if (z === "Monde entier") {
                // Toggle: si déjà monde → décocher (vider), sinon → cocher monde
                if (isMonde) setAnswers(a => ({...a, [step]: ""}));
                else setAnswers(a => ({...a, [step]: "Monde entier"}));
              } else {
                let next = cur.filter(x => x !== "Monde entier" && x !== "");
                if (next.includes(z)) next = next.filter(x => x !== z);
                else next = [...next, z];
                // Si toutes les 6 zones cochées → revenir à Monde entier
                if (next.length >= 6) next = ["Monde entier"];
                setAnswers(a => ({...a, [step]: next.join(",")}));
              }
            };
            const hasSelection = isMonde || cur.filter(x => x && x !== "Monde entier").length > 0;
            return (<>
              {ZONES.map((z, idx) => {
                const checked = z === "Monde entier" ? isMonde : (!isMonde && cur.includes(z));
                const disabled = z !== "Monde entier" && isMonde;
                return (
                  <div key={z} style={{animation:"cardIn .45s cubic-bezier(.23,1,.32,1) both",animationDelay:`${idx*0.04}s`,marginBottom:8}}>
                    <div onClick={() => toggle(z)} style={{
                      borderRadius:6,border:`0.5px solid ${checked?"rgba(26,58,106,.35)":"rgba(5,11,20,0.09)"}`,
                      padding:"14px 18px",display:"flex",alignItems:"center",gap:12,
                      cursor:"pointer",opacity:disabled?0.4:1,
                      background:checked?"rgba(5,11,20,.04)":"rgba(255,255,255,0.72)",
                      transition:"all 0.5s cubic-bezier(.16,1,.3,1)",
                    }}>
                      <span style={{width:16,height:16,borderRadius:3,border:`1.5px solid ${checked?"#1a3a6a":"rgba(5,11,20,.15)"}`,background:checked?"#1a3a6a":"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.5s cubic-bezier(.16,1,.3,1)"}}>
                        {checked&&<span style={{color:"white",fontSize:10}}>✓</span>}
                      </span>
                      <span style={{fontSize:14,fontWeight:checked?500:400,color:"rgba(5,11,20,.88)",fontFamily:"'Inter',sans-serif",flex:1}}>{z}</span>
                      {z==="Marchés Émergents"&&(
                        <div style={{position:"relative",marginLeft:"auto"}}>
                          <span onClick={e=>{e.stopPropagation();const t=e.currentTarget.nextElementSibling as HTMLElement;if(t)t.style.display=t.style.display==="block"?"none":"block";}} style={{width:18,height:18,borderRadius:"50%",border:"1px solid rgba(5,11,20,.12)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"rgba(5,11,20,.3)",cursor:"pointer",fontWeight:600}}>i</span>
                          <div style={{display:"none",position:"absolute",bottom:"calc(100% + 8px)",right:0,width:280,background:"#050B14",color:"rgba(255,255,255,.85)",borderRadius:8,padding:"12px 14px",fontSize:11.5,lineHeight:1.7,fontWeight:300,zIndex:50,boxShadow:"0 8px 24px rgba(0,0,0,.25)"}}>
                            Les marchés émergents (Chine, Inde, Brésil, Corée...) offrent un potentiel de croissance supérieur mais avec une volatilité plus élevée. C'est une classification financière qui chevauche plusieurs zones géographiques.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setStep(s => s+1)} disabled={!hasSelection} className="btn-cta" style={{marginTop:16,width:"100%",opacity:hasSelection?1:0.4,cursor:hasSelection?"pointer":"not-allowed"}}>Continuer →</button>
            </>);
          })()}
          {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{marginTop:12,background:"none",border:"none",color:"rgba(5,11,20,.25)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:300}}>← Précédent</button>}
        </div>
      ) : q.id==="Q7" ? (
        <div>
          <Q7DivCards value={answers[step]} onSelect={v=>{setAnswers(a=>({...a,[step]:v}));setTimeout(()=>setStep(s=>s+1),300);}} />
          {step>1&&<div style={{textAlign:"center"}}><button onClick={()=>setStep(s=>s-1)} style={{marginTop:24,background:"none",border:"none",color:"rgba(5,11,20,.25)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:300}}>← Précédent</button></div>}
        </div>
      ) : q.id==="Q8" ? (
        <div style={{maxWidth:580,margin:"0 auto"}}>
          <SupportBuilder
            value={answers[8]||"[]"}
            onChange={(json: string)=>setAnswers(a=>({...a,[8]:json}))}
            onSubmit={()=>startCalc()}
          />
          {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{marginTop:12,background:"none",border:"none",color:"rgba(5,11,20,.25)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:300}}>← Précédent</button>}
        </div>
      ) : (
        /* ── Questions standards (Q1-Q4) : boutons radio ── */
        <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:540,margin:"0 auto"}}>
          {q.opts.map((opt:string,idx:number)=>{
            const isSel=answers[step]===opt,isFlash=flash===opt;
            return(<div key={opt} style={{animation:"cardIn .45s cubic-bezier(.23,1,.32,1) both",animationDelay:`${idx*0.04}s`}}>
              <div onClick={()=>answer(opt)} style={{
                borderRadius:6,border:isFlash?".5px solid rgba(26,58,106,.45)":isSel?".5px solid rgba(5,11,20,.13)":`0.5px solid rgba(5,11,20,0.09)`,
                padding:"17px 22px",fontSize:14,fontWeight:isFlash?500:400,letterSpacing:"-.005em",cursor:isFlash?"default":"pointer",
                fontFamily:"'Inter',sans-serif",
                background:isFlash?`linear-gradient(145deg,#050B14,#0c1a2e)`:isSel?"rgba(255,255,255,.88)":"rgba(255,255,255,0.72)",
                color:isFlash?"rgba(255,255,255,.93)":"rgba(5,11,20,.88)",
                boxShadow:isFlash?"0 4px 20px rgba(26,58,106,.25),inset 0 1px 0 rgba(255,255,255,.04)":"0 1px 2px rgba(0,0,0,0.015)",
                transition:"all 0.5s cubic-bezier(.16,1,.3,1)",
              }}>
                {opt}
              </div>
            </div>);
          })}
          {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{marginTop:24,background:"none",border:"none",color:"rgba(5,11,20,.25)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:300}}>{"\u2190"} Precedent</button>}
        </div>
      )}
      </Sheet>
    </div></>);
  }

  // ── Calcul — Animation Markowitz ──
  if(step===100)return(<><style>{css}</style>
    <div style={{background:"#F9F8F6",minHeight:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 20px"}}>
      <MarkowitzAnim calcPct={calcPct} currentStep={CALC_STEPS[Math.max(0,calcStepIdx)]} stepIdx={calcStepIdx}/>
    </div>
  </>);

  // ── Résultats ──
  if(step===200){
    if(!results||results.length===0)return(<><style>{css}</style><div className="op"><Sheet><p style={{color:"rgba(5,11,20,.4)"}}>Aucun résultat.</p><button className="btn-cta" style={{marginTop:16}} onClick={()=>{setStep(0);setResults([]);setCalcPct(0);setAnswers({});}}>Recommencer</button></Sheet></div></>);
    const selR=results.find(r=>r.method===sel)??results[0];
    const cap=parseFloat(capital)||50000;
    const SAP="#1a3a6a";const SAPG="rgba(26,58,106,.25)";
    const cRet="rgba(22,90,52,.75)";const cVar="rgba(155,50,48,.75)";const cMid="rgba(5,11,20,.5)";
    const TC:Record<string,{bg:string;c:string}>={etf:{bg:"rgba(26,58,106,.08)",c:SAP},stock:{bg:"rgba(22,90,52,.08)",c:"rgba(22,90,52,.8)"},bond:{bg:"rgba(5,11,20,.06)",c:"rgba(5,11,20,.5)"},gold:{bg:"rgba(180,140,0,.08)",c:"rgba(160,120,0,.7)"},crypto:{bg:"rgba(180,80,0,.08)",c:"rgba(180,80,0,.7)"},reit:{bg:"rgba(120,60,140,.08)",c:"rgba(120,60,140,.7)"}};
    return(<><style>{css}</style><div className="op">
      <Sheet>
      {/* Header */}
      <div style={{fontSize:10,fontWeight:500,letterSpacing:".15em",color:SAP,opacity:.65,marginBottom:16,textTransform:"uppercase"}}>Résultats · Portefeuille Zero CGP</div>
      <h1 style={{fontFamily:"'Inter',sans-serif",fontSize:38,fontWeight:500,color:"rgba(5,11,20,.88)",letterSpacing:"-.03em",lineHeight:1.15,marginBottom:28}}>3 portefeuilles optimaux.</h1>

      {/* 3 cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:28,position:"relative",zIndex:1}}>
        {results.map((r,ri)=>{const isSel=r.method===sel;return(
          <div key={r.method} onClick={()=>setSel(r.method)} style={{
            borderRadius:10,padding:"28px 24px",cursor:"pointer",position:"relative",
            zIndex:bubbleOpenCard===r.method?50:1,
            background:isSel?"linear-gradient(145deg,#0c1a2e,#1a3a6a)":"rgba(255,255,255,.72)",
            border:isSel?`.5px solid rgba(26,58,106,.45)`:r.rec?`.5px solid rgba(5,11,20,.15)`:`.5px solid rgba(5,11,20,.09)`,
            boxShadow:isSel?"0 6px 28px rgba(26,58,106,0.3), 0 0 40px rgba(26,58,106,0.08)":"0 2px 12px rgba(0,0,0,.018)",
            transition:"all 0.5s cubic-bezier(.16,1,.3,1)",
            animation:`cardIn .45s cubic-bezier(.23,1,.32,1) both`,animationDelay:`${ri*0.08}s`,
          }}>
            {r.rec&&<div style={{position:"absolute",top:-10,right:16,background:"#050B14",color:"white",fontSize:8,fontWeight:500,padding:"4px 12px",letterSpacing:".14em",textTransform:"uppercase",borderRadius:4}}>Recommandé</div>}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:9,fontWeight:500,letterSpacing:".14em",color:isSel?"rgba(255,255,255,.2)":"rgba(5,11,20,.25)",textTransform:"uppercase"}}>{r.method}</span>
              <div onClick={e=>e.stopPropagation()} style={{position:"relative",zIndex:200}}><InfoBubble text={METHOD_INFO[r.method]??""} dark={isSel} onToggle={o=>setBubbleOpenCard(o?r.method:null)}/></div>
            </div>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:500,marginBottom:24,color:isSel?"white":"rgba(5,11,20,.88)",letterSpacing:"-.01em"}}>{r.label}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {([
                ["Rendement",`+${(r.ret||0).toFixed(1)}%`,(r.ret||0)>0?(isSel?"rgba(130,220,170,.85)":cRet):cVar,"C'est le gain moyen par an. +10% veut dire que 10 000 € deviennent environ 11 000 € après un an."],
                ["Volatilité",`${(r.vol||0).toFixed(1)}%`,isSel?"rgba(255,255,255,.4)":cMid,"C'est à quel point votre argent fait les montagnes russes. Plus c'est bas, plus c'est stable."],
                ["Sharpe",(r.sharpe||0).toFixed(2),isSel?"rgba(255,255,255,.5)":cMid,"Est-ce que le risque en vaut la peine ? Au-dessus de 0.7 c'est bien, au-dessus de 1 c'est très bien."],
                ["VaR 95%",`−${(r.var95||0).toFixed(1)}%`,isSel?"rgba(250,180,180,.7)":cVar,"Dans le pire des cas raisonnables, voilà combien vous pourriez perdre en un an. 95 fois sur 100, la perte sera inférieure à ce chiffre."],
              ] as [string,string,string,string][]).map(([lbl,val,col,tip])=>(
                <div key={lbl}>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4}}>
                    <span style={{fontSize:9,fontWeight:500,color:isSel?"rgba(255,255,255,.25)":"rgba(5,11,20,.3)",letterSpacing:".06em"}}>{lbl}</span>
                    <span onClick={e=>e.stopPropagation()} style={{position:"relative",zIndex:200,opacity:isSel?1:0,pointerEvents:isSel?"auto":"none",transition:"opacity 0.5s cubic-bezier(.16,1,.3,1)"}}><InfoBubble text={tip} dark={isSel} onToggle={o=>setBubbleOpenCard(o?r.method:null)}/></span>
                  </div>
                  <div style={{fontSize:20,fontWeight:500,color:col,fontVariantNumeric:"tabular-nums"}}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        );})}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,marginBottom:28,borderBottom:".5px solid rgba(5,11,20,0.07)"}}>
        {([{id:"allocation",label:"Allocation"},{id:"geo",label:"Exposition géographique"},{id:"apply",label:"Appliquer le portefeuille"}] as const).map(t=>(
          <div key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"12px 24px",cursor:"pointer",
            fontSize:12,fontWeight:tab===t.id?500:400,
            color:tab===t.id?"rgba(5,11,20,0.88)":"rgba(5,11,20,0.36)",
            borderBottom:tab===t.id?"1.5px solid #1a3a6a":"1.5px solid transparent",
            transition:"all 0.5s cubic-bezier(.16,1,.3,1)",
            fontFamily:"Inter,sans-serif",letterSpacing:"-.005em",
          }}>{t.label}</div>
        ))}
      </div>

      {/* Tab content with crossfade */}
      <div key={sel+tab} style={{animation:"fadeUp .45s cubic-bezier(.23,1,.32,1) both"}}>

      {tab==="allocation"&&(<>
        {/* Frontier chart */}
        {selR.frontier&&selR.frontier.length>0&&(
          <div style={{background:"rgba(255,255,255,.5)",borderRadius:10,padding:24,marginBottom:20,border:".5px solid rgba(5,11,20,.05)"}}>
            <h3 style={{fontFamily:"'Inter',sans-serif",fontSize:16,fontWeight:500,color:"rgba(5,11,20,.88)",marginBottom:6,letterSpacing:"-.02em"}}>Frontière efficiente</h3>
            <p style={{fontSize:11,color:"rgba(5,11,20,.4)",marginBottom:16,fontWeight:400}}>Chaque point représente un portefeuille possible.</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={selR.frontier} margin={{top:10,right:20,bottom:5,left:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(5,11,20,.04)"/>
                <XAxis dataKey="vol" unit="%" tick={{fontSize:10,fill:"rgba(5,11,20,.25)"}} tickLine={false} axisLine={false}/>
                <YAxis dataKey="ret" unit="%" tick={{fontSize:10,fill:"rgba(5,11,20,.25)"}} tickLine={false} axisLine={false} width={45}/>
                <Tooltip content={<FrontierTooltip/>}/>
                <Line type="monotone" dataKey="ret" stroke={SAP} strokeWidth={2} dot={{r:2.5,fill:SAP,stroke:"white",strokeWidth:1}} activeDot={{r:4,fill:"#050B14",stroke:"white",strokeWidth:2}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Allocation */}
        {selR.weights&&selR.weights.length>0&&(
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{fontFamily:"'Inter',sans-serif",fontSize:22,fontWeight:500,color:"rgba(5,11,20,.88)",letterSpacing:"-.02em"}}>Allocation recommandée</h3>
              <div style={{fontSize:11,fontWeight:500,color:"rgba(5,11,20,.36)"}}>Capital : {eur(cap)}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {selR.weights.map((w,wi)=>(
                <div key={w.symbol} style={{animation:`cardIn .4s cubic-bezier(.23,1,.32,1) both`,animationDelay:`${wi*0.04}s`}}>
                  <AssetCard symbol={w.symbol} name={w.name} weight={w.weight} amount={w.amount} type={w.type}/>
                </div>
              ))}
            </div>
          </div>
        )}
      </>)}

      {tab==="geo"&&(
        <div style={{marginBottom:24}}>
          <WorldMapExposure weights={selR.weights} geoExposure={geoExposure} loading={geoLoading}/>
        </div>
      )}

      {tab==="apply"&&selR.weights&&selR.weights.length>0&&(()=>{
        const supportInfo: Record<string,{label:string;fullName:string;color:string;bgColor:string;desc:string}> = {
          PEA:{label:"PEA",fullName:"Plan d'Épargne en Actions",color:"#1a3a6a",bgColor:"rgba(26,58,106,0.06)",desc:"Fiscalité avantageuse après 5 ans · Plafonné à 150 000 €"},
          CTO:{label:"CTO",fullName:"Compte-Titres Ordinaire",color:"rgba(22,90,52,0.8)",bgColor:"rgba(22,90,52,0.05)",desc:"Aucune restriction d'actifs · Flat Tax 30%"},
          AV:{label:"AV",fullName:"Assurance-Vie",color:"#8B6914",bgColor:"rgba(139,105,20,0.05)",desc:"Enveloppe fiscale long terme · Fonds en unités de compte"},
          Crypto:{label:"Crypto",fullName:"Plateforme crypto",color:"#D97706",bgColor:"rgba(217,119,6,0.05)",desc:"Binance, Coinbase ou cold wallet"},
          "Non compatible":{label:"⚠",fullName:"Support manquant",color:"rgba(217,119,6,0.8)",bgColor:"rgba(217,119,6,0.05)",desc:"Un Compte-Titres (CTO) serait nécessaire pour cet actif"},
        };
        let userComptes: {type:string;banque:string;pct:number}[] = [];
        try { userComptes = JSON.parse(answers[8] || "[]"); } catch { userComptes = []; }
        const hasPEA = userComptes.some(c=>c.type==="PEA");
        const hasCTO = userComptes.some(c=>c.type==="CTO");
        const hasAV = userComptes.some(c=>c.type==="AV");
        const hasCrypto = userComptes.some(c=>c.type==="crypto");

        function getSupport(sym: string): string {
          const isPeaEligible = /\.(PA|DE|AS|MI|MC|BR|LS)$/.test(sym) || sym.startsWith("CW8") || sym.startsWith("PAEEM");
          if (sym.match(/BTC|ETH|SOL|ADA|DOT|AVAX/i)) return hasCrypto ? "Crypto" : hasCTO ? "CTO" : "Non compatible";
          if (isPeaEligible && hasPEA) return "PEA";
          if (hasAV) return "AV";
          if (hasCTO) return "CTO";
          return "Non compatible";
        }

        function toggleCheck(sym: string) {
          setCheckedOrders(prev => { const next = new Set(prev); if (next.has(sym)) next.delete(sym); else next.add(sym); return next; });
        }

        const enriched = selR.weights.map(w => {
          const price = assetPrices[w.symbol]||0;
          const base = baseSymbol(w.symbol);
          const isin = ASSET_DB[base]?.isin || w.isin || "";
          const targetAmount = w.amount;
          const qty = price>0 ? Math.floor(targetAmount/price) : 0;
          const invested = Math.round(qty*price);
          const remainder = Math.round(targetAmount - qty*price);
          const support = getSupport(w.symbol);
          return {...w,price,isin,qty,invested,remainder,support};
        });

        const groups: Record<string,typeof enriched> = {};
        enriched.forEach(a => { if (!groups[a.support]) groups[a.support]=[]; groups[a.support].push(a); });
        const totalInvested = enriched.reduce((s,a) => s + (a.price>0?a.invested:a.amount),0);
        const totalOrders = enriched.length;
        const completedOrders = enriched.filter(a => checkedOrders.has(a.symbol)).length;

        return (
          <div style={{marginBottom:24}}>
            <h3 style={{fontSize:22,fontWeight:500,color:"rgba(5,11,20,0.88)",letterSpacing:"-.02em",marginBottom:6,fontFamily:"Inter,sans-serif"}}>Comment investir ?</h3>
            <p style={{fontSize:13,fontWeight:400,color:"rgba(5,11,20,0.36)",marginBottom:20,fontFamily:"Inter,sans-serif",maxWidth:560}}>
              Passez ces {totalOrders} ordres pour reproduire le portefeuille avec {eur(cap)}. Cochez chaque ordre une fois passé.
            </p>

            {/* Bandeau ISIN */}
            <div style={{padding:"12px 18px",borderRadius:6,marginBottom:24,background:"rgba(26,58,106,0.04)",border:".5px solid rgba(26,58,106,0.08)",display:"flex",alignItems:"center",gap:12}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a3a6a" strokeWidth="1.5" strokeLinecap="round" opacity={0.5}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span style={{fontSize:12,fontWeight:400,color:"rgba(5,11,20,0.52)",lineHeight:1.6}}>Tapez le code ISIN dans la barre de recherche de votre banque ou courtier pour retrouver chaque actif. Cliquez sur un code ISIN pour le copier.</span>
            </div>

            {/* Barre de progression */}
            <div style={{marginBottom:28}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:10,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(5,11,20,0.36)"}}>Progression</span>
                <span style={{fontSize:11,fontWeight:500,color:completedOrders===totalOrders?"rgba(22,90,52,0.75)":"#1a3a6a",fontVariantNumeric:"tabular-nums"}}>{completedOrders}/{totalOrders} ordres passés</span>
              </div>
              <div style={{height:3,borderRadius:2,background:"rgba(26,58,106,.06)",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:2,width:`${totalOrders>0?(completedOrders/totalOrders)*100:0}%`,background:completedOrders===totalOrders?"linear-gradient(90deg, rgba(22,90,52,0.5), rgba(22,90,52,0.75))":"linear-gradient(90deg, rgba(26,58,106,0.25), #1a3a6a)",boxShadow:completedOrders>0?"0 0 6px rgba(26,58,106,0.25)":"none",transition:"width 0.8s cubic-bezier(.16,1,.3,1), background 0.5s ease"}}/>
              </div>
            </div>

            {/* 3 Stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:36}}>
              {[{label:"Capital total",value:eur(cap)},{label:"Capital investi",value:eur(totalInvested),sub:`${((totalInvested/cap)*100).toFixed(1)}%`},{label:"Liquidités restantes",value:eur(cap-totalInvested),sub:"Arrondis de parts"}].map(c=>(
                <div key={c.label} style={{padding:"18px 20px",borderRadius:8,background:"rgba(255,255,255,.65)",border:"0.5px solid rgba(5,11,20,.09)",boxShadow:"0 2px 12px rgba(0,0,0,.018)"}}>
                  <div style={{fontSize:9,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(5,11,20,0.36)",marginBottom:8}}>{c.label}</div>
                  <div style={{fontSize:22,fontWeight:500,color:"rgba(5,11,20,0.88)",fontVariantNumeric:"tabular-nums",letterSpacing:"-.02em"}}>{c.value}</div>
                  {c.sub&&<div style={{fontSize:10,fontWeight:400,color:"rgba(5,11,20,0.36)",marginTop:4}}>{c.sub}</div>}
                </div>
              ))}
            </div>

            {pricesLoading&&<div style={{textAlign:"center",padding:24,color:"rgba(5,11,20,.3)",fontSize:11,letterSpacing:".1em"}}>Récupération des prix en temps réel…</div>}

            {/* Groups by support */}
            {Object.entries(groups).map(([support,items],gi)=>{
              const info = supportInfo[support]||supportInfo.CTO;
              const groupTotal = items.reduce((s,a)=>s+(a.price>0?a.invested:a.amount),0);
              const groupRemainder = items.reduce((s,a)=>s+a.remainder,0);
              const allChecked = items.every(a=>checkedOrders.has(a.symbol));
              return (
                <div key={support} style={{marginBottom:32}}>
                  {/* Support header */}
                  <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,paddingBottom:12,borderBottom:".5px solid rgba(5,11,20,0.07)"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:allChecked?"rgba(22,90,52,0.75)":info.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,color:"white",transition:"background 0.5s cubic-bezier(.16,1,.3,1)",boxShadow:allChecked?"0 0 8px rgba(22,90,52,0.3)":"none"}}>
                      {allChecked?"✓":gi+1}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                        <span style={{fontSize:15,fontWeight:500,color:"rgba(5,11,20,0.88)"}}>{info.fullName}</span>
                        <span style={{fontSize:9,fontWeight:500,padding:"2px 8px",borderRadius:4,background:info.bgColor,color:info.color,letterSpacing:".04em"}}>{info.label}</span>
                      </div>
                      <div style={{fontSize:11,fontWeight:400,color:"rgba(5,11,20,0.36)",marginTop:2}}>{info.desc}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:16,fontWeight:500,color:"rgba(5,11,20,0.88)",fontVariantNumeric:"tabular-nums"}}>{groupTotal.toLocaleString("fr-FR")} €</div>
                      <div style={{fontSize:10,fontWeight:400,color:"rgba(5,11,20,0.36)"}}>{items.length} ordre{items.length>1?"s":""}</div>
                    </div>
                  </div>

                  {/* Asset rows */}
                  {items.map((a,ai)=>{
                    const isChecked=checkedOrders.has(a.symbol);
                    const isCopied=copiedIsin===a.isin;
                    const incompatible=a.support==="Non compatible";
                    return (
                      <div key={a.symbol}>
                      <div style={{display:"flex",alignItems:"center",gap:16,padding:"14px 18px",marginBottom:incompatible?2:6,borderRadius:6,background:isChecked?"rgba(22,90,52,0.03)":incompatible?"rgba(217,119,6,0.02)":"rgba(255,255,255,.72)",border:isChecked?".5px solid rgba(22,90,52,0.12)":incompatible?".5px solid rgba(217,119,6,0.2)":"0.5px solid rgba(5,11,20,0.09)",boxShadow:"0 1px 2px rgba(0,0,0,.015)",transition:"all 0.5s cubic-bezier(.16,1,.3,1)",opacity:isChecked?0.7:incompatible?0.5:1,animation:"fadeUp .4s cubic-bezier(.23,1,.32,1) both",animationDelay:`${(gi*3+ai)*0.04}s`}}>
                        {/* Checkbox */}
                        <div onClick={()=>toggleCheck(a.symbol)} style={{width:20,height:20,borderRadius:4,cursor:"pointer",flexShrink:0,border:isChecked?"none":".5px solid rgba(5,11,20,.15)",background:isChecked?"rgba(22,90,52,0.75)":"rgba(255,255,255,.5)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.5s cubic-bezier(.16,1,.3,1)"}}>
                          {isChecked&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        {/* Badge type */}
                        <div style={{fontSize:9,fontWeight:500,padding:"3px 8px",borderRadius:4,flexShrink:0,background:a.type==="etf"?"rgba(26,58,106,.08)":"rgba(22,90,52,.08)",color:a.type==="etf"?"#1a3a6a":"rgba(22,90,52,0.8)"}}>{(a.type||"stock").toUpperCase()}</div>
                        {/* Name + ISIN */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:500,color:"rgba(5,11,20,0.88)",textDecoration:isChecked?"line-through":"none",textDecorationColor:"rgba(5,11,20,.15)"}}>{a.name}</div>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                            <span onClick={()=>{navigator.clipboard.writeText(a.isin||"");setCopiedIsin(a.isin);setTimeout(()=>setCopiedIsin(null),1500);}} style={{fontSize:11,fontWeight:400,color:"rgba(5,11,20,0.4)",fontVariantNumeric:"tabular-nums",cursor:"pointer",transition:"color 0.3s ease"}} onMouseEnter={e=>(e.currentTarget.style.color="#1a3a6a")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(5,11,20,0.4)")}>
                              ISIN : {a.isin||"—"}
                            </span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(5,11,20,0.25)" strokeWidth="1.5" strokeLinecap="round" style={{cursor:"pointer",flexShrink:0}}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            {isCopied&&<span style={{fontSize:9,fontWeight:500,color:"rgba(22,90,52,0.75)"}}>Copié !</span>}
                          </div>
                        </div>
                        {/* Quantity */}
                        <div style={{textAlign:"center",minWidth:70}}>
                          <div style={{fontSize:18,fontWeight:500,color:"rgba(5,11,20,0.88)",fontVariantNumeric:"tabular-nums"}}>{a.qty||"—"}</div>
                          <div style={{fontSize:9,fontWeight:400,color:"rgba(5,11,20,0.36)"}}>parts</div>
                        </div>
                        {/* Unit price */}
                        <div style={{textAlign:"center",minWidth:80}}>
                          <div style={{fontSize:13,fontWeight:400,color:"rgba(5,11,20,0.52)",fontVariantNumeric:"tabular-nums"}}>{a.price>0?`${a.price.toLocaleString("fr-FR",{minimumFractionDigits:2})} €`:"—"}</div>
                          <div style={{fontSize:9,fontWeight:400,color:"rgba(5,11,20,0.36)"}}>/ part</div>
                        </div>
                        {/* Total */}
                        <div style={{textAlign:"right",minWidth:80}}>
                          <div style={{fontSize:14,fontWeight:500,color:"rgba(5,11,20,0.88)",fontVariantNumeric:"tabular-nums"}}>{(a.price>0?a.invested:a.amount).toLocaleString("fr-FR")} €</div>
                          <div style={{fontSize:9,fontWeight:400,color:"rgba(5,11,20,0.36)"}}>{a.weight.toFixed(1)}%</div>
                        </div>
                      </div>
                      {incompatible&&<div style={{fontSize:10,fontWeight:400,color:"rgba(217,119,6,0.8)",padding:"4px 18px 8px 54px",lineHeight:1.5}}>Cet actif n'est pas disponible sur vos supports sélectionnés. Un Compte-Titres (CTO) serait nécessaire.</div>}
                      </div>
                    );
                  })}

                  {/* Group remainder */}
                  {groupRemainder>0&&<div style={{fontSize:10,fontWeight:400,color:"rgba(5,11,20,0.36)",paddingLeft:54,marginTop:6}}>Liquidités restantes sur {info.label} : {groupRemainder.toLocaleString("fr-FR")} € (arrondis de parts)</div>}
                </div>
              );
            })}

            {/* Disclaimer */}
            <div style={{marginTop:12,padding:"16px 20px",borderRadius:8,background:"rgba(26,58,106,0.02)",border:".5px solid rgba(26,58,106,0.06)"}}>
              <div style={{fontSize:11,fontWeight:400,color:"rgba(5,11,20,0.52)",lineHeight:1.7}}>Les quantités sont calculées à partir des cours de marché actuels et arrondies à la part inférieure. Les prix réels peuvent varier au moment de l'exécution. Ce portefeuille n'est pas un conseil en investissement.</div>
            </div>
          </div>
        );
      })()}

      </div>

      {saveError&&<p style={{color:"rgba(155,50,48,.8)",fontSize:12,marginBottom:12}}>{saveError}</p>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
        <button className="btn-out" onClick={()=>{setStep(0);setResults([]);setCalcPct(0);setCalcStepIdx(0);setAnswers({});setSaveError("");}}>Recommencer</button>
        <button onClick={()=>setSaveModalOpen(true)} disabled={saving} className="btn-cta">{saving?"Enregistrement...":"Enregistrer ce portefeuille"}</button>
      </div>

      {/* Save modal */}
      {saveModalOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(5,11,20,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .3s ease"}} onClick={()=>setSaveModalOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:12,padding:"36px 40px",width:440,boxShadow:"0 20px 60px rgba(0,0,0,.15)",animation:"fadeUp .4s cubic-bezier(.23,1,.32,1)"}}>
            <h3 style={{fontSize:20,fontWeight:500,color:"rgba(5,11,20,0.88)",letterSpacing:"-.02em",marginBottom:20,fontFamily:"Inter,sans-serif"}}>Enregistrer le portefeuille</h3>

            <label style={{fontSize:10,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(5,11,20,0.36)",display:"block",marginBottom:8}}>Nom du portefeuille</label>
            <input type="text" value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Mon portefeuille optimisé" style={{width:"100%",padding:"14px 18px",fontSize:14,fontWeight:400,border:"0.5px solid rgba(5,11,20,.09)",borderRadius:6,background:"rgba(255,255,255,.72)",outline:"none",fontFamily:"Inter,sans-serif",marginBottom:24,transition:"border 0.7s cubic-bezier(.16,1,.3,1)",boxSizing:"border-box"}}/>

            <label style={{fontSize:10,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(5,11,20,0.36)",display:"block",marginBottom:12}}>Statut du portefeuille</label>

            <div onClick={()=>setSaveStatus("simulated")} style={{padding:"14px 18px",borderRadius:6,marginBottom:8,cursor:"pointer",border:saveStatus==="simulated"?".5px solid rgba(26,58,106,.45)":"0.5px solid rgba(5,11,20,.09)",background:saveStatus==="simulated"?"rgba(26,58,106,0.04)":"rgba(255,255,255,.72)",transition:"all 0.5s cubic-bezier(.16,1,.3,1)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <span style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"rgba(201,168,76,0.12)",color:"#c9a84c",letterSpacing:".04em"}}>0CGP</span>
                <span style={{fontSize:13,fontWeight:500,color:"rgba(5,11,20,0.88)"}}>Simulation</span>
              </div>
              <div style={{fontSize:11,fontWeight:400,color:"rgba(5,11,20,0.4)",lineHeight:1.6,paddingLeft:50}}>Portefeuille optimisé par Zero CGP, non encore appliqué à vos comptes. Vous pourrez le comparer et l'appliquer plus tard.</div>
            </div>

            <div onClick={()=>setSaveStatus("active")} style={{padding:"14px 18px",borderRadius:6,marginBottom:24,cursor:"pointer",border:saveStatus==="active"?".5px solid rgba(22,90,52,.35)":"0.5px solid rgba(5,11,20,.09)",background:saveStatus==="active"?"rgba(22,90,52,0.03)":"rgba(255,255,255,.72)",transition:"all 0.5s cubic-bezier(.16,1,.3,1)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <span style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"rgba(22,90,52,0.1)",color:"rgba(22,90,52,0.8)",letterSpacing:".04em"}}>ACTIF</span>
                <span style={{fontSize:13,fontWeight:500,color:"rgba(5,11,20,0.88)"}}>Appliqué</span>
              </div>
              <div style={{fontSize:11,fontWeight:400,color:"rgba(5,11,20,0.4)",lineHeight:1.6,paddingLeft:50}}>Vous avez investi dans ce portefeuille. Zero CGP suivra ses performances et vous alertera si un rééquilibrage est nécessaire.</div>
            </div>

            <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
              <button onClick={()=>setSaveModalOpen(false)} style={{padding:"12px 24px",border:"0.5px solid rgba(5,11,20,.09)",borderRadius:6,background:"transparent",cursor:"pointer",fontSize:11,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(5,11,20,0.6)",transition:"all 0.5s cubic-bezier(.16,1,.3,1)",fontFamily:"Inter,sans-serif"}}>Annuler</button>
              <button className="btn-cta" onClick={()=>{handleSave(saveName,saveStatus);setSaveModalOpen(false);}}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
      </Sheet>
    </div></>);
  }
  return null;
}

export default function OptimizerPage() {


  return (
    <Suspense fallback={<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",minHeight:400}}><div style={{color:"#8A9BB0",fontSize:11,letterSpacing:".2em"}}>CHARGEMENT...</div></div>}>
      <OptimizerInner />
    </Suspense>
  );
}
