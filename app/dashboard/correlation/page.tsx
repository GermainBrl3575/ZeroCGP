"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { supabase } from "@/lib/supabase";

// ── Base corrélations ─────────────────────────────────────────
const CORR_DB: Record<string, Record<string, number>> = {
  "CSPX":{"CSPX":1.00,"IWDA":0.96,"VWCE":0.94,"EQQQ":0.88,"MC":0.62,"AAPL":0.82,"MSFT":0.85,"BTC":0.28,"ETH":0.25,"ASML":0.71,"NOVO":0.48,"PAEEM":0.58,"AIR":0.64,"NVDA":0.78,"TSLA":0.52},
  "IWDA":{"CSPX":0.96,"IWDA":1.00,"VWCE":0.98,"EQQQ":0.85,"MC":0.68,"AAPL":0.79,"MSFT":0.82,"BTC":0.24,"ETH":0.21,"ASML":0.74,"NOVO":0.52,"PAEEM":0.65,"AIR":0.66,"NVDA":0.74,"TSLA":0.48},
  "VWCE":{"CSPX":0.94,"IWDA":0.98,"VWCE":1.00,"EQQQ":0.82,"MC":0.70,"AAPL":0.77,"MSFT":0.80,"BTC":0.22,"ETH":0.20,"ASML":0.72,"NOVO":0.54,"PAEEM":0.68,"AIR":0.67,"NVDA":0.72,"TSLA":0.46},
  "EQQQ":{"CSPX":0.88,"IWDA":0.85,"VWCE":0.82,"EQQQ":1.00,"MC":0.58,"AAPL":0.88,"MSFT":0.90,"BTC":0.32,"ETH":0.28,"ASML":0.78,"NOVO":0.42,"PAEEM":0.52,"AIR":0.56,"NVDA":0.88,"TSLA":0.62},
  "MC":  {"CSPX":0.62,"IWDA":0.68,"VWCE":0.70,"EQQQ":0.58,"MC":1.00,"AAPL":0.54,"MSFT":0.56,"BTC":0.14,"ETH":0.12,"ASML":0.62,"NOVO":0.38,"PAEEM":0.58,"AIR":0.72,"NVDA":0.48,"TSLA":0.36},
  "AAPL":{"CSPX":0.82,"IWDA":0.79,"VWCE":0.77,"EQQQ":0.88,"MC":0.54,"AAPL":1.00,"MSFT":0.86,"BTC":0.30,"ETH":0.26,"ASML":0.72,"NOVO":0.40,"PAEEM":0.50,"AIR":0.52,"NVDA":0.82,"TSLA":0.58},
  "MSFT":{"CSPX":0.85,"IWDA":0.82,"VWCE":0.80,"EQQQ":0.90,"MC":0.56,"AAPL":0.86,"MSFT":1.00,"BTC":0.28,"ETH":0.24,"ASML":0.76,"NOVO":0.42,"PAEEM":0.52,"AIR":0.54,"NVDA":0.85,"TSLA":0.55},
  "BTC": {"CSPX":0.28,"IWDA":0.24,"VWCE":0.22,"EQQQ":0.32,"MC":0.14,"AAPL":0.30,"MSFT":0.28,"BTC":1.00,"ETH":0.88,"ASML":0.20,"NOVO":0.08,"PAEEM":0.18,"AIR":0.12,"NVDA":0.35,"TSLA":0.42},
  "ETH": {"CSPX":0.25,"IWDA":0.21,"VWCE":0.20,"EQQQ":0.28,"MC":0.12,"AAPL":0.26,"MSFT":0.24,"BTC":0.88,"ETH":1.00,"ASML":0.18,"NOVO":0.06,"PAEEM":0.16,"AIR":0.10,"NVDA":0.30,"TSLA":0.38},
  "ASML":{"CSPX":0.71,"IWDA":0.74,"VWCE":0.72,"EQQQ":0.78,"MC":0.62,"AAPL":0.72,"MSFT":0.76,"BTC":0.20,"ETH":0.18,"ASML":1.00,"NOVO":0.44,"PAEEM":0.56,"AIR":0.60,"NVDA":0.76,"TSLA":0.50},
  "NOVO":{"CSPX":0.48,"IWDA":0.52,"VWCE":0.54,"EQQQ":0.42,"MC":0.38,"AAPL":0.40,"MSFT":0.42,"BTC":0.08,"ETH":0.06,"ASML":0.44,"NOVO":1.00,"PAEEM":0.36,"AIR":0.34,"NVDA":0.38,"TSLA":0.28},
  "PAEEM":{"CSPX":0.58,"IWDA":0.65,"VWCE":0.68,"EQQQ":0.52,"MC":0.58,"AAPL":0.50,"MSFT":0.52,"BTC":0.18,"ETH":0.16,"ASML":0.56,"NOVO":0.36,"PAEEM":1.00,"AIR":0.54,"NVDA":0.46,"TSLA":0.38},
  "AIR": {"CSPX":0.64,"IWDA":0.66,"VWCE":0.67,"EQQQ":0.56,"MC":0.72,"AAPL":0.52,"MSFT":0.54,"BTC":0.12,"ETH":0.10,"ASML":0.60,"NOVO":0.34,"PAEEM":0.54,"AIR":1.00,"NVDA":0.50,"TSLA":0.38},
  "NVDA":{"CSPX":0.78,"IWDA":0.74,"VWCE":0.72,"EQQQ":0.88,"MC":0.48,"AAPL":0.82,"MSFT":0.85,"BTC":0.35,"ETH":0.30,"ASML":0.76,"NOVO":0.38,"PAEEM":0.46,"AIR":0.50,"NVDA":1.00,"TSLA":0.62},
  "TSLA":{"CSPX":0.52,"IWDA":0.48,"VWCE":0.46,"EQQQ":0.62,"MC":0.36,"AAPL":0.58,"MSFT":0.55,"BTC":0.42,"ETH":0.38,"ASML":0.50,"NOVO":0.28,"PAEEM":0.38,"AIR":0.38,"NVDA":0.62,"TSLA":1.00},
};

// ── Explications pédagogiques par paire ───────────────────────
// Clé : "A|B" ou "B|A" — symétrique
const PAIR_EXPLANATIONS: Record<string, string> = {
  "CSPX|IWDA": "Tous deux répliquent les marchés développés mondiaux avec une forte pondération USA. Ils réagissent aux mêmes nouvelles macro (Fed, inflation, résultats S&P 500). Les détenir ensemble offre peu de diversification réelle.",
  "IWDA|VWCE": "IWDA couvre les marchés développés, VWCE inclut en plus les émergents (~10%). La différence est minime — ces deux ETF évoluent quasi-identiquement au quotidien.",
  "CSPX|EQQQ": "Le S&P 500 contient 30% de valeurs tech, ce qui le rend très sensible aux mêmes facteurs que le Nasdaq. Quand la tech chute, les deux baissent ensemble.",
  "AAPL|MSFT": "Les deux sont des mega-caps technologiques américaines très sensibles aux taux d'intérêt, aux perspectives de l'IA et au sentiment tech. Elles évoluent souvent de concert car elles sont dans les mêmes indices et les mêmes portefeuilles institutionnels.",
  "EQQQ|MSFT": "Microsoft représente ~9% du Nasdaq. MSFT et EQQQ partagent donc une grande partie de leurs mouvements. Une bonne nouvelle pour Microsoft monte mécaniquement l'ETF.",
  "EQQQ|NVDA": "Nvidia pèse ~6% du Nasdaq 100. C'est l'un des moteurs principaux de l'ETF depuis l'explosion de l'IA en 2023. Nvidia monte → EQQQ monte presque autant.",
  "BTC|ETH": "Bitcoin et Ethereum partagent la même classe d'actif (crypto), attirent les mêmes profils d'investisseurs, subissent les mêmes régulations et les mêmes cycles de peur/cupidité. Quand le marché crypto plonge, les deux chutent ensemble.",
  "BTC|CSPX": "Le Bitcoin est un actif alternatif sans revenu ni bénéfice. Il répond à des catalyseurs totalement différents des actions (halvings, adoption institutionnelle, régulation crypto). C'est l'un des rares actifs peu corrélés aux marchés actions — d'où son intérêt comme diversifiant.",
  "BTC|NOVO": "Novo Nordisk est une entreprise pharmaceutique aux revenus prévisibles (médicaments remboursés). Le Bitcoin est un actif spéculatif sans flux de trésorerie. Ils n'ont aucun facteur commun — c'est l'exemple parfait de décorrélation.",
  "NOVO|CSPX": "Novo Nordisk opère dans la santé défensive — ses revenus ne dépendent pas du cycle économique. Quand les marchés actions corrigent lors d'une récession, la demande de médicaments reste stable. C'est pourquoi la santé défensive amortit les chocs de marché.",
  "PAEEM|BTC": "Les marchés émergents et le Bitcoin répondent tous deux à l'appétit pour le risque global, mais pour des raisons différentes. En période de risk-off, les deux peuvent baisser simultanément — leur décorrélation est donc plus fragile qu'elle n'y paraît.",
  "PAEEM|CSPX": "Les marchés émergents sont sensibles au dollar (un dollar fort pénalise leurs dettes), aux matières premières et à la croissance chinoise — des facteurs absents du S&P 500. C'est une vraie diversification géographique.",
  "MC|CSPX": "LVMH dépend de la consommation discrétionnaire du luxe chinois et européen. Le S&P 500 est dominé par la tech américaine. Deux économies, deux cycles — la corrélation reste modérée.",
  "MC|AIR": "LVMH et Airbus sont tous deux européens et cycliques, mais sensibles à des secteurs différents (luxe vs transport). Ils partagent toutefois une exposition à l'économie mondiale et à l'euro.",
  "MC|BTC": "LVMH est une entreprise réelle avec des magasins, des usines et des revenus. Le Bitcoin est un actif numérique décentralisé. Leurs valorisations dépendent de facteurs radicalement différents — d'où une faible corrélation.",
  "ASML|NVDA": "ASML fabrique les machines qui permettent à TSMC et Samsung de produire les puces Nvidia. Leurs destins sont liés : une forte demande de puces IA booste les deux. C'est une corrélation de chaîne de valeur.",
  "ASML|BTC": "ASML est un fournisseur d'équipements industriels avec des commandes pluriannuelles prévisibles. Le Bitcoin est spéculatif et volatile. Peu de facteurs communs — bonne décorrélation.",
  "AAPL|BTC": "Apple est une entreprise mature avec des revenus récurrents (services, iPhone). Le Bitcoin est un actif alternatif. Une légère corrélation existe car les deux attirent les investisseurs 'croissance/risque', mais leurs fondamentaux sont très différents.",
  "NOVO|BTC": "Novo Nordisk génère des revenus stables grâce à des brevets pharmaceutiques. Le Bitcoin n'a pas de bénéfices, pas de dividendes, pas de brevet. Ce sont deux univers d'investissement totalement différents — corrélation proche de zéro.",
  "AIR|CSPX": "Airbus est très exposé au cycle du transport aérien (commandes d'avions, prix du kérosène, croissance mondiale). Le S&P 500 est plus diversifié. Une corrélation modérée existe car les deux réagissent à la croissance économique globale.",
};

function getPairKey(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `${x}|${y}`;
}

function getPairExplanation(a: string, b: string): string {
  const key = getPairKey(
    a.split(".")[0].split("-")[0].toUpperCase(),
    b.split(".")[0].split("-")[0].toUpperCase()
  );
  return PAIR_EXPLANATIONS[key] ?? `Ces deux actifs évoluent dans des contextes partiellement différents. Leur corrélation de ${getCorr(a,b).toFixed(2)} reflète le degré auquel ils réagissent aux mêmes nouvelles macro-économiques (taux Fed, inflation, croissance mondiale). Une corrélation < 0.5 indique une vraie diversification.`;
}

const TYPE_COLOR: Record<string, string> = {
  etf:"#2563EB", stock:"#16A34A", crypto:"#D97706", default:"#6B7280",
};

function getCorr(a: string, b: string): number {
  const ka = a.split(".")[0].split("-")[0].toUpperCase();
  const kb = b.split(".")[0].split("-")[0].toUpperCase();
  if (ka === kb) return 1.0;
  return CORR_DB[ka]?.[kb] ?? CORR_DB[kb]?.[ka] ?? 0.5;
}
function linkColor(v: number): string {
  if (v >= 0.85) return "rgba(220,38,38,0.75)";
  if (v >= 0.70) return "rgba(251,146,60,0.6)";
  if (v >= 0.50) return "rgba(250,204,21,0.55)";
  if (v >= 0.30) return "rgba(74,222,128,0.5)";
  return "rgba(99,102,241,0.45)";
}
function linkWidth(v: number): number { return Math.max(0.8, v * 4.5); }
function corrLabel(v: number): string {
  if (v >= 0.90) return "Quasi-identiques";
  if (v >= 0.75) return "Très fortement liés";
  if (v >= 0.60) return "Fortement liés";
  if (v >= 0.45) return "Modérément liés";
  if (v >= 0.30) return "Faiblement liés";
  if (v >= 0.15) return "Très faiblement liés";
  return "Quasi indépendants";
}
function corrBadge(v: number): {bg:string;color:string;label:string} {
  if (v >= 0.85) return {bg:"#FEE2E2",color:"#DC2626",label:"⚠ Redondance"};
  if (v >= 0.65) return {bg:"#FEF3C7",color:"#D97706",label:"Attention"};
  if (v >= 0.45) return {bg:"#FFF7ED",color:"#92400E",label:"Modéré"};
  if (v >= 0.25) return {bg:"#F0FDF4",color:"#15803D",label:"✓ Bon diversifiant"};
  return {bg:"#EEF2FF",color:"#4F46E5",label:"✓✓ Excellent diversifiant"};
}

interface NodeState {
  id:string; label:string; type:string; weight:number;
  x:number; y:number; vx:number; vy:number;
}
interface Link { source:string; target:string; value:number; }

function NetworkGraph({ nodes, links, W, H }: {
  nodes:NodeState[]; links:Link[]; W:number; H:number;
}) {
  const [pos, setPos] = useState<Record<string,{x:number;y:number}>>({});
  const [hovered, setHovered] = useState<string|null>(null);
  const frameRef = useRef<number>(0);
  const stateRef = useRef<NodeState[]>([]);
  const tickRef  = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(frameRef.current);
    tickRef.current = 0;
    const n = nodes.length;
    const s: NodeState[] = nodes.map((node, i) => ({
      ...node,
      x: W/2 + Math.cos((i/n)*2*Math.PI) * Math.min(W,H)*0.3,
      y: H/2 + Math.sin((i/n)*2*Math.PI) * Math.min(W,H)*0.3,
      vx:0, vy:0,
    }));
    stateRef.current = s;

    function tick() {
      tickRef.current++;
      const cooling = Math.max(0.015, 1 - tickRef.current/200);
      const cur = stateRef.current;
      for (let i=0;i<cur.length;i++) {
        for (let j=i+1;j<cur.length;j++) {
          const dx=cur[j].x-cur[i].x, dy=cur[j].y-cur[i].y;
          const d=Math.sqrt(dx*dx+dy*dy)||1;
          const minD=(28+cur[i].weight*22)+(28+cur[j].weight*22)+14;
          if(d<minD){const f=((minD-d)/d)*0.42;cur[i].vx-=dx*f;cur[i].vy-=dy*f;cur[j].vx+=dx*f;cur[j].vy+=dy*f;}
          const rep=3600/(d*d);
          cur[i].vx-=(dx/d)*rep;cur[i].vy-=(dy/d)*rep;
          cur[j].vx+=(dx/d)*rep;cur[j].vy+=(dy/d)*rep;
        }
      }
      for (const link of links) {
        const si=cur.find(n=>n.id===link.source), sj=cur.find(n=>n.id===link.target);
        if(!si||!sj)continue;
        const dx=sj.x-si.x, dy=sj.y-si.y;
        const d=Math.sqrt(dx*dx+dy*dy)||1;
        const ideal=60+(1-link.value)*200;
        const f=((d-ideal)/d)*0.065*link.value;
        si.vx+=dx*f;si.vy+=dy*f;sj.vx-=dx*f;sj.vy-=dy*f;
      }
      for (const node of cur) {
        node.vx+=(W/2-node.x)*0.013;node.vy+=(H/2-node.y)*0.013;
        node.vx*=0.76*cooling;node.vy*=0.76*cooling;
        node.x=Math.max(44,Math.min(W-44,node.x+node.vx));
        node.y=Math.max(44,Math.min(H-44,node.y+node.vy));
      }
      stateRef.current=[...cur];
      const p:Record<string,{x:number;y:number}>={};
      cur.forEach(n=>{p[n.id]={x:n.x,y:n.y};});
      setPos(p);
      if(tickRef.current<220) frameRef.current=requestAnimationFrame(tick);
    }
    frameRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frameRef.current);
  }, [nodes.map(n=>n.id).join(","),W,H]);

  const hovLinks=hovered?links.filter(l=>l.source===hovered||l.target===hovered):[];
  const hovNeighbors=new Set(hovLinks.flatMap(l=>[l.source,l.target]));

  return (
    <svg width={W} height={H} style={{overflow:"visible"}}>
      <defs>
        {nodes.map(n=>(
          <radialGradient key={n.id} id={`g_${n.id}`} cx="35%" cy="35%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0.1)"/>
          </radialGradient>
        ))}
      </defs>

      {links.map(link=>{
        const ps=pos[link.source],pt=pos[link.target];
        if(!ps||!pt)return null;
        const isHov=hovered&&(link.source===hovered||link.target===hovered);
        const fade=hovered&&!isHov;
        return(
          <line key={`${link.source}-${link.target}`}
            x1={ps.x} y1={ps.y} x2={pt.x} y2={pt.y}
            stroke={linkColor(link.value)}
            strokeWidth={isHov?linkWidth(link.value)*2:linkWidth(link.value)}
            strokeOpacity={fade?0.05:1}
            style={{transition:"stroke-opacity .2s,stroke-width .15s"}}/>
        );
      })}

      {hovLinks.map(link=>{
        const ps=pos[link.source],pt=pos[link.target];
        if(!ps||!pt)return null;
        const mx=(ps.x+pt.x)/2,my=(ps.y+pt.y)/2;
        return(
          <g key={`lbl_${link.source}_${link.target}`}>
            <rect x={mx-20} y={my-10} width={40} height={18} rx={5} fill="#0A1628" fillOpacity={0.9}/>
            <text x={mx} y={my+4} textAnchor="middle"
              style={{fontSize:10,fontWeight:700,fill:"white",fontFamily:"'Inter',sans-serif"}}>
              {link.value.toFixed(2)}
            </text>
          </g>
        );
      })}

      {nodes.map(node=>{
        const p=pos[node.id];
        if(!p)return null;
        const r=26+node.weight*28;
        const col=TYPE_COLOR[node.type]??TYPE_COLOR.default;
        const fade=hovered&&!hovNeighbors.has(node.id)&&node.id!==hovered;
        const isHov=node.id===hovered;
        return(
          <g key={node.id} style={{cursor:"pointer",transition:"opacity .2s"}} opacity={fade?0.15:1}
            onMouseEnter={()=>setHovered(node.id)}
            onMouseLeave={()=>setHovered(null)}>
            {isHov&&<circle cx={p.x} cy={p.y} r={r+10} fill={col} fillOpacity={0.1} stroke={col} strokeOpacity={0.25} strokeWidth={1.5}/>}
            <circle cx={p.x} cy={p.y} r={r} fill={col} fillOpacity={isHov?1:0.84} stroke="white" strokeWidth={isHov?2.5:1.5}/>
            <circle cx={p.x} cy={p.y} r={r} fill={`url(#g_${node.id})`}/>
            <text x={p.x} y={p.y-(r>36?5:3)} textAnchor="middle"
              style={{fontSize:r>38?12:10,fontWeight:700,fill:"white",fontFamily:"'Inter',sans-serif",pointerEvents:"none"}}>
              {node.label}
            </text>
            {node.weight>0.04&&(
              <text x={p.x} y={p.y+(r>36?14:11)} textAnchor="middle"
                style={{fontSize:r>36?10:8,fill:"rgba(255,255,255,.65)",fontFamily:"'Inter',sans-serif",pointerEvents:"none"}}>
                {(node.weight*100).toFixed(0)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const DEFAULT_ITEMS = [
  {id:"CSPX",type:"etf"},{id:"IWDA",type:"etf"},{id:"EQQQ",type:"etf"},
  {id:"AAPL",type:"stock"},{id:"MSFT",type:"stock"},{id:"NVDA",type:"stock"},
  {id:"BTC",type:"crypto"},{id:"ETH",type:"crypto"},
  {id:"PAEEM",type:"etf"},{id:"MC",type:"stock"},
];

function CorrInner(){
  const svgWrapRef=useRef<HTMLDivElement>(null);
  const [W,setW]=useState(800);
  const [source,setSource]=useState<"portfolio"|"custom">("custom");
  const [portfolios,setPortfolios]=useState<{id:string;name:string;type:string}[]>([]);
  const [selPfId,setSelPfId]=useState("");
  const [items,setItems]=useState(DEFAULT_ITEMS);
  const [input,setInput]=useState("");
  const [threshold,setThreshold]=useState(0.30);
  const [selPair,setSelPair]=useState<{a:string;b:string}|null>(null);

  useEffect(()=>{
    const obs=new ResizeObserver(entries=>{const w=entries[0]?.contentRect.width;if(w)setW(Math.floor(w));});
    if(svgWrapRef.current)obs.observe(svgWrapRef.current);
    return()=>obs.disconnect();
  },[]);

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{
      if(!data.user)return;
      supabase.from("portfolios").select("id,name,type").eq("user_id",data.user.id)
        .then(({data:pfs})=>{if(pfs)setPortfolios(pfs);});
    });
  },[]);

  async function loadPf(id:string){
    const{data:raw}=await supabase.from("portfolio_assets").select("symbol,type,quantity,target_amount").eq("portfolio_id",id);
    if(!raw)return;
    const tot=raw.reduce((s:number,a:{quantity:number;target_amount?:number})=>s+(a.target_amount||a.quantity*100),0);
    setItems(raw.map((a:{symbol:string;type:string;quantity:number;target_amount?:number})=>({
      id:a.symbol.split(".")[0].split("-")[0].toUpperCase(),
      type:a.type,
      weight:tot>0?(a.target_amount||a.quantity*100)/tot:1/raw.length,
    })));
  }

  const nodes=items.map(it=>({
    id:it.id,label:it.id,type:it.type??"etf",
    x:0,y:0,vx:0,vy:0,
    weight:(it as {weight?:number}).weight??(1/items.length),
  }));

  const links:Link[]=[];
  for(let i=0;i<nodes.length;i++)
    for(let j=i+1;j<nodes.length;j++){
      const v=getCorr(nodes[i].id,nodes[j].id);
      if(v>=threshold)links.push({source:nodes[i].id,target:nodes[j].id,value:v});
    }

  const avgCorr=links.length>0?links.reduce((s,l)=>s+l.value,0)/links.length:0;
  const divScore=Math.round((1-avgCorr)*100);

  // Toutes les paires triées par corrélation
  const allPairs:Link[]=[];
  for(let i=0;i<nodes.length;i++)
    for(let j=i+1;j<nodes.length;j++)
      allPairs.push({source:nodes[i].id,target:nodes[j].id,value:getCorr(nodes[i].id,nodes[j].id)});
  allPairs.sort((a,b)=>b.value-a.value);

  const H=Math.max(380,Math.min(560,W*0.62));

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;1,300&family=Inter:wght@300;400;500&display=swap');
    .cr{padding:40px 48px;background:#F5F4F1;min-height:100%;font-family:'Inter',sans-serif;padding-bottom:60px}
    .ey{font-size:9px;font-weight:500;letter-spacing:.18em;color:#1E3A6E;margin-bottom:12px}
    .h1{font-family:'Cormorant Garant',serif;font-size:clamp(30px,4vw,44px);font-weight:300;color:#0A1628;letter-spacing:-.02em;line-height:1.05;margin-bottom:10px}
    .sub{font-size:12px;font-weight:300;color:#4B5563;line-height:1.75;margin-bottom:28px;max-width:600px}
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
    .chip{display:inline-flex;align-items:center;gap:6px;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:600;color:white;margin:3px}
    .cdel{background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:14px;line-height:1;padding:0}
    .cdel:hover{color:white}
    .add-inp{background:white;border:1px solid rgba(10,22,40,.12);border-radius:6px;padding:8px 12px;font-size:12px;color:#0A1628;outline:none;font-family:'Inter',sans-serif;width:96px}
    .add-inp:focus{border-color:#0A1628}
    .add-btn{background:#0A1628;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:10px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;letter-spacing:.08em}
    .sld{width:100%;height:2px;background:rgba(10,22,40,.1);outline:none;-webkit-appearance:none;cursor:pointer;border-radius:1px}
    .sld::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#0A1628;cursor:pointer;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.2)}
    .score-ring{width:76px;height:76px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;border:3px solid;flex-shrink:0}
    .pair-row{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid rgba(10,22,40,.05);cursor:pointer;transition:background .1s;border-radius:6px;margin:0 -8px;padding-left:8px;padding-right:8px}
    .pair-row:last-child{border-bottom:none}
    .pair-row:hover{background:rgba(10,22,40,.025)}
    .pair-row.selected{background:rgba(30,58,110,.04);border-color:rgba(30,58,110,.1)}
    .badge{font-size:9px;font-weight:600;padding:2px 8px;border-radius:3px;white-space:nowrap;flex-shrink:0}
    .explain-panel{background:rgba(30,58,110,.03);border:1px solid rgba(30,58,110,.1);border-radius:10px;padding:16px 20px;margin-top:10px}
    .ep-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
    .ep-pair{font-family:'Cormorant Garant',serif;font-size:20px;font-weight:400;color:#0A1628}
    .ep-corr{font-size:24px;font-weight:300;font-family:'Cormorant Garant',serif}
    .ep-text{font-size:12.5px;color:#3D4F63;line-height:1.85;font-weight:300}
    .intro-box{background:#0A1628;border-radius:14px;padding:28px 32px;margin-bottom:14px;color:white}
    .ib-title{font-family:'Cormorant Garant',serif;font-size:22px;font-weight:300;margin-bottom:16px;letter-spacing:-.01em}
    .ib-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .ib-item{background:rgba(255,255,255,.06);border-radius:10px;padding:14px 16px}
    .ib-v{font-size:28px;font-weight:700;margin-bottom:2px}
    .ib-l{font-size:11px;color:rgba(255,255,255,.55);margin-bottom:6px;letter-spacing:.04em}
    .ib-desc{font-size:11px;color:rgba(255,255,255,.4);line-height:1.65;font-weight:300}
    .scale-row{display:flex;align-items:center;gap:6px;padding:8px 0;border-bottom:1px solid rgba(10,22,40,.05)}
    .scale-row:last-child{border-bottom:none}
    .scale-num{font-family:'Cormorant Garant',serif;font-size:20px;font-weight:300;width:44px;flex-shrink:0}
    .scale-bar{height:10px;border-radius:3px;flex-shrink:0}
  `;

  return(
    <>
      <style>{css}</style>
      <div className="cr">
        <div className="ey">ANALYSE · CORRÉLATION</div>
        <h1 className="h1">Réseau de corrélations<br/>de votre portefeuille.</h1>
        <p className="sub">
          Chaque bulle est un actif. Les liens montrent la corrélation entre deux actifs — passez la souris sur une bulle pour explorer ses connexions. Cliquez sur une paire dans le tableau pour comprendre <strong style={{color:"#0A1628",fontWeight:500}}>pourquoi</strong> ces deux actifs sont liés ou décorrélés.
        </p>

        {/* Config */}
        <div className="card">
          <div className="ct">Source & actifs</div>
          <div className="src-row">
            <button className={`src-btn ${source==="portfolio"?"on":"off"}`} onClick={()=>setSource("portfolio")}>Portefeuille existant</button>
            <button className={`src-btn ${source==="custom"?"on":"off"}`} onClick={()=>setSource("custom")}>Actifs personnalisés</button>
          </div>
          {source==="portfolio"&&(portfolios.length>0?portfolios.map(pf=>(
            <div key={pf.id} className={`pf-item ${selPfId===pf.id?"on":"off"}`}
              onClick={()=>{setSelPfId(pf.id);loadPf(pf.id);}}>
              <span>{pf.name}</span><span style={{fontSize:10,opacity:.6}}>{pf.type==="optimized"?"0CGP":"INIT"}</span>
            </div>
          )):<p style={{fontSize:12,color:"#8A9BB0",fontStyle:"italic"}}>Aucun portefeuille. Utilisez les actifs personnalisés.</p>)}
          {source==="custom"&&(
            <div>
              <div style={{marginBottom:10,lineHeight:2.2}}>
                {items.map(it=>(
                  <span key={it.id} className="chip" style={{background:TYPE_COLOR[it.type]??"#6B7280"}}>
                    {it.id}
                    <button className="cdel" onClick={()=>setItems(p=>p.filter(x=>x.id!==it.id))}>×</button>
                  </span>
                ))}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <input className="add-inp" value={input} onChange={e=>setInput(e.target.value)}
                  placeholder="Ex: NVDA" onKeyDown={e=>{if(e.key==="Enter"){
                    const s=input.trim().toUpperCase().split(".")[0].split("-")[0];
                    if(s&&!items.find(x=>x.id===s)&&items.length<20)setItems(p=>[...p,{id:s,type:"etf"}]);
                    setInput("");
                  }}}/>
                <button className="add-btn" onClick={()=>{
                  const s=input.trim().toUpperCase().split(".")[0].split("-")[0];
                  if(s&&!items.find(x=>x.id===s)&&items.length<20)setItems(p=>[...p,{id:s,type:"etf"}]);
                  setInput("");
                }}>+ AJOUTER</button>
                <span style={{fontSize:10,color:"#8A9BB0"}}>{items.length}/20 actifs</span>
                {["etf","stock","crypto"].map((t,i)=>(
                  <div key={t} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:Object.values(TYPE_COLOR)[i]}}/>
                    <span style={{fontSize:10,color:"#8A9BB0"}}>{["ETF","Action","Crypto"][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{marginTop:16,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <label style={{fontSize:9,fontWeight:500,letterSpacing:".12em",color:"#8A9BB0",flexShrink:0}}>AFFICHER LIENS ≥</label>
            <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:20,fontWeight:300,color:"#0A1628",width:36,flexShrink:0}}>{threshold.toFixed(2)}</div>
            <input type="range" min={0.1} max={0.9} step={0.05} value={threshold}
              className="sld" style={{flex:1,maxWidth:220}} onChange={e=>setThreshold(Number(e.target.value))}/>
            <span style={{fontSize:10,color:"#8A9BB0"}}>{links.length} lien{links.length>1?"s":""}</span>
          </div>
        </div>

        {nodes.length>=2&&(
          <>
            {/* Graphe */}
            <div className="card" style={{padding:16}}>
              <div ref={svgWrapRef} style={{width:"100%"}}>
                <NetworkGraph nodes={nodes} links={links} W={W-32} H={H}/>
              </div>
              {/* Légende liens */}
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
                {[["rgba(220,38,38,0.75)","≥ 0.85 — Redondance"],["rgba(251,146,60,.6)","≥ 0.70 — Forte"],["rgba(250,204,21,.6)","≥ 0.50 — Modérée"],["rgba(74,222,128,.55)","≥ 0.30 — Faible"],["rgba(99,102,241,.5)","< 0.30 — Décorrélés"]].map(([c,l])=>(
                  <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:22,height:3,background:c,borderRadius:2}}/>
                    <span style={{fontSize:9,color:"#8A9BB0"}}>{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score + insights */}
            <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:14,marginBottom:14}}>
              <div className="card" style={{minWidth:180}}>
                <div className="ct">Diversification</div>
                <div style={{display:"flex",alignItems:"center",gap:16,marginTop:8}}>
                  <div className="score-ring" style={{
                    borderColor:divScore>=65?"#16A34A":divScore>=45?"#D97706":"#DC2626",
                    color:divScore>=65?"#16A34A":divScore>=45?"#D97706":"#DC2626",
                  }}>
                    <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:28,fontWeight:300,lineHeight:1}}>{divScore}</div>
                    <div style={{fontSize:8,opacity:.7}}>/100</div>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"#0A1628",marginBottom:4}}>
                      {divScore>=70?"Excellent":divScore>=55?"Bien":divScore>=40?"Moyen":"Faible"}
                    </div>
                    <div style={{fontSize:11,color:"#8A9BB0",lineHeight:1.6}}>
                      Corrél. moy. : {avgCorr.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="ct">Meilleurs diversifiants</div>
                <div className="cs">Les paires avec la corrélation la plus basse apportent le plus à votre portefeuille.</div>
                {allPairs.slice(-3).reverse().map(p=>{
                  const b=corrBadge(p.value);
                  return(
                    <div key={p.source+p.target} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                      <div style={{flex:1,fontSize:12,fontWeight:600,color:"#0A1628"}}>{p.source} × {p.target}</div>
                      <span className="badge" style={{background:b.bg,color:b.color}}>{b.label}</span>
                      <div style={{fontSize:13,fontWeight:700,color:b.color,width:36,textAlign:"right"}}>{p.value.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ══════════════════════════════════════════════
                SECTION PÉDAGOGIQUE
            ══════════════════════════════════════════════ */}

            {/* Explication de la corrélation */}
            <div className="intro-box">
              <div className="ib-title">Comprendre la corrélation entre actifs</div>
              <p style={{fontSize:12,color:"rgba(255,255,255,.5)",marginBottom:20,lineHeight:1.8,fontWeight:300}}>
                La corrélation mesure dans quelle mesure deux actifs évoluent ensemble. C'est toujours une <strong style={{color:"white",fontWeight:500}}>mesure par paire</strong> — elle n'existe qu'entre deux actifs précis. Une bonne diversification consiste à combiner des actifs dont les corrélations sont basses, pour que les pertes d'un actif soient compensées par la stabilité ou la hausse d'un autre.
              </p>
              <div className="ib-grid">
                {[
                  {v:"1.0",col:"#F87171",l:"Corrélation parfaite",d:"Les deux actifs bougent exactement pareil. Détenir les deux n'apporte aucune diversification — c'est comme avoir deux fois le même actif."},
                  {v:"0.7",col:"#FCD34D",l:"Forte corrélation",d:"Les deux actifs évoluent souvent dans le même sens. Il y a une certaine diversification mais limitée. Typique entre deux ETF actions mondiales."},
                  {v:"0.3",col:"#4ADE80",l:"Faible corrélation",d:"Les actifs évoluent de façon largement indépendante. C'est ici que la vraie diversification commence — ajouter cet actif réduit la volatilité globale du portefeuille."},
                  {v:"0.0",col:"#818CF8",l:"Aucune corrélation",d:"Les mouvements des deux actifs sont totalement indépendants. Cas rare mais idéal pour un diversifiant parfait. Proche de la réalité pour BTC × Novo Nordisk."},
                ].map(({v,col,l,d})=>(
                  <div key={v} className="ib-item">
                    <div className="ib-l">{l}</div>
                    <div className="ib-v" style={{color:col}}>{v}</div>
                    <div className="ib-desc">{d}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tableau toutes les paires avec explication */}
            <div className="card">
              <div className="ct">Analyse de chaque paire</div>
              <div className="cs">
                Cliquez sur une paire pour comprendre pourquoi ces deux actifs sont corrélés ou décorrélés — et ce que cela signifie pour votre portefeuille.
              </div>

              {/* Filtres */}
              <div style={{display:"flex",gap:6,marginBottom:16}}>
                {["Toutes",">0.70","0.30–0.70","<0.30"].map(f=>(
                  <button key={f} style={{
                    padding:"4px 12px",borderRadius:5,border:"1px solid",
                    fontSize:10,fontWeight:500,cursor:"pointer",fontFamily:"'Inter',sans-serif",
                    background:"transparent",color:"#8A9BB0",borderColor:"rgba(10,22,40,.1)",
                  }}
                  onClick={()=>{
                    if(f==="Toutes")setThreshold(0.1);
                    else if(f===">0.70")setThreshold(0.70);
                    else if(f==="0.30–0.70")setThreshold(0.30);
                    else setThreshold(0.1);
                  }}>
                    {f}
                  </button>
                ))}
              </div>

              {allPairs.map(pair=>{
                const badge=corrBadge(pair.value);
                const isSelected=selPair?.a===pair.source&&selPair?.b===pair.target;
                const explanation=getPairExplanation(pair.source,pair.target);
                const nodeA=nodes.find(n=>n.id===pair.source);
                const nodeB=nodes.find(n=>n.id===pair.target);
                const colA=TYPE_COLOR[nodeA?.type??"etf"];
                const colB=TYPE_COLOR[nodeB?.type??"etf"];

                return(
                  <div key={pair.source+pair.target}>
                    <div className={`pair-row${isSelected?" selected":""}`}
                      onClick={()=>setSelPair(isSelected?null:{a:pair.source,b:pair.target})}>
                      {/* Bulles actifs */}
                      <div style={{display:"flex",alignItems:"center",gap:0,flexShrink:0}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:colA,display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid white",boxShadow:"0 1px 4px rgba(0,0,0,.12)"}}>
                          <span style={{fontSize:7,fontWeight:700,color:"white"}}>{pair.source.slice(0,4)}</span>
                        </div>
                        <div style={{width:28,height:28,borderRadius:"50%",background:colB,display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid white",boxShadow:"0 1px 4px rgba(0,0,0,.12)",marginLeft:-6}}>
                          <span style={{fontSize:7,fontWeight:700,color:"white"}}>{pair.target.slice(0,4)}</span>
                        </div>
                      </div>
                      {/* Noms */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:"#0A1628"}}>
                          {pair.source} × {pair.target}
                        </div>
                        <div style={{fontSize:10,color:"#8A9BB0",marginTop:1}}>{corrLabel(pair.value)}</div>
                      </div>
                      {/* Badge */}
                      <span className="badge" style={{background:badge.bg,color:badge.color}}>{badge.label}</span>
                      {/* Score */}
                      <div style={{
                        fontFamily:"'Cormorant Garant',serif",fontSize:22,fontWeight:300,
                        color:pair.value>=0.75?"#DC2626":pair.value>=0.45?"#D97706":pair.value>=0.25?"#16A34A":"#6366F1",
                        width:44,textAlign:"right",flexShrink:0,
                      }}>
                        {pair.value.toFixed(2)}
                      </div>
                      {/* Chevron */}
                      <div style={{
                        color:"#8A9BB0",fontSize:12,flexShrink:0,
                        transition:"transform .2s",
                        transform:isSelected?"rotate(180deg)":"rotate(0deg)",
                      }}>▾</div>
                    </div>

                    {/* Panel d'explication */}
                    {isSelected&&(
                      <div className="explain-panel">
                        <div className="ep-header">
                          <div>
                            <div className="ep-pair">{pair.source} × {pair.target}</div>
                            <div style={{fontSize:10,color:"#8A9BB0",marginTop:2}}>
                              Corrélation sur 5 ans · données historiques
                            </div>
                          </div>
                          <div className="ep-corr" style={{
                            color:pair.value>=0.75?"#DC2626":pair.value>=0.45?"#D97706":pair.value>=0.25?"#16A34A":"#6366F1",
                          }}>
                            {pair.value.toFixed(2)}
                          </div>
                          <span className="badge" style={{background:badge.bg,color:badge.color,fontSize:10,padding:"4px 10px"}}>{badge.label}</span>
                        </div>
                        <div className="ep-text">{explanation}</div>
                        {/* Mini-barre visuelle de la corrélation */}
                        <div style={{marginTop:12,display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:9,color:"#8A9BB0",width:28}}>0</span>
                          <div style={{flex:1,height:6,background:"rgba(10,22,40,.07)",borderRadius:3,overflow:"hidden",position:"relative"}}>
                            <div style={{
                              position:"absolute",left:0,top:0,bottom:0,
                              width:`${pair.value*100}%`,
                              background:pair.value>=0.75?"#DC2626":pair.value>=0.45?"#D97706":pair.value>=0.25?"#16A34A":"#6366F1",
                              borderRadius:3,transition:"width .5s",
                            }}/>
                          </div>
                          <span style={{fontSize:9,color:"#8A9BB0",width:24,textAlign:"right"}}>1.0</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {nodes.length<2&&(
          <div style={{textAlign:"center",padding:60,color:"#8A9BB0",fontSize:12}}>
            Ajoutez au moins 2 actifs pour voir le réseau de corrélations.
          </div>
        )}
      </div>
    </>
  );
}

export default function CorrPage(){
  return(
    <Suspense fallback={<div style={{padding:40,color:"#8A9BB0",fontSize:11,letterSpacing:".2em"}}>CHARGEMENT...</div>}>
      <CorrInner/>
    </Suspense>
  );
}
