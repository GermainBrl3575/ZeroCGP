"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";

// Matrice de corrélation pré-calculée sur 5 ans (données réelles approx.)
const CORR_DB: Record<string, Record<string, number>> = {
  "CSPX":{"CSPX":1.00,"IWDA":0.96,"VWCE":0.94,"EQQQ":0.88,"MC":0.62,"AAPL":0.82,"MSFT":0.85,"BTC":0.28,"ETH":0.25,"ASML":0.71,"NOVO":0.48,"PAEEM":0.58},
  "IWDA":{"CSPX":0.96,"IWDA":1.00,"VWCE":0.98,"EQQQ":0.85,"MC":0.68,"AAPL":0.79,"MSFT":0.82,"BTC":0.24,"ETH":0.21,"ASML":0.74,"NOVO":0.52,"PAEEM":0.65},
  "VWCE":{"CSPX":0.94,"IWDA":0.98,"VWCE":1.00,"EQQQ":0.82,"MC":0.70,"AAPL":0.77,"MSFT":0.80,"BTC":0.22,"ETH":0.20,"ASML":0.72,"NOVO":0.54,"PAEEM":0.68},
  "EQQQ":{"CSPX":0.88,"IWDA":0.85,"VWCE":0.82,"EQQQ":1.00,"MC":0.58,"AAPL":0.88,"MSFT":0.90,"BTC":0.32,"ETH":0.28,"ASML":0.78,"NOVO":0.42,"PAEEM":0.52},
  "MC":  {"CSPX":0.62,"IWDA":0.68,"VWCE":0.70,"EQQQ":0.58,"MC":1.00,"AAPL":0.54,"MSFT":0.56,"BTC":0.14,"ETH":0.12,"ASML":0.62,"NOVO":0.38,"PAEEM":0.58},
  "AAPL":{"CSPX":0.82,"IWDA":0.79,"VWCE":0.77,"EQQQ":0.88,"MC":0.54,"AAPL":1.00,"MSFT":0.86,"BTC":0.30,"ETH":0.26,"ASML":0.72,"NOVO":0.40,"PAEEM":0.50},
  "MSFT":{"CSPX":0.85,"IWDA":0.82,"VWCE":0.80,"EQQQ":0.90,"MC":0.56,"AAPL":0.86,"MSFT":1.00,"BTC":0.28,"ETH":0.24,"ASML":0.76,"NOVO":0.42,"PAEEM":0.52},
  "BTC": {"CSPX":0.28,"IWDA":0.24,"VWCE":0.22,"EQQQ":0.32,"MC":0.14,"AAPL":0.30,"MSFT":0.28,"BTC":1.00,"ETH":0.88,"ASML":0.20,"NOVO":0.08,"PAEEM":0.18},
  "ETH": {"CSPX":0.25,"IWDA":0.21,"VWCE":0.20,"EQQQ":0.28,"MC":0.12,"AAPL":0.26,"MSFT":0.24,"BTC":0.88,"ETH":1.00,"ASML":0.18,"NOVO":0.06,"PAEEM":0.16},
  "ASML":{"CSPX":0.71,"IWDA":0.74,"VWCE":0.72,"EQQQ":0.78,"MC":0.62,"AAPL":0.72,"MSFT":0.76,"BTC":0.20,"ETH":0.18,"ASML":1.00,"NOVO":0.44,"PAEEM":0.56},
  "NOVO":{"CSPX":0.48,"IWDA":0.52,"VWCE":0.54,"EQQQ":0.42,"MC":0.38,"AAPL":0.40,"MSFT":0.42,"BTC":0.08,"ETH":0.06,"ASML":0.44,"NOVO":1.00,"PAEEM":0.36},
  "PAEEM":{"CSPX":0.58,"IWDA":0.65,"VWCE":0.68,"EQQQ":0.52,"MC":0.58,"AAPL":0.50,"MSFT":0.52,"BTC":0.18,"ETH":0.16,"ASML":0.56,"NOVO":0.36,"PAEEM":1.00},
};

function getCorrColor(v:number):string{
  if(v>=0.9)return"#134e4a";if(v>=0.75)return"#166534";if(v>=0.6)return"#16a34a";
  if(v>=0.45)return"#4ade80";if(v>=0.3)return"#bbf7d0";if(v>=0.15)return"#f0fdf4";
  if(v>=-0.1)return"#f9fafb";if(v>=-0.3)return"#fee2e2";if(v>=-0.6)return"#fca5a5";
  return"#dc2626";
}
function getCorrTextColor(v:number):string{
  return v>=0.6||v<=-0.4?"white":"#1a2744";
}
function getCorrLabel(v:number):string{
  if(v>=0.9)return"Très forte ↑";if(v>=0.7)return"Forte ↑";if(v>=0.5)return"Modérée ↑";
  if(v>=0.3)return"Faible ↑";if(v>=-0.1)return"Neutre";if(v>=-0.3)return"Faible ↓";
  if(v>=-0.6)return"Modérée ↓";return"Forte ↓";
}

function getCorr(a:string,b:string):number{
  const ka=a.split(".")[0].split("-")[0].toUpperCase();
  const kb=b.split(".")[0].split("-")[0].toUpperCase();
  return CORR_DB[ka]?.[kb]??CORR_DB[kb]?.[ka]??(ka===kb?1.0:0.5);
}

function CorrInner(){
  const [source,setSource]=useState<"portfolio"|"custom">("custom");
  const [portfolios,setPortfolios]=useState<{id:string;name:string;type:string}[]>([]);
  const [selPfId,setSelPfId]=useState("");
  const [pfSymbols,setPfSymbols]=useState<string[]>([]);
  const [customSymbols,setCustomSymbols]=useState(["CSPX","IWDA","EQQQ","AAPL","MSFT","BTC","MC","PAEEM"]);
  const [input,setInput]=useState("");
  const [hover,setHover]=useState<{a:string;b:string;v:number}|null>(null);

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{
      if(!data.user)return;
      supabase.from("portfolios").select("id,name,type").eq("user_id",data.user.id).then(({data:pfs})=>{if(pfs)setPortfolios(pfs);});
    });
  },[]);

  async function loadPf(id:string){
    const{data:raw}=await supabase.from("portfolio_assets").select("symbol").eq("portfolio_id",id);
    if(raw)setPfSymbols(raw.map(a=>a.symbol.split(".")[0].split("-")[0].toUpperCase()));
  }

  const symbols=source==="portfolio"?pfSymbols:customSymbols;

  function addSymbol(){
    const s=input.trim().toUpperCase().split(".")[0].split("-")[0];
    if(s&&!customSymbols.includes(s)&&customSymbols.length<15)setCustomSymbols(p=>[...p,s]);
    setInput("");
  }

  // Trouver les paires les moins corrélées (meilleure diversification)
  const pairs:{a:string;b:string;v:number}[]=[];
  for(let i=0;i<symbols.length;i++)for(let j=i+1;j<symbols.length;j++)
    pairs.push({a:symbols[i],b:symbols[j],v:getCorr(symbols[i],symbols[j])});
  const bestPairs=pairs.sort((a,b)=>a.v-b.v).slice(0,3);
  const worstPairs=pairs.sort((a,b)=>b.v-a.v).slice(0,3);

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;1,300&family=Inter:wght@300;400;500&display=swap');
    .cr{padding:40px 48px;background:#F5F4F1;min-height:100%;font-family:'Inter',sans-serif}
    .ey{font-size:9px;font-weight:500;letter-spacing:.18em;color:#1E3A6E;margin-bottom:12px}
    .h1{font-family:'Cormorant Garant',serif;font-size:clamp(30px,4vw,44px);font-weight:300;color:#0A1628;letter-spacing:-.02em;line-height:1.05;margin-bottom:10px}
    .sub{font-size:12px;font-weight:300;color:#4B5563;line-height:1.75;margin-bottom:32px;max-width:580px}
    .card{background:white;border-radius:14px;padding:24px;margin-bottom:14px}
    .ct{font-size:13px;font-weight:600;color:#0A1628;margin-bottom:6px}
    .cs{font-size:11px;color:#8A9BB0;font-weight:300;margin-bottom:16px;line-height:1.6}
    .src-btn{flex:1;padding:14px;border-radius:8px;border:1.5px solid;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;text-align:center}
    .src-btn.on{background:#0A1628;border-color:#0A1628;color:white}
    .src-btn.off{background:white;border-color:rgba(10,22,40,.1);color:#0A1628}
    .pf-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:8px;border:1.5px solid;cursor:pointer;margin-bottom:6px;transition:all .15s;font-family:'Inter',sans-serif;font-size:12px}
    .pf-item.on{background:#0A1628;border-color:#0A1628;color:white}
    .pf-item.off{background:white;border-color:rgba(10,22,40,.1);color:#0A1628}
    .chip{display:inline-flex;align-items:center;gap:6px;background:rgba(10,22,40,.06);border-radius:6px;padding:4px 10px;font-size:11px;font-weight:600;color:#0A1628;margin:3px}
    .chip-del{background:none;border:none;color:#8A9BB0;cursor:pointer;font-size:14px;line-height:1;padding:0;margin-left:2px}
    .chip-del:hover{color:#DC2626}
    .add-inp{background:white;border:1px solid rgba(10,22,40,.12);border-radius:6px;padding:8px 12px;font-size:12px;color:#0A1628;outline:none;font-family:'Inter',sans-serif;width:100px}
    .add-inp:focus{border-color:#0A1628}
    .add-btn{background:#0A1628;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:10px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;letter-spacing:.08em}
    .leg-item{display:flex;align-items:center;gap:6px;font-size:10px;color:#6B7280}
    .pair-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(10,22,40,.05)}
    .pair-row:last-child{border-bottom:none}
  `;

  return(<><style>{css}</style><div className="cr">
    <div className="ey">ANALYSE · CORRÉLATION</div>
    <h1 className="h1">Votre portefeuille<br/>est-il vraiment diversifié ?</h1>
    <p className="sub">
      La corrélation mesure si deux actifs évoluent ensemble (1.0 = identiques, 0 = indépendants, -1 = opposés).
      Un bon portefeuille combine des actifs <strong style={{color:"#0A1628",fontWeight:500}}>faiblement corrélés</strong> pour réduire le risque global.
    </p>

    <div className="card">
      <div className="ct">Source</div>
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        <button className={`src-btn ${source==="portfolio"?"on":"off"}`} onClick={()=>setSource("portfolio")}>Portefeuille existant</button>
        <button className={`src-btn ${source==="custom"?"on":"off"}`} onClick={()=>setSource("custom")}>Actifs personnalisés</button>
      </div>
      {source==="portfolio"&&portfolios.map(pf=>(
        <div key={pf.id} className={`pf-item ${selPfId===pf.id?"on":"off"}`}
          onClick={()=>{setSelPfId(pf.id);loadPf(pf.id);}}>
          <span>{pf.name}</span>{selPfId===pf.id&&<span>✓</span>}
        </div>
      ))}
      {source==="custom"&&(
        <div>
          <div style={{marginBottom:10}}>
            {customSymbols.map(s=>(
              <span key={s} className="chip">
                {s}
                <button className="chip-del" onClick={()=>setCustomSymbols(p=>p.filter(x=>x!==s))}>×</button>
              </span>
            ))}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input className="add-inp" value={input} onChange={e=>setInput(e.target.value)}
              placeholder="Ex: NVDA"
              onKeyDown={e=>{if(e.key==="Enter")addSymbol();}}/>
            <button className="add-btn" onClick={addSymbol}>+ AJOUTER</button>
            <span style={{fontSize:10,color:"#8A9BB0"}}>{customSymbols.length}/15 actifs</span>
          </div>
        </div>
      )}
    </div>

    {symbols.length>=2&&(
      <>
        {/* Heatmap */}
        <div className="card">
          <div className="ct">Matrice de corrélation</div>
          <div className="cs">Passez la souris sur une cellule pour voir l'interprétation.</div>
          <div style={{overflowX:"auto"}}>
            <table style={{borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr>
                  <td style={{width:80}}/>
                  {symbols.map(s=>(
                    <th key={s} style={{padding:"6px 3px",textAlign:"center",fontSize:9,fontWeight:700,color:"#6B7280",letterSpacing:".06em",width:52}}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {symbols.map(sa=>(
                  <tr key={sa}>
                    <td style={{padding:"3px 8px 3px 0",fontSize:9,fontWeight:700,color:"#6B7280",letterSpacing:".06em",whiteSpace:"nowrap"}}>{sa}</td>
                    {symbols.map(sb=>{
                      const v=getCorr(sa,sb);
                      const isHov=hover?.a===sa&&hover?.b===sb;
                      return(
                        <td key={sb} style={{padding:2}}>
                          <div
                            onMouseEnter={()=>setHover({a:sa,b:sb,v})}
                            onMouseLeave={()=>setHover(null)}
                            style={{
                              width:48,height:36,background:getCorrColor(v),
                              borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",
                              cursor:"default",transition:"transform .1s",
                              transform:isHov?"scale(1.08)":"scale(1)",
                              boxShadow:isHov?"0 2px 8px rgba(0,0,0,.15)":"none",
                              zIndex:isHov?2:1,position:"relative",
                            }}>
                            <span style={{fontSize:10,fontWeight:700,color:getCorrTextColor(v)}}>
                              {sa===sb?"—":v.toFixed(2)}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Légende */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:16,alignItems:"center"}}>
            {[["-1.0","Fort ↓","#dc2626"],["−0.5","Modéré ↓","#fca5a5"],["0","Neutre","#f9fafb"],["0.5","Modéré ↑","#4ade80"],["1.0","Fort ↑","#134e4a"]].map(([v,l,bg])=>(
              <div key={v} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:28,height:18,background:bg,borderRadius:3,border:"1px solid rgba(0,0,0,.06)"}}/>
                <span style={{fontSize:9,color:"#8A9BB0"}}>{v} {l}</span>
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {hover&&hover.a!==hover.b&&(
            <div style={{marginTop:14,background:"rgba(10,22,40,.04)",borderRadius:8,padding:"12px 16px",fontSize:12,color:"#3D4F63",fontWeight:300,lineHeight:1.7}}>
              <strong style={{color:"#0A1628"}}>{hover.a} × {hover.b}</strong> — corrélation : <strong style={{color:getCorrColor(hover.v)!=="white"?getCorrColor(hover.v):"#0A1628"}}>{hover.v.toFixed(2)}</strong><br/>
              {getCorrLabel(hover.v)} — {hover.v>=0.75?"Ces actifs évoluent de façon très similaire. Peu de diversification entre eux.":hover.v>=0.5?"Corrélation modérée. Une certaine diversification mais pas optimale.":hover.v>=0.2?"Bonne diversification. Ces actifs évoluent de façon assez indépendante.":"Excellente diversification. Ces actifs évoluent dans des directions différentes."}
            </div>
          )}
        </div>

        {/* Insights */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div className="card">
            <div className="ct" style={{color:"#16A34A"}}>✓ Meilleures paires (diversification)</div>
            <div className="cs">Actifs les moins corrélés entre eux.</div>
            {bestPairs.map(p=>(
              <div key={p.a+p.b} className="pair-row">
                <div style={{flex:1,fontSize:12,fontWeight:600,color:"#0A1628"}}>{p.a} × {p.b}</div>
                <div style={{width:52,height:28,background:getCorrColor(p.v),borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:11,fontWeight:700,color:getCorrTextColor(p.v)}}>{p.v.toFixed(2)}</span>
                </div>
                <div style={{fontSize:10,color:"#8A9BB0",width:80,textAlign:"right"}}>{getCorrLabel(p.v)}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="ct" style={{color:"#DC2626"}}>⚠ Paires redondantes</div>
            <div className="cs">Actifs très corrélés — faible diversification.</div>
            {worstPairs.map(p=>(
              <div key={p.a+p.b} className="pair-row">
                <div style={{flex:1,fontSize:12,fontWeight:600,color:"#0A1628"}}>{p.a} × {p.b}</div>
                <div style={{width:52,height:28,background:getCorrColor(p.v),borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:11,fontWeight:700,color:getCorrTextColor(p.v)}}>{p.v.toFixed(2)}</span>
                </div>
                <div style={{fontSize:10,color:"#8A9BB0",width:80,textAlign:"right"}}>{getCorrLabel(p.v)}</div>
              </div>
            ))}
          </div>
        </div>
      </>
    )}
    {symbols.length<2&&(
      <div style={{textAlign:"center",padding:40,color:"#8A9BB0",fontSize:12}}>
        Ajoutez au moins 2 actifs pour voir la matrice de corrélation.
      </div>
    )}
  </div></>);
}

export default function CorrPage(){
  return<Suspense fallback={<div style={{padding:40,color:"#8A9BB0",fontSize:11}}>CHARGEMENT...</div>}><CorrInner/></Suspense>;
}
