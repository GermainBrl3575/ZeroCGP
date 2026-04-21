"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Asset } from "@/types";
import Treemap from "@/components/Treemap";
import InfoBubble from "@/components/ui/InfoBubble";
import { SkeletonPortfolio } from "@/components/ui/Skeleton";

const C = {
  navy:"#050B14", navyText:"rgba(5,11,20,0.88)", sapphire:"#1a3a6a",
  textMid:"rgba(5,11,20,0.52)", textLight:"rgba(5,11,20,0.36)",
  border:"rgba(5,11,20,0.07)", borderCard:"rgba(5,11,20,0.09)",
  gUp:"rgba(22,90,52,0.75)", gDn:"rgba(155,50,48,0.75)", gold:"#c9a84c",
};
const EASE = "0.5s cubic-bezier(.16,1,.3,1)";

function eur(n: number) {
  return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
}
function fpct(n: number) { return `${n>=0?"+":""}${n.toFixed(2)}%`; }

const RANGES = ["1D","1M","3M","6M","1Y"] as const;
type Range = typeof RANGES[number];

const CSS = `
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
`;

type MetricsData = {
  portfolio: {
    id:string; name:string; type:string; created_at:string;
    capitalInitial:number; valeurActuelle:number; perfSinceCreation:number;
    portfolioPerfs:Record<string,number>; volatilite:number; sharpe:number;
    diversificationScore:number; maxDrawdown:number; peakValue:number;
    daysSinceCreation:number; evolution:{date:string;value:number}[];
  };
  assets: {
    id:string; symbol:string; name:string; type:string; weight:number;
    targetAmount:number; currentPrice:number; currentValue:number;
    perfs:Record<string,number>;
  }[];
};

function DiversificationCircle({ score }: { score: number }) {
  const r = 16, cx = 20, cy = 20, circumference = 2 * Math.PI * r;
  const pct = score / 10;
  const color = score >= 7 ? C.gUp : score >= 5 ? C.gold : C.gDn;
  return (
    <div style={{display:"flex",alignItems:"center",gap:14}}>
      <svg width={40} height={40} viewBox="0 0 40 40">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(5,11,20,0.05)" strokeWidth="3"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${circumference*pct} ${circumference*(1-pct)}`}
          strokeLinecap="round" transform="rotate(-90 20 20)"
          style={{transition:`stroke-dasharray ${EASE}`}}/>
        <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle"
          fontSize="12" fontWeight="500" fill={color} fontFamily="Inter,sans-serif">{score}</text>
      </svg>
      <div>
        <div style={{fontSize:12,fontWeight:500,color:C.navyText,fontFamily:"Inter,sans-serif"}}>Diversification</div>
        <div style={{fontSize:10,fontWeight:400,color:C.textLight,fontFamily:"Inter,sans-serif",marginTop:2}}>
          {score>=7?"Bonne":score>=5?"Correcte":"Faible"} · /10
        </div>
      </div>
    </div>
  );
}

function EvolutionChart({ data, capitalInitial }: { data:{date:string;value:number}[]; capitalInitial:number }) {
  if (data.length < 3) return (
    <div style={{textAlign:"center",padding:60,fontSize:13,color:C.textLight,fontFamily:"Inter,sans-serif"}}>
      Pas encore assez de données pour tracer l'évolution. Revenez dans quelques jours.
    </div>
  );

  const W = 700, H = 220, PX = 50, PY = 20;
  const values = data.map(d => d.value);
  const minV = Math.min(...values) * 0.98;
  const maxV = Math.max(...values) * 1.02;
  const rangeV = maxV - minV || 1;
  const x = (i: number) => PX + (i / (data.length - 1)) * (W - PX - 10);
  const y = (v: number) => PY + (1 - (v - minV) / rangeV) * (H - PY - 20);

  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const areaD = pathD + ` L${x(data.length - 1).toFixed(1)},${H - 10} L${PX},${H - 10} Z`;

  const gridLines = 4;
  const step = rangeV / gridLines;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.sapphire} stopOpacity="0.12"/>
            <stop offset="100%" stopColor={C.sapphire} stopOpacity="0.01"/>
          </linearGradient>
        </defs>
        {Array.from({length:gridLines+1}).map((_,i) => {
          const val = minV + step * i;
          const yPos = y(val);
          return <g key={i}>
            <line x1={PX} y1={yPos} x2={W-10} y2={yPos} stroke={C.navy} strokeWidth="0.3" opacity="0.06"/>
            <text x={PX-6} y={yPos+3} textAnchor="end" fontSize="9" fill={C.textLight} fontFamily="Inter,sans-serif">
              {Math.round(val/1000)}k €
            </text>
          </g>;
        })}
        <path d={areaD} fill="url(#areaGrad)"/>
        <path d={pathD} fill="none" stroke={C.sapphire} strokeWidth="1.5" strokeLinejoin="round"/>
        {/* Entry point */}
        <circle cx={x(0)} cy={y(data[0].value)} r="5" fill="none" stroke={C.gold} strokeWidth="1.5"/>
        <text x={x(0)+10} y={y(data[0].value)-8} fontSize="9" fill={C.gold} fontFamily="Inter,sans-serif">
          Entrée : {eur(capitalInitial)}
        </text>
        {/* Current point */}
        <circle cx={x(data.length-1)} cy={y(data[data.length-1].value)} r="6" fill={C.sapphire} opacity="0.15"/>
        <circle cx={x(data.length-1)} cy={y(data[data.length-1].value)} r="3" fill={C.sapphire}/>
      </svg>
      {/* Legend */}
      <div style={{display:"flex",gap:24,borderTop:`.5px solid ${C.border}`,paddingTop:12,marginTop:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:20,height:2,background:C.sapphire,borderRadius:1}}/>
          <span style={{fontSize:10,color:C.textLight,fontFamily:"Inter,sans-serif"}}>Valeur du portefeuille</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:10,height:10,borderRadius:"50%",border:`1.5px solid ${C.gold}`}}/>
          <span style={{fontSize:10,color:C.textLight,fontFamily:"Inter,sans-serif"}}>Point d'entrée</span>
        </div>
      </div>
    </div>
  );
}

function PortfolioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("1M");
  const [tab, setTab] = useState<"repartition"|"evolution"|"actifs">("repartition");
  const [openAsset, setOpenAsset] = useState<string|null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      let pfId = searchParams.get("id");
      if (!pfId) {
        const { data: pfs } = await supabase.from("portfolios").select("id")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
        if (!pfs?.length) { router.push("/dashboard/entry"); return; }
        pfId = pfs[0].id;
      }

      try {
        const r = await fetch(`/api/portfolio/metrics?id=${pfId}`);
        if (r.ok) { const d = await r.json(); if (d.portfolio) setData(d); }
      } catch {}
      setLoading(false);
    }
    load();
  }, [router, searchParams]);

  if (loading) return <SkeletonPortfolio />;
  if (!data) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:400,gap:16}}>
      <p style={{color:C.textLight}}>Aucun portefeuille trouvé.</p>
      <button onClick={()=>router.push("/dashboard/entry")} style={{background:C.navy,color:"white",border:"none",padding:"14px 32px",fontSize:10,fontWeight:500,letterSpacing:".14em",cursor:"pointer"}}>AJOUTER DES ACTIFS →</button>
    </div>
  );

  const { portfolio: pf, assets } = data;
  const isOpt = pf.type === "optimized";
  const createdAt = new Date(pf.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
  const perfColor = pf.perfSinceCreation >= 0 ? C.gUp : C.gDn;

  // Convert perfs to treemap format
  const treemapPerfs: Record<string,{p1d:number;p1m:number;p3m:number;p6m:number;p1a:number}> = {};
  const treemapAssets: Asset[] = assets.map(a => {
    treemapPerfs[a.symbol] = {
      p1d: a.perfs["1D"]||0, p1m: a.perfs["1M"]||0, p3m: a.perfs["3M"]||0,
      p6m: a.perfs["6M"]||0, p1a: a.perfs["1Y"]||0,
    };
    return {
      id: a.id, symbol: a.symbol, name: a.name, type: a.type as "etf"|"stock"|"crypto",
      quantity: 0, currentPrice: a.currentPrice, value: a.currentValue, weight: a.weight / 100,
    };
  });

  // Markets closed detection for 1D
  const marketsClosed = range === "1D" && assets.every(a => Math.abs(a.perfs["1D"]||0) < 0.005);

  // Selected period perf for asset table
  const perfKey = range;

  return (
    <>
      <style>{CSS}</style>
      <div style={{padding:"36px 44px",minHeight:"100%",fontFamily:"Inter,sans-serif"}}>

        {/* Header */}
        <div style={{marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontSize:10,fontWeight:500,letterSpacing:".15em",textTransform:"uppercase",color:C.sapphire,opacity:.65}}>{pf.name}</span>
            <span style={{fontSize:8,fontWeight:600,padding:"2px 7px",borderRadius:3,letterSpacing:".08em",
              background:isOpt?"rgba(201,168,76,0.12)":"rgba(22,90,52,0.1)",
              color:isOpt?C.gold:"rgba(22,90,52,0.8)",
            }}>{isOpt?"0CGP":"ACTIF"}</span>
          </div>
          <div style={{display:"flex",alignItems:"baseline",gap:16,flexWrap:"wrap"}}>
            <span style={{fontSize:42,fontWeight:500,color:C.navyText,letterSpacing:"-.03em",fontVariantNumeric:"tabular-nums",lineHeight:1}}>{eur(pf.valeurActuelle)}</span>
            <span style={{fontSize:16,fontWeight:500,color:perfColor}}>{fpct(pf.perfSinceCreation)}</span>
            <span style={{fontSize:12,fontWeight:400,color:C.textLight}}>depuis le {createdAt}</span>
          </div>
          <div style={{fontSize:13,fontWeight:400,color:C.textLight,marginTop:8}}>
            Allocation cible — portefeuille optimisé par Markowitz
          </div>
        </div>

        {/* 4 Stat boxes */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:28}}>
          {[
            {label:"Valeur totale",value:eur(pf.valeurActuelle),color:C.navyText},
            {label:"Performance",value:fpct(pf.perfSinceCreation),color:perfColor},
            {label:"Volatilité annualisée",value:pf.volatilite!=null?`${pf.volatilite.toFixed(1)}%`:"—",color:C.navyText},
            {label:"Ratio de Sharpe",value:pf.sharpe!=null?pf.sharpe.toFixed(2):"—",color:pf.sharpe!=null&&pf.sharpe>0.5?C.gUp:C.navyText},
          ].map(s=>(
            <div key={s.label} style={{padding:"18px 20px",borderRadius:8,background:"rgba(255,255,255,.65)",border:`0.5px solid ${C.borderCard}`,boxShadow:"0 2px 12px rgba(0,0,0,.018)"}}>
              <div style={{fontSize:9,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",color:C.textLight,marginBottom:8}}>{s.label}</div>
              <div style={{fontSize:22,fontWeight:500,color:s.color,fontVariantNumeric:"tabular-nums",letterSpacing:"-.02em"}}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Diversification score */}
        <div style={{marginBottom:28}}>
          <DiversificationCircle score={pf.diversificationScore}/>
        </div>

        {/* Period selector (Actifs tab only) + Legend */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          {tab==="actifs"?<div style={{display:"flex",gap:4}}>
            {RANGES.map(r=>(
              <button key={r} onClick={()=>setRange(r)} style={{
                padding:"7px 16px",borderRadius:6,fontSize:11,fontWeight:range===r?500:400,
                background:range===r?C.navy:"transparent",color:range===r?"white":C.textMid,
                border:range===r?"none":`0.5px solid ${C.borderCard}`,cursor:"pointer",
                fontFamily:"Inter,sans-serif",transition:`all ${EASE}`,
              }}>{r}</button>
            ))}
          </div>:<div/>}
          <div style={{display:"flex",gap:14}}>
            {[["etf","ETF","rgba(26,58,106,.5)"],["stock","Action","rgba(22,90,52,.5)"],["crypto","Crypto","rgba(217,119,6,.5)"]].map(([,l,c])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:7,height:7,borderRadius:2,background:c}}/>
                <span style={{fontSize:11,color:C.textLight}}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:0,marginBottom:24,borderBottom:`.5px solid ${C.border}`}}>
          {([{id:"repartition",label:"Répartition"},{id:"evolution",label:"Évolution"},{id:"actifs",label:"Actifs"}] as const).map(t=>(
            <div key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"12px 24px",cursor:"pointer",fontSize:12,
              fontWeight:tab===t.id?500:400,color:tab===t.id?C.navyText:C.textLight,
              borderBottom:tab===t.id?"1.5px solid #1a3a6a":"1.5px solid transparent",
              transition:`all ${EASE}`,fontFamily:"Inter,sans-serif",
            }}>{t.label}</div>
          ))}
        </div>

        {/* Tab content */}
        <div key={tab+range} style={{animation:"fadeUp .45s cubic-bezier(.23,1,.32,1) both"}}>

          {/* Répartition */}
          {tab==="repartition"&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                <span style={{fontSize:14,fontWeight:500,color:C.navyText}}>Répartition</span>
                <InfoBubble text="Les performances affichées sont calculées à partir des cours de marché en temps réel via Yahoo Finance. De légères différences avec votre banque sont normales : elles viennent de la devise de cotation (USD vs EUR), du décalage horaire entre places boursières, et des frais de gestion de chaque courtier."/>
              </div>
              {marketsClosed&&(
                <div style={{fontSize:11,color:C.textLight,fontStyle:"italic",marginBottom:12}}>
                  Marchés fermés — les performances intraday seront disponibles à l'ouverture.
                </div>
              )}
              <Treemap assets={treemapAssets} perfs={treemapPerfs}/>
            </div>
          )}

          {/* Évolution */}
          {tab==="evolution"&&(
            <div>
              <div style={{fontSize:14,fontWeight:500,color:C.navyText,marginBottom:6}}>Évolution depuis la création</div>
              <div style={{fontSize:12,fontWeight:400,color:C.textLight,marginBottom:20}}>Depuis le {createdAt}</div>
              <div style={{background:"rgba(255,255,255,0.42)",borderRadius:12,border:"0.5px solid rgba(5,11,20,0.035)",boxShadow:"0 1px 0 rgba(255,255,255,0.8) inset, 0 20px 50px rgba(0,0,0,0.02)",padding:"24px 20px"}}>
                <EvolutionChart data={pf.evolution} capitalInitial={pf.capitalInitial}/>
              </div>
              {/* Stats under chart */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginTop:20}}>
                {[
                  {label:"Rendement total",value:fpct(pf.perfSinceCreation),color:pf.perfSinceCreation>=0?C.gUp:C.gDn},
                  {label:"Plus haut",value:eur(pf.peakValue),color:C.navyText},
                  {label:"Drawdown max",value:`${pf.maxDrawdown.toFixed(1)}%`,color:C.gDn},
                  {label:"Jours",value:String(pf.daysSinceCreation),color:C.navyText},
                ].map(s=>(
                  <div key={s.label} style={{padding:"14px 16px",borderRadius:6,border:`0.5px solid ${C.borderCard}`,background:"rgba(255,255,255,.65)"}}>
                    <div style={{fontSize:9,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",color:C.textLight,marginBottom:6}}>{s.label}</div>
                    <div style={{fontSize:18,fontWeight:500,color:s.color,fontVariantNumeric:"tabular-nums"}}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actifs */}
          {tab==="actifs"&&(
            <div>
              {/* Header */}
              <div style={{display:"grid",gridTemplateColumns:"2fr 70px 80px 100px 80px",gap:0,padding:"8px 22px",marginBottom:8}}>
                {["ACTIF","TYPE","POIDS","VALEUR","PERF"].map((h,i)=>(
                  <div key={h} style={{fontSize:9,fontWeight:500,letterSpacing:".1em",color:C.textLight,textAlign:i>=3?"right":"left"}}>{h}</div>
                ))}
              </div>
              {/* Rows */}
              {assets.map((a,ai)=>{
                const isOpen = openAsset===a.symbol;
                const perf = a.perfs[perfKey]||0;
                const perfC = perf>=0?C.gUp:C.gDn;
                return (
                  <div key={a.symbol} style={{animation:`fadeUp .4s cubic-bezier(.23,1,.32,1) both`,animationDelay:`${ai*0.04}s`}}>
                    <div onClick={()=>setOpenAsset(isOpen?null:a.symbol)} style={{
                      display:"grid",gridTemplateColumns:"2fr 70px 80px 100px 80px",gap:0,alignItems:"center",
                      padding:"14px 22px",borderRadius:isOpen?"6px 6px 0 0":6,cursor:"pointer",
                      border:isOpen?`0.5px solid rgba(26,58,106,0.15)`:`0.5px solid ${C.borderCard}`,
                      background:isOpen?"rgba(26,58,106,0.02)":"rgba(255,255,255,.72)",
                      boxShadow:"0 1px 2px rgba(0,0,0,.015)",marginBottom:isOpen?0:6,
                      transition:`all ${EASE}`,
                    }}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:C.navyText}}>{a.symbol.split(".")[0]}</div>
                        <div style={{fontSize:11,fontWeight:400,color:C.textLight,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
                      </div>
                      <div>
                        <span style={{fontSize:9,fontWeight:500,padding:"3px 8px",borderRadius:4,
                          background:a.type==="etf"?"rgba(26,58,106,.08)":"rgba(22,90,52,.08)",
                          color:a.type==="etf"?C.sapphire:"rgba(22,90,52,0.8)",
                        }}>{a.type.toUpperCase()}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:500,color:C.navyText,fontVariantNumeric:"tabular-nums"}}>{a.weight.toFixed(1)}%</div>
                      <div style={{fontSize:14,fontWeight:500,color:C.navyText,fontVariantNumeric:"tabular-nums",textAlign:"right"}}>{eur(a.currentValue)}</div>
                      <div style={{fontSize:13,fontWeight:500,color:perfC,fontVariantNumeric:"tabular-nums",textAlign:"right"}}>{fpct(perf)}</div>
                    </div>
                    {isOpen&&(
                      <div style={{padding:"16px 22px",border:`0.5px solid rgba(26,58,106,0.15)`,borderTop:"none",borderRadius:"0 0 6px 6px",background:"rgba(26,58,106,0.015)",marginBottom:6,animation:"fadeUp .3s ease both"}}>
                        <div style={{fontSize:12,color:C.textMid,lineHeight:1.6,marginBottom:14}}>
                          {a.name} · Prix actuel : {a.currentPrice.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          {(["1D","1M","3M","6M","1Y"] as const).map(p=>{
                            const v = a.perfs[p]||0;
                            const pos = v>=0;
                            return (
                              <div key={p} style={{flex:1,textAlign:"center",padding:"8px 4px",borderRadius:6,
                                background:pos?"rgba(22,90,52,0.04)":"rgba(155,50,48,0.04)",
                                border:`0.5px solid ${pos?"rgba(22,90,52,0.1)":"rgba(155,50,48,0.1)"}`,
                              }}>
                                <div style={{fontSize:8,color:C.textLight,marginBottom:4,letterSpacing:".08em"}}>{p}</div>
                                <div style={{fontSize:12,fontWeight:500,color:pos?C.gUp:C.gDn,fontVariantNumeric:"tabular-nums"}}>{fpct(v)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<SkeletonPortfolio/>}>
      <PortfolioInner />
    </Suspense>
  );
}
