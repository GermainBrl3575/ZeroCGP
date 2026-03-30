"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { supabase } from "@/lib/supabase";

// ── Base de corrélations (données historiques 5 ans) ──────────
const CORR_DB: Record<string, Record<string, number>> = {
  "CSPX": { "CSPX":1.00,"IWDA":0.96,"VWCE":0.94,"EQQQ":0.88,"MC":0.62,"AAPL":0.82,"MSFT":0.85,"BTC":0.28,"ETH":0.25,"ASML":0.71,"NOVO":0.48,"PAEEM":0.58,"AIR":0.64,"NVDA":0.78,"TSLA":0.52 },
  "IWDA": { "CSPX":0.96,"IWDA":1.00,"VWCE":0.98,"EQQQ":0.85,"MC":0.68,"AAPL":0.79,"MSFT":0.82,"BTC":0.24,"ETH":0.21,"ASML":0.74,"NOVO":0.52,"PAEEM":0.65,"AIR":0.66,"NVDA":0.74,"TSLA":0.48 },
  "VWCE": { "CSPX":0.94,"IWDA":0.98,"VWCE":1.00,"EQQQ":0.82,"MC":0.70,"AAPL":0.77,"MSFT":0.80,"BTC":0.22,"ETH":0.20,"ASML":0.72,"NOVO":0.54,"PAEEM":0.68,"AIR":0.67,"NVDA":0.72,"TSLA":0.46 },
  "EQQQ": { "CSPX":0.88,"IWDA":0.85,"VWCE":0.82,"EQQQ":1.00,"MC":0.58,"AAPL":0.88,"MSFT":0.90,"BTC":0.32,"ETH":0.28,"ASML":0.78,"NOVO":0.42,"PAEEM":0.52,"AIR":0.56,"NVDA":0.88,"TSLA":0.62 },
  "MC":   { "CSPX":0.62,"IWDA":0.68,"VWCE":0.70,"EQQQ":0.58,"MC":1.00,"AAPL":0.54,"MSFT":0.56,"BTC":0.14,"ETH":0.12,"ASML":0.62,"NOVO":0.38,"PAEEM":0.58,"AIR":0.72,"NVDA":0.48,"TSLA":0.36 },
  "AAPL": { "CSPX":0.82,"IWDA":0.79,"VWCE":0.77,"EQQQ":0.88,"MC":0.54,"AAPL":1.00,"MSFT":0.86,"BTC":0.30,"ETH":0.26,"ASML":0.72,"NOVO":0.40,"PAEEM":0.50,"AIR":0.52,"NVDA":0.82,"TSLA":0.58 },
  "MSFT": { "CSPX":0.85,"IWDA":0.82,"VWCE":0.80,"EQQQ":0.90,"MC":0.56,"AAPL":0.86,"MSFT":1.00,"BTC":0.28,"ETH":0.24,"ASML":0.76,"NOVO":0.42,"PAEEM":0.52,"AIR":0.54,"NVDA":0.85,"TSLA":0.55 },
  "BTC":  { "CSPX":0.28,"IWDA":0.24,"VWCE":0.22,"EQQQ":0.32,"MC":0.14,"AAPL":0.30,"MSFT":0.28,"BTC":1.00,"ETH":0.88,"ASML":0.20,"NOVO":0.08,"PAEEM":0.18,"AIR":0.12,"NVDA":0.35,"TSLA":0.42 },
  "ETH":  { "CSPX":0.25,"IWDA":0.21,"VWCE":0.20,"EQQQ":0.28,"MC":0.12,"AAPL":0.26,"MSFT":0.24,"BTC":0.88,"ETH":1.00,"ASML":0.18,"NOVO":0.06,"PAEEM":0.16,"AIR":0.10,"NVDA":0.30,"TSLA":0.38 },
  "ASML": { "CSPX":0.71,"IWDA":0.74,"VWCE":0.72,"EQQQ":0.78,"MC":0.62,"AAPL":0.72,"MSFT":0.76,"BTC":0.20,"ETH":0.18,"ASML":1.00,"NOVO":0.44,"PAEEM":0.56,"AIR":0.60,"NVDA":0.76,"TSLA":0.50 },
  "NOVO": { "CSPX":0.48,"IWDA":0.52,"VWCE":0.54,"EQQQ":0.42,"MC":0.38,"AAPL":0.40,"MSFT":0.42,"BTC":0.08,"ETH":0.06,"ASML":0.44,"NOVO":1.00,"PAEEM":0.36,"AIR":0.34,"NVDA":0.38,"TSLA":0.28 },
  "PAEEM":{ "CSPX":0.58,"IWDA":0.65,"VWCE":0.68,"EQQQ":0.52,"MC":0.58,"AAPL":0.50,"MSFT":0.52,"BTC":0.18,"ETH":0.16,"ASML":0.56,"NOVO":0.36,"PAEEM":1.00,"AIR":0.54,"NVDA":0.46,"TSLA":0.38 },
  "AIR":  { "CSPX":0.64,"IWDA":0.66,"VWCE":0.67,"EQQQ":0.56,"MC":0.72,"AAPL":0.52,"MSFT":0.54,"BTC":0.12,"ETH":0.10,"ASML":0.60,"NOVO":0.34,"PAEEM":0.54,"AIR":1.00,"NVDA":0.50,"TSLA":0.38 },
  "NVDA": { "CSPX":0.78,"IWDA":0.74,"VWCE":0.72,"EQQQ":0.88,"MC":0.48,"AAPL":0.82,"MSFT":0.85,"BTC":0.35,"ETH":0.30,"ASML":0.76,"NOVO":0.38,"PAEEM":0.46,"AIR":0.50,"NVDA":1.00,"TSLA":0.62 },
  "TSLA": { "CSPX":0.52,"IWDA":0.48,"VWCE":0.46,"EQQQ":0.62,"MC":0.36,"AAPL":0.58,"MSFT":0.55,"BTC":0.42,"ETH":0.38,"ASML":0.50,"NOVO":0.28,"PAEEM":0.38,"AIR":0.38,"NVDA":0.62,"TSLA":1.00 },
};

const TYPE_COLOR: Record<string, string> = {
  etf:"#2563EB", stock:"#16A34A", crypto:"#D97706", default:"#6B7280",
};

function getCorr(a: string, b: string): number {
  const ka = a.split(".")[0].split("-")[0].toUpperCase();
  const kb = b.split(".")[0].split("-")[0].toUpperCase();
  if (ka === kb) return 1.0;
  return CORR_DB[ka]?.[kb] ?? CORR_DB[kb]?.[ka] ?? 0.5;
}

// Couleur du lien selon la corrélation
function linkColor(v: number): string {
  if (v >= 0.85) return "rgba(220,38,38,0.7)";   // très forte — rouge danger (redondant)
  if (v >= 0.70) return "rgba(251,146,60,0.55)";  // forte — orange
  if (v >= 0.50) return "rgba(250,204,21,0.45)";  // modérée — jaune
  if (v >= 0.30) return "rgba(74,222,128,0.4)";   // faible — vert clair
  return "rgba(99,102,241,0.35)";                  // très faible — violet (bon diversifiant)
}
function linkWidth(v: number): number {
  return Math.max(0.5, v * 4);
}

interface Node {
  id: string; label: string; type: string;
  x: number; y: number; vx: number; vy: number;
  weight: number; // poids dans le portefeuille (taille de la bulle)
}

interface Link { source: string; target: string; value: number; }

// Simulation de force (force-directed layout)
function useForceLayout(nodes: Node[], links: Link[], W: number, H: number) {
  const [positions, setPositions] = useState<Record<string, {x:number;y:number}>>({});
  const frameRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const tickRef  = useRef(0);

  useEffect(() => {
    if (!nodes.length || !W || !H) return;
    cancelAnimationFrame(frameRef.current);
    tickRef.current = 0;

    // Init positions en cercle
    const n = nodes.length;
    const state: Node[] = nodes.map((node, i) => ({
      ...node,
      x: W/2 + Math.cos((i / n) * 2 * Math.PI) * Math.min(W,H) * 0.32,
      y: H/2 + Math.sin((i / n) * 2 * Math.PI) * Math.min(W,H) * 0.32,
      vx: 0, vy: 0,
    }));
    nodesRef.current = state;

    function tick() {
      tickRef.current++;
      const cooling = Math.max(0.02, 1 - tickRef.current / 180);
      const s = nodesRef.current;

      // Répulsion entre nœuds
      for (let i = 0; i < s.length; i++) {
        for (let j = i + 1; j < s.length; j++) {
          const dx = s[j].x - s[i].x;
          const dy = s[j].y - s[i].y;
          const d  = Math.sqrt(dx*dx + dy*dy) || 1;
          const ri = 28 + s[i].weight * 24;
          const rj = 28 + s[j].weight * 24;
          const minD = ri + rj + 12;
          if (d < minD) {
            const f = ((minD - d) / d) * 0.4;
            s[i].vx -= dx * f; s[i].vy -= dy * f;
            s[j].vx += dx * f; s[j].vy += dy * f;
          }
          // Répulsion générale
          const rep = 3200 / (d * d);
          s[i].vx -= (dx / d) * rep; s[i].vy -= (dy / d) * rep;
          s[j].vx += (dx / d) * rep; s[j].vy += (dy / d) * rep;
        }
      }

      // Attraction par liens (selon corrélation)
      for (const link of links) {
        const si = s.find(n => n.id === link.source);
        const sj = s.find(n => n.id === link.target);
        if (!si || !sj) continue;
        const dx = sj.x - si.x;
        const dy = sj.y - si.y;
        const d  = Math.sqrt(dx*dx + dy*dy) || 1;
        // Plus corrélés = plus proches
        const idealDist = 80 + (1 - link.value) * 180;
        const f = ((d - idealDist) / d) * 0.06 * link.value;
        si.vx += dx * f; si.vy += dy * f;
        sj.vx -= dx * f; sj.vy -= dy * f;
      }

      // Centrage (gravity)
      for (const node of s) {
        node.vx += (W/2 - node.x) * 0.012;
        node.vy += (H/2 - node.y) * 0.012;
        // Appliquer + friction
        node.vx *= 0.78 * cooling;
        node.vy *= 0.78 * cooling;
        node.x  = Math.max(40, Math.min(W-40, node.x + node.vx));
        node.y  = Math.max(40, Math.min(H-40, node.y + node.vy));
      }

      nodesRef.current = [...s];
      const pos: Record<string, {x:number;y:number}> = {};
      s.forEach(n => { pos[n.id] = {x:n.x, y:n.y}; });
      setPositions(pos);

      if (tickRef.current < 200) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [nodes.map(n=>n.id).join(","), W, H]);

  return positions;
}

// ── Composant réseau SVG ──────────────────────────────────────
function NetworkGraph({ nodes, links, W, H }: {
  nodes: Node[]; links: Link[]; W: number; H: number;
}) {
  const positions = useForceLayout(nodes, links, W, H);
  const [hovered, setHovered] = useState<string | null>(null);

  if (!nodes.length) return null;

  const hoveredLinks = hovered
    ? links.filter(l => l.source === hovered || l.target === hovered)
    : [];
  const hoveredNeighbors = new Set(hoveredLinks.flatMap(l => [l.source, l.target]));

  return (
    <svg width={W} height={H} style={{overflow:"visible"}}>
      <defs>
        {nodes.map(n => (
          <radialGradient key={n.id} id={`g_${n.id}`} cx="35%" cy="35%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0.15)"/>
          </radialGradient>
        ))}
      </defs>

      {/* Liens */}
      {links.map(link => {
        const ps = positions[link.source];
        const pt = positions[link.target];
        if (!ps || !pt) return null;
        const isHov = hovered && (link.source === hovered || link.target === hovered);
        const fade  = hovered && !isHov;
        return (
          <line
            key={`${link.source}-${link.target}`}
            x1={ps.x} y1={ps.y} x2={pt.x} y2={pt.y}
            stroke={linkColor(link.value)}
            strokeWidth={isHov ? linkWidth(link.value) * 1.8 : linkWidth(link.value)}
            strokeOpacity={fade ? 0.06 : 1}
            style={{transition:"stroke-opacity .2s, stroke-width .15s"}}
          />
        );
      })}

      {/* Label de corrélation sur les liens survolés */}
      {hoveredLinks.map(link => {
        const ps = positions[link.source];
        const pt = positions[link.target];
        if (!ps || !pt) return null;
        const mx = (ps.x + pt.x) / 2;
        const my = (ps.y + pt.y) / 2;
        return (
          <g key={`lbl_${link.source}_${link.target}`}>
            <rect x={mx-18} y={my-9} width={36} height={16} rx={4}
              fill="#0A1628" fillOpacity={0.85}/>
            <text x={mx} y={my+4} textAnchor="middle"
              style={{fontSize:9,fontWeight:700,fill:"white",fontFamily:"'Inter',sans-serif"}}>
              {link.value.toFixed(2)}
            </text>
          </g>
        );
      })}

      {/* Bulles */}
      {nodes.map(node => {
        const pos = positions[node.id];
        if (!pos) return null;
        const r     = 26 + node.weight * 26;
        const col   = TYPE_COLOR[node.type] ?? TYPE_COLOR.default;
        const fade  = hovered && !hoveredNeighbors.has(node.id) && node.id !== hovered;
        const isHov = node.id === hovered;

        return (
          <g key={node.id}
            style={{cursor:"pointer",transition:"opacity .2s"}}
            opacity={fade ? 0.18 : 1}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Halo */}
            {isHov && (
              <circle cx={pos.x} cy={pos.y} r={r+8}
                fill={col} fillOpacity={0.12}
                stroke={col} strokeOpacity={0.3} strokeWidth={1}/>
            )}
            {/* Cercle principal */}
            <circle cx={pos.x} cy={pos.y} r={r}
              fill={col}
              fillOpacity={isHov ? 1 : 0.82}
              stroke="white" strokeWidth={isHov ? 2.5 : 1.5}
              style={{transition:"r .2s, fill-opacity .15s"}}
            />
            {/* Reflet */}
            <circle cx={pos.x} cy={pos.y} r={r}
              fill={`url(#g_${node.id})`}
            />
            {/* Label */}
            <text x={pos.x} y={pos.y - (r > 36 ? 4 : 2)} textAnchor="middle"
              style={{
                fontSize: r > 36 ? 12 : 10,
                fontWeight: 700,
                fill: "white",
                fontFamily: "'Inter',sans-serif",
                letterSpacing: "0.04em",
                pointerEvents: "none",
                textShadow: "0 1px 3px rgba(0,0,0,.4)",
              }}>
              {node.label}
            </text>
            {node.weight > 0.04 && (
              <text x={pos.x} y={pos.y + (r > 36 ? 14 : 11)} textAnchor="middle"
                style={{
                  fontSize: r > 36 ? 10 : 8,
                  fill: "rgba(255,255,255,0.7)",
                  fontFamily: "'Inter',sans-serif",
                  pointerEvents: "none",
                }}>
                {(node.weight * 100).toFixed(0)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Page principale ───────────────────────────────────────────
const DEFAULT_SYMBOLS = [
  {id:"CSPX",type:"etf"},{id:"IWDA",type:"etf"},{id:"EQQQ",type:"etf"},
  {id:"AAPL",type:"stock"},{id:"MSFT",type:"stock"},{id:"NVDA",type:"stock"},
  {id:"BTC",type:"crypto"},{id:"ETH",type:"crypto"},
  {id:"PAEEM",type:"etf"},{id:"MC",type:"stock"},
];

const CORR_THRESHOLD = 0.30; // on n'affiche les liens que si corrélation > seuil

function CorrInner() {
  const svgRef      = useRef<HTMLDivElement>(null);
  const [W, setW]   = useState(800);
  const [source,    setSource]    = useState<"portfolio"|"custom">("custom");
  const [portfolios,setPortfolios]= useState<{id:string;name:string;type:string}[]>([]);
  const [selPfId,   setSelPfId]   = useState("");
  const [items,     setItems]     = useState(DEFAULT_SYMBOLS);
  const [input,     setInput]     = useState("");
  const [threshold, setThreshold] = useState(0.30);
  const [hovInfo,   setHovInfo]   = useState<{node:string;neighbors:{sym:string;val:number}[]}|null>(null);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setW(Math.floor(w));
    });
    if (svgRef.current) obs.observe(svgRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from("portfolios").select("id,name,type")
        .eq("user_id", data.user.id)
        .then(({ data: pfs }) => { if (pfs) setPortfolios(pfs); });
    });
  }, []);

  async function loadPf(id: string) {
    const { data: raw } = await supabase
      .from("portfolio_assets").select("symbol,type,quantity,target_amount,weight")
      .eq("portfolio_id", id);
    if (!raw) return;
    const tot = raw.reduce((s: number, a: {quantity:number;target_amount?:number}) => s + (a.target_amount || a.quantity * 100), 0);
    setItems(raw.map((a: {symbol:string;type:string;quantity:number;target_amount?:number;weight?:number}) => ({
      id: a.symbol.split(".")[0].split("-")[0].toUpperCase(),
      type: a.type,
      weight: tot > 0 ? (a.target_amount || a.quantity * 100) / tot : 1 / raw.length,
    })));
  }

  const nodes: Node[] = items.map((it, i) => ({
    id:     it.id,
    label:  it.id,
    type:   it.type ?? "etf",
    x:      0, y: 0, vx: 0, vy: 0,
    weight: (it as {weight?:number}).weight ?? (1 / items.length),
  }));

  const links: Link[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const v = getCorr(nodes[i].id, nodes[j].id);
      if (v >= threshold) links.push({ source: nodes[i].id, target: nodes[j].id, value: v });
    }
  }

  // Trie les voisins par corrélation pour l'info-panel
  function getNeighbors(nodeId: string) {
    return links
      .filter(l => l.source === nodeId || l.target === nodeId)
      .map(l => ({ sym: l.source === nodeId ? l.target : l.source, val: l.value }))
      .sort((a, b) => b.val - a.val);
  }

  const H = Math.max(400, Math.min(600, W * 0.65));

  // Score de diversification global (moyenne des 1 - corrélations)
  const avgCorr = links.length > 0
    ? links.reduce((s, l) => s + l.value, 0) / links.length
    : 0;
  const divScore = Math.round((1 - avgCorr) * 100);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;1,300&family=Inter:wght@300;400;500&display=swap');
    .cr{padding:40px 48px;background:#F5F4F1;min-height:100%;font-family:'Inter',sans-serif}
    .ey{font-size:9px;font-weight:500;letter-spacing:.18em;color:#1E3A6E;margin-bottom:12px}
    .h1{font-family:'Cormorant Garant',serif;font-size:clamp(30px,4vw,44px);font-weight:300;color:#0A1628;letter-spacing:-.02em;line-height:1.05;margin-bottom:10px}
    .sub{font-size:12px;font-weight:300;color:#4B5563;line-height:1.75;margin-bottom:28px;max-width:580px}
    .card{background:white;border-radius:14px;padding:24px;margin-bottom:14px}
    .ct{font-size:13px;font-weight:600;color:#0A1628;margin-bottom:6px}
    .cs{font-size:11px;color:#8A9BB0;font-weight:300;margin-bottom:14px;line-height:1.6}
    .src-row{display:flex;gap:8px;margin-bottom:14px}
    .src-btn{flex:1;padding:12px;border-radius:8px;border:1.5px solid;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;text-align:center;font-size:11px;font-weight:500}
    .src-btn.on{background:#0A1628;border-color:#0A1628;color:white}
    .src-btn.off{background:white;border-color:rgba(10,22,40,.1);color:#0A1628}
    .pf-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:8px;border:1.5px solid;cursor:pointer;margin-bottom:6px;transition:all .15s;font-size:12px;font-family:'Inter',sans-serif}
    .pf-item.on{background:#0A1628;border-color:#0A1628;color:white}
    .pf-item.off{background:white;border-color:rgba(10,22,40,.1);color:#0A1628}
    .chip{display:inline-flex;align-items:center;gap:6px;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:600;color:white;margin:3px;cursor:default}
    .cdel{background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:14px;line-height:1;padding:0;margin-left:2px}
    .cdel:hover{color:white}
    .add-inp{background:white;border:1px solid rgba(10,22,40,.12);border-radius:6px;padding:8px 12px;font-size:12px;color:#0A1628;outline:none;font-family:'Inter',sans-serif;width:100px}
    .add-inp:focus{border-color:#0A1628}
    .add-btn{background:#0A1628;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:10px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;letter-spacing:.08em}
    .score-ring{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;border:3px solid}
    .insight-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(10,22,40,.05)}
    .insight-row:last-child{border-bottom:none}
    .sld{width:100%;height:2px;background:rgba(10,22,40,.1);outline:none;WebkitAppearance:none;cursor:pointer;border-radius:1px}
    .sld::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#0A1628;cursor:pointer;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.2)}
    .type-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  `;

  return (
    <>
      <style>{css}</style>
      <div className="cr">
        <div className="ey">ANALYSE · CORRÉLATION</div>
        <h1 className="h1">Réseau de corrélations<br/>de votre portefeuille.</h1>
        <p className="sub">
          Chaque bulle est un actif — sa taille reflète son poids dans le portefeuille.
          Les liens montrent la corrélation entre deux actifs :
          <strong style={{color:"#DC2626"}}> rouge</strong> = très liés (redondance),
          <strong style={{color:"#6366F1"}}> violet</strong> = indépendants (bonne diversification).
          Passez la souris sur une bulle pour explorer ses connexions.
        </p>

        {/* Paramètres */}
        <div className="card">
          <div className="ct">Source & actifs</div>
          <div className="src-row">
            <button className={`src-btn ${source==="portfolio"?"on":"off"}`} onClick={()=>setSource("portfolio")}>
              Portefeuille existant
            </button>
            <button className={`src-btn ${source==="custom"?"on":"off"}`} onClick={()=>setSource("custom")}>
              Actifs personnalisés
            </button>
          </div>

          {source==="portfolio" && (
            portfolios.length > 0 ? portfolios.map(pf => (
              <div key={pf.id} className={`pf-item ${selPfId===pf.id?"on":"off"}`}
                onClick={() => { setSelPfId(pf.id); loadPf(pf.id); }}>
                <span>{pf.name}</span>
                <span style={{fontSize:10,opacity:.6}}>{pf.type==="optimized"?"0CGP":"INIT"}</span>
              </div>
            )) : (
              <p style={{fontSize:12,color:"#8A9BB0",fontStyle:"italic"}}>
                Aucun portefeuille. Utilisez les actifs personnalisés.
              </p>
            )
          )}

          {source==="custom" && (
            <div>
              <div style={{marginBottom:10,lineHeight:2}}>
                {items.map(it => (
                  <span key={it.id} className="chip" style={{background:TYPE_COLOR[it.type]??"#6B7280"}}>
                    {it.id}
                    <button className="cdel" onClick={()=>setItems(p=>p.filter(x=>x.id!==it.id))}>×</button>
                  </span>
                ))}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <input className="add-inp" value={input}
                  onChange={e=>setInput(e.target.value)}
                  placeholder="Ex: NVDA"
                  onKeyDown={e=>{if(e.key==="Enter"){
                    const s=input.trim().toUpperCase().split(".")[0].split("-")[0];
                    if(s&&!items.find(x=>x.id===s)&&items.length<20)
                      setItems(p=>[...p,{id:s,type:"etf"}]);
                    setInput("");
                  }}}/>
                <button className="add-btn" onClick={()=>{
                  const s=input.trim().toUpperCase().split(".")[0].split("-")[0];
                  if(s&&!items.find(x=>x.id===s)&&items.length<20)
                    setItems(p=>[...p,{id:s,type:"etf"}]);
                  setInput("");
                }}>+ AJOUTER</button>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["ETF","Actions","Crypto"].map((t,i)=>{
                    const types=["etf","stock","crypto"];
                    return(
                      <div key={t} style={{display:"flex",alignItems:"center",gap:4}}>
                        <div className="type-dot" style={{background:Object.values(TYPE_COLOR)[i]}}/>
                        <span style={{fontSize:10,color:"#8A9BB0"}}>{t}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Seuil d'affichage des liens */}
          <div style={{marginTop:16,display:"flex",alignItems:"center",gap:14}}>
            <label style={{fontSize:9,fontWeight:500,letterSpacing:".12em",color:"#8A9BB0",flexShrink:0}}>
              AFFICHER LIENS ≥
            </label>
            <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:20,fontWeight:300,color:"#0A1628",flexShrink:0,width:36}}>
              {threshold.toFixed(2)}
            </div>
            <input type="range" min={0.1} max={0.9} step={0.05} value={threshold}
              className="sld" style={{flex:1,maxWidth:200}}
              onChange={e=>setThreshold(Number(e.target.value))}/>
            <span style={{fontSize:10,color:"#8A9BB0"}}>
              {links.length} lien{links.length>1?"s":""} affichés
            </span>
          </div>
        </div>

        {nodes.length >= 2 && (
          <>
            {/* Graphe */}
            <div className="card" style={{padding:16}}>
              <div ref={svgRef} style={{width:"100%"}}>
                <NetworkGraph nodes={nodes} links={links} W={W-32} H={H}/>
              </div>
            </div>

            {/* Légende des liens */}
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14,padding:"0 4px"}}>
              {[
                ["rgba(220,38,38,0.7)","≥ 0.85 — Très forte (redondance)"],
                ["rgba(251,146,60,0.55)","≥ 0.70 — Forte"],
                ["rgba(250,204,21,0.55)","≥ 0.50 — Modérée"],
                ["rgba(74,222,128,0.5)","≥ 0.30 — Faible"],
                ["rgba(99,102,241,0.45)","< 0.30 — Très faible (diversifiant)"],
              ].map(([col,lbl])=>(
                <div key={lbl} style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:24,height:3,background:col,borderRadius:2}}/>
                  <span style={{fontSize:10,color:"#8A9BB0"}}>{lbl}</span>
                </div>
              ))}
            </div>

            {/* Score de diversification + top insights */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>

              {/* Score global */}
              <div className="card">
                <div className="ct">Score de diversification</div>
                <div className="cs">Basé sur la corrélation moyenne entre tous les actifs.</div>
                <div style={{display:"flex",alignItems:"center",gap:20}}>
                  <div className="score-ring" style={{
                    borderColor:divScore>=65?"#16A34A":divScore>=45?"#D97706":"#DC2626",
                    color:divScore>=65?"#16A34A":divScore>=45?"#D97706":"#DC2626",
                  }}>
                    <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:28,fontWeight:300,lineHeight:1}}>{divScore}</div>
                    <div style={{fontSize:8,letterSpacing:".1em",opacity:.7}}>/100</div>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"#0A1628",marginBottom:4}}>
                      {divScore>=70?"Excellent":divScore>=55?"Bien":divScore>=40?"Moyen":"Faible"}
                    </div>
                    <div style={{fontSize:11,color:"#8A9BB0",fontWeight:300,lineHeight:1.6}}>
                      Corrélation moyenne : {avgCorr.toFixed(2)}<br/>
                      {divScore>=70?"Votre portefeuille est bien diversifié.":divScore>=55?"Quelques redondances à corriger.":"Forte concentration — manque de diversification."}
                    </div>
                  </div>
                </div>
              </div>

              {/* Meilleures paires */}
              <div className="card">
                <div className="ct" style={{color:"#16A34A"}}>✓ Meilleures paires</div>
                <div className="cs">Actifs les moins corrélés — meilleure diversification.</div>
                {links.sort((a,b)=>a.value-b.value).slice(0,4).map(l=>(
                  <div key={l.source+l.target} className="insight-row">
                    <div style={{flex:1,fontSize:12,fontWeight:600,color:"#0A1628"}}>{l.source} × {l.target}</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#16A34A"}}>{l.value.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Paires redondantes */}
              <div className="card">
                <div className="ct" style={{color:"#DC2626"}}>⚠ Paires redondantes</div>
                <div className="cs">Actifs très corrélés — apportent peu de diversification.</div>
                {links.sort((a,b)=>b.value-a.value).slice(0,4).map(l=>(
                  <div key={l.source+l.target} className="insight-row">
                    <div style={{flex:1,fontSize:12,fontWeight:600,color:"#0A1628"}}>{l.source} × {l.target}</div>
                    <div style={{fontSize:13,fontWeight:700,color:l.value>=0.85?"#DC2626":l.value>=0.7?"#D97706":"#F59E0B"}}>{l.value.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {nodes.length < 2 && (
          <div style={{textAlign:"center",padding:60,color:"#8A9BB0",fontSize:12}}>
            Ajoutez au moins 2 actifs pour voir le réseau de corrélations.
          </div>
        )}
      </div>
    </>
  );
}

export default function CorrPage() {
  return (
    <Suspense fallback={
      <div style={{padding:40,color:"#8A9BB0",fontSize:11,letterSpacing:".2em"}}>CHARGEMENT...</div>
    }>
      <CorrInner />
    </Suspense>
  );
}
