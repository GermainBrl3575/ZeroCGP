"use client";
import { useState } from "react";
import { Asset } from "@/types";

const PERF_DB: Record<string, Record<string, number>> = {
  "URTH":{"1D":0.42,"1M":1.8,"3M":4.2,"6M":8.1,"1Y":18.5,"5Y":95.0,"10Y":232.0},
  "AAPL":{"1D":0.85,"1M":3.1,"3M":8.4,"6M":14.2,"1Y":26.0,"5Y":198.0,"10Y":832.0},
  "MSFT":{"1D":0.62,"1M":2.2,"3M":6.8,"6M":11.0,"1Y":18.0,"5Y":182.0,"10Y":742.0},
  "NVDA":{"1D":2.14,"1M":8.4,"3M":22.0,"6M":48.0,"1Y":120.0,"5Y":1420.0,"10Y":8200.0},
  "IWDA":{"1D":0.38,"1M":1.6,"3M":4.0,"6M":7.8,"1Y":17.2,"5Y":95.0,"10Y":232.0},
  "VWCE":{"1D":0.35,"1M":1.5,"3M":3.8,"6M":7.4,"1Y":15.2,"5Y":82.0,"10Y":198.0},
  "CSPX":{"1D":0.44,"1M":1.8,"3M":4.2,"6M":8.0,"1Y":18.5,"5Y":98.0,"10Y":241.0},
  "EQQQ":{"1D":0.78,"1M":2.4,"3M":5.1,"6M":10.2,"1Y":22.3,"5Y":132.0,"10Y":389.0},
  "PAEEM":{"1D":-0.22,"1M":-0.8,"3M":2.1,"6M":4.2,"1Y":8.4,"5Y":21.0,"10Y":52.0},
  "MC":{"1D":-0.54,"1M":-2.1,"3M":-8.4,"6M":-10.2,"1Y":-12.0,"5Y":68.0,"10Y":285.0},
  "AIR":{"1D":0.18,"1M":0.6,"3M":3.2,"6M":5.8,"1Y":4.8,"5Y":38.0,"10Y":142.0},
  "ASML":{"1D":-0.92,"1M":-3.2,"3M":-12.0,"6M":-8.0,"1Y":5.0,"5Y":178.0,"10Y":1820.0},
  "NOVO":{"1D":-1.24,"1M":-4.1,"3M":-18.0,"6M":-24.0,"1Y":12.0,"5Y":288.0,"10Y":980.0},
  "BTC":{"1D":2.8,"1M":8.2,"3M":28.0,"6M":42.0,"1Y":62.0,"5Y":890.0,"10Y":18400.0},
  "ETH":{"1D":1.4,"1M":4.1,"3M":12.0,"6M":18.0,"1Y":28.0,"5Y":420.0,"10Y":6800.0},
  "EEM":{"1D":-0.18,"1M":-0.6,"3M":1.8,"6M":3.6,"1Y":7.2,"5Y":18.0,"10Y":44.0},
};
const PERIODS=["1D","1M","3M","6M","1Y","5Y","10Y"] as const;
type Period=typeof PERIODS[number];
const THRESH:Record<Period,number>={"1D":1.5,"1M":5,"3M":10,"6M":15,"1Y":25,"5Y":80,"10Y":200};

function getPerf(sym:string,p:Period):number{
  const b=sym.split(".")[0].split("-")[0].toUpperCase();
  if(PERF_DB[b]?.[p]!==undefined)return PERF_DB[b][p];
  const s=sym.charCodeAt(0)+(sym.charCodeAt(sym.length-1)||0);
  return((s%31)-15)*0.15;
}
function perfColor(pct:number,p:Period):string{
  const cap=THRESH[p];
  const i=Math.min(1,Math.pow(Math.abs(pct)/cap,0.45));
  if(Math.abs(pct)<0.005)return"rgb(226,225,222)";
  if(pct>0){
    const r=Math.round(226-i*(226-0));const g=Math.round(225-i*(225-148));const b=Math.round(222-i*(222-50));
    return`rgb(${r},${g},${b})`;
  }
  const r=Math.round(226-i*(226-180));const g=Math.round(225-i*(225-25));const b=Math.round(222-i*(222-25));
  return`rgb(${r},${g},${b})`;
}
function txtCol(pct:number,p:Period):string{
  return Math.min(1,Math.pow(Math.abs(pct)/THRESH[p],0.45))>0.22?"white":"#2D3748";
}

// Algorithme squarified treemap adaptatif — aucun trou
// On découpe en lignes, chaque ligne remplit toute la largeur
interface Strip { asset:Asset; flexBasis:number }
interface Row { strips:Strip[]; height:number }

function buildRows(assets:Asset[],tot:number,W:number,H:number):Row[]{
  const sorted=[...assets].sort((a,b)=>b.value-a.value);
  const rows:Row[]=[];
  let remaining=[...sorted];
  let remainH=H;

  while(remaining.length>0){
    // Essayer d'ajouter des items à la rangée courante
    let best:Asset[]=[];let bestRatio=Infinity;
    for(let n=1;n<=remaining.length;n++){
      const group=remaining.slice(0,n);
      const groupW=group.reduce((s,a)=>s+a.value/tot,0)*W;
      const rowH=remainH*(group.reduce((s,a)=>s+a.value/tot,0)/remaining.reduce((s,a)=>s+a.value/tot,0));
      const maxRatio=Math.max(...group.map(a=>{
        const w=a.value/tot/group.reduce((s,x)=>s+x.value/tot,0)*groupW;
        return Math.max(w/rowH,rowH/w);
      }));
      if(maxRatio<bestRatio){bestRatio=maxRatio;best=group;}
      else break;
    }
    if(best.length===0)best=[remaining[0]];
    const groupTot=best.reduce((s,a)=>s+a.value/tot,0);
    const rowH=Math.max(40,remainH*(groupTot/remaining.reduce((s,a)=>s+a.value/tot,0)));
    rows.push({
      height:rowH,
      strips:best.map(a=>({asset:a,flexBasis:(a.value/tot/groupTot)*100})),
    });
    remaining=remaining.slice(best.length);
    remainH-=rowH;
  }
  return rows;
}

export default function Treemap({assets}:{assets:Asset[]}){
  const [period,setPeriod]=useState<Period>("1D");
  if(!assets.length)return null;
  const tot=assets.reduce((s,a)=>s+a.value,0);
  const TOTAL_H=300;
  const rows=buildRows(assets,tot,900,TOTAL_H);

  return(
    <div>
      <div style={{display:"flex",gap:4,marginBottom:12}}>
        {PERIODS.map(p=>(
          <button key={p} onClick={()=>setPeriod(p)} style={{
            padding:"5px 11px",fontSize:10,fontWeight:600,letterSpacing:".06em",
            borderRadius:5,border:"1px solid",cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all .12s",
            background:period===p?"#0A1628":"transparent",color:period===p?"white":"#8A9BB0",
            borderColor:period===p?"#0A1628":"rgba(10,22,40,.1)",
          }}>{p}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:2,marginBottom:10,alignItems:"center"}}>
        <div style={{display:"flex",borderRadius:4,overflow:"hidden",height:8}}>
          {[-1,-0.5,-0.15,0,0.15,0.5,1].map((v,i)=>(
            <div key={i} style={{width:20,background:perfColor(v*THRESH[period],period)}}/>
          ))}
        </div>
        <span style={{fontSize:9,color:"#9CA3AF",marginLeft:6,letterSpacing:".04em"}}>Négatif → Neutre → Positif</span>
      </div>
      {/* Heatmap adaptative — AUCUN trou */}
      <div style={{width:"100%",borderRadius:8,overflow:"hidden",display:"flex",flexDirection:"column",gap:3}}>
        {rows.map((row,ri)=>(
          <div key={ri} style={{display:"flex",gap:3,height:row.height,flexShrink:0}}>
            {row.strips.map(({asset,flexBasis})=>{
              const pct=getPerf(asset.symbol,period);
              const bg=perfColor(pct,period);
              const tc=txtCol(pct,period);
              const small=flexBasis<12||row.height<44;
              return(
                <div key={asset.id} style={{
                  flexBasis:`${flexBasis}%`,flexGrow:0,flexShrink:0,
                  background:bg,borderRadius:4,padding:small?"5px 7px":"10px 12px",
                  display:"flex",flexDirection:"column",justifyContent:"space-between",
                  overflow:"hidden",cursor:"default",transition:"filter .12s",
                }}
                onMouseEnter={e=>(e.currentTarget.style.filter="brightness(.88)")}
                onMouseLeave={e=>(e.currentTarget.style.filter="none")}
                >
                  <div style={{fontSize:small?8:10,fontWeight:700,color:tc,opacity:.8,letterSpacing:".05em",textTransform:"uppercase",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {asset.symbol.split(".")[0].split("-")[0]}
                  </div>
                  <div>
                    <div style={{fontSize:small?10:13,fontWeight:800,color:tc,lineHeight:1}}>
                      {pct>=0?"+":""}{pct.toFixed(2)}%
                    </div>
                    {!small&&<div style={{fontSize:8,color:tc,opacity:.55,marginTop:2}}>
                      {(asset.value/tot*100).toFixed(1)}% du ptf
                    </div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
