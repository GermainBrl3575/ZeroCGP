"use client";
import { useState, useCallback } from "react";
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, ReferenceLine,
  BarChart, Bar, Cell,
} from "recharts";

const NAVY = "#0A1628";
const NAVY_MID = "#1E3A6E";

function feur(n: number) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(2)} M€`;
  if (n >= 1_000)     return `${Math.round(n/1_000)} k€`;
  return `${Math.round(n)} €`;
}

// ── Générateur Box-Muller (loi normale) ──────────────────────
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Simulation Monte Carlo (géométrique brownien) ────────────
interface SimResult {
  year: number;
  p10: number; p25: number; p50: number; p75: number; p90: number;
  median: number;
}

interface SimSummary {
  chart:         SimResult[];
  finalValues:   number[];
  probPositive:  number;
  probDouble:    number;
  probHalf:      number;
  median:        number;
  p10:           number;
  p90:           number;
  worstCase:     number;
  bestCase:      number;
  samplePaths:   number[][];
}

function runMonteCarlo(
  capital: number,
  years: number,
  annualReturn: number,  // ex: 0.08
  annualVol: number,     // ex: 0.15
  nSim = 1000
): SimSummary {
  const dt = 1; // pas annuel
  const drift = (annualReturn - 0.5 * annualVol * annualVol) * dt;
  const sigma = annualVol * Math.sqrt(dt);

  // Générer toutes les trajectoires
  const paths: number[][] = [];
  for (let s = 0; s < nSim; s++) {
    const path = [capital];
    for (let y = 1; y <= years; y++) {
      path.push(path[y - 1] * Math.exp(drift + sigma * randn()));
    }
    paths.push(path);
  }

  // 30 trajectoires échantillon pour affichage
  const step = Math.floor(nSim / 30);
  const samplePaths = paths.filter((_, i) => i % step === 0).slice(0, 30);

  // Percentiles par année
  const chart: SimResult[] = [];
  for (let y = 0; y <= years; y++) {
    const vals = paths.map(p => p[y]).sort((a, b) => a - b);
    const pct = (p: number) => vals[Math.floor(p * (nSim - 1))];
    chart.push({
      year: y,
      p10: pct(0.10), p25: pct(0.25), p50: pct(0.50),
      p75: pct(0.75), p90: pct(0.90),
      median: pct(0.50),
    });
  }

  // Valeurs finales
  const finalValues = paths.map(p => p[years]).sort((a, b) => a - b);
  const nPos    = finalValues.filter(v => v > capital).length;
  const nDouble = finalValues.filter(v => v >= capital * 2).length;
  const nHalf   = finalValues.filter(v => v < capital / 2).length;

  const pct = (p: number) => finalValues[Math.floor(p * (nSim - 1))];

  return {
    chart,
    finalValues,
    probPositive: nPos / nSim,
    probDouble:   nDouble / nSim,
    probHalf:     nHalf / nSim,
    median:       pct(0.50),
    p10:          pct(0.10),
    p90:          pct(0.90),
    worstCase:    finalValues[0],
    bestCase:     finalValues[nSim - 1],
    samplePaths,
  };
}

// ── Histogramme des valeurs finales ─────────────────────────
function buildHistogram(values: number[], bins = 30): { x: number; count: number; pct: number }[] {
  const min = values[0];
  const max = values[values.length - 1];
  const step = (max - min) / bins;
  const hist = Array.from({ length: bins }, (_, i) => ({
    x: min + i * step + step / 2,
    count: 0, pct: 0,
  }));
  for (const v of values) {
    const i = Math.min(Math.floor((v - min) / step), bins - 1);
    hist[i].count++;
  }
  const maxCount = Math.max(...hist.map(h => h.count));
  hist.forEach(h => h.pct = h.count / values.length * 100);
  return hist;
}

// ── Tooltip fan chart ────────────────────────────────────────
function FanTooltip({ active, payload, label }: { active?:boolean; payload?:{value:number;name:string}[]; label?:number }) {
  if (!active || !payload?.length) return null;
  const get = (name: string) => payload.find(p => p.name === name)?.value ?? 0;
  return (
    <div style={{ background:NAVY, borderRadius:8, padding:"12px 16px", boxShadow:"0 4px 20px rgba(0,0,0,.25)", minWidth:160 }}>
      <div style={{ color:"rgba(255,255,255,.4)", fontSize:10, marginBottom:8, letterSpacing:".08em" }}>AN {label}</div>
      {[["90e pct.", "p90", "#4ADE80"], ["Médiane", "p50", "white"], ["10e pct.", "p10", "#F87171"]].map(([lbl, key, col]) => (
        <div key={key} style={{ display:"flex", justifyContent:"space-between", gap:16, marginBottom:4 }}>
          <span style={{ fontSize:11, color:"rgba(255,255,255,.5)" }}>{lbl}</span>
          <span style={{ fontSize:11, fontWeight:600, color:col }}>{feur(get(key))}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label:string; value:string; sub?:string; color?:string }) {
  return (
    <div style={{ background:"white", borderRadius:12, padding:"20px 22px" }}>
      <div style={{ fontSize:9, fontWeight:600, letterSpacing:".14em", color:"#8A9BB0", marginBottom:8 }}>{label}</div>
      <div style={{ fontFamily:"'Cormorant Garant',serif", fontSize:28, fontWeight:300, color:color??NAVY, letterSpacing:"-.02em", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#8A9BB0", marginTop:5, fontWeight:300 }}>{sub}</div>}
    </div>
  );
}

const PRESETS = [
  { label:"Prudent",    ret:5,  vol:8,  desc:"Obligations + ETF défensifs" },
  { label:"Équilibré",  ret:8,  vol:15, desc:"MSCI World — profil standard" },
  { label:"Dynamique",  ret:11, vol:20, desc:"Actions croissance" },
  { label:"Agressif",   ret:15, vol:28, desc:"Tech + Crypto" },
];

export default function MonteCarloPage() {
  const [capital,    setCapital]    = useState(50000);
  const [years,      setYears]      = useState(20);
  const [retPct,     setRetPct]     = useState(8);
  const [volPct,     setVolPct]     = useState(15);
  const [running,    setRunning]    = useState(false);
  const [result,     setResult]     = useState<SimSummary | null>(null);
  const [histData,   setHistData]   = useState<ReturnType<typeof buildHistogram>>([]);
  const [progress,   setProgress]   = useState(0);

  const run = useCallback(() => {
    setRunning(true);
    setProgress(0);
    // Simuler le chargement en 3 étapes
    let p = 0;
    const iv = setInterval(() => {
      p += 33;
      setProgress(Math.min(p, 95));
      if (p >= 95) clearInterval(iv);
    }, 120);
    // Calcul en setTimeout pour laisser le UI se mettre à jour
    setTimeout(() => {
      const res = runMonteCarlo(capital, years, retPct / 100, volPct / 100, 1000);
      setResult(res);
      setHistData(buildHistogram(res.finalValues, 28));
      setProgress(100);
      clearInterval(iv);
      setTimeout(() => setRunning(false), 200);
    }, 350);
  }, [capital, years, retPct, volPct]);

  const median = result?.median ?? 0;
  const gain   = median - capital;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;1,300&family=Inter:wght@300;400;500&display=swap');
        .mc { padding:40px 48px; background:#F5F4F1; min-height:100%; font-family:'Inter',sans-serif; }
        .mc-ey { font-size:9px; font-weight:500; letter-spacing:.18em; color:${NAVY_MID}; margin-bottom:12px; }
        .mc-h1 { font-family:'Cormorant Garant',serif; font-size:clamp(32px,4vw,46px); font-weight:300; color:${NAVY}; letter-spacing:-.02em; line-height:1.05; margin-bottom:10px; }
        .mc-sub { font-size:12.5px; font-weight:300; color:#4B5563; line-height:1.75; margin-bottom:36px; max-width:580px; }
        .card { background:white; border-radius:14px; padding:24px; margin-bottom:16px; }
        .card-title { font-size:13px; font-weight:600; color:${NAVY}; margin-bottom:6px; }
        .card-sub { font-size:11px; color:#8A9BB0; font-weight:300; margin-bottom:18px; line-height:1.6; }
        .preset-btn { padding:8px 16px; border-radius:8px; border:1.5px solid; font-size:11px; font-weight:500; cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.15s; }
        .preset-btn.on { background:${NAVY}; color:white; border-color:${NAVY}; }
        .preset-btn.off { background:white; color:${NAVY}; border-color:rgba(10,22,40,.12); }
        .preset-btn.off:hover { border-color:${NAVY}; }
        .slider-label { font-size:9px; font-weight:500; letter-spacing:.14em; color:#8A9BB0; display:block; margin-bottom:8px; }
        .slider-val { font-family:'Cormorant Garant',serif; font-size:24px; font-weight:300; color:${NAVY}; margin-bottom:8px; letter-spacing:-.02em; }
        input[type=range] { width:100%; height:2px; background:rgba(10,22,40,.1); outline:none; -webkit-appearance:none; cursor:pointer; border-radius:1px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:${NAVY}; cursor:pointer; border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,.2); }
        .run-btn { font-family:'Inter',sans-serif; font-size:10px; font-weight:500; letter-spacing:.16em; background:${NAVY}; color:white; border:none; padding:16px 48px; cursor:pointer; transition:opacity 0.2s; }
        .run-btn:hover { opacity:.82; }
        .run-btn:disabled { opacity:.5; cursor:not-allowed; }
        .stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:16px; }
        .stat-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px; }
        .params-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:24px; }
        .prog-bar { height:3px; background:rgba(10,22,40,.07); border-radius:2px; overflow:hidden; margin-top:12px; }
        .prog-fill { height:100%; background:${NAVY}; transition:width 0.3s ease; border-radius:2px; }
        .explain-box { background:rgba(30,58,110,.04); border:1px solid rgba(30,58,110,.08); border-radius:10px; padding:16px 20px; margin-bottom:16px; }
        .explain-title { font-size:10px; font-weight:600; letter-spacing:.12em; color:${NAVY_MID}; margin-bottom:8px; }
        .explain-text { font-size:12px; color:#4B5563; line-height:1.75; font-weight:300; }
        .explain-text strong { color:${NAVY}; font-weight:500; }
        .prob-bar-wrap { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
        .prob-bar-bg { flex:1; height:6px; background:rgba(10,22,40,.07); border-radius:3px; overflow:hidden; }
        .prob-bar-fill { height:100%; border-radius:3px; transition:width 0.8s cubic-bezier(.4,0,.2,1); }
      `}</style>

      <div className="mc">
        <div className="mc-ey">SIMULATION · MONTE CARLO</div>
        <h1 className="mc-h1">1 000 futurs possibles<br/>de votre portefeuille.</h1>
        <p className="mc-sub">
          La méthode Monte Carlo simule des milliers de trajectoires de marché aléatoires pour estimer 
          la distribution des résultats possibles. Elle répond à la vraie question : <strong style={{color:NAVY,fontWeight:500}}>combien aurai-je 
          dans X ans, dans le pire cas, le cas médian, et le meilleur cas ?</strong>
        </p>

        {/* Paramètres */}
        <div className="card" style={{marginBottom:16}}>
          <div className="card-title">Paramètres de simulation</div>
          <div className="card-sub">Choisissez un profil ou ajustez manuellement le rendement et la volatilité estimés.</div>

          {/* Presets */}
          <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
            {PRESETS.map(p => {
              const on = retPct===p.ret && volPct===p.vol;
              return (
                <button key={p.label} onClick={()=>{setRetPct(p.ret);setVolPct(p.vol);}}
                  className={`preset-btn ${on?"on":"off"}`}>
                  <div>{p.label}</div>
                  <div style={{fontSize:9,opacity:.6,marginTop:2,fontWeight:400}}>{p.desc}</div>
                </button>
              );
            })}
          </div>

          <div className="params-grid">
            <div>
              <label className="slider-label">CAPITAL DE DÉPART</label>
              <div className="slider-val">{feur(capital)}</div>
              <input type="range" min={5000} max={500000} step={5000}
                value={capital} onChange={e=>setCapital(Number(e.target.value))}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:9,color:"#9CA3AF"}}>
                <span>5 k€</span><span>500 k€</span>
              </div>
            </div>
            <div>
              <label className="slider-label">HORIZON (ANNÉES)</label>
              <div className="slider-val">{years} <span style={{fontSize:14,color:"#8A9BB0",fontFamily:"'Inter',sans-serif",fontWeight:300}}>ans</span></div>
              <input type="range" min={5} max={40} step={1}
                value={years} onChange={e=>setYears(Number(e.target.value))}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:9,color:"#9CA3AF"}}>
                <span>5 ans</span><span>40 ans</span>
              </div>
            </div>
            <div>
              <label className="slider-label">RENDEMENT ANNUEL ESTIMÉ</label>
              <div className="slider-val" style={{color:retPct>=8?"#16A34A":retPct>=5?"#92400E":"#DC2626"}}>{retPct}%</div>
              <input type="range" min={1} max={20} step={0.5}
                value={retPct} onChange={e=>setRetPct(Number(e.target.value))}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:9,color:"#9CA3AF"}}>
                <span>1%</span><span>20%</span>
              </div>
            </div>
            <div>
              <label className="slider-label">VOLATILITÉ ANNUELLE</label>
              <div className="slider-val" style={{color:volPct<=10?"#16A34A":volPct<=18?"#92400E":"#DC2626"}}>{volPct}%</div>
              <input type="range" min={3} max={50} step={1}
                value={volPct} onChange={e=>setVolPct(Number(e.target.value))}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:9,color:"#9CA3AF"}}>
                <span>3% (stable)</span><span>50% (crypto)</span>
              </div>
            </div>
          </div>

          <div style={{marginTop:28,display:"flex",alignItems:"center",gap:20}}>
            <button onClick={run} disabled={running} className="run-btn">
              {running ? "SIMULATION EN COURS..." : "LANCER LA SIMULATION →"}
            </button>
            {running && (
              <div style={{flex:1,maxWidth:200}}>
                <div style={{fontSize:10,color:"#8A9BB0",marginBottom:4}}>1 000 trajectoires calculées…</div>
                <div className="prog-bar"><div className="prog-fill" style={{width:`${progress}%`}}/></div>
              </div>
            )}
          </div>
        </div>

        {/* Explication de lecture */}
        {!result && !running && (
          <div className="explain-box">
            <div className="explain-title">COMMENT LIRE LES RÉSULTATS ?</div>
            <div className="explain-text">
              La simulation va générer <strong>1 000 scénarios de marché différents</strong> sur votre horizon.
              Vous verrez un graphique en "éventail" : la zone <strong style={{color:"#16A34A"}}>verte</strong> représente les 50% de meilleurs cas,
              la zone <strong style={{color:"#DC2626"}}>rouge</strong> les 50% de moins bons cas.
              La <strong>ligne du milieu</strong> est votre résultat médian — c'est-à-dire le scénario au-dessus duquel
              se trouvent exactement 50% des simulations.
            </div>
          </div>
        )}

        {/* Résultats */}
        {result && (
          <>
            {/* KPIs */}
            <div className="stat-grid">
              <StatCard
                label="MÉDIANE (50e PERCENTILE)"
                value={feur(result.median)}
                sub={`+${feur(gain)} vs capital initial`}
                color={NAVY}
              />
              <StatCard
                label="SCÉNARIO FAVORABLE (90e PCT)"
                value={feur(result.p90)}
                sub="Meilleurs 10% des cas"
                color="#16A34A"
              />
              <StatCard
                label="SCÉNARIO DÉFAVORABLE (10e PCT)"
                value={feur(result.p10)}
                sub="Pires 10% des cas"
                color="#DC2626"
              />
              <StatCard
                label="RENDEMENT × VOLATILITÉ"
                value={`${retPct}% / ${volPct}%`}
                sub={`Ratio Sharpe ≈ ${((retPct - 2.5) / volPct).toFixed(2)}`}
              />
            </div>

            {/* Probabilités */}
            <div className="card">
              <div className="card-title">Probabilités de résultat</div>
              <div className="card-sub">Sur {years} ans, avec ces paramètres, voici ce que dit la simulation.</div>
              {[
                { label:`Probabilité de ne pas perdre d'argent`, pct:result.probPositive*100, col:"#16A34A" },
                { label:`Probabilité de doubler le capital (×2)`,  pct:result.probDouble*100,   col:"#1E3A6E" },
                { label:`Probabilité de perdre plus de 50%`,       pct:result.probHalf*100,     col:"#DC2626" },
              ].map(({label, pct, col}) => (
                <div key={label} className="prob-bar-wrap">
                  <div style={{width:320,fontSize:12,color:"#3D4F63",fontWeight:300,flexShrink:0}}>{label}</div>
                  <div className="prob-bar-bg">
                    <div className="prob-bar-fill" style={{width:`${pct}%`,background:col}}/>
                  </div>
                  <div style={{width:48,textAlign:"right",fontSize:13,fontWeight:700,color:col,flexShrink:0}}>
                    {pct.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>

            {/* Fan chart */}
            <div className="card">
              <div className="card-title">Éventail des trajectoires</div>
              <div className="card-sub">
                Zone verte foncée = 80% des scénarios (P10–P90). Zone verte claire = 50% centraux (P25–P75). Ligne blanche = médiane.
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={result.chart} margin={{top:10,right:16,left:16,bottom:0}}>
                  <defs>
                    <linearGradient id="bandOuter" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={NAVY_MID} stopOpacity={0.15}/>
                      <stop offset="100%" stopColor={NAVY_MID} stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="bandInner" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={NAVY_MID} stopOpacity={0.3}/>
                      <stop offset="100%" stopColor={NAVY_MID} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false}
                    tickFormatter={v => v===0?"Départ":`An ${v}`} interval={Math.floor(years/5)}/>
                  <YAxis tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false}
                    tickFormatter={v => feur(v)} width={72}/>
                  <Tooltip content={<FanTooltip/>}/>
                  <ReferenceLine y={capital} stroke="rgba(10,22,40,.2)" strokeDasharray="4 4"
                    label={{value:"Capital initial",position:"left",fontSize:9,fill:"#8A9BB0"}}/>
                  {/* Bande P10–P90 */}
                  <Area type="monotone" dataKey="p90" stroke="none" fill="url(#bandOuter)" fillOpacity={1} name="p90"/>
                  <Area type="monotone" dataKey="p10" stroke="none" fill="#F5F4F1" fillOpacity={1} name="p10"/>
                  {/* Bande P25–P75 */}
                  <Area type="monotone" dataKey="p75" stroke="none" fill="url(#bandInner)" fillOpacity={1} name="p75"/>
                  <Area type="monotone" dataKey="p25" stroke="none" fill="#F5F4F1" fillOpacity={1} name="p25"/>
                  {/* Médiane */}
                  <Line type="monotone" dataKey="p50" stroke="white" strokeWidth={2.5}
                    dot={false} name="p50"
                    activeDot={{r:5,fill:NAVY,stroke:"white",strokeWidth:2}}/>
                  {/* Lignes P10 / P90 */}
                  <Line type="monotone" dataKey="p90" stroke="#4ADE80" strokeWidth={1.2}
                    dot={false} strokeDasharray="3 2" name="p90"/>
                  <Line type="monotone" dataKey="p10" stroke="#F87171" strokeWidth={1.2}
                    dot={false} strokeDasharray="3 2" name="p10"/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Histogramme valeurs finales */}
            <div className="card">
              <div className="card-title">Distribution des valeurs finales</div>
              <div className="card-sub">
                Chaque barre représente un groupe de scénarios ayant abouti à une valeur proche. 
                La ligne verticale est votre capital de départ.
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={histData} margin={{top:5,right:16,left:16,bottom:0}}>
                  <XAxis dataKey="x" tick={{fontSize:9,fill:"#aaa"}} tickLine={false} axisLine={false}
                    tickFormatter={v=>feur(v)} interval={Math.floor(histData.length/5)}/>
                  <YAxis tick={{fontSize:9,fill:"#aaa"}} tickLine={false} axisLine={false}
                    tickFormatter={v=>`${v.toFixed(1)}%`} width={44}/>
                  <Tooltip
                    contentStyle={{background:NAVY,border:"none",borderRadius:8,fontSize:11,color:"white"}}
                    formatter={(v:number,_:string,p:{payload:{x:number}}) => [
                      `${v.toFixed(1)}% des simulations`,
                      `Valeur finale ≈ ${feur(p.payload.x)}`,
                    ]}
                    labelFormatter={() => ""}
                  />
                  <ReferenceLine x={capital} stroke="rgba(10,22,40,.4)" strokeDasharray="3 2"/>
                  {histData.map((entry, i) => (
                    <Bar key={i} dataKey="pct" isAnimationActive={false}>
                      {histData.map((e, j) => (
                        <Cell key={j} fill={e.x >= capital ? "#1E3A6E" : "#FCA5A5"}
                          fillOpacity={j===i?1:0.7}/>
                      ))}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div style={{display:"flex",gap:16,marginTop:10}}>
                {[["#1E3A6E","Supérieur au capital initial"],["#FCA5A5","Inférieur au capital initial"]].map(([col,lbl])=>(
                  <div key={lbl} style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:10,height:10,borderRadius:2,background:col}}/>
                    <span style={{fontSize:10,color:"#8A9BB0"}}>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interprétation */}
            <div className="explain-box">
              <div className="explain-title">CE QUE DIT CETTE SIMULATION</div>
              <div className="explain-text">
                En investissant <strong>{feur(capital)}</strong> pendant <strong>{years} ans</strong> avec un rendement 
                annuel de <strong>{retPct}%</strong> et une volatilité de <strong>{volPct}%</strong> :<br/><br/>
                • Dans <strong style={{color:"#16A34A"}}>le meilleur cas probable</strong> (90e percentile), vous atteignez <strong style={{color:"#16A34A"}}>{feur(result.p90)}</strong>.<br/>
                • Dans <strong>le cas médian</strong> (50 simulations sur 100), vous avez <strong>{feur(result.median)}</strong>.<br/>
                • Dans <strong style={{color:"#DC2626"}}>le pire cas probable</strong> (10e percentile), vous avez <strong style={{color:"#DC2626"}}>{feur(result.p10)}</strong>.<br/><br/>
                <strong style={{color:NAVY}}>Important :</strong> Cette simulation est basée sur un modèle statistique (mouvement brownien géométrique).
                Elle ne prédit pas l'avenir — elle quantifie l'incertitude. Les marchés réels peuvent s'écarter significativement de ce modèle.
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
