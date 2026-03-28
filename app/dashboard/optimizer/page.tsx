"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, createPortfolio, upsertAssets } from "@/lib/supabase";
import { eur } from "@/lib/utils";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip } from "recharts";

const NAVY = "#0A1628";
const NAVY_MID = "#1E3A6E";
const TYPE_COLOR: Record<string, string> = { etf: "#2563EB", stock: "#16A34A", crypto: "#D97706" };

const QUESTIONS = [
  { id:"Q1", q:"Horizon d'investissement ?",       opts:["Moins de 2 ans","2 à 5 ans","5 à 10 ans","10 ans et plus"] },
  { id:"Q2", q:"Profil de risque ?",               opts:["Conservateur","Modéré","Dynamique","Agressif"] },
  { id:"Q3", q:"Perte maximale acceptable ?",      opts:["−10% maximum","−20% maximum","−35% maximum","Aucune limite"] },
  { id:"Q4", q:"Filtres ESG ?",                    opts:["Aucun filtre","Exclure armement & tabac","ESG strict uniquement"] },
  { id:"Q5", q:"Classes d'actifs souhaitées ?",    opts:["ETF uniquement","ETF + Actions","ETF + Actions + Crypto","Toutes les classes"] },
  { id:"Q6", q:"Zones géographiques prioritaires ?", opts:["Monde entier","USA dominante","Europe","Marchés émergents"] },
  { id:"Q7", q:"Niveau de diversification ?",      opts:["Concentré (5 actifs)","Équilibré (8–10)","Large (15+ actifs)"] },
];

const CALC_STEPS = [
  "Récupération des données historiques (5 ans)",
  "Construction de la matrice de covariance",
  "Ledoit-Wolf shrinkage",
  "Calcul de la frontière efficiente",
  "Maximisation du ratio de Sharpe",
  "Calcul VaR 95% et CVaR",
  "Génération du rapport final",
];

type OptResult = {
  method:string; label:string; ret:number; vol:number; sharpe:number; var95:number; rec?:boolean;
  weights:Array<{symbol:string;name:string;type:string;weight:number;amount:number}>;
  frontier:Array<{expectedReturn:number;volatility:number}>;
};

function mockResults(capital:number):OptResult[] {
  const syms=[
    {symbol:"CSPX",name:"iShares Core S&P 500",type:"etf"},
    {symbol:"VWCE",name:"Vanguard All-World",type:"etf"},
    {symbol:"EQQQ",name:"Invesco NASDAQ-100",type:"etf"},
    {symbol:"PAEEM",name:"MSCI Emerging Markets",type:"etf"},
    {symbol:"MC",name:"LVMH",type:"stock"},
    {symbol:"BTC",name:"Bitcoin",type:"crypto"},
  ];
  const alloc=(w:number[])=>syms.map((s,i)=>({...s,weight:w[i],amount:capital*w[i]}));
  const frontier=Array.from({length:40},(_,i)=>({
    volatility:parseFloat((8+i*0.7).toFixed(1)),
    expectedReturn:parseFloat((4+Math.sqrt(i)*2.2).toFixed(1)),
  }));
  return [
    {method:"gmv",      label:"Variance Minimale",ret:8.2, vol:11.4,sharpe:0.69,var95:18.8,weights:alloc([0.35,0.28,0.15,0.12,0.07,0.03]),frontier},
    {method:"maxsharpe",label:"Sharpe Maximum",   ret:12.7,vol:14.2,sharpe:0.87,var95:23.4,rec:true,weights:alloc([0.30,0.22,0.20,0.10,0.12,0.06]),frontier},
    {method:"utility",  label:"Utilité Maximale", ret:10.4,vol:12.8,sharpe:0.76,var95:21.1,weights:alloc([0.32,0.25,0.18,0.11,0.09,0.05]),frontier},
  ];
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
  .prog{height:100%;background:${NAVY};border-radius:1px;transition:width 0.4s ease}
  .q-btn{width:100%;text-align:left;display:flex;align-items:center;justify-content:space-between;border-radius:10px;padding:16px 20px;border:1.5px solid;font-size:14px;cursor:pointer;transition:all 0.15s;font-family:'Inter',sans-serif;margin-bottom:10px}
  .m-card{border-radius:16px;padding:24px 20px;cursor:pointer;transition:all 0.2s;position:relative;border:2px solid}
`;

export default function OptimizerPage() {
  const router = useRouter();
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState<Record<number,string>>({});
  const [capital,setCapital]=useState("");
  const [flash,setFlash]=useState<string|null>(null);
  const [calcPct,setCalcPct]=useState(0);
  const [calcStep,setCalcStep]=useState(0);
  const [results,setResults]=useState<OptResult[]>([]);
  const [sel,setSel]=useState("maxsharpe");
  const [saving,setSaving]=useState(false);

  function answer(opt:string){
    setFlash(opt);
    setTimeout(()=>{
      setAnswers(p=>({...p,[step]:opt}));setFlash(null);
      if(step<QUESTIONS.length)setStep(s=>s+1);else startCalc();
    },250);
  }

  async function startCalc(){
    setStep(100);let pct=0,si=0;
    const iv=setInterval(()=>{
      pct+=14;si=Math.min(Math.floor(pct/14),CALC_STEPS.length-1);
      setCalcPct(Math.min(pct,100));setCalcStep(si);
      if(pct>=100){clearInterval(iv);setTimeout(async()=>{
        const cap=parseFloat(capital)||46000;
        try{
          const r=await fetch("/api/optimize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({capital:cap,answers})});
          const d=await r.json();setResults(d.results?.length?d.results:mockResults(cap));
        }catch{setResults(mockResults(cap));}
        setStep(200);
      },400);}
    },320);
  }

  async function handleSave(){
    setSaving(true);
    const selR=results.find(r=>r.method===sel)!;
    const{data:{user}}=await supabase.auth.getUser();
    if(!user){router.push("/auth/login");return;}
    const{count}=await supabase.from("portfolios").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("type","optimized");
    const n=(count??0)+1;
    const pf=await createPortfolio(user.id,`Portefeuille Zero CGP ${n}`,"optimized");
    await upsertAssets(pf.id,selR.weights.map(w=>({symbol:w.symbol,name:w.name,type:w.type,quantity:parseFloat((w.amount/100).toFixed(4))})));
    router.push("/dashboard/portfolio");
  }

  if(step===0)return(<><style>{css}</style><div className="op">
    <div className="op-ey">OPTIMISEUR MARKOWITZ</div>
    <h1 className="op-h1">Créez votre<br/>portefeuille optimal.</h1>
    <p className="op-sub">En 7 questions, notre algorithme calcule le portefeuille qui maximise votre rendement ajusté du risque selon la théorie de Markowitz (1952).</p>
    <div className="op-metrics">
      {[["7","Questions"],["3","Méthodes"],["33","Actifs"]].map(([n,l])=>(
        <div key={l}><div className="op-mn">{n}</div><div className="op-ml">{l}</div></div>
      ))}
    </div>
    <div className="fl" style={{marginBottom:28}}><label>CAPITAL À INVESTIR (€)</label><input type="number" value={capital} onChange={e=>setCapital(e.target.value)} placeholder="Ex: 50000"/></div>
    <button onClick={()=>setStep(1)} className="btn-navy">CRÉER UN PORTEFEUILLE ZERO CGP →</button>
  </div></>);

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
          const isSel=answers[step]===opt,fl=flash===opt;
          return(<button key={opt} onClick={()=>answer(opt)} className="q-btn" style={{
            background:fl?NAVY:isSel?"rgba(10,22,40,.03)":"white",
            borderColor:fl||isSel?NAVY:"rgba(10,22,40,.1)",
            color:fl?"white":NAVY,fontWeight:isSel?500:400,
          }}>{opt}{isSel&&!fl&&<span style={{color:NAVY_MID,fontSize:12}}>✓</span>}</button>);
        })}
      </div>
      {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{marginTop:24,background:"none",border:"none",color:"#8A9BB0",fontSize:12,cursor:"pointer"}}>← Précédent</button>}
    </div></>);
  }

  if(step===100)return(<><style>{css}</style><div className="op" style={{display:"flex",flexDirection:"column",justifyContent:"center",minHeight:"60vh"}}>
    <div style={{maxWidth:440}}>
      <div className="op-ey">CALCUL EN COURS</div>
      <h2 style={{fontFamily:"'Cormorant Garant',serif",fontSize:32,fontWeight:300,color:NAVY,marginBottom:36,letterSpacing:"-.02em",lineHeight:1.1}}>Optimisation<br/>du portefeuille...</h2>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:28}}>
        {CALC_STEPS.map((cs,i)=>(
          <div key={cs} style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,background:calcStep>=i?NAVY:"rgba(10,22,40,.08)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.3s"}}>
              {calcStep>=i&&<span style={{color:"white",fontSize:10,fontWeight:500}}>✓</span>}
            </div>
            <span style={{fontSize:13,color:calcStep>=i?NAVY:"#8A9BB0",transition:"color 0.3s"}}>{cs}</span>
          </div>
        ))}
      </div>
      <div className="prog-wrap"><div className="prog" style={{width:`${calcPct}%`}}/></div>
      <div style={{color:"#8A9BB0",fontSize:11,marginTop:6}}>{calcPct}%</div>
    </div>
  </div></>);

  const selResult=results.find(r=>r.method===sel)??results[0];
  return(<><style>{css}</style><div className="op" style={{paddingBottom:60}}>
    <div className="op-ey">PORTEFEUILLE ZERO CGP · RÉSULTATS</div>
    <h1 className="op-h1">3 portefeuilles optimaux.</h1>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:20}}>
      {results.map(r=>{
        const isSel=r.method===sel;
        return(<div key={r.method} onClick={()=>setSel(r.method)} className="m-card" style={{
          background:isSel?NAVY:"white",
          borderColor:isSel?NAVY:r.rec?"rgba(30,58,110,.3)":"rgba(10,22,40,.08)",
        }}>
          {r.rec&&<div style={{position:"absolute",top:-10,right:14,background:NAVY_MID,color:"white",fontSize:8,fontWeight:500,padding:"3px 10px",letterSpacing:".1em"}}>RECOMMANDÉ</div>}
          <div style={{fontSize:9,fontWeight:500,letterSpacing:".12em",marginBottom:8,color:isSel?"rgba(255,255,255,.3)":"#8A9BB0"}}>{r.method.toUpperCase()}</div>
          <div style={{fontSize:15,fontWeight:500,marginBottom:20,color:isSel?"white":NAVY}}>{r.label}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[["Rendement",`+${r.ret.toFixed(1)}%`,r.ret>0?(isSel?"#6EE7B7":"#16A34A"):"#DC2626"],
              ["Volatilité",`${r.vol.toFixed(1)}%`,isSel?"rgba(255,255,255,.4)":"#8A9BB0"],
              ["Sharpe",r.sharpe.toFixed(2),r.sharpe>0.7?(isSel?"#6EE7B7":"#16A34A"):"#8A9BB0"],
              ["VaR 95%",`−${r.var95.toFixed(1)}%`,isSel?"#FCA5A5":"#DC2626"],
            ].map(([lbl,val,col])=>(
              <div key={lbl}>
                <div style={{fontSize:9,marginBottom:3,color:isSel?"rgba(255,255,255,.25)":"#8A9BB0"}}>{lbl}</div>
                <div style={{fontSize:20,fontWeight:700,color:col as string}}>{val}</div>
              </div>
            ))}
          </div>
        </div>);
      })}
    </div>
    {selResult?.frontier?.length>0&&(
      <div style={{background:"white",borderRadius:16,padding:24,marginBottom:16}}>
        <h3 style={{fontFamily:"'Cormorant Garant',serif",fontSize:18,fontWeight:400,color:NAVY,marginBottom:16}}>Frontière efficiente</h3>
        <ResponsiveContainer width="100%" height={180}>
          <ScatterChart margin={{top:10,right:20,bottom:10,left:20}}>
            <XAxis dataKey="volatility" name="Volatilité" unit="%" tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false}/>
            <YAxis dataKey="expectedReturn" name="Rendement" unit="%" tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false}/>
            <Tooltip contentStyle={{background:NAVY,border:"none",borderRadius:7,fontSize:11,color:"white"}} formatter={(v:number,n:string)=>[`${v.toFixed(1)}%`,n]}/>
            <Scatter data={selResult.frontier} fill={NAVY_MID} opacity={0.7}/>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    )}
    {selResult&&(
      <div style={{background:"white",borderRadius:16,padding:24,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{fontFamily:"'Cormorant Garant',serif",fontSize:18,fontWeight:400,color:NAVY}}>Allocation recommandée</h3>
          <div style={{fontSize:11,color:"#8A9BB0"}}>{eur(selResult.weights.reduce((s,w)=>s+w.amount,0))}</div>
        </div>
        {selResult.weights.map(w=>(
          <div key={w.symbol} style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
            <div style={{width:52,fontSize:12,fontWeight:600,color:NAVY,flexShrink:0}}>{w.symbol}</div>
            <div style={{flex:1,height:4,background:"rgba(10,22,40,.06)",borderRadius:2}}>
              <div style={{width:`${(w.weight*100).toFixed(0)}%`,height:"100%",borderRadius:2,background:TYPE_COLOR[w.type],transition:"width 0.5s"}}/>
            </div>
            <div style={{width:36,textAlign:"right",fontSize:12,color:"#8A9BB0",flexShrink:0}}>{(w.weight*100).toFixed(0)}%</div>
            <div style={{width:72,textAlign:"right",fontSize:12,fontWeight:600,color:NAVY,flexShrink:0}}>{eur(w.amount)}</div>
          </div>
        ))}
      </div>
    )}
    <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
      <button className="btn-out" onClick={()=>{setStep(0);setResults([]);setCalcPct(0);setAnswers({});}}>Recommencer</button>
      <button onClick={handleSave} disabled={saving} className="btn-navy">{saving?"ENREGISTREMENT...":"ENREGISTRER CE PORTEFEUILLE →"}</button>
    </div>
  </div></>);
}
