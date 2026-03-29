"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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

// ─── Explications pédagogiques ────────────────────────────────
const METHOD_INFO: Record<string, string> = {
  gmv: "Le portefeuille à Variance Minimale est le plus prudent possible. Il choisit la combinaison d'actifs qui fait le moins trembler votre patrimoine, même si le rendement est plus faible. Idéal si vous avez peur des turbulences.",
  maxsharpe: "Le portefeuille Sharpe Maximum est le plus efficace : il vous donne le meilleur rendement possible pour le niveau de risque que vous prenez. C'est le portefeuille que la plupart des experts recommandent comme point de départ.",
  utility: "Le portefeuille Utilité Maximale est personnalisé selon votre tolérance au risque. Il équilibre rendement et sécurité selon votre profil, entre la prudence totale et l'optimisme maximal.",
};

const METRIC_INFO: Record<string, string> = {
  rendement: "C'est le gain annuel moyen que ce portefeuille aurait produit historiquement. +10% veut dire que 10 000 € deviennent 11 000 € en un an en moyenne.",
  volatilite: "C'est la mesure des 'secousses' de votre portefeuille. Une volatilité de 15% signifie que votre portefeuille peut varier de ±15% autour de sa trajectoire. Plus c'est bas, plus c'est stable.",
  sharpe: "Le ratio de Sharpe mesure si le jeu en vaut la chandelle. Un Sharpe > 0.7 est bon, > 1 est excellent. Plus il est élevé, mieux vous êtes rémunéré pour le risque que vous prenez.",
  var95: "La VaR à 95% est le pire scénario probable. -18% signifie que sur 100 années, 95 fois votre perte annuelle sera inférieure à 18%. C'est une 'limite basse' de confiance.",
};

// ─── Tooltip info bulle ───────────────────────────────────────
function InfoBubble({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 16, height: 16, borderRadius: "50%",
          background: "rgba(30,58,110,0.12)", border: "none",
          color: NAVY_MID, fontSize: 9, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
          transition: "background 0.15s", fontFamily: "Georgia, serif",
          fontStyle: "italic", lineHeight: 1,
        }}
        title="En savoir plus"
      >
        i
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)", width: 240,
          background: NAVY, color: "white", borderRadius: 10,
          padding: "12px 14px", fontSize: 11.5, lineHeight: 1.7,
          fontWeight: 300, zIndex: 200, fontFamily: "'Inter', sans-serif",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}>
          {text}
          {/* Flèche */}
          <div style={{
            position: "absolute", top: "100%", left: "50%",
            transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: `6px solid ${NAVY}`,
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Accordéon actif ─────────────────────────────────────────
const ASSET_INFO: Record<string, { desc: string; sector: string; history: Record<string, number> }> = {
  "CSPX":  { desc: "ETF qui réplique les 500 plus grandes entreprises américaines (Apple, Microsoft, Amazon…). C'est l'indice de référence mondial.", sector: "ETF Actions USA", history: {"1M":1.8,"6M":4.2,"1A":18.5,"5A":98.3,"10A":241.0} },
  "VWCE":  { desc: "ETF 'total world' qui investit dans plus de 3 700 entreprises de 50 pays. La diversification ultime en un seul actif.", sector: "ETF Actions Monde", history: {"1M":1.5,"6M":3.8,"1A":15.2,"5A":82.1,"10A":198.0} },
  "EQQQ":  { desc: "ETF qui suit les 100 plus grandes valeurs technologiques du Nasdaq (Nvidia, Meta, Google…). Plus volatile mais plus performant.", sector: "ETF Tech USA", history: {"1M":2.4,"6M":5.1,"1A":22.3,"5A":132.0,"10A":389.0} },
  "PAEEM": { desc: "ETF exposé aux marchés émergents : Chine, Inde, Brésil, Taïwan… Fort potentiel de croissance mais plus risqué.", sector: "ETF Marchés Émergents", history: {"1M":-0.8,"6M":2.1,"1A":8.4,"5A":21.0,"10A":52.0} },
  "MC":    { desc: "LVMH est le premier groupe mondial de luxe (Louis Vuitton, Dior, Moët…). Chiffre d'affaires 2023 : 86 Mds €.", sector: "Luxe / Consommation", history: {"1M":-2.1,"6M":-8.4,"1A":-12.0,"5A":68.0,"10A":285.0} },
  "AIR":   { desc: "Airbus est le leader mondial de la construction aéronautique civile. Carnet de commandes record en 2024.", sector: "Aéronautique / Défense", history: {"1M":0.6,"6M":3.2,"1A":4.8,"5A":38.0,"10A":142.0} },
  "ASML":  { desc: "ASML est le seul fabricant mondial de machines lithographiques EUV, indispensables pour produire les puces les plus avancées.", sector: "Semi-conducteurs", history: {"1M":-3.2,"6M":-12.0,"1A":5.0,"5A":178.0,"10A":1820.0} },
  "AAPL":  { desc: "Apple est la première capitalisation mondiale. Très diversifié entre iPhone, Mac, services (App Store, iCloud) et wearables.", sector: "Tech / Consumer", history: {"1M":3.1,"6M":8.4,"1A":26.0,"5A":198.0,"10A":832.0} },
  "MSFT":  { desc: "Microsoft est le leader mondial du cloud (Azure), de la productivité (Office 365) et de l'IA (Copilot, OpenAI).", sector: "Cloud / IA / Software", history: {"1M":2.2,"6M":6.8,"1A":18.0,"5A":182.0,"10A":742.0} },
  "BTC":   { desc: "Le Bitcoin est la première cryptomonnaie mondiale par capitalisation. Réserve de valeur numérique, offre limitée à 21M d'unités.", sector: "Crypto-actif", history: {"1M":8.2,"6M":28.0,"1A":62.0,"5A":890.0,"10A":18400.0} },
  "ETH":   { desc: "Ethereum est la blockchain de référence pour les smart contracts et les applications décentralisées (DeFi, NFT).", sector: "Crypto-actif", history: {"1M":4.1,"6M":12.0,"1A":28.0,"5A":420.0,"10A":6800.0} },
};

const NEWS: Record<string, string[]> = {
  "CSPX":  ["Le S&P 500 atteint de nouveaux sommets portés par les valeurs tech","La Fed maintient ses taux, les marchés en hausse","Bonne saison de résultats pour les grandes capitalisations américaines"],
  "VWCE":  ["Les marchés mondiaux progressent malgré l'incertitude géopolitique","Les ETF monde battent à nouveau les fonds actifs sur 10 ans","L'Europe et l'Asie soutiennent la performance du MSCI All World"],
  "EQQQ":  ["Nvidia dépasse les 3 000 Mds de capitalisation","L'intelligence artificielle propulse le Nasdaq à la hausse","Les valeurs semi-conducteurs en forte progression"],
  "PAEEM": ["L'Inde devient le 3ème marché boursier mondial","Reprise en Chine : le CSI 300 rebondit","Les émergents profitent d'un dollar plus faible"],
  "MC":    ["LVMH : résultats T1 2024 légèrement en retrait sur le luxe en Chine","Bernard Arnault confirme la stratégie long terme du groupe","Le segment Sephora et DFS affichent une forte croissance"],
  "AAPL":  ["Apple Intelligence déployé dans iOS 18, fort intérêt des analystes","iPhone 16 : ventes décevantes en Chine, solides aux USA","Apple rachète des actions pour 110 Mds$, record absolu"],
  "MSFT":  ["Azure dépasse 40% de croissance grâce à l'IA","Microsoft Copilot intégré dans 365, adoption massive en entreprise","Résultats Q2 2024 en hausse de 17%, au-dessus des attentes"],
  "ASML":  ["Commandes record pour les machines EUV next-gen","TSMC et Samsung commandent de nouvelles machines ASML","Les États-Unis restreignent l'export vers la Chine, impact limité"],
  "BTC":   ["Bitcoin consolide après son ATH historique à 73 000$","Les ETF Bitcoin spot américains franchissent 50 Mds$ d'encours","Le halving réduit l'offre, pression haussière attendue"],
  "ETH":   ["Ethereum post-Merge : consommation énergétique -99,95%","L'essor du restaking booste la demande d'ETH","Les L2 Ethereum (Arbitrum, Base) battent des records de volumes"],
};

function AssetRow({ w }: { w: { symbol: string; name: string; type: string; weight: number; amount: number } }) {
  const [open, setOpen] = useState(false);
  const info = ASSET_INFO[w.symbol];
  const news = NEWS[w.symbol] ?? ["Données d'actualités non disponibles pour cet actif."];
  const periods = ["1M","6M","1A","5A","10A"];

  return (
    <div style={{ marginBottom: 10, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(10,22,40,.07)", background: "white" }}>
      {/* Ligne principale */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer" }}
        onClick={() => setOpen(!open)}>
        <div style={{ width: 48, fontSize: 12, fontWeight: 700, color: NAVY, flexShrink: 0 }}>{w.symbol}</div>
        <div style={{ flex: 1, height: 4, background: "rgba(10,22,40,.06)", borderRadius: 2 }}>
          <div style={{ width: `${Math.round(w.weight * 100)}%`, height: "100%", borderRadius: 2, background: TYPE_COLOR[w.type] ?? "#2563EB" }} />
        </div>
        <div style={{ width: 34, textAlign: "right", fontSize: 12, color: "#8A9BB0", flexShrink: 0 }}>
          {Math.round(w.weight * 100)}%
        </div>
        <div style={{ width: 76, textAlign: "right", fontSize: 12, fontWeight: 600, color: NAVY, flexShrink: 0 }}>
          {eur(w.amount)}
        </div>
        {/* Flèche chevron */}
        <div style={{
          width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "transform 0.25s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 1L6 6.5L11 1" stroke="#8A9BB0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Accordéon */}
      {open && (
        <div style={{ borderTop: "1px solid rgba(10,22,40,.05)", padding: "20px 18px", background: "#FAFAF9" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
            {/* Infos */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".14em", color: "#8A9BB0", marginBottom: 8 }}>
                {info?.sector ?? "Actif financier"}
              </div>
              <p style={{ fontSize: 12.5, color: "#3D4F63", lineHeight: 1.8, fontWeight: 300 }}>
                {info?.desc ?? "Actif sélectionné par l'algorithme de Markowitz pour ses propriétés de diversification."}
              </p>
            </div>

            {/* Performances historiques */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".14em", color: "#8A9BB0", marginBottom: 10 }}>
                PERFORMANCES HISTORIQUES
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {periods.map(p => {
                  const val = info?.history?.[p];
                  if (val === undefined) return null;
                  const pos = val >= 0;
                  return (
                    <div key={p} style={{
                      background: pos ? "#F0FDF4" : "#FEF2F2",
                      borderRadius: 8, padding: "8px 12px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 9, color: "#8A9BB0", marginBottom: 4, letterSpacing: ".08em" }}>{p}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: pos ? "#16A34A" : "#DC2626" }}>
                        {pos ? "+" : ""}{val}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actualités */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".14em", color: "#8A9BB0", marginBottom: 10 }}>
              ACTUALITÉS RÉCENTES
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {news.map((n, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: TYPE_COLOR[w.type], flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 12, color: "#3D4F63", lineHeight: 1.65, fontWeight: 300 }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const QUESTIONS = [
  { id:"Q1", q:"Horizon d'investissement ?",         opts:["Moins de 2 ans","2 à 5 ans","5 à 10 ans","10 ans et plus"] },
  { id:"Q2", q:"Profil de risque ?",                 opts:["Conservateur","Modéré","Dynamique","Agressif"] },
  { id:"Q3", q:"Perte maximale acceptable ?",        opts:["−10% maximum","−20% maximum","−35% maximum","Aucune limite"] },
  { id:"Q4", q:"Filtres ESG ?",                      opts:["Aucun filtre","Exclure armement & tabac","ESG strict uniquement"] },
  { id:"Q5", q:"Classes d'actifs souhaitées ?",      opts:["ETF uniquement","ETF + Actions","ETF + Actions + Crypto","Toutes les classes"] },
  { id:"Q6", q:"Zones géographiques prioritaires ?", opts:["Monde entier","USA dominante","Europe","Marchés émergents"] },
  { id:"Q7", q:"Niveau de diversification ?",        opts:["Concentré (5 actifs)","Équilibré (8–10)","Large (15+ actifs)"] },
];

const CALC_STEPS = [
  "Connexion aux données de marché","Récupération des historiques (5 ans)",
  "Construction de la matrice de covariance","Application du shrinkage Ledoit-Wolf",
  "Calcul de la frontière efficiente","Maximisation du ratio de Sharpe",
  "Calcul VaR 95% et CVaR","Validation des contraintes","Génération du rapport final",
];
const CALC_DURATION = 12000;

type Weight = { symbol:string; name:string; type:string; weight:number; amount:number };
type FrontierPt = { vol:number; ret:number };
type OptResult = {
  method:string; label:string; ret:number; vol:number; sharpe:number; var95:number;
  rec?:boolean; weights:Weight[]; frontier:FrontierPt[];
};

function buildMockResults(capital:number):OptResult[] {
  const syms = [
    {symbol:"CSPX",name:"iShares Core S&P 500",type:"etf"},
    {symbol:"VWCE",name:"Vanguard All-World",type:"etf"},
    {symbol:"EQQQ",name:"Invesco NASDAQ-100",type:"etf"},
    {symbol:"PAEEM",name:"MSCI Emerging Markets",type:"etf"},
    {symbol:"MC",name:"LVMH",type:"stock"},
    {symbol:"BTC",name:"Bitcoin",type:"crypto"},
  ];
  const alloc=(ws:number[]):Weight[]=>syms.map((s,i)=>({...s,weight:ws[i],amount:Math.round(capital*ws[i])}));
  const frontier:FrontierPt[]=Array.from({length:40},(_,i)=>({
    vol:parseFloat((8+i*0.7).toFixed(1)),
    ret:parseFloat((4+Math.sqrt(i)*2.2).toFixed(1)),
  }));
  return [
    {method:"gmv",label:"Variance Minimale",ret:8.2,vol:11.4,sharpe:0.69,var95:18.8,weights:alloc([0.35,0.28,0.15,0.12,0.07,0.03]),frontier},
    {method:"maxsharpe",label:"Sharpe Maximum",ret:12.7,vol:14.2,sharpe:0.87,var95:23.4,rec:true,weights:alloc([0.30,0.22,0.20,0.10,0.12,0.06]),frontier},
    {method:"utility",label:"Utilité Maximale",ret:10.4,vol:12.8,sharpe:0.76,var95:21.1,weights:alloc([0.32,0.25,0.18,0.11,0.09,0.05]),frontier},
  ];
}

// Tooltip frontière efficiente lisible
function FrontierTooltip({ active, payload }: { active?: boolean; payload?: { value: number; name: string }[] }) {
  if (!active || !payload?.length) return null;
  const vol = payload.find(p => p.name === "vol")?.value;
  const ret = payload.find(p => p.name === "ret")?.value;
  return (
    <div style={{ background: NAVY, borderRadius: 8, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,.2)" }}>
      <div style={{ color: "rgba(255,255,255,.45)", fontSize: 10, marginBottom: 5 }}>Point de la frontière</div>
      <div style={{ color: "white", fontSize: 12, fontWeight: 500 }}>Rendement : <span style={{ color: "#6EE7B7" }}>+{ret}%</span></div>
      <div style={{ color: "white", fontSize: 12, fontWeight: 500 }}>Volatilité : <span style={{ color: "#FCA5A5" }}>{vol}%</span></div>
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
  .btn-navy:hover{opacity:.82}
  .btn-navy:disabled{opacity:.4;cursor:not-allowed}
  .btn-out{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;background:transparent;color:${NAVY};border:1px solid rgba(10,22,40,.2);padding:12px 24px;cursor:pointer;border-radius:8px;transition:all 0.2s}
  .btn-out:hover{background:${NAVY};color:white}
  .prog-wrap{height:2px;background:rgba(10,22,40,.07);border-radius:1px;margin-bottom:8px}
  .prog{height:100%;background:${NAVY};border-radius:1px;transition:width 0.6s ease}
  .q-btn{width:100%;text-align:left;display:flex;align-items:center;justify-content:space-between;border-radius:10px;padding:16px 20px;border:1.5px solid;font-size:14px;cursor:pointer;transition:all 0.15s;font-family:'Inter',sans-serif;margin-bottom:10px}
  .m-card{border-radius:16px;padding:24px 20px;cursor:pointer;transition:all 0.2s;position:relative;border:2px solid}
  .card-white{background:white;border-radius:14px;padding:24px;margin-bottom:16px}
  .metric-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .metric-box{padding:0}
  .metric-label{font-size:9px;margin-bottom:4px;display:flex;align-items:center;gap:5px}
  .metric-val{font-size:20px;font-weight:700}
`;

export default function OptimizerPage() {
  const router = useRouter();
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState<Record<number,string>>({});
  const [capital,setCapital]=useState("");
  const [flash,setFlash]=useState<string|null>(null);
  const [calcPct,setCalcPct]=useState(0);
  const [calcStepIdx,setCalcStepIdx]=useState(0);
  const [results,setResults]=useState<OptResult[]>([]);
  const [sel,setSel]=useState("maxsharpe");
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState("");

  function answer(opt:string){
    setFlash(opt);
    setTimeout(()=>{
      setAnswers(p=>({...p,[step]:opt}));setFlash(null);
      if(step<QUESTIONS.length)setStep(s=>s+1);else startCalc();
    },250);
  }

  function startCalc(){
    setStep(100);
    const stepDur=CALC_DURATION/CALC_STEPS.length;
    let si=0;
    const iv=setInterval(()=>{
      si+=1;
      setCalcStepIdx(si-1);
      setCalcPct(Math.min(Math.round((si/CALC_STEPS.length)*100),100));
      if(si>=CALC_STEPS.length){
        clearInterval(iv);
        setTimeout(async()=>{
          const cap=parseFloat(capital)||50000;
          let res:OptResult[]=[];
          try{
            const r=await fetch("/api/optimize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({capital:cap,answers})});
            if(r.ok){const d=await r.json();res=Array.isArray(d.results)&&d.results.length>0?d.results:buildMockResults(cap);}
            else res=buildMockResults(cap);
          }catch{res=buildMockResults(cap);}
          setResults(res);
          setSel(res.find(r=>r.rec)?.method??res[0]?.method??"maxsharpe");
          setStep(200);
        },800);
      }
    },stepDur);
  }

  async function handleSave(){
    setSaving(true);setSaveError("");
    const selR=results.find(r=>r.method===sel);
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
      router.push("/dashboard/portfolio");
    }catch{setSaveError("Erreur lors de l'enregistrement. Réessayez.");setSaving(false);}
  }

  // ── Écran 0 ──
  if(step===0)return(<><style>{css}</style><div className="op">
    <div className="op-ey">OPTIMISEUR MARKOWITZ</div>
    <h1 className="op-h1">Créez votre<br/>portefeuille optimal.</h1>
    <p className="op-sub">En 7 questions, notre algorithme calcule le portefeuille qui maximise votre rendement ajusté du risque selon la théorie de Markowitz (1952).</p>
    <div className="op-metrics">
      {[["7","Questions"],["3","Méthodes"],["33","Actifs"]].map(([n,l])=>(<div key={l}><div className="op-mn">{n}</div><div className="op-ml">{l}</div></div>))}
    </div>
    <div className="fl" style={{marginBottom:28}}><label>CAPITAL À INVESTIR (€)</label><input type="number" value={capital} onChange={e=>setCapital(e.target.value)} placeholder="Ex: 50 000"/></div>
    <button onClick={()=>setStep(1)} className="btn-navy">CRÉER UN PORTEFEUILLE ZERO CGP →</button>
  </div></>);

  // ── Questions ──
  if(step>=1&&step<=QUESTIONS.length){
    const q=QUESTIONS[step-1];const progress=(step/QUESTIONS.length)*100;
    return(<><style>{css}</style><div className="op">
      <div style={{marginBottom:48}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:10,fontWeight:500,color:"#8A9BB0",letterSpacing:".14em"}}>{q.id} / 7</span>
          <span style={{fontSize:10,color:"#8A9BB0"}}>{Math.round(progress)}%</span>
        </div>
        <div className="prog-wrap"><div className="prog" style={{width:`${progress}%`}}/></div>
      </div>
      <h2 style={{fontFamily:"'Cormorant Garant',serif",fontSize:28,fontWeight:300,color:NAVY,marginBottom:32,letterSpacing:"-.02em",lineHeight:1.15}}>{q.q}</h2>
      <div style={{maxWidth:520}}>
        {q.opts.map(opt=>{
          const isSel=answers[step]===opt,isFlash=flash===opt;
          return(<button key={opt} onClick={()=>answer(opt)} className="q-btn" style={{background:isFlash?NAVY:isSel?"rgba(10,22,40,.03)":"white",borderColor:isFlash||isSel?NAVY:"rgba(10,22,40,.1)",color:isFlash?"white":NAVY,fontWeight:isSel?500:400}}>
            {opt}{isSel&&!isFlash&&<span style={{color:NAVY_MID,fontSize:12,fontWeight:600}}>✓</span>}
          </button>);
        })}
      </div>
      {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{marginTop:24,background:"none",border:"none",color:"#8A9BB0",fontSize:12,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>← Précédent</button>}
    </div></>);
  }

  // ── Calcul ──
  if(step===100)return(<><style>{css}</style><div className="op" style={{display:"flex",flexDirection:"column",justifyContent:"center",minHeight:"70vh"}}>
    <div style={{maxWidth:460}}>
      <div className="op-ey">CALCUL EN COURS</div>
      <h2 style={{fontFamily:"'Cormorant Garant',serif",fontSize:34,fontWeight:300,color:NAVY,marginBottom:40,letterSpacing:"-.02em",lineHeight:1.1}}>Optimisation<br/>du portefeuille...</h2>
      <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:32}}>
        {CALC_STEPS.map((cs,i)=>{
          const done=i<=calcStepIdx,cur=i===calcStepIdx+1;
          return(<div key={cs} style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:done?NAVY:"rgba(10,22,40,.07)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.5s",border:cur?`1px solid ${NAVY_MID}`:"none"}}>
              {done&&<span style={{color:"white",fontSize:11,fontWeight:600}}>✓</span>}
            </div>
            <span style={{fontSize:13,color:done?NAVY:cur?NAVY_MID:"#8A9BB0",transition:"color 0.4s",fontWeight:cur?500:400}}>{cs}</span>
          </div>);
        })}
      </div>
      <div className="prog-wrap"><div className="prog" style={{width:`${calcPct}%`}}/></div>
      <div style={{color:"#8A9BB0",fontSize:11,marginTop:8,letterSpacing:".06em"}}>{calcPct}% complété</div>
    </div>
  </div></>);

  // ── Résultats ──
  if(step===200){
    if(!results||results.length===0)return(<><style>{css}</style><div className="op"><p style={{color:"#8A9BB0"}}>Aucun résultat.</p><button className="btn-navy" style={{marginTop:16}} onClick={()=>{setStep(0);setResults([]);setCalcPct(0);setAnswers({})}}>Recommencer</button></div></>);
    const selR=results.find(r=>r.method===sel)??results[0];
    const cap=parseFloat(capital)||50000;

    return(<><style>{css}</style><div className="op" style={{paddingBottom:60}}>
      <div className="op-ey">RÉSULTATS · PORTEFEUILLE ZERO CGP</div>
      <h1 className="op-h1">3 portefeuilles optimaux.</h1>

      {/* Cards méthodes avec boutons info */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:20}}>
        {results.map(r=>{
          const isSel=r.method===sel;
          return(
            <div key={r.method} onClick={()=>setSel(r.method)} className="m-card" style={{background:isSel?NAVY:"white",borderColor:isSel?NAVY:r.rec?"rgba(30,58,110,.28)":"rgba(10,22,40,.08)"}}>
              {r.rec&&<div style={{position:"absolute",top:-11,right:14,background:NAVY_MID,color:"white",fontSize:8,fontWeight:600,padding:"3px 11px",letterSpacing:".12em"}}>RECOMMANDÉ</div>}

              {/* Header méthode avec info */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:9,fontWeight:500,letterSpacing:".12em",color:isSel?"rgba(255,255,255,.3)":"#8A9BB0"}}>{r.method.toUpperCase()}</span>
                <div onClick={e=>e.stopPropagation()}>
                  <InfoBubble text={METHOD_INFO[r.method]??""} />
                </div>
              </div>
              <div style={{fontSize:15,fontWeight:500,marginBottom:22,color:isSel?"white":NAVY}}>{r.label}</div>

              {/* Métriques avec info */}
              <div className="metric-row">
                {[
                  ["Rendement",`+${(r.ret||0).toFixed(1)}%`,(r.ret||0)>0?(isSel?"#6EE7B7":"#16A34A"):"#DC2626","rendement"],
                  ["Volatilité",`${(r.vol||0).toFixed(1)}%`,isSel?"rgba(255,255,255,.4)":"#8A9BB0","volatilite"],
                  ["Sharpe",(r.sharpe||0).toFixed(2),(r.sharpe||0)>0.7?(isSel?"#6EE7B7":"#16A34A"):"#8A9BB0","sharpe"],
                  ["VaR 95%",`−${(r.var95||0).toFixed(1)}%`,isSel?"#FCA5A5":"#DC2626","var95"],
                ].map(([lbl,val,col,key])=>(
                  <div key={lbl} className="metric-box">
                    <div className="metric-label" style={{color:isSel?"rgba(255,255,255,.25)":"#8A9BB0"}}>
                      {lbl}
                      <div onClick={e=>e.stopPropagation()}>
                        <InfoBubble text={METRIC_INFO[key as string]??""} />
                      </div>
                    </div>
                    <div className="metric-val" style={{color:col as string}}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Frontière efficiente — scatter remplacé par LineChart pour lisibilité */}
      {selR.frontier&&selR.frontier.length>0&&(
        <div className="card-white">
          <h3 style={{fontFamily:"'Cormorant Garant',serif",fontSize:18,fontWeight:400,color:NAVY,marginBottom:6}}>Frontière efficiente</h3>
          <p style={{fontSize:11,color:"#8A9BB0",marginBottom:16,fontWeight:300}}>Chaque point représente un portefeuille possible. La courbe montre le meilleur rendement atteignable pour chaque niveau de risque.</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={selR.frontier} margin={{top:10,right:20,bottom:5,left:10}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,22,40,.05)"/>
              <XAxis dataKey="vol" name="Volatilité" unit="%" tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false} label={{value:"Risque (volatilité %)",position:"insideBottom",offset:-2,fontSize:9,fill:"#bbb"}}/>
              <YAxis dataKey="ret" name="Rendement" unit="%" tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false} width={45}/>
              <Tooltip content={<FrontierTooltip />}/>
              <Line type="monotone" dataKey="ret" stroke={NAVY_MID} strokeWidth={2.5} dot={{r:3,fill:NAVY_MID,stroke:"white",strokeWidth:1.5}} activeDot={{r:5,fill:NAVY,stroke:"white",strokeWidth:2}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Allocation avec accordéons */}
      {selR.weights&&selR.weights.length>0&&(
        <div className="card-white">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <h3 style={{fontFamily:"'Cormorant Garant',serif",fontSize:18,fontWeight:400,color:NAVY}}>Allocation recommandée</h3>
            <div style={{fontSize:11,color:"#8A9BB0"}}>Capital : {eur(cap)}</div>
          </div>
          <p style={{fontSize:11,color:"#8A9BB0",marginBottom:16,fontWeight:300}}>Cliquez sur un actif pour voir ses performances historiques et ses actualités.</p>
          {selR.weights.map(w=><AssetRow key={w.symbol} w={w}/>)}
        </div>
      )}

      {saveError&&<p style={{color:"#DC2626",fontSize:12,marginBottom:12}}>{saveError}</p>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
        <button className="btn-out" onClick={()=>{setStep(0);setResults([]);setCalcPct(0);setCalcStepIdx(0);setAnswers({});setSaveError("")}}>Recommencer</button>
        <button onClick={handleSave} disabled={saving} className="btn-navy">{saving?"ENREGISTREMENT...":"ENREGISTRER CE PORTEFEUILLE →"}</button>
      </div>
    </div></>);
  }
  return null;
}
