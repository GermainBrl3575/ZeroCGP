"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Asset } from "@/types";
import { eur, cn, TYPE_COLOR } from "@/lib/utils";
import Treemap from "@/components/Treemap";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const PERIODS = ["1J","1S","1M","3M","6M","1A","MAX"];
const TYPE_BADGE: Record<string,string> = {
  etf:   "bg-blue-50 text-blue-700",
  stock: "bg-green-50 text-green-700",
  crypto:"bg-amber-50 text-amber-700",
};

function pct(n: number, d = 2) { return `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`; }
function feur(n: number) {
  return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
}

export default function PortfolioPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [period, setPeriod] = useState("1M");
  const [loading, setLoading] = useState(true);
  const [perfData, setPerfData] = useState<{j:string;v:number;p:number}[]>([]);
  const [showPct, setShowPct] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: portfolios } = await supabase
        .from("portfolios").select("id")
        .eq("user_id", user.id).limit(1)
        .order("created_at", { ascending: false });

      if (!portfolios || portfolios.length === 0) {
        router.push("/dashboard/entry"); return;
      }

      const { data: rawAssets } = await supabase
        .from("portfolio_assets").select("*")
        .eq("portfolio_id", portfolios[0].id);

      if (!rawAssets || rawAssets.length === 0) { setLoading(false); return; }

      const enriched: Asset[] = await Promise.all(
        rawAssets.map(async a => {
          try {
            const res = await fetch(`/api/yahoo/quote?symbol=${a.symbol}`);
            const q = await res.json();
            return {
              id: a.id, symbol: a.symbol, name: a.name, isin: a.isin,
              type: a.type as "etf"|"stock"|"crypto",
              quantity: a.quantity, currentPrice: q.price ?? 0,
              value: a.quantity * (q.price ?? 0), weight: 0,
              performance24h: q.changePercent ?? 0,
            };
          } catch {
            return { id:a.id, symbol:a.symbol, name:a.name, isin:a.isin,
              type:a.type as "etf"|"stock"|"crypto",
              quantity:a.quantity, currentPrice:0, value:0, weight:0 };
          }
        })
      );

      const tot = enriched.reduce((s,a) => s + a.value, 0);
      const final = enriched.map(a => ({ ...a, weight: tot > 0 ? a.value/tot : 0 }));
      setAssets(final);

      // Graphique perf
      const base = tot * 0.92;
      const demo = Array.from({ length: 30 }, (_, i) => {
        const v = Math.round(base + i * (tot * 0.003) + Math.sin(i*0.7)*tot*0.015);
        return { j:`J-${29-i}`, v, p: parseFloat(((v - base)/base*100).toFixed(2)) };
      });
      setPerfData(demo);
      setLoading(false);
    }
    load();
  }, [router]);

  const total = assets.reduce((s,a) => s + a.value, 0);
  const gain  = assets.reduce((s,a) => s + a.value * (a.performance24h ?? 0) / 100, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div style={{color:"#8A9BB0",fontSize:11,letterSpacing:".2em"}}>CHARGEMENT...</div>
    </div>
  );

  if (assets.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
      <p style={{color:"#8A9BB0"}}>Aucun actif dans ce portefeuille.</p>
      <button onClick={() => router.push("/dashboard/entry")}
        style={{background:"#0A1628",color:"white",border:"none",padding:"14px 32px",fontSize:10,fontWeight:500,letterSpacing:".14em",cursor:"pointer"}}>
        AJOUTER DES ACTIFS →
      </button>
    </div>
  );

  const yDataKey = showPct ? "p" : "v";
  const yFormatter = showPct
    ? (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`
    : (v: number) => feur(v);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400&family=Inter:wght@300;400;500&display=swap');
        .pf{padding:36px 44px;background:#F5F4F1;min-height:100%;font-family:'Inter',sans-serif}
        .pf-ey{font-size:9px;font-weight:500;letter-spacing:.14em;color:#1E3A6E;margin-bottom:8px}
        .pf-total{font-family:'Cormorant Garant',serif;font-size:44px;font-weight:300;color:#0A1628;letter-spacing:-.03em;line-height:1}
        .pf-gain-pos{color:#16A34A;font-size:13px;font-weight:500;margin-top:6px}
        .pf-gain-neg{color:#DC2626;font-size:13px;font-weight:500;margin-top:6px}
        .card{background:white;border-radius:14px;padding:22px;margin-bottom:16px}
        .card-title{font-size:13px;font-weight:600;color:#0A1628;margin-bottom:16px}
        .per-btn{padding:5px 11px;font-size:10px;font-weight:600;border-radius:5px;cursor:pointer;transition:all 0.15s;border:1px solid}
        .per-btn.on{background:#0A1628;color:white;border-color:#0A1628}
        .per-btn.off{background:transparent;color:#8A9BB0;border-color:rgba(10,22,40,.1)}
        .toggle-wrap{display:flex;background:rgba(10,22,40,.05);border-radius:6px;padding:3px;gap:3px}
        .toggle-btn{padding:5px 14px;font-size:10px;font-weight:500;border:none;border-radius:4px;cursor:pointer;transition:all 0.15s;font-family:'Inter',sans-serif;letter-spacing:.06em}
        .toggle-btn.on{background:white;color:#0A1628;box-shadow:0 1px 3px rgba(0,0,0,.08)}
        .toggle-btn.off{background:transparent;color:#8A9BB0}
      `}</style>

      <div className="pf">
        {/* Header */}
        <div style={{marginBottom:28}}>
          <div className="pf-ey">PORTEFEUILLE DE DÉPART</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:12}}>
            <div>
              <div className="pf-total">{feur(total)}</div>
              <div className={gain >= 0 ? "pf-gain-pos" : "pf-gain-neg"}>
                {pct(total > 0 ? gain/total*100 : 0)} · {gain >= 0 ? "+" : ""}{feur(gain)} aujourd'hui
              </div>
            </div>
            <div style={{display:"flex",gap:4}}>
              {PERIODS.map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`per-btn ${period === p ? "on" : "off"}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Treemap */}
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div className="card-title">Répartition</div>
            <div style={{display:"flex",gap:14}}>
              {[["etf","ETF"],["stock","Action"],["crypto","Crypto"]].map(([t,l]) => (
                <div key={t} style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:7,height:7,borderRadius:2,background:TYPE_COLOR[t]}}/>
                  <span style={{fontSize:11,color:"#8A9BB0"}}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <Treemap assets={assets} />
        </div>

        {/* Performance */}
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div className="card-title">Performance 30 jours</div>
            <div className="toggle-wrap">
              <button className={`toggle-btn ${!showPct ? "on" : "off"}`} onClick={() => setShowPct(false)}>VALEUR</button>
              <button className={`toggle-btn ${showPct ? "on" : "off"}`} onClick={() => setShowPct(true)}>%</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={perfData} margin={{top:4,right:4,left:0,bottom:0}}>
              <XAxis dataKey="j" tick={{fontSize:9,fill:"#aaa"}} tickLine={false} axisLine={false} interval={9}/>
              <YAxis tick={{fontSize:9,fill:"#aaa"}} tickLine={false} axisLine={false}
                tickFormatter={yFormatter} width={showPct ? 50 : 80}/>
              <Tooltip
                contentStyle={{background:"#0A1628",border:"none",borderRadius:7,fontSize:11,color:"white"}}
                formatter={(v:number) => [yFormatter(v), showPct ? "Performance" : "Valeur"]}
              />
              <Line type="monotone" dataKey={yDataKey} stroke="#0A1628" strokeWidth={1.5} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Table actifs */}
        <div className="card" style={{marginBottom:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div className="card-title">Actifs</div>
            <button onClick={() => router.push("/dashboard/entry")}
              style={{fontSize:10,color:"#8A9BB0",background:"none",border:"none",cursor:"pointer",letterSpacing:".06em"}}>
              ⚙ GÉRER
            </button>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{borderBottom:"1px solid rgba(10,22,40,.06)"}}>
                {["ACTIF","TYPE","QTÉ","PRIX","VALEUR","POIDS","24H"].map(h => (
                  <th key={h} style={{paddingBottom:8,paddingLeft:8,paddingRight:8,textAlign:h==="ACTIF"?"left":"right",fontSize:9,fontWeight:600,color:"#8A9BB0",letterSpacing:".09em"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...assets].sort((a,b) => b.value - a.value).map((a, i) => (
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
                  <td style={{padding:"12px 8px",textAlign:"right",fontSize:12,color:"#0A1628"}}>{a.quantity}</td>
                  <td style={{padding:"12px 8px",textAlign:"right",fontSize:12,color:"#8A9BB0"}}>{a.currentPrice > 0 ? feur(a.currentPrice) : "—"}</td>
                  <td style={{padding:"12px 8px",textAlign:"right",fontSize:13,fontWeight:700,color:"#0A1628"}}>{feur(a.value)}</td>
                  <td style={{padding:"12px 8px",textAlign:"right",fontSize:12,color:"#8A9BB0"}}>{(a.weight*100).toFixed(1)}%</td>
                  <td style={{padding:"12px 8px",textAlign:"right",fontSize:12,fontWeight:600,
                    color:(a.performance24h??0)>=0?"#16A34A":"#DC2626"}}>
                    {pct(a.performance24h??0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
