"use client";
import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ReferenceLine, BarChart, Bar, Cell } from "recharts";

const NAVY="#0A1628"; const NM="#1E3A6E";
function feur(n:number){if(n>=1e6)return`${(n/1e6).toFixed(2)} M€`;if(n>=1000)return`${Math.round(n/1000)} k€`;return`${Math.round(n)} €`;}
function randn(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

function runMC(capital:number,years:number,ret:number,vol:number,nSim=1000){
  const drift=(ret-.5*vol*vol);const sigma=vol;
  const paths=Array.from({length:nSim},()=>{
    const p=[capital];
    for(let y=1;y<=years;y++)p.push(p[y-1]*Math.exp(drift+sigma*randn()));
    return p;
  });
  const chart=Array.from({length:years+1},(_,y)=>{
    const v=[...paths.map(p=>p[y])].sort((a,b)=>a-b);
    const pc=(p:number)=>v[Math.floor(p*(nSim-1))];
    return{year:y,p10:pc(.1),p25:pc(.25),p50:pc(.5),p75:pc(.75),p90:pc(.9)};
  });
  const fv=[...paths.map(p=>p[years])].sort((a,b)=>a-b);
  const pc=(p:number)=>fv[Math.floor(p*(nSim-1))];
  return{chart,finalValues:fv,probPos:fv.filter(v=>v>capital).length/nSim,probDbl:fv.filter(v=>v>=capital*2).length/nSim,probHalf:fv.filter(v=>v<capital/2).length/nSim,p10:pc(.1),p50:pc(.5),p90:pc(.9),worstCase:fv[0],bestCase:fv[nSim-1]};
}

function buildHist(vals:number[],bins=26){
  const min=vals[0],max=vals[vals.length-1],step=(max-min)/bins;
  const h=Array.from({length:bins},(_,i)=>({x:min+i*step+step/2,pct:0}));
  vals.forEach(v=>{const i=Math.min(Math.floor((v-min)/step),bins-1);h[i].pct+=100/vals.length;});
  return h;
}

const PRESETS=[{l:"Prudent",r:5,v:8},{l:"Équilibré",r:8,v:15},{l:"Dynamique",r:11,v:20},{l:"Agressif",r:15,v:28}];

function FanTip({active,payload,label}:{active?:boolean;payload?:{value:number;name:string}[];label?:number}){
  if(!active||!payload?.length)return null;
  const g=(n:string)=>payload.find(p=>p.name===n)?.value??0;
  return<div style={{background:NAVY,borderRadius:8,padding:"12px 16px",boxShadow:"0 4px 20px rgba(0,0,0,.25)"}}>
    <div style={{color:"rgba(255,255,255,.4)",fontSize:10,marginBottom:8}}>AN {label}</div>
    {[["90e pct.","p90","#4ADE80"],["Médiane","p50","white"],["10e pct.","p10","#F87171"]].map(([l,k,c])=>(
      <div key={k} style={{display:"flex",justifyContent:"space-between",gap:16,marginBottom:3}}>
        <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{l}</span>
        <span style={{fontSize:11,fontWeight:600,color:c}}>{feur(g(k))}</span>
      </div>
    ))}
  </div>;
}

interface SimRecord{id:string;date:string;capital:number;years:number;ret:number;vol:number;pfName:string;p10:number;p50:number;p90:number;probPos:number}

function MonteCarloInner(){
  const searchParams=useSearchParams();
  const [step,setStep]=useState<"choose"|"params"|"running"|"result">("choose");
  const [source,setSource]=useState<"portfolio"|"manual">("manual");
  const [portfolios,setPortfolios]=useState<{id:string;name:string;type:string;capital?:number}[]>([]);
  const [selPfId,setSelPfId]=useState("");
  const [capital,setCapital]=useState(50000);
  const [years,setYears]=useState(20);
  const [retPct,setRetPct]=useState(8);
  const [volPct,setVolPct]=useState(15);
  const [progress,setProgress]=useState(0);
  const [result,setResult]=useState<ReturnType<typeof runMC>|null>(null);
  const [hist,setHist]=useState<ReturnType<typeof buildHist>>([]);
  const [history,setHistory]=useState<SimRecord[]>([]);
  const [pfName,setPfName]=useState("Manuel");

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{
      if(!data.user)return;
      supabase.from("portfolios").select("id,name,type").eq("user_id",data.user.id).then(({data:pfs})=>{
        if(pfs)setPortfolios(pfs);
      });
    });
    const saved=localStorage.getItem("mc_history");
    if(saved)try{setHistory(JSON.parse(saved));}catch{}
  },[]);

  async function loadPfCapital(id:string){
    const{data:assets}=await supabase.from("portfolio_assets").select("quantity,target_amount").eq("portfolio_id",id);
    const pf=portfolios.find(p=>p.id===id);
    if(!assets)return;
    // Pour les portefeuilles optimisés on somme target_amount, sinon on utilise une valeur estimée
    const cap=assets.reduce((s:number,a:{quantity:number;target_amount?:number})=>s+(a.target_amount||a.quantity*100),0);
    setCapital(Math.round(cap)||50000);
    setPfName(pf?.name??"Portefeuille");
  }

  function startCalc(){
    setStep("running");setProgress(0);
    let p=0;const iv=setInterval(()=>{p+=20;setProgress(Math.min(p,92));if(p>=92)clearInterval(iv);},180);
    setTimeout(()=>{
      const r=runMC(capital,years,retPct/100,volPct/100,1000);
      setResult(r);setHist(buildHist(r.finalValues,26));
      clearInterval(iv);setProgress(100);
      setTimeout(()=>setStep("result"),200);
    },900);
  }

  function saveResult(){
    if(!result)return;
    const now=new Date();
    const rec:SimRecord={
      id:Date.now().toString(),
      date:now.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"})+" à "+now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),
      capital,years,ret:retPct,vol:volPct,pfName,
      p10:result.p10,p50:result.p50,p90:result.p90,probPos:result.probPos,
    };
    const newHistory=[rec,...history];
    setHistory(newHistory);
    localStorage.setItem("mc_history",JSON.stringify(newHistory));
  }

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;1,300&family=Inter:wght@300;400;500&display=swap');
    .mc{padding:40px 48px;background:#F5F4F1;min-height:100%;font-family:'Inter',sans-serif}
    .ey{font-size:9px;font-weight:500;letter-spacing:.18em;color:#1E3A6E;margin-bottom:12px}
    .h1{font-family:'Cormorant Garant',serif;font-size:clamp(30px,4vw,44px);font-weight:300;color:#0A1628;letter-spacing:-.02em;line-height:1.05;margin-bottom:10px}
    .sub{font-size:12px;font-weight:300;color:#4B5563;line-height:1.75;margin-bottom:32px;max-width:580px}
    .card{background:white;border-radius:14px;padding:24px;margin-bottom:14px}
    .ct{font-size:13px;font-weight:600;color:#0A1628;margin-bottom:6px}
    .cs{font-size:11px;color:#8A9BB0;font-weight:300;margin-bottom:16px;line-height:1.6}
    .src-btn{flex:1;padding:20px;border-radius:10px;border:2px solid;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;text-align:left}
    .src-btn.on{background:#0A1628;border-color:#0A1628;color:white}
    .src-btn.off{background:white;border-color:rgba(10,22,40,.1);color:#0A1628}
    .src-btn.off:hover{border-color:#0A1628}
    .pf-item{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:8px;border:1.5px solid;cursor:pointer;margin-bottom:8px;transition:all .15s;font-family:'Inter',sans-serif}
    .pf-item.on{background:#0A1628;border-color:#0A1628;color:white}
    .pf-item.off{background:white;border-color:rgba(10,22,40,.1);color:#0A1628}
    .pf-item.off:hover{border-color:#0A1628}
    .preset{padding:10px 16px;border-radius:8px;border:1.5px solid;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;text-align:center}
    .preset.on{background:#0A1628;border-color:#0A1628;color:white}
    .preset.off{background:white;border-color:rgba(10,22,40,.1);color:#0A1628}
    .sld-lbl{font-size:9px;font-weight:500;letter-spacing:.14em;color:#8A9BB0;display:block;margin-bottom:7px}
    .sld-val{font-family:'Cormorant Garant',serif;font-size:24px;font-weight:300;color:#0A1628;margin-bottom:8px}
    input[type=range]{width:100%;height:2px;background:rgba(10,22,40,.1);outline:none;-webkit-appearance:none;cursor:pointer;border-radius:1px}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#0A1628;cursor:pointer;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.2)}
    .btn-nv{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;background:#0A1628;color:white;border:none;padding:14px 40px;cursor:pointer;transition:opacity .2s;border-radius:0}
    .btn-nv:hover{opacity:.82}.btn-nv:disabled{opacity:.45;cursor:not-allowed}
    .btn-out{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.12em;background:transparent;color:#0A1628;border:1px solid rgba(10,22,40,.2);padding:12px 28px;cursor:pointer;border-radius:8px;transition:all .2s}
    .btn-out:hover{background:#0A1628;color:white}
    .prog-w{height:3px;background:rgba(10,22,40,.07);border-radius:2px;overflow:hidden;margin-top:10px}
    .prog-f{height:100%;background:#0A1628;transition:width .3s ease;border-radius:2px}
    .stat4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}
    .stat3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}
    .sc{background:white;border-radius:12px;padding:18px 20px}
    .sl{font-size:9px;font-weight:600;letter-spacing:.12em;color:#8A9BB0;margin-bottom:7px}
    .sv{font-family:'Cormorant Garant',serif;font-size:26px;font-weight:300;letter-spacing:-.02em;line-height:1}
    .ss{font-size:11px;color:#8A9BB0;margin-top:4px;font-weight:300}
    .prob-row{display:flex;align-items:center;gap:12px;margin-bottom:10px}
    .pb{flex:1;height:6px;background:rgba(10,22,40,.07);border-radius:3px;overflow:hidden}
    .pf{height:100%;border-radius:3px;transition:width .8s cubic-bezier(.4,0,.2,1)}
    .hist-item{background:#F8F9FA;border:1px solid rgba(10,22,40,.06);border-radius:10px;padding:16px 20px;margin-bottom:8px}
    .hist-date{font-size:9px;color:#8A9BB0;margin-bottom:8px;letter-spacing:.06em}
    .hist-vals{display:flex;gap:20px}
    .hv{text-align:center}
    .hvl{font-size:9px;color:#8A9BB0;margin-bottom:3px}
    .hvv{font-size:14px;font-weight:600;color:#0A1628}
  `;

  if(step==="choose")return(<><style>{css}</style><div className="mc">
    <div className="ey">SIMULATION · MONTE CARLO</div>
    <h1 className="h1">1 000 futurs possibles<br/>de votre portefeuille.</h1>
    <p className="sub">Simulez des milliers de trajectoires de marché pour estimer votre patrimoine futur dans le pire cas, le cas médian, et le meilleur cas.</p>
    <div className="card">
      <div className="ct">Source des données</div>
      <div className="cs">Choisissez de simuler sur un portefeuille existant ou d'entrer des paramètres manuellement.</div>
      <div style={{display:"flex",gap:12,marginBottom:24}}>
        <button className={`src-btn ${source==="portfolio"?"on":"off"}`} onClick={()=>setSource("portfolio")}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Portefeuille existant</div>
          <div style={{fontSize:11,opacity:.6,fontWeight:300}}>Utiliser la valeur et le profil d'un de vos portefeuilles</div>
        </button>
        <button className={`src-btn ${source==="manual"?"on":"off"}`} onClick={()=>setSource("manual")}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Paramètres manuels</div>
          <div style={{fontSize:11,opacity:.6,fontWeight:300}}>Saisir capital, rendement et volatilité librement</div>
        </button>
      </div>
      {source==="portfolio"&&portfolios.length>0&&(
        <div>
          <div style={{fontSize:10,fontWeight:500,letterSpacing:".1em",color:"#8A9BB0",marginBottom:10}}>SÉLECTIONNEZ UN PORTEFEUILLE</div>
          {portfolios.map(pf=>(
            <div key={pf.id} className={`pf-item ${selPfId===pf.id?"on":"off"}`}
              onClick={()=>{setSelPfId(pf.id);setPfName(pf.name);loadPfCapital(pf.id);}}>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>{pf.name}</div>
                <div style={{fontSize:10,opacity:.6,marginTop:2}}>{pf.type==="optimized"?"0CGP — Optimisé":"INIT — Manuel"}</div>
              </div>
              {selPfId===pf.id&&<span style={{fontSize:14}}>✓</span>}
            </div>
          ))}
        </div>
      )}
      {source==="portfolio"&&portfolios.length===0&&(
        <div style={{fontSize:12,color:"#8A9BB0",fontStyle:"italic"}}>Aucun portefeuille créé. Utilisez les paramètres manuels.</div>
      )}
    </div>
    <div style={{display:"flex",justifyContent:"flex-end"}}>
      <button className="btn-nv"
        disabled={source==="portfolio"&&!selPfId}
        onClick={()=>setStep("params")}>
        CONFIGURER LA SIMULATION →
      </button>
    </div>
    {history.length>0&&(
      <div className="card" style={{marginTop:24}}>
        <div className="ct">Simulations précédentes</div>
        <div className="cs">Vos résultats sauvegardés.</div>
        {history.map(h=>(
          <div key={h.id} className="hist-item">
            <div className="hist-date">{h.pfName} · {h.date}</div>
            <div className="hist-vals">
              {[["10e pct.",feur(h.p10),"#DC2626"],["Médiane",feur(h.p50),"#0A1628"],["90e pct.",feur(h.p90),"#16A34A"],["Prob. gain",`${(h.probPos*100).toFixed(0)}%`,"#1E3A6E"]].map(([l,v,c])=>(
                <div key={l} className="hv"><div className="hvl">{l}</div><div className="hvv" style={{color:c}}>{v}</div></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
  </div></>);

  if(step==="params")return(<><style>{css}</style><div className="mc">
    <div className="ey">MONTE CARLO · PARAMÈTRES</div>
    <h1 className="h1">Configurer la simulation.</h1>
    <div className="card">
      <div className="ct">Profil de risque</div>
      <div className="cs">Choisissez un preset ou ajustez les curseurs.</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:24}}>
        {PRESETS.map(p=>(
          <button key={p.l} className={`preset ${retPct===p.r&&volPct===p.v?"on":"off"}`}
            onClick={()=>{setRetPct(p.r);setVolPct(p.v);}}>
            <div style={{fontWeight:600,marginBottom:2}}>{p.l}</div>
            <div style={{fontSize:9,opacity:.6}}>{p.r}% / {p.v}%</div>
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:24}}>
        {[
          {l:"CAPITAL DE DÉPART",v:feur(capital),min:5000,max:500000,step:5000,val:capital,set:setCapital},
          {l:"HORIZON (ANS)",v:`${years} ans`,min:5,max:40,step:1,val:years,set:setYears},
          {l:"RENDEMENT ANNUEL",v:`${retPct}%`,min:1,max:20,step:.5,val:retPct,set:setRetPct},
          {l:"VOLATILITÉ ANNUELLE",v:`${volPct}%`,min:3,max:50,step:1,val:volPct,set:setVolPct},
        ].map(({l,v,min,max,step,val,set})=>(
          <div key={l}>
            <label className="sld-lbl">{l}</label>
            <div className="sld-val">{v}</div>
            <input type="range" min={min} max={max} step={step} value={val}
              onChange={e=>set(Number(e.target.value) as never)}/>
          </div>
        ))}
      </div>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <button className="btn-out" onClick={()=>setStep("choose")}>← RETOUR</button>
      <button className="btn-nv" onClick={startCalc}>LANCER 1 000 SIMULATIONS →</button>
    </div>
  </div></>);

  if(step==="running")return(<><style>{css}</style><div className="mc" style={{display:"flex",flexDirection:"column",justifyContent:"center",minHeight:"70vh"}}>
    <div style={{maxWidth:440}}>
      <div className="ey">CALCUL EN COURS</div>
      <h2 style={{fontFamily:"'Cormorant Garant',serif",fontSize:34,fontWeight:300,color:"#0A1628",marginBottom:32,letterSpacing:"-.02em",lineHeight:1.1}}>1 000 trajectoires<br/>en cours de calcul...</h2>
      {[["Génération des nombres aléatoires","Mouvement brownien géométrique","Calcul des percentiles (P10–P90)","Analyse de la distribution finale","Calcul des probabilités"]].flat().map((s,i)=>(
        <div key={s} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <div style={{width:20,height:20,borderRadius:"50%",background:progress>i*20?"#0A1628":"rgba(10,22,40,.08)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .4s"}}>
            {progress>i*20&&<span style={{color:"white",fontSize:10}}>✓</span>}
          </div>
          <span style={{fontSize:13,color:progress>i*20?"#0A1628":"#8A9BB0",transition:"color .3s"}}>{s}</span>
        </div>
      ))}
      <div className="prog-w"><div className="prog-f" style={{width:`${progress}%`}}/></div>
      <div style={{color:"#8A9BB0",fontSize:11,marginTop:6}}>{progress}% complété</div>
    </div>
  </div></>);

  if(!result)return null;
  const gain=result.p50-capital;

  return(<><style>{css}</style><div className="mc" style={{paddingBottom:60}}>
    <div className="ey">RÉSULTATS · MONTE CARLO</div>
    <h1 className="h1">Résultats de simulation.</h1>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontSize:11,color:"#8A9BB0",fontWeight:300}}>{pfName} · {years} ans · {retPct}%/an · vol {volPct}%</div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn-out" onClick={saveResult}>ENREGISTRER CETTE SIMULATION</button>
        <button className="btn-out" onClick={()=>{setResult(null);setStep("choose");}}>RECOMMENCER</button>
      </div>
    </div>

    <div className="stat4">
      {[["MÉDIANE",feur(result.p50),`+${feur(gain)} vs initial`,"#0A1628"],
        ["90e PERCENTILE",feur(result.p90),"Meilleurs 10%","#16A34A"],
        ["10e PERCENTILE",feur(result.p10),"Pires 10%","#DC2626"],
        ["RATIO SHARPE",((retPct-2.5)/volPct).toFixed(2),`${retPct}% / ${volPct}%`,"#1E3A6E"],
      ].map(([l,v,s,c])=>(
        <div key={l} className="sc"><div className="sl">{l}</div>
          <div className="sv" style={{color:c}}>{v}</div><div className="ss">{s}</div>
        </div>
      ))}
    </div>

    <div className="card">
      <div className="ct">Probabilités de résultat</div>
      <div className="cs">Sur {years} ans avec ces hypothèses.</div>
      {[["Ne pas perdre d'argent",result.probPos*100,"#16A34A"],
        ["Doubler le capital (×2)",result.probDbl*100,"#1E3A6E"],
        ["Perdre plus de 50%",result.probHalf*100,"#DC2626"],
      ].map(([l,p,c])=>(
        <div key={l as string} className="prob-row">
          <div style={{width:280,fontSize:12,color:"#3D4F63",fontWeight:300,flexShrink:0}}>{l}</div>
          <div className="pb"><div className="pf" style={{width:`${p}%`,background:c as string}}/></div>
          <div style={{width:44,textAlign:"right",fontSize:13,fontWeight:700,color:c as string,flexShrink:0}}>{(p as number).toFixed(1)}%</div>
        </div>
      ))}
    </div>

    <div className="card">
      <div className="ct">Éventail des trajectoires</div>
      <div className="cs">Zone foncée = 80% des cas (P10–P90). Zone claire = 50% centraux. Ligne = médiane.</div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={result.chart} margin={{top:10,right:16,left:16,bottom:0}}>
          <defs>
            <linearGradient id="go" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E3A6E" stopOpacity={0.18}/><stop offset="100%" stopColor="#1E3A6E" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E3A6E" stopOpacity={0.3}/><stop offset="100%" stopColor="#1E3A6E" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="year" tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false}
            tickFormatter={v=>v===0?"Départ":`An ${v}`} interval={Math.floor(years/5)}/>
          <YAxis tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false}
            tickFormatter={v=>feur(v)} width={72}/>
          <Tooltip content={<FanTip/>}/>
          <ReferenceLine y={capital} stroke="rgba(10,22,40,.2)" strokeDasharray="4 4"/>
          <Area type="monotone" dataKey="p90" stroke="none" fill="url(#go)" fillOpacity={1} name="p90"/>
          <Area type="monotone" dataKey="p10" stroke="none" fill="#F5F4F1" fillOpacity={1} name="p10"/>
          <Area type="monotone" dataKey="p75" stroke="none" fill="url(#gi)" fillOpacity={1} name="p75"/>
          <Area type="monotone" dataKey="p25" stroke="none" fill="#F5F4F1" fillOpacity={1} name="p25"/>
          <Line type="monotone" dataKey="p50" stroke="white" strokeWidth={2.5} dot={false} name="p50"
            activeDot={{r:5,fill:"#0A1628",stroke:"white",strokeWidth:2}}/>
          <Line type="monotone" dataKey="p90" stroke="#4ADE80" strokeWidth={1.2} dot={false} strokeDasharray="3 2" name="p90"/>
          <Line type="monotone" dataKey="p10" stroke="#F87171" strokeWidth={1.2} dot={false} strokeDasharray="3 2" name="p10"/>
        </ComposedChart>
      </ResponsiveContainer>
    </div>

    <div className="card">
      <div className="ct">Distribution des valeurs finales</div>
      <div className="cs">Bleu = supérieur au capital initial. Rose = inférieur.</div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={hist} margin={{top:5,right:16,left:16,bottom:0}}>
          <XAxis dataKey="x" tick={{fontSize:9,fill:"#aaa"}} tickLine={false} axisLine={false}
            tickFormatter={v=>feur(v)} interval={Math.floor(hist.length/5)}/>
          <YAxis tick={{fontSize:9,fill:"#aaa"}} tickLine={false} axisLine={false}
            tickFormatter={v=>`${v.toFixed(1)}%`} width={40}/>
          <Tooltip contentStyle={{background:"#0A1628",border:"none",borderRadius:8,fontSize:11,color:"white"}}
            formatter={(v:number,_:string,p:{payload:{x:number}})=>[`${v.toFixed(1)}% des simulations`,feur(p.payload.x)]}
            labelFormatter={()=>""}/>
          <ReferenceLine x={capital} stroke="rgba(10,22,40,.4)" strokeDasharray="3 2"/>
          {hist.map((_,i)=><Bar key={i} dataKey="pct" isAnimationActive={false}>
            {hist.map((e,j)=><Cell key={j} fill={e.x>=capital?"#1E3A6E":"#FCA5A5"} fillOpacity={j===i?1:.7}/>)}
          </Bar>)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div></>);
}

export default function MonteCarlo(){
  return<Suspense fallback={<div style={{padding:40,color:"#8A9BB0",fontSize:11}}>CHARGEMENT...</div>}>
    <MonteCarloInner/>
  </Suspense>;
}
