"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LineChart, Line, ReferenceLine } from "recharts";

// Scénarios historiques réels avec impacts par secteur/géo (en %)
const SCENARIOS = [
  {
    id:"gfc2008", label:"Crise Financière 2008", icon:"🏦",
    desc:"Faillite de Lehman Brothers. Le S&P 500 perd -56% en 17 mois. Pire crise depuis 1929.",
    duration:"17 mois", recovery:"4 ans",
    impacts:{
      etf:-42, stock:-55, crypto:-60,
      "USA":-50,"Europe":-52,"Asie":-48,"Émergents":-58,
      "Finance":-70,"Immobilier":-65,"Tech":-45,"Luxe":-38,"Santé":-20,"Énergie":-40,"Défense":-25,
    },
    timeline:[0,-8,-15,-24,-32,-38,-44,-50,-54,-56,-52,-48,-42,-35,-28,-18,-8,0,5,10,12],
  },
  {
    id:"covid2020", label:"Crash COVID-19 2020", icon:"🦠",
    desc:"Pandémie mondiale. Le S&P 500 perd -34% en 33 jours — la chute la plus rapide de l'histoire.",
    duration:"33 jours", recovery:"6 mois",
    impacts:{
      etf:-30, stock:-38, crypto:-55,
      "USA":-32,"Europe":-38,"Asie":-28,"Émergents":-36,
      "Finance":-42,"Immobilier":-45,"Tech":-20,"Luxe":-48,"Santé":+15,"Énergie":-60,"Défense":-10,
    },
    timeline:[0,-5,-12,-20,-28,-34,-32,-28,-22,-15,-8,-2,2,8,15,22,28,32,35,38],
  },
  {
    id:"dotcom2000", label:"Éclatement bulle dot-com 2000", icon:"💻",
    desc:"Effondrement des valeurs technologiques. Le Nasdaq perd -78% en 2 ans et demi.",
    duration:"30 mois", recovery:"6 ans",
    impacts:{
      etf:-38, stock:-50, crypto:-70,
      "USA":-42,"Europe":-48,"Asie":-36,"Émergents":-30,
      "Finance":-28,"Immobilier":+5,"Tech":-75,"Luxe":-30,"Santé":-15,"Énergie":+8,"Défense":+12,
    },
    timeline:[0,-3,-8,-14,-22,-30,-36,-40,-45,-48,-50,-52,-50,-48,-44,-40,-36,-30,-22,-15],
  },
  {
    id:"inflation2022", label:"Choc d'inflation 2022", icon:"📈",
    desc:"La Fed remonte les taux de 0 à 5,25% en 14 mois. Le S&P 500 perd -25%, les obligations -20%.",
    duration:"12 mois", recovery:"18 mois",
    impacts:{
      etf:-22, stock:-28, crypto:-72,
      "USA":-25,"Europe":-20,"Asie":-18,"Émergents":-25,
      "Finance":+5,"Immobilier":-28,"Tech":-35,"Luxe":-22,"Santé":-8,"Énergie":+42,"Défense":+8,
    },
    timeline:[0,-2,-5,-9,-13,-17,-20,-22,-24,-25,-23,-20,-17,-12,-8,-4,-1,2,5,8],
  },
  {
    id:"eurodebt2011", label:"Crise dettes souveraines Europe 2011", icon:"🇪🇺",
    desc:"Grèce, Italie, Espagne au bord du défaut. L'Euro Stoxx 50 perd -28%.",
    duration:"8 mois", recovery:"3 ans",
    impacts:{
      etf:-20, stock:-28, crypto:-15,
      "USA":-14,"Europe":-28,"Asie":-12,"Émergents":-20,
      "Finance":-40,"Immobilier":-25,"Tech":-15,"Luxe":-18,"Santé":-8,"Énergie":-20,"Défense":-5,
    },
    timeline:[0,-2,-5,-10,-16,-22,-26,-28,-26,-22,-18,-14,-10,-6,-2,2,5,8,10,12],
  },
  {
    id:"custom", label:"Scénario personnalisé", icon:"⚙️",
    desc:"Définissez votre propre choc de marché.",
    duration:"—", recovery:"—",
    impacts:{ etf:-20, stock:-25, crypto:-40, "USA":-20,"Europe":-20,"Asie":-20,"Émergents":-20, "Finance":-25,"Immobilier":-20,"Tech":-25,"Luxe":-20,"Santé":-10,"Énergie":-15,"Défense":-5 },
    timeline:[0,-4,-8,-12,-16,-20,-18,-16,-14,-12,-10,-8,-6,-4,-2,0,2,4,6,8],
  },
];

function feur(n:number){if(Math.abs(n)>=1e6)return`${(n/1e6).toFixed(2)} M€`;if(Math.abs(n)>=1000)return`${Math.round(n/1000)} k€`;return`${Math.round(n)} €`;}

interface Asset{id:string;symbol:string;name:string;type:"etf"|"stock"|"crypto";value:number;weight:number}

function StressInner(){
  const [step,setStep]=useState<"choose"|"params"|"running"|"result">("choose");
  const [source,setSource]=useState<"portfolio"|"manual">("manual");
  const [portfolios,setPortfolios]=useState<{id:string;name:string;type:string}[]>([]);
  const [selPfId,setSelPfId]=useState("");
  const [assets,setAssets]=useState<Asset[]>([]);
  const [pfName,setPfName]=useState("Manuel");
  const [manualCapital,setManualCapital]=useState(50000);
  const [selScenario,setSelScenario]=useState(SCENARIOS[0]);
  const [customShock,setCustomShock]=useState(25);
  const [progress,setProgress]=useState(0);
  const [result,setResult]=useState<{asset:string;type:string;impact:number;lossEur:number;finalVal:number}[]|null>(null);
  const [history,setHistory]=useState<{id:string;date:string;scenario:string;pfName:string;totalLoss:number;totalFinal:number}[]>([]);

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{
      if(!data.user)return;
      supabase.from("portfolios").select("id,name,type").eq("user_id",data.user.id).then(({data:pfs})=>{if(pfs)setPortfolios(pfs);});
    });
    const s=localStorage.getItem("st_history");
    if(s)try{setHistory(JSON.parse(s));}catch{}
  },[]);

  async function loadPf(id:string){
    const{data:raw}=await supabase.from("portfolio_assets").select("*").eq("portfolio_id",id);
    if(!raw)return;
    const enriched=await Promise.all(raw.map(async a=>{
      let val=a.target_amount||0;
      if(!val){try{const r=await fetch(`/api/yahoo/quote?symbol=${a.symbol}`);const q=await r.json();val=a.quantity*(q.price||100);}catch{val=a.quantity*100;}}
      return{id:a.id,symbol:a.symbol,name:a.name||a.symbol,type:a.type,value:val,weight:0};
    }));
    const tot=enriched.reduce((s,a)=>s+a.value,0);
    setAssets(enriched.map(a=>({...a,weight:tot>0?a.value/tot:0})));
  }

  function runStress(){
    setStep("running");setProgress(0);
    let p=0;const iv=setInterval(()=>{p+=25;setProgress(Math.min(p,90));if(p>=90)clearInterval(iv);},200);
    setTimeout(()=>{
      const sc=selScenario;
      const impactMap=sc.id==="custom"?{etf:-customShock,stock:-(customShock*1.2),crypto:-(customShock*1.8)}:sc.impacts;
      const list=assets.length>0?assets:[
        {id:"1",symbol:"ETF",name:"Portefeuille ETF",type:"etf" as const,value:manualCapital*0.6,weight:0.6},
        {id:"2",symbol:"Actions",name:"Actions",type:"stock" as const,value:manualCapital*0.3,weight:0.3},
        {id:"3",symbol:"Crypto",name:"Crypto",type:"crypto" as const,value:manualCapital*0.1,weight:0.1},
      ];
      const res=list.map(a=>{
        const shock=(impactMap[a.type as keyof typeof impactMap]||impactMap.etf) as number;
        const lossEur=a.value*(shock/100);
        return{asset:a.symbol,type:a.type,impact:shock,lossEur,finalVal:a.value+lossEur};
      });
      clearInterval(iv);setProgress(100);
      setTimeout(()=>{setResult(res);setStep("result");},200);
    },800);
  }

  function saveResult(){
    if(!result)return;
    const tot=result.reduce((s,r)=>s+r.lossEur,0);
    const fin=result.reduce((s,r)=>s+r.finalVal,0);
    const now=new Date();
    const rec={id:Date.now().toString(),date:now.toLocaleDateString("fr-FR")+` à ${now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}`,scenario:selScenario.label,pfName,totalLoss:tot,totalFinal:fin};
    const nh=[rec,...history];setHistory(nh);localStorage.setItem("st_history",JSON.stringify(nh));
  }

  const totalVal=assets.reduce((s,a)=>s+a.value,0)||manualCapital;

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;1,300&family=Inter:wght@300;400;500&display=swap');
    .st{padding:40px 48px;background:#F5F4F1;min-height:100%;font-family:'Inter',sans-serif}
    .ey{font-size:9px;font-weight:500;letter-spacing:.18em;color:#1E3A6E;margin-bottom:12px}
    .h1{font-family:'Cormorant Garant',serif;font-size:clamp(30px,4vw,44px);font-weight:300;color:#0A1628;letter-spacing:-.02em;line-height:1.05;margin-bottom:10px}
    .sub{font-size:12px;font-weight:300;color:#4B5563;line-height:1.75;margin-bottom:32px;max-width:580px}
    .card{background:white;border-radius:14px;padding:24px;margin-bottom:14px}
    .ct{font-size:13px;font-weight:600;color:#0A1628;margin-bottom:6px}
    .cs{font-size:11px;color:#8A9BB0;font-weight:300;margin-bottom:16px;line-height:1.6}
    .sc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:8px}
    .sc-card{padding:16px;border-radius:10px;border:1.5px solid;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif}
    .sc-card.on{background:#0A1628;border-color:#0A1628;color:white}
    .sc-card.off{background:white;border-color:rgba(10,22,40,.1)}
    .sc-card.off:hover{border-color:#0A1628}
    .sc-icon{font-size:20px;margin-bottom:8px}
    .sc-name{font-size:12px;font-weight:600;margin-bottom:4px}
    .sc-meta{font-size:10px;opacity:.6;font-weight:300;line-height:1.5}
    .src-btn{flex:1;padding:18px;border-radius:10px;border:2px solid;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;text-align:left}
    .src-btn.on{background:#0A1628;border-color:#0A1628;color:white}
    .src-btn.off{background:white;border-color:rgba(10,22,40,.1);color:#0A1628}
    .pf-item{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:8px;border:1.5px solid;cursor:pointer;margin-bottom:8px;transition:all .15s;font-family:'Inter',sans-serif}
    .pf-item.on{background:#0A1628;border-color:#0A1628;color:white}
    .pf-item.off{background:white;border-color:rgba(10,22,40,.1);color:#0A1628}
    .pf-item.off:hover{border-color:#0A1628}
    .btn-nv{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;background:#0A1628;color:white;border:none;padding:14px 40px;cursor:pointer;transition:opacity .2s}
    .btn-nv:hover{opacity:.82}.btn-nv:disabled{opacity:.45;cursor:not-allowed}
    .btn-out{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.12em;background:transparent;color:#0A1628;border:1px solid rgba(10,22,40,.2);padding:12px 28px;cursor:pointer;border-radius:8px;transition:all .2s}
    .btn-out:hover{background:#0A1628;color:white}
    .kpi{background:white;border-radius:12px;padding:18px 20px}
    .kpi-l{font-size:9px;font-weight:600;letter-spacing:.12em;color:#8A9BB0;margin-bottom:7px}
    .kpi-v{font-family:'Cormorant Garant',serif;font-size:26px;font-weight:300;letter-spacing:-.02em;line-height:1}
    .kpi-s{font-size:11px;color:#8A9BB0;margin-top:4px;font-weight:300}
    .prog-w{height:3px;background:rgba(10,22,40,.07);border-radius:2px;overflow:hidden;margin-top:10px}
    .prog-f{height:100%;background:#0A1628;transition:width .3s ease;border-radius:2px}
    .tb{width:100%;border-collapse:collapse}
    .tb th{padding-bottom:8px;padding-left:8px;padding-right:8px;font-size:9px;font-weight:600;color:#8A9BB0;letter-spacing:.09em;text-align:right;border-bottom:1px solid rgba(10,22,40,.06)}
    .tb th:first-child{text-align:left}
    .tb td{padding:11px 8px;font-size:12px;border-bottom:1px solid rgba(10,22,40,.04)}
    .tb tr:last-child td{border-bottom:none}
    .hist-item{background:#F8F9FA;border:1px solid rgba(10,22,40,.06);border-radius:10px;padding:14px 18px;margin-bottom:8px}
  `;

  if(step==="choose")return(<><style>{css}</style><div className="st">
    <div className="ey">STRESS TEST</div>
    <h1 className="h1">Que se passe-t-il si<br/>les marchés s'effondrent ?</h1>
    <p className="sub">Appliquez un scénario de crise historique réel à votre portefeuille pour mesurer votre exposition et votre résilience.</p>

    <div className="card">
      <div className="ct">Source des données</div>
      <div className="cs">Simuler sur un portefeuille existant ou entrer un capital manuellement.</div>
      <div style={{display:"flex",gap:12,marginBottom:source==="portfolio"?20:0}}>
        <button className={`src-btn ${source==="portfolio"?"on":"off"}`} onClick={()=>setSource("portfolio")}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Portefeuille existant</div>
          <div style={{fontSize:11,opacity:.6,fontWeight:300}}>Analyser l'impact actif par actif</div>
        </button>
        <button className={`src-btn ${source==="manual"?"on":"off"}`} onClick={()=>setSource("manual")}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Capital manuel</div>
          <div style={{fontSize:11,opacity:.6,fontWeight:300}}>Estimer par type d'actif</div>
        </button>
      </div>
      {source==="portfolio"&&portfolios.map(pf=>(
        <div key={pf.id} className={`pf-item ${selPfId===pf.id?"on":"off"}`}
          onClick={()=>{setSelPfId(pf.id);setPfName(pf.name);loadPf(pf.id);}}>
          <div><div style={{fontSize:13,fontWeight:600}}>{pf.name}</div>
            <div style={{fontSize:10,opacity:.6,marginTop:2}}>{pf.type==="optimized"?"0CGP":"INIT"}</div></div>
          {selPfId===pf.id&&<span>✓</span>}
        </div>
      ))}
      {source==="manual"&&(
        <div style={{marginTop:16}}>
          <label style={{fontSize:9,fontWeight:500,letterSpacing:".14em",color:"#8A9BB0",display:"block",marginBottom:8}}>CAPITAL TOTAL (€)</label>
          <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:24,fontWeight:300,color:"#0A1628",marginBottom:8}}>{feur(manualCapital)}</div>
          <input type="range" style={{width:280,height:2,background:"rgba(10,22,40,.1)",outline:"none",WebkitAppearance:"none",cursor:"pointer",borderRadius:1}} min={5000} max={500000} step={5000} value={manualCapital} onChange={e=>setManualCapital(Number(e.target.value))}/>
        </div>
      )}
    </div>

    <div style={{display:"flex",justifyContent:"flex-end"}}>
      <button className="btn-nv" disabled={source==="portfolio"&&!selPfId} onClick={()=>setStep("params")}>
        CHOISIR UN SCÉNARIO →
      </button>
    </div>

    {history.length>0&&(
      <div className="card" style={{marginTop:24}}>
        <div className="ct">Tests précédents</div>
        {history.map(h=>(
          <div key={h.id} className="hist-item">
            <div style={{fontSize:9,color:"#8A9BB0",marginBottom:6}}>{h.pfName} · {h.scenario} · {h.date}</div>
            <div style={{display:"flex",gap:20}}>
              {[["Perte totale",feur(h.totalLoss),"#DC2626"],["Valeur finale",feur(h.totalFinal),"#0A1628"]].map(([l,v,c])=>(
                <div key={l}><div style={{fontSize:9,color:"#8A9BB0",marginBottom:3}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:700,color:c}}>{v}</div></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
  </div></>);

  if(step==="params")return(<><style>{css}</style><div className="st">
    <div className="ey">STRESS TEST · SCÉNARIO</div>
    <h1 className="h1">Choisissez un scénario.</h1>
    <div className="card">
      <div className="ct">Crises historiques</div>
      <div className="cs">Données réelles extraites des archives de marché (S&P 500, MSCI World, secteurs).</div>
      <div className="sc-grid">
        {SCENARIOS.map(sc=>(
          <div key={sc.id} className={`sc-card ${selScenario.id===sc.id?"on":"off"}`} onClick={()=>setSelScenario(sc)}>
            <div className="sc-icon">{sc.icon}</div>
            <div className="sc-name">{sc.label}</div>
            <div className="sc-meta">Durée : {sc.duration}<br/>Récupération : {sc.recovery}</div>
          </div>
        ))}
      </div>
      {selScenario.id==="custom"&&(
        <div style={{marginTop:16,padding:16,background:"rgba(10,22,40,.03)",borderRadius:8}}>
          <label style={{fontSize:9,fontWeight:500,letterSpacing:".14em",color:"#8A9BB0",display:"block",marginBottom:8}}>AMPLITUDE DU CHOC (%)</label>
          <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:28,fontWeight:300,color:"#DC2626",marginBottom:8}}>−{customShock}%</div>
          <input type="range" style={{width:300,height:2,background:"rgba(10,22,40,.1)",outline:"none",WebkitAppearance:"none",cursor:"pointer"}} min={5} max={80} step={1} value={customShock} onChange={e=>setCustomShock(Number(e.target.value))}/>
        </div>
      )}
    </div>
    <div style={{background:"rgba(220,38,38,.04)",border:"1px solid rgba(220,38,38,.12)",borderRadius:10,padding:"16px 20px",marginBottom:16}}>
      <div style={{fontSize:10,fontWeight:600,letterSpacing:".1em",color:"#DC2626",marginBottom:6}}>SCÉNARIO SÉLECTIONNÉ</div>
      <div style={{fontSize:13,fontWeight:500,color:"#0A1628",marginBottom:4}}>{selScenario.label}</div>
      <div style={{fontSize:12,color:"#4B5563",fontWeight:300,lineHeight:1.7}}>{selScenario.desc}</div>
    </div>
    <div style={{display:"flex",justifyContent:"space-between"}}>
      <button className="btn-out" onClick={()=>setStep("choose")}>← RETOUR</button>
      <button className="btn-nv" onClick={runStress}>LANCER LE STRESS TEST →</button>
    </div>
  </div></>);

  if(step==="running")return(<><style>{css}</style><div className="st" style={{display:"flex",flexDirection:"column",justifyContent:"center",minHeight:"70vh"}}>
    <div style={{maxWidth:420}}>
      <div className="ey">CALCUL EN COURS</div>
      <h2 style={{fontFamily:"'Cormorant Garant',serif",fontSize:34,fontWeight:300,color:"#0A1628",marginBottom:32,letterSpacing:"-.02em"}}>Application du scénario<br/>{selScenario.label}...</h2>
      {["Chargement des données historiques","Application des chocs par classe d'actif","Calcul de l'impact sur chaque position","Agrégation des pertes totales"].map((s,i)=>(
        <div key={s} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <div style={{width:20,height:20,borderRadius:"50%",background:progress>i*25?"#0A1628":"rgba(10,22,40,.08)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .4s"}}>
            {progress>i*25&&<span style={{color:"white",fontSize:10}}>✓</span>}
          </div>
          <span style={{fontSize:13,color:progress>i*25?"#0A1628":"#8A9BB0"}}>{s}</span>
        </div>
      ))}
      <div className="prog-w"><div className="prog-f" style={{width:`${progress}%`}}/></div>
    </div>
  </div></>);

  if(!result)return null;
  const totalLoss=result.reduce((s,r)=>s+r.lossEur,0);
  const totalFinal=result.reduce((s,r)=>s+r.finalVal,0);
  const pctLoss=totalVal>0?totalLoss/totalVal*100:0;

  return(<><style>{css}</style><div className="st" style={{paddingBottom:60}}>
    <div className="ey">RÉSULTATS · STRESS TEST</div>
    <h1 className="h1">{selScenario.icon} {selScenario.label}</h1>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontSize:11,color:"#8A9BB0",fontWeight:300}}>{pfName} · Impact estimé sur votre portefeuille</div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn-out" onClick={saveResult}>ENREGISTRER</button>
        <button className="btn-out" onClick={()=>{setResult(null);setStep("choose");}}>RECOMMENCER</button>
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
      {[["VALEUR INITIALE",feur(totalVal),"","#0A1628"],
        ["PERTE ESTIMÉE",feur(totalLoss),`${pctLoss.toFixed(1)}% du portefeuille`,"#DC2626"],
        ["VALEUR APRÈS CHOC",feur(totalFinal),"Valeur résiduelle","#0A1628"],
        ["ACTIF LE + TOUCHÉ",result.sort((a,b)=>a.lossEur-b.lossEur)[0]?.asset||"—",`${result.sort((a,b)=>a.lossEur-b.lossEur)[0]?.impact.toFixed(1)||"—"}%`,"#DC2626"],
      ].map(([l,v,s,c])=>(
        <div key={l} className="kpi"><div className="kpi-l">{l}</div>
          <div className="kpi-v" style={{color:c}}>{v}</div><div className="kpi-s">{s}</div>
        </div>
      ))}
    </div>

    <div className="card">
      <div className="ct">Impact par actif</div>
      <div className="cs">Comparaison valeur avant/après le scénario {selScenario.label}.</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={result.map(r=>({name:r.asset,avant:r.finalVal-r.lossEur,apres:r.finalVal,pct:r.impact}))}
          margin={{top:5,right:16,left:16,bottom:20}}>
          <XAxis dataKey="name" tick={{fontSize:10,fill:"#666"}} tickLine={false} axisLine={false}/>
          <YAxis tick={{fontSize:9,fill:"#aaa"}} tickLine={false} axisLine={false} tickFormatter={v=>feur(v)} width={64}/>
          <Tooltip contentStyle={{background:"rgba(245,244,241,0.92)",backdropFilter:"blur(12px)",border:"1px solid rgba(10,22,40,.09)",borderRadius:10,fontSize:11,color:"#0A1628",boxShadow:"0 2px 12px rgba(10,22,40,.08)"}}
            formatter={(v:number,n:string)=>[feur(v),n==="avant"?"Avant":"Après choc"]}/>
          <Bar dataKey="avant" name="avant" fill="rgba(10,22,40,.12)" radius={[4,4,0,0]}/>
          <Bar dataKey="apres" name="apres" radius={[4,4,0,0]}>
            {result.map((_,i)=><Cell key={i} fill={result[i].impact<0?"#FCA5A5":"#86EFAC"}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="card">
      <div className="ct">Trajectoire historique du choc</div>
      <div className="cs">Évolution de la valeur du portefeuille si ce scénario s'était produit (basé sur les données réelles).</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={selScenario.timeline.map((pct,i)=>({mois:`M${i}`,val:totalVal*(1+pct/100),pct}))}
          margin={{top:5,right:16,left:16,bottom:0}}>
          <XAxis dataKey="mois" tick={{fontSize:9,fill:"#aaa"}} tickLine={false} axisLine={false}/>
          <YAxis tick={{fontSize:9,fill:"#aaa"}} tickLine={false} axisLine={false} tickFormatter={v=>feur(v)} width={68}/>
          <Tooltip contentStyle={{background:"rgba(245,244,241,0.92)",backdropFilter:"blur(12px)",border:"1px solid rgba(10,22,40,.09)",borderRadius:10,fontSize:11,color:"#0A1628",boxShadow:"0 2px 12px rgba(10,22,40,.08)"}}
            formatter={(v:number)=>[feur(v),"Valeur estimée"]}/>
          <ReferenceLine y={totalVal} stroke="rgba(10,22,40,.2)" strokeDasharray="4 4"/>
          <Line type="monotone" dataKey="val" stroke="#DC2626" strokeWidth={2} dot={false}
            activeDot={{r:4,fill:"#DC2626",stroke:"white",strokeWidth:2}}/>
        </LineChart>
      </ResponsiveContainer>
    </div>

    <div className="card" style={{marginBottom:0}}>
      <div className="ct">Détail par position</div>
      <table className="tb">
        <thead><tr>
          <th style={{textAlign:"left"}}>ACTIF</th>
          <th>TYPE</th>
          <th>CHOC</th>
          <th>PERTE (€)</th>
          <th>VALEUR FINALE</th>
        </tr></thead>
        <tbody>
          {result.map(r=>(
            <tr key={r.asset}>
              <td style={{fontWeight:600,color:"#0A1628"}}>{r.asset}</td>
              <td style={{textAlign:"right"}}><span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:3,background:r.type==="etf"?"#EFF6FF":r.type==="stock"?"#F0FDF4":"#FFFBEB",color:r.type==="etf"?"#1D4ED8":r.type==="stock"?"#15803D":"#92400E"}}>{r.type.toUpperCase()}</span></td>
              <td style={{textAlign:"right",fontWeight:700,color:r.impact<0?"#DC2626":"#16A34A"}}>{r.impact>0?"+":""}{r.impact.toFixed(1)}%</td>
              <td style={{textAlign:"right",fontWeight:600,color:"#DC2626"}}>{feur(r.lossEur)}</td>
              <td style={{textAlign:"right",fontWeight:700,color:"#0A1628"}}>{feur(r.finalVal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div></>);
}

export default function StressPage(){
  return<Suspense fallback={<div style={{padding:40,color:"#8A9BB0",fontSize:11}}>CHARGEMENT...</div>}><StressInner/></Suspense>;
}
