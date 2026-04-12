"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Asset } from "@/types";
import { TYPE_COLOR } from "@/lib/utils";
import Treemap from "@/components/Treemap";
import { SkeletonPortfolio } from "@/components/ui/Skeleton";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const PERIODS = ["1J","1S","1M","3M","6M","1A","MAX"];

function feur(n: number) {
  return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
}
function fpct(n: number) { return `${n>=0?"+":""}${n.toFixed(2)}%`; }
function colorVal(n: number) { return n>=0?"#16A34A":"#DC2626"; }

function CustomTooltip({ active, payload, label, showPct }: {
  active?:boolean; payload?:{value:number}[]; label?:string; showPct:boolean;
}) {
  if (!active||!payload?.length) return null;
  const val = payload[0].value;
  return (
    <div style={{background:"#0A1628",borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 16px rgba(0,0,0,.2)"}}>
      <div style={{color:"rgba(255,255,255,.4)",fontSize:10,marginBottom:4}}>{label}</div>
      <div style={{color:showPct?(val>=0?"#4ADE80":"#F87171"):"white",fontSize:15,fontWeight:700}}>
        {showPct?`${val>=0?"+":""}${val.toFixed(2)}%`:feur(val)}
      </div>
    </div>
  );
}

function PortfolioInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [assets,   setAssets]   = useState<Asset[]>([]);
  const [pfName,   setPfName]   = useState("");
  const [pfType,   setPfType]   = useState<"manual"|"optimized">("manual");
  const [period,   setPeriod]   = useState("1M");
  const [loading,  setLoading]  = useState(true);
  const [perfData, setPerfData] = useState<{j:string;v:number;p:number}[]>([]);
  const [assetPerfs, setAssetPerfs] = useState<Record<string,{p1m:number;p6m:number;p1a:number;p5a:number;p10a:number}>>({});
  const [showPct,  setShowPct]  = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const urlId = searchParams.get("id");
      let pfId = urlId;
      let type: "manual"|"optimized" = "manual";

      if (!pfId) {
        const { data: portfolios } = await supabase
          .from("portfolios").select("id,name,type")
          .eq("user_id", user.id).limit(1)
          .order("created_at", { ascending: false });
        if (!portfolios?.length) { router.push("/dashboard/entry"); return; }
        pfId  = portfolios[0].id;
        type  = portfolios[0].type as "manual"|"optimized";
        setPfName(portfolios[0].name);
        setPfType(type);
      } else {
        const { data: pf } = await supabase
          .from("portfolios").select("id,name,type").eq("id", pfId).single();
        if (pf) {
          type = pf.type as "manual"|"optimized";
          setPfName(pf.name);
          setPfType(type);
        }
      }

      const { data: rawAssets } = await supabase
        .from("portfolio_assets").select("*")
        .eq("portfolio_id", pfId!);

      if (!rawAssets?.length) { setLoading(false); return; }

      const enriched: Asset[] = await Promise.all(
        rawAssets.map(async a => {
          let value = 0, currentPrice = 0, changePercent = 0;

          if (type === "optimized") {
            // Portefeuille optimisé : montant cible directement
            value = Number(a.target_amount) || 0;
          } else {
            // Portefeuille manuel : prix live × quantité
            try {
              const res = await fetch(`/api/yahoo/quote?symbol=${a.symbol}`);
              const q   = await res.json();
              currentPrice  = q.price ?? 0;
              changePercent = q.changePercent ?? 0;
              value         = a.quantity * currentPrice;
            } catch { value = 0; }
          }

          return {
            id: a.id, symbol: a.symbol, name: a.name || a.symbol,
            isin: a.isin, type: a.type as "etf"|"stock"|"crypto",
            quantity: a.quantity, currentPrice, value, weight: 0,
            performance24h: changePercent,
          };
        })
      );

      const tot   = enriched.reduce((s,a) => s+a.value, 0);
      const final = enriched.map(a => ({ ...a, weight: tot>0?a.value/tot:0 }));
      setAssets(final);

      // ── Charger les vraies données historiques depuis Neon ──
      // Graphique portfolio : pondération des actifs × historique prix
      const mainSymbol = final[0]?.symbol;
      if (mainSymbol) {
        try {
          const hRes = await fetch(`/api/market/history?symbol=${mainSymbol}&period=1y`);
          const hData = await hRes.json();
          if (hData.data?.length > 0) {
            const prices = hData.data;
            const firstPrice = prices[0].close;
            const perfPoints = prices.map((p: {date:string;close:number}) => ({
              j: new Date(p.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"}),
              v: Math.round(tot * p.close / prices[prices.length-1].close),
              p: parseFloat(((p.close - firstPrice) / firstPrice * 100).toFixed(2)),
            }));
            setPerfData(perfPoints);
          }
        } catch {}
      }

      // ── Performances historiques par actif (1M, 6M, 1A, 5A, 10A) ──
      const perfsMap: Record<string,{p1m:number;p6m:number;p1a:number;p5a:number;p10a:number}> = {};
      await Promise.all(
        final.slice(0, 8).map(async (a) => { // max 8 actifs pour limiter les requêtes
          try {
            const r = await fetch(`/api/market/history?symbol=${a.symbol}&period=10y`);
            const d = await r.json();
            if (!d.data?.length) return;
            const prices = d.data as {date:string;close:number}[];
            const last   = prices[prices.length-1].close;
            const ago = (weeks: number) => {
              const idx = Math.max(0, prices.length - 1 - weeks);
              return prices[idx].close;
            };
            perfsMap[a.symbol] = {
              p1m:  parseFloat(((last - ago(4))   / ago(4)   * 100).toFixed(2)),
              p6m:  parseFloat(((last - ago(26))  / ago(26)  * 100).toFixed(2)),
              p1a:  parseFloat(((last - ago(52))  / ago(52)  * 100).toFixed(2)),
              p5a:  parseFloat(((last - ago(260)) / ago(260) * 100).toFixed(2)),
              p10a: parseFloat(((last - ago(520)) / ago(520) * 100).toFixed(2)),
            };
          } catch {}
        })
      );
      setAssetPerfs(perfsMap);
      setLoading(false);
    }
    load();
  }, [router, searchParams]);

  const total   = assets.reduce((s,a)=>s+a.value,0);
  const gain    = assets.reduce((s,a)=>s+a.value*(a.performance24h??0)/100,0);
  const gainPct = total>0?gain/total*100:0;
  const isOpt   = pfType==="optimized";

  if (loading) return <SkeletonPortfolio />;

  if (!assets.length) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:400,gap:16}}>
      <p style={{color:"#8A9BB0"}}>Aucun actif dans ce portefeuille.</p>
      <button onClick={()=>router.push("/dashboard/entry")}
        style={{background:"#0A1628",color:"white",border:"none",padding:"14px 32px",fontSize:10,fontWeight:500,letterSpacing:".14em",cursor:"pointer"}}>
        AJOUTER DES ACTIFS →
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400&family=Inter:wght@300;400;500&display=swap');
        .pf{padding:36px 44px;background:#F5F4F1;min-height:100%;font-family:'Inter',sans-serif}
        .card{background:white;border-radius:14px;padding:22px;margin-bottom:16px}
        .card-title{font-size:13px;font-weight:600;color:#0A1628;margin-bottom:16px}
        .per-btn{padding:5px 11px;font-size:10px;font-weight:600;border-radius:5px;cursor:pointer;transition:all 0.15s;border:1px solid;font-family:'Inter',sans-serif}
        .per-btn.on{background:#0A1628;color:white;border-color:#0A1628}
        .per-btn.off{background:transparent;color:#8A9BB0;border-color:rgba(10,22,40,.1)}
        .toggle-wrap{display:flex;background:rgba(10,22,40,.05);border-radius:6px;padding:3px;gap:3px}
        .toggle-btn{padding:5px 14px;font-size:10px;font-weight:500;border:none;border-radius:4px;cursor:pointer;transition:all 0.15s;font-family:'Inter',sans-serif;letter-spacing:.06em}
        .toggle-btn.on{background:white;color:#0A1628;box-shadow:0 1px 3px rgba(0,0,0,.08)}
        .toggle-btn.off{background:transparent;color:#8A9BB0}
      `}</style>
      <div className="pf">
        <div style={{marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{fontSize:9,fontWeight:500,letterSpacing:".14em",color:"#1E3A6E"}}>{pfName.toUpperCase()}</div>
            <span style={{
              fontSize:8,fontWeight:600,padding:"2px 7px",borderRadius:3,letterSpacing:".08em",
              background:isOpt?"rgba(255,200,0,0.15)":"rgba(30,58,110,0.1)",
              color:isOpt?"#92760A":"#1E3A6E",
            }}>
              {isOpt?"0CGP":"INIT"}
            </span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:44,fontWeight:300,color:"#0A1628",letterSpacing:"-.03em",lineHeight:1}}>
                {feur(total)}
              </div>
              {!isOpt ? (
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
                  <span style={{fontSize:13,fontWeight:600,color:colorVal(gainPct)}}>{fpct(gainPct)}</span>
                  <span style={{fontSize:13,color:"#8A9BB0"}}>·</span>
                  <span style={{fontSize:13,fontWeight:600,color:colorVal(gain)}}>{gain>=0?"+":""}{feur(gain)}</span>
                  <span style={{fontSize:11,color:"#8A9BB0",fontWeight:300}}>aujourd'hui</span>
                </div>
              ) : (
                <div style={{fontSize:12,color:"#8A9BB0",marginTop:6,fontWeight:300}}>
                  Allocation cible — portefeuille optimisé par Markowitz
                </div>
              )}
            </div>
            {!isOpt && (
              <div style={{display:"flex",gap:4}}>
                {PERIODS.map(p=>(
                  <button key={p} onClick={()=>setPeriod(p)}
                    className={`per-btn ${period===p?"on":"off"}`}>{p}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div className="card-title">Répartition</div>
            <div style={{display:"flex",gap:14}}>
              {[["etf","ETF"],["stock","Action"],["crypto","Crypto"]].map(([t,l])=>(
                <div key={t} style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:7,height:7,borderRadius:2,background:TYPE_COLOR[t]}}/>
                  <span style={{fontSize:11,color:"#8A9BB0"}}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <Treemap assets={assets}/>
        </div>

        {!isOpt && (
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div className="card-title">Performance 30 jours</div>
              <div className="toggle-wrap">
                <button className={`toggle-btn ${!showPct?"on":"off"}`} onClick={()=>setShowPct(false)}>VALEUR</button>
                <button className={`toggle-btn ${showPct?"on":"off"}`} onClick={()=>setShowPct(true)}>%</button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={perfData} margin={{top:4,right:4,left:0,bottom:0}}>
                <XAxis dataKey="j" tick={{fontSize:9,fill:"#aaa"}} tickLine={false} axisLine={false} interval={9}/>
                <YAxis tick={{fontSize:9,fill:"#aaa"}} tickLine={false} axisLine={false}
                  tickFormatter={showPct?(v:number)=>`${v>0?"+":""}${v.toFixed(1)}%`:(v:number)=>feur(v)}
                  width={showPct?50:80}/>
                <Tooltip content={<CustomTooltip showPct={showPct}/>}/>
                <Line type="monotone" dataKey={showPct?"p":"v"} stroke="#0A1628" strokeWidth={1.5} dot={false}
                  activeDot={{r:4,fill:"#0A1628",stroke:"white",strokeWidth:2}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card" style={{marginBottom:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div className="card-title">Actifs</div>
            {!isOpt && (
              <button onClick={()=>router.push("/dashboard/entry")}
                style={{fontSize:10,color:"#8A9BB0",background:"none",border:"none",cursor:"pointer",letterSpacing:".06em",fontFamily:"'Inter',sans-serif"}}>
                ⚙ GÉRER
              </button>
            )}
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{borderBottom:"1px solid rgba(10,22,40,.06)"}}>
                {["ACTIF","TYPE",isOpt?"POIDS":"QTÉ",isOpt?"ALLOCATION":"PRIX","VALEUR","POIDS",...(!isOpt?["24H"]:[])].map(h=>(
                  <th key={h} style={{paddingBottom:8,paddingLeft:8,paddingRight:8,textAlign:h==="ACTIF"?"left":"right",fontSize:9,fontWeight:600,color:"#8A9BB0",letterSpacing:".09em"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...assets].sort((a,b)=>b.value-a.value).map((a,i)=>{
                const perf=a.performance24h??0;
                return(
                  <tr key={a.id} style={{borderBottom:i<assets.length-1?"1px solid rgba(10,22,40,.04)":"none"}}>
                    <td style={{padding:"12px 8px"}}>
                      <div style={{fontWeight:700,fontSize:13,color:"#0A1628"}}>{a.symbol}</div>
                      <div style={{fontSize:10,color:"#8A9BB0",marginTop:1,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
                    </td>
                    <td style={{padding:"12px 8px",textAlign:"right"}}>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:3,
                        background:a.type==="etf"?"#EFF6FF":a.type==="stock"?"#F0FDF4":"#FFFBEB",
                        color:a.type==="etf"?"#1D4ED8":a.type==="stock"?"#15803D":"#92400E"}}>
                        {a.type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{padding:"12px 8px",textAlign:"right",fontSize:12,color:"#0A1628"}}>
                      {isOpt?`${(a.weight*100).toFixed(1)}%`:a.quantity}
                    </td>
                    <td style={{padding:"12px 8px",textAlign:"right",fontSize:12,color:"#8A9BB0"}}>
                      {isOpt?feur(a.value):a.currentPrice>0?feur(a.currentPrice):"—"}
                    </td>
                    <td style={{padding:"12px 8px",textAlign:"right",fontSize:13,fontWeight:700,color:"#0A1628"}}>{feur(a.value)}</td>
                    <td style={{padding:"12px 8px",textAlign:"right",fontSize:12,color:"#8A9BB0"}}>{(a.weight*100).toFixed(1)}%</td>
                    {!isOpt&&<td style={{padding:"12px 8px",textAlign:"right",fontSize:12,fontWeight:600,color:colorVal(perf)}}>{fpct(perf)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// Export avec Suspense — obligatoire pour useSearchParams en Next.js 14
export default function PortfolioPage() {
  return (
    <Suspense fallback={
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",minHeight:400}}>
        <div style={{color:"#8A9BB0",fontSize:11,letterSpacing:".2em"}}>CHARGEMENT...</div>
      </div>
    }>
      <PortfolioInner />
    </Suspense>
  );
}
