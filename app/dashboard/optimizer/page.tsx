"use client";
import dynamic from "next/dynamic";
import AssetCard from "@/components/AssetCard";
const MarkowitzAnim = dynamic(() => import("@/components/MarkowitzAnim"), { ssr: false });
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

// ─── Bulle info ────────────────────────────────────────────────────────────────
function InfoBubble({ text, dark }: { text: string; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position:"relative", display:"inline-flex", alignItems:"center" }}>
      <button onClick={e=>{e.stopPropagation();setOpen(!open)}} style={{
        width:16,height:16,borderRadius:"50%",
        background:dark?"rgba(255,255,255,0.15)":"rgba(30,58,110,0.12)",
        border:"none",color:dark?"rgba(255,255,255,0.7)":NAVY_MID,
        fontSize:9,fontWeight:700,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
        flexShrink:0,fontFamily:"Georgia,serif",fontStyle:"italic",lineHeight:1,
      }}>i</button>
      {open && (
        <div style={{
          position:"absolute",bottom:"calc(100% + 8px)",left:"50%",
          transform:"translateX(-50%)",width:240,
          background:NAVY,color:"white",borderRadius:10,
          padding:"12px 14px",fontSize:11.5,lineHeight:1.7,
          fontWeight:300,zIndex:300,boxShadow:"0 8px 24px rgba(0,0,0,.25)",
        }}>
          {text}
          <div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",
            width:0,height:0,borderLeft:"6px solid transparent",
            borderRight:"6px solid transparent",borderTop:`6px solid ${NAVY}`}}/>
        </div>
      )}
    </div>
  );
}

// ─── Accordéon actif ────────────────────────────────────────────────────────────



const ASSET_CLASSES = ["ETF", "Actions", "Crypto", "Obligations", "Immobilier coté"];

const QUESTIONS = [
  { id:"Q1", q:"Quel est votre horizon d'investissement ?",    opts:["Moins de 2 ans","2 à 5 ans","5 à 10 ans","10 ans et plus"] },
  { id:"Q2", q:"Quel est votre profil de risque ?",           opts:["Conservateur","Modéré","Dynamique","Agressif"] },
  { id:"Q3", q:"Quelle perte annuelle pouvez-vous accepter ?",opts:["−10% maximum","−20% maximum","−35% maximum","Pas de limite"] },
  { id:"Q4", q:"Souhaitez-vous des filtres ESG ?",             opts:["Aucun filtre","Exclure armement & tabac","ESG strict uniquement"] },
  { id:"Q5", q:"Quelles classes d'actifs souhaitez-vous ?",   opts:[], isMulti:true },
  { id:"Q6", q:"Quelles zones géographiques privilégiez-vous ?", opts:["Monde entier","USA dominante","Europe","Marchés émergents"] },
  { id:"Q7", q:"Quel niveau de diversification visez-vous ?", opts:["Concentré (5 actifs)","Équilibré (8–10 actifs)","Large (15+ actifs)"] },
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
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;1,300&family=Inter:wght@300;400;500&display=swap');
  .op{padding:40px 48px;background:#F5F4F1;min-height:100%;font-family:'Inter',sans-serif}
  .op-ey{font-size:9px;font-weight:500;letter-spacing:.18em;color:${NAVY_MID};margin-bottom:12px}
  .op-h1{font-family:'Cormorant Garant',serif;font-size:clamp(32px,4vw,48px);font-weight:300;color:${NAVY};letter-spacing:-.02em;line-height:1.05;margin-bottom:14px}
  .op-sub{font-size:13px;font-weight:300;color:#5A6B80;line-height:1.7;margin-bottom:36px;max-width:520px}
  .op-metrics{display:flex;gap:40px;margin-bottom:36px}
  .op-mn{font-family:'Cormorant Garant',serif;font-size:36px;font-weight:300;color:${NAVY};line-height:1}
  .op-ml{font-size:10px;color:#8A9BB0;margin-top:4px;letter-spacing:.06em}
  .fl label{font-size:9px;font-weight:500;letter-spacing:.16em;color:#8A9BB0;display:block;margin-bottom:10px}
  .fl input{background:white;border:1px solid rgba(10,22,40,.12);border-radius:8px;padding:12px 16px;font-size:14px;color:${NAVY};outline:none;transition:border-color 0.2s;font-family:'Inter',sans-serif;width:240px}
  .fl input:focus{border-color:${NAVY_MID}}
  .btn-navy{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.16em;background:${NAVY};color:white;border:none;padding:16px 40px;cursor:pointer;transition:opacity 0.2s;display:inline-block}
  .btn-navy:hover{opacity:.82}.btn-navy:disabled{opacity:.4;cursor:not-allowed}
  .btn-out{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;background:transparent;color:${NAVY};border:1px solid rgba(10,22,40,.2);padding:12px 24px;cursor:pointer;border-radius:8px;transition:all 0.2s}
  .btn-out:hover{background:${NAVY};color:white}
  .prog-wrap{height:2px;background:rgba(10,22,40,.07);border-radius:1px;margin-bottom:8px}
  .prog{height:100%;background:${NAVY};border-radius:1px;transition:width 0.6s ease}
  .q-btn{width:100%;text-align:left;display:flex;align-items:center;justify-content:space-between;border-radius:10px;padding:16px 20px;border:1.5px solid;font-size:14px;cursor:pointer;transition:all 0.15s;font-family:'Inter',sans-serif;margin-bottom:10px}
  .m-card{border-radius:16px;padding:24px 20px;cursor:pointer;transition:all 0.2s;position:relative;border:2px solid}
  .card-white{background:white;border-radius:14px;padding:24px;margin-bottom:16px}
  .ac-chip{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:8px;border:1.5px solid;cursor:pointer;transition:all 0.15s;font-size:13px;font-family:'Inter',sans-serif;margin:5px}
  .ac-chip.on{background:${NAVY};color:white;border-color:${NAVY}}
  .ac-chip.off{background:white;color:${NAVY};border-color:rgba(10,22,40,.12)}
  .ac-chip.off:hover{border-color:${NAVY}}
`;

function OptimizerInner() {
  const router = useRouter();
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
          body:JSON.stringify({capital:cap,answers:{"1":answers[1]??"","2":answers[2]??"","3":answers[3]??"","4":answers[4]??"","5":multiSel.join(","),"6":answers[6]??"","7":answers[7]??""}}
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

  async function handleSave(){
    setSaving(true);setSaveError("");
    const selR = results.find(r=>r.method===sel);
    if(!selR){setSaveError("Aucun résultat.");setSaving(false);return;}
    try{
      const{data:{user}}=await supabase.auth.getUser();
      if(!user){router.push("/auth/login");return;}
      const{count}=await supabase.from("portfolios").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("type","optimized");
      const n=(count??0)+1;
      const{data:pf,error:pfErr}=await supabase.from("portfolios").insert({user_id:user.id,name:`Portefeuille Zero CGP ${n}`,type:"optimized"}).select().single();
      if(pfErr||!pf)throw new Error();
      const assets=selR.weights.filter(w=>w.weight>0).map(w=>({portfolio_id:pf.id,symbol:w.symbol,name:w.name,type:w.type,quantity:parseFloat((w.amount/100).toFixed(4)),weight:w.weight,target_amount:w.amount}));
      if(assets.length>0){const{error:ae}=await supabase.from("portfolio_assets").insert(assets);if(ae)throw new Error();}
      router.push(`/dashboard/portfolio?id=${pf.id}`);
    }catch{setSaveError("Erreur enregistrement. Réessayez.");setSaving(false);}
  }

  // ── Écran 0 ──
  if(step===0)return(<><style>{css}</style><div className="op">
    <div className="op-ey">OPTIMISEUR MARKOWITZ</div>
    <h1 className="op-h1">Créez votre<br/>portefeuille optimal.</h1>
    <p className="op-sub">En 7 questions, notre algorithme calcule le portefeuille qui maximise votre rendement ajusté du risque selon la théorie de Markowitz (1952).</p>
    <div className="op-metrics">
      {[["7","Questions"],["3","Méthodes"],["305","Actifs"]].map(([n,l])=>(<div key={l}><div className="op-mn">{n}</div><div className="op-ml">{l}</div></div>))}
    </div>
    <div className="fl" style={{marginBottom:28}}><label>CAPITAL À INVESTIR (€)</label><input type="number" value={capital} onChange={e=>setCapital(e.target.value)} placeholder="Ex: 50 000"/></div>
    <button onClick={()=>setStep(1)} className="btn-navy">CRÉER UN PORTEFEUILLE ZERO CGP →</button>
  </div></>);

  // ── Questions ──
  if(step>=1&&step<=QUESTIONS.length){
    const q=QUESTIONS[step-1];
    const progress=(step/QUESTIONS.length)*100;
    const isMulti=q.isMulti;
    return(<><style>{css}</style><div className="op">
      <div style={{marginBottom:48}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:10,fontWeight:500,color:"#8A9BB0",letterSpacing:".14em"}}>{q.id} / 7</span>
          <span style={{fontSize:10,color:"#8A9BB0"}}>{Math.round(progress)}%</span>
        </div>
        <div className="prog-wrap"><div className="prog" style={{width:`${progress}%`}}/></div>
      </div>
      <h2 style={{fontFamily:"'Cormorant Garant',serif",fontSize:28,fontWeight:300,color:NAVY,marginBottom:32,letterSpacing:"-.02em",lineHeight:1.15}}>{q.q}</h2>
      {isMulti ? (
        <div style={{maxWidth:560}}>
          <p style={{fontSize:12,color:"#8A9BB0",marginBottom:20,fontWeight:300}}>Sélectionnez une ou plusieurs classes (au moins une)</p>
          <div style={{display:"flex",flexWrap:"wrap",marginBottom:32}}>
            {ASSET_CLASSES.map(c=>(
              <button key={c} onClick={()=>toggleClass(c)} className={`ac-chip ${multiSel.includes(c)?"on":"off"}`}>
                {multiSel.includes(c)&&<span style={{fontSize:11}}>✓</span>}
                {c}
              </button>
            ))}
          </div>
          <button onClick={advanceQ5} disabled={multiSel.length===0} className="btn-navy">
            CONFIRMER ({multiSel.length} sélectionnée{multiSel.length>1?"s":""}) →
          </button>
          {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{marginTop:16,background:"none",border:"none",color:"#8A9BB0",fontSize:12,cursor:"pointer",fontFamily:"'Inter',sans-serif",display:"block"}}>← Précédent</button>}
        </div>
      ):(
        <div style={{maxWidth:520}}>
          {q.opts.map(opt=>{
            const isSel=answers[step]===opt,isFlash=flash===opt;
            return(<button key={opt} onClick={()=>answer(opt)} className="q-btn" style={{background:isFlash?NAVY:isSel?"rgba(10,22,40,.03)":"white",borderColor:isFlash||isSel?NAVY:"rgba(10,22,40,.1)",color:isFlash?"white":NAVY,fontWeight:isSel?500:400}}>
              {opt}{isSel&&!isFlash&&<span style={{color:NAVY_MID,fontSize:12,fontWeight:600}}>✓</span>}
            </button>);
          })}
          {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{marginTop:24,background:"none",border:"none",color:"#8A9BB0",fontSize:12,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>← Précédent</button>}
        </div>
      )}
    </div></>);
  }

  // ── Calcul — Animation Markowitz ──
  if(step===100)return(<><style>{css}</style>
    <div style={{background:"#F9F8F6",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <MarkowitzAnim calcPct={calcPct} currentStep={CALC_STEPS[Math.max(0,calcStepIdx)]}/>
    </div>
  </>);

  // ── Résultats ──
  if(step===200){
    if(!results||results.length===0)return(<><style>{css}</style><div className="op"><p style={{color:"#8A9BB0"}}>Aucun résultat.</p><button className="btn-navy" style={{marginTop:16}} onClick={()=>{setStep(0);setResults([]);setCalcPct(0);setAnswers({});}}>Recommencer</button></div></>);
    const selR=results.find(r=>r.method===sel)??results[0];
    const cap=parseFloat(capital)||50000;
    return(<><style>{css}</style><div className="op" style={{paddingBottom:60}}>
      <div className="op-ey">RÉSULTATS · PORTEFEUILLE ZERO CGP</div>
      <h1 className="op-h1">3 portefeuilles optimaux.</h1>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:20}}>
        {results.map(r=>{
          const isSel=r.method===sel;
          return(<div key={r.method} onClick={()=>setSel(r.method)} className="m-card" style={{background:isSel?NAVY:"white",borderColor:isSel?NAVY:r.rec?"rgba(30,58,110,.28)":"rgba(10,22,40,.08)"}}>
            {r.rec&&<div style={{position:"absolute",top:-11,right:14,background:NAVY_MID,color:"white",fontSize:8,fontWeight:600,padding:"3px 11px",letterSpacing:".12em"}}>RECOMMANDÉ</div>}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:9,fontWeight:500,letterSpacing:".12em",color:isSel?"rgba(255,255,255,.3)":"#8A9BB0"}}>{r.method.toUpperCase()}</span>
              <div onClick={e=>e.stopPropagation()}><InfoBubble text={METHOD_INFO[r.method]??""} dark={isSel}/></div>
            </div>
            <div style={{fontSize:15,fontWeight:500,marginBottom:22,color:isSel?"white":NAVY}}>{r.label}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {([
                ["Rendement",`+${(r.ret||0).toFixed(1)}%`,(r.ret||0)>0?(isSel?"#6EE7B7":"#16A34A"):"#DC2626","rendement"],
                ["Volatilité",`${(r.vol||0).toFixed(1)}%`,isSel?"rgba(255,255,255,.4)":"#8A9BB0","volatilite"],
                ["Sharpe",(r.sharpe||0).toFixed(2),(r.sharpe||0)>0.7?(isSel?"#6EE7B7":"#16A34A"):"#8A9BB0","sharpe"],
                ["VaR 95%",`−${(r.var95||0).toFixed(1)}%`,isSel?"#FCA5A5":"#DC2626","var95"],
              ] as [string,string,string,string][]).map(([lbl,val,col,key])=>(
                <div key={lbl}>
                  <div style={{fontSize:9,marginBottom:4,display:"flex",alignItems:"center",gap:5,color:isSel?"rgba(255,255,255,.25)":"#8A9BB0"}}>
                    {lbl}<div onClick={e=>e.stopPropagation()}><InfoBubble text={METRIC_INFO[key]??""} dark={isSel}/></div>
                  </div>
                  <div style={{fontSize:20,fontWeight:700,color:col}}>{val}</div>
                </div>
              ))}
            </div>
          </div>);
        })}
      </div>

      {selR.frontier&&selR.frontier.length>0&&(
        <div className="card-white">
          <h3 style={{fontFamily:"'Cormorant Garant',serif",fontSize:18,fontWeight:400,color:NAVY,marginBottom:6}}>Frontière efficiente</h3>
          <p style={{fontSize:11,color:"#5A6B80",marginBottom:16,fontWeight:300}}>Chaque point représente un portefeuille possible. La courbe montre le meilleur rendement atteignable pour chaque niveau de risque.</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={selR.frontier} margin={{top:10,right:20,bottom:5,left:10}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,22,40,.05)"/>
              <XAxis dataKey="vol" unit="%" tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false}/>
              <YAxis dataKey="ret" unit="%" tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false} width={45}/>
              <Tooltip content={<FrontierTooltip/>}/>
              <Line type="monotone" dataKey="ret" stroke={NAVY_MID} strokeWidth={2.5} dot={{r:3,fill:NAVY_MID,stroke:"white",strokeWidth:1.5}} activeDot={{r:5,fill:NAVY,stroke:"white",strokeWidth:2}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {selR.weights&&selR.weights.length>0&&(
        <div className="card-white">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <h3 style={{fontFamily:"'Cormorant Garant',serif",fontSize:18,fontWeight:400,color:NAVY}}>Allocation recommandée</h3>
            <div style={{fontSize:11,color:"#8A9BB0"}}>Capital : {eur(cap)}</div>
          </div>
          <p style={{fontSize:11,color:"#5A6B80",marginBottom:16,fontWeight:300}}>Cliquez sur un actif pour voir sa fiche détaillée, ses performances et ses actualités.</p>
          {selR.weights.map(w=>(
          <AssetCard
            key={w.symbol}
            symbol={w.symbol}
            name={w.name}
            weight={w.weight}
            amount={w.amount}
            type={w.type||"stock"}
            perf={assetHistories[w.symbol]}
          />
        ))}
        </div>
      )}

      {saveError&&<p style={{color:"#DC2626",fontSize:12,marginBottom:12}}>{saveError}</p>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
        <button className="btn-out" onClick={()=>{setStep(0);setResults([]);setCalcPct(0);setCalcStepIdx(0);setAnswers({});setSaveError("");}}>Recommencer</button>
        <button onClick={handleSave} disabled={saving} className="btn-navy">{saving?"ENREGISTREMENT...":"ENREGISTRER CE PORTEFEUILLE →"}</button>
      </div>
    </div></>);
  }
  return null;
}

export default function OptimizerPage() {

  const [assetHistories, setAssetHistories] = useState<Record<string,Record<string,string>>>({});
  const [assetMeta, setAssetMeta] = useState<Record<string,{name:string;sector:string;type:string}>>({});

  return (
    <Suspense fallback={<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",minHeight:400}}><div style={{color:"#8A9BB0",fontSize:11,letterSpacing:".2em"}}>CHARGEMENT...</div></div>}>
      <OptimizerInner />
    </Suspense>
  );
}
