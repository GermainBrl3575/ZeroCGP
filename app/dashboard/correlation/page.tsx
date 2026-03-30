"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { assetName } from "@/lib/assetNames";

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

const PAIR_EXPLANATIONS: Record<string, string> = {
  "CSPX|IWDA":"Tous deux répliquent les marchés développés mondiaux avec une forte pondération USA. Ils réagissent aux mêmes nouvelles macro (Fed, inflation, résultats S&P 500). Peu de diversification réelle entre eux.",
  "IWDA|VWCE":"IWDA couvre les marchés développés, VWCE inclut en plus les émergents (~10%). La différence est minime — ces deux ETF évoluent quasi-identiquement au quotidien.",
  "CSPX|EQQQ":"Le S&P 500 contient 30% de valeurs tech, ce qui le rend très sensible aux mêmes facteurs que le Nasdaq. Quand la tech chute, les deux baissent ensemble.",
  "AAPL|MSFT":"Deux mega-caps tech américaines très sensibles aux taux d'intérêt et aux perspectives de l'IA. Elles évoluent souvent de concert car elles sont dans les mêmes indices institutionnels.",
  "EQQQ|MSFT":"Microsoft représente ~9% du Nasdaq 100. MSFT et EQQQ partagent donc une grande partie de leurs mouvements.",
  "EQQQ|NVDA":"Nvidia pèse ~6% du Nasdaq 100. C'est l'un des moteurs principaux de l'ETF depuis l'explosion de l'IA en 2023.",
  "BTC|ETH":"Bitcoin et Ethereum partagent la même classe d'actif (crypto) et subissent les mêmes cycles de peur/cupidité. Quand le marché crypto plonge, les deux chutent ensemble.",
  "BTC|CSPX":"Le Bitcoin est un actif alternatif sans revenu ni bénéfice. Il répond à des catalyseurs totalement différents des actions — c'est l'un des rares actifs peu corrélés aux marchés actions.",
  "BTC|NOVO":"Novo Nordisk génère des revenus stables grâce à des brevets pharmaceutiques. Le Bitcoin n'a pas de bénéfices ni de dividendes. Ce sont deux univers d'investissement totalement différents.",
  "NOVO|CSPX":"Novo Nordisk opère dans la santé défensive — ses revenus ne dépendent pas du cycle économique. La santé défensive amortit les chocs de marché.",
  "PAEEM|CSPX":"Les marchés émergents sont sensibles au dollar, aux matières premières et à la croissance chinoise — des facteurs absents du S&P 500. C'est une vraie diversification géographique.",
  "MC|CSPX":"LVMH dépend du luxe chinois et européen. Le S&P 500 est dominé par la tech américaine. Deux économies, deux cycles — corrélation modérée.",
  "MC|AIR":"LVMH et Airbus sont tous deux européens et cycliques, mais dans des secteurs différents (luxe vs transport aérien).",
  "ASML|NVDA":"ASML fabrique les machines qui permettent de produire les puces Nvidia. Leurs destins sont liés par la chaîne de valeur des semi-conducteurs.",
};

function getPairExpl(a:string,b:string):string{
  const k=[a,b].sort().join("|");
  return PAIR_EXPLANATIONS[k]??`Ces deux actifs évoluent dans des contextes partiellement différents. Leur corrélation de ${getCorr(a,b).toFixed(2)} reflète le degré auquel ils réagissent aux mêmes nouvelles macro-économiques.`;
}

const TYPE_COLORS: Record<string,{bg:string;border:string;text:string}> = {
  etf:   { bg:"#DBEAFE", border:"#93C5FD", text:"#1D4ED8" },
  stock: { bg:"#DCFCE7", border:"#86EFAC", text:"#15803D" },
  crypto:{ bg:"#FEF3C7", border:"#FCD34D", text:"#92400E" },
  default:{ bg:"#F3F4F6", border:"#D1D5DB", text:"#374151" },
};

function getCorr(a:string,b:string):number{
  const ka=a.split(".")[0].split("-")[0].toUpperCase();
  const kb=b.split(".")[0].split("-")[0].toUpperCase();
  if(ka===kb)return 1.0;
  return CORR_DB[ka]?.[kb]??CORR_DB[kb]?.[ka]??0.5;
}
function linkColor(v:number):string{
  if(v>=0.85)return"rgba(220,38,38,0.7)";
  if(v>=0.70)return"rgba(251,146,60,0.55)";
  if(v>=0.50)return"rgba(250,204,21,0.5)";
  if(v>=0.30)return"rgba(74,222,128,0.45)";
  return"rgba(99,102,241,0.4)";
}
function linkWidth(v:number):number{return Math.max(1,v*4);}
function corrLabel(v:number):string{
  if(v>=0.90)return"Quasi-identiques";if(v>=0.75)return"Très fortement liés";
  if(v>=0.60)return"Fortement liés";if(v>=0.45)return"Modérément liés";
  if(v>=0.30)return"Faiblement liés";if(v>=0.15)return"Très faiblement liés";
  return"Quasi indépendants";
}
function corrBadge(v:number):{bg:string;color:string;label:string}{
  if(v>=0.85)return{bg:"#FEE2E2",color:"#DC2626",label:"⚠ Redondance"};
  if(v>=0.65)return{bg:"#FEF3C7",color:"#D97706",label:"Modéré"};
  if(v>=0.45)return{bg:"#FFF7ED",color:"#92400E",label:"Acceptable"};
  if(v>=0.25)return{bg:"#F0FDF4",color:"#15803D",label:"✓ Diversifiant"};
  return{bg:"#EEF2FF",color:"#4F46E5",label:"✓✓ Excellent"};
}

interface NodeState{id:string;label:string;fullName:string;type:string;weight:number;x:number;y:number;vx:number;vy:number}
interface Link{source:string;target:string;value:number}

// Tooltip verre dépoli
function GlassTooltip({children,style}:{children:React.ReactNode;style?:React.CSSProperties}){
  return(
    <div style={{
      position:"absolute",
      background:"rgba(245,244,241,0.92)",
      backdropFilter:"blur(14px)",
      WebkitBackdropFilter:"blur(14px)",
      border:"1px solid rgba(10,22,40,0.1)",
      borderRadius:10,
      padding:"10px 14px",
      boxShadow:"0 2px 12px rgba(10,22,40,0.08)",
      fontFamily:"'Inter',sans-serif",
      zIndex:50,
      pointerEvents:"none",
      minWidth:140,
      ...style,
    }}>
      {children}
    </div>
  );
}

function NetworkGraph({nodes,links,W,H}:{nodes:NodeState[];links:Link[];W:number;H:number}){
  const [pos,setPos]=useState<Record<string,{x:number;y:number}>>({});
  const [hovered,setHovered]=useState<string|null>(null);
  const [tooltipPos,setTooltipPos]=useState<{x:number;y:number}|null>(null);
  const frameRef=useRef<number>(0);
  const stateRef=useRef<NodeState[]>([]);
  const tickRef=useRef(0);
  const svgRef=useRef<SVGSVGElement>(null);

  useEffect(()=>{
    cancelAnimationFrame(frameRef.current);
    tickRef.current=0;
    const n=nodes.length;
    const s:NodeState[]=nodes.map((node,i)=>({
      ...node,
      x:W/2+Math.cos((i/n)*2*Math.PI)*Math.min(W,H)*0.3,
      y:H/2+Math.sin((i/n)*2*Math.PI)*Math.min(W,H)*0.3,
      vx:0,vy:0,
    }));
    stateRef.current=s;
    function tick(){
      tickRef.current++;
      const cooling=Math.max(0.01,1-tickRef.current/220);
      const cur=stateRef.current;
      for(let i=0;i<cur.length;i++){
        for(let j=i+1;j<cur.length;j++){
          const dx=cur[j].x-cur[i].x,dy=cur[j].y-cur[i].y;
          const d=Math.sqrt(dx*dx+dy*dy)||1;
          const ri=30+cur[i].weight*24,rj=30+cur[j].weight*24;
          const minD=ri+rj+16;
          if(d<minD){const f=((minD-d)/d)*0.4;cur[i].vx-=dx*f;cur[i].vy-=dy*f;cur[j].vx+=dx*f;cur[j].vy+=dy*f;}
          const rep=3800/(d*d);
          cur[i].vx-=(dx/d)*rep;cur[i].vy-=(dy/d)*rep;
          cur[j].vx+=(dx/d)*rep;cur[j].vy+=(dy/d)*rep;
        }
      }
      for(const link of links){
        const si=cur.find(n=>n.id===link.source),sj=cur.find(n=>n.id===link.target);
        if(!si||!sj)continue;
        const dx=sj.x-si.x,dy=sj.y-si.y,d=Math.sqrt(dx*dx+dy*dy)||1;
        const ideal=55+(1-link.value)*210;
        const f=((d-ideal)/d)*0.07*link.value;
        si.vx+=dx*f;si.vy+=dy*f;sj.vx-=dx*f;sj.vy-=dy*f;
      }
      for(const node of cur){
        node.vx+=(W/2-node.x)*0.014;node.vy+=(H/2-node.y)*0.014;
        node.vx*=0.75*cooling;node.vy*=0.75*cooling;
        node.x=Math.max(48,Math.min(W-48,node.x+node.vx));
        node.y=Math.max(48,Math.min(H-48,node.y+node.vy));
      }
      stateRef.current=[...cur];
      const p:Record<string,{x:number;y:number}>={};
      cur.forEach(n=>{p[n.id]={x:n.x,y:n.y};});
      setPos(p);
      if(tickRef.current<240)frameRef.current=requestAnimationFrame(tick);
    }
    frameRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frameRef.current);
  },[nodes.map(n=>n.id).join(","),W,H]);

  const hovLinks=hovered?links.filter(l=>l.source===hovered||l.target===hovered):[];
  const hovNeighbors=new Set(hovLinks.flatMap(l=>[l.source,l.target]));
  const hovNode=nodes.find(n=>n.id===hovered);

  return(
    <div style={{position:"relative"}}>
      <svg ref={svgRef} width={W} height={H} style={{overflow:"visible",display:"block"}}>
        {/* Liens */}
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
              strokeOpacity={fade?0.04:1}
              style={{transition:"stroke-opacity .2s,stroke-width .15s"}}/>
          );
        })}

        {/* Valeurs de corrélation sur liens survolés */}
        {hovLinks.map(link=>{
          const ps=pos[link.source],pt=pos[link.target];
          if(!ps||!pt)return null;
          const mx=(ps.x+pt.x)/2,my=(ps.y+pt.y)/2;
          const badge=corrBadge(link.value);
          return(
            <g key={`lbl_${link.source}_${link.target}`}>
              <rect x={mx-22} y={my-11} width={44} height={20} rx={6}
                fill="rgba(245,244,241,0.95)" stroke="rgba(10,22,40,.1)" strokeWidth={1}/>
              <text x={mx} y={my+5} textAnchor="middle"
                style={{fontSize:10,fontWeight:700,fill:badge.color,fontFamily:"'Inter',sans-serif"}}>
                {link.value.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Bulles */}
        {nodes.map(node=>{
          const p=pos[node.id];
          if(!p)return null;
          const r=28+node.weight*26;
          const tc=TYPE_COLORS[node.type]??TYPE_COLORS.default;
          const fade=hovered&&!hovNeighbors.has(node.id)&&node.id!==hovered;
          const isHov=node.id===hovered;
          const shortName=assetName(node.id);
          // Tronquer si trop long pour la bulle
          const displayName=shortName.length>10?shortName.slice(0,9)+"…":shortName;

          return(
            <g key={node.id}
              style={{cursor:"pointer",transition:"opacity .2s"}}
              opacity={fade?0.12:1}
              onMouseEnter={e=>{
                setHovered(node.id);
                const rect=svgRef.current?.getBoundingClientRect();
                if(rect)setTooltipPos({x:p.x+r+8,y:p.y-20});
              }}
              onMouseLeave={()=>{setHovered(null);setTooltipPos(null);}}>
              {/* Bordure légère quand survolé */}
              {isHov&&<circle cx={p.x} cy={p.y} r={r+4}
                fill="none" stroke={tc.border} strokeWidth={2} strokeOpacity={0.6}/>}
              {/* Fond de la bulle */}
              <circle cx={p.x} cy={p.y} r={r}
                fill={tc.bg}
                stroke={tc.border}
                strokeWidth={isHov?2:1.5}
                style={{transition:"stroke-width .15s"}}/>
              {/* Symbole (en haut) */}
              <text x={p.x} y={p.y-(r>38?8:4)} textAnchor="middle"
                style={{
                  fontSize:r>42?12:10,
                  fontWeight:700,
                  fill:tc.text,
                  fontFamily:"'Inter',sans-serif",
                  pointerEvents:"none",
                }}>
                {node.id}
              </text>
              {/* Nom complet (en bas) */}
              <text x={p.x} y={p.y+(r>38?10:8)} textAnchor="middle"
                style={{
                  fontSize:r>42?10:8,
                  fontWeight:400,
                  fill:tc.text,
                  opacity:0.7,
                  fontFamily:"'Inter',sans-serif",
                  pointerEvents:"none",
                }}>
                {displayName}
              </text>
              {/* Poids si bulle assez grande */}
              {node.weight>0.06&&r>36&&(
                <text x={p.x} y={p.y+(r>42?24:20)} textAnchor="middle"
                  style={{fontSize:8,fill:tc.text,opacity:0.45,fontFamily:"'Inter',sans-serif",pointerEvents:"none"}}>
                  {(node.weight*100).toFixed(0)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip verre dépoli */}
      {hovered&&hovNode&&tooltipPos&&(
        <GlassTooltip style={{top:tooltipPos.y,left:Math.min(tooltipPos.x,W-160)}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:".1em",color:"#8A9BB0",marginBottom:4}}>
            {(TYPE_COLORS[hovNode.type]?TYPE_COLORS[hovNode.type].text:"#374151") && hovNode.type.toUpperCase()}
          </div>
          <div style={{fontSize:14,fontWeight:700,color:"#0A1628",marginBottom:2}}>{hovNode.id}</div>
          <div style={{fontSize:11,color:"#4B5563",marginBottom:8,fontWeight:300}}>{assetName(hovNode.id)}</div>
          {hovLinks.length>0&&(
            <>
              <div style={{fontSize:9,color:"#8A9BB0",marginBottom:5,letterSpacing:".06em"}}>CORRÉLATIONS</div>
              {hovLinks.sort((a,b)=>b.value-a.value).map(l=>{
                const other=l.source===hovered?l.target:l.source;
                const b=corrBadge(l.value);
                return(
                  <div key={other} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:4}}>
                    <span style={{fontSize:11,color:"#3D4F63",fontWeight:500}}>{other}</span>
                    <span style={{fontSize:10,fontWeight:700,color:b.color}}>{l.value.toFixed(2)}</span>
                  </div>
                );
              })}
            </>
          )}
        </GlassTooltip>
      )}
    </div>
  );
}

const DEFAULT_ITEMS=[
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
    id:it.id,label:it.id,fullName:assetName(it.id),
    type:it.type??"etf",x:0,y:0,vx:0,vy:0,
    weight:(it as {weight?:number}).weight??(1/items.length),
  }));

  const links:Link[]=[];
  for(let i=0;i<nodes.length;i++)
    for(let j=i+1;j<nodes.length;j++){
      const v=getCorr(nodes[i].id,nodes[j].id);
      if(v>=threshold)links.push({source:nodes[i].id,target:nodes[j].id,value:v});
    }

  const allPairs:Link[]=[];
  for(let i=0;i<nodes.length;i++)
    for(let j=i+1;j<nodes.length;j++)
      allPairs.push({source:nodes[i].id,target:nodes[j].id,value:getCorr(nodes[i].id,nodes[j].id)});
  allPairs.sort((a,b)=>b.value-a.value);

  const avgCorr=links.length>0?links.reduce((s,l)=>s+l.value,0)/links.length:0;
  const divScore=Math.round((1-avgCorr)*100);
  const H=Math.max(380,Math.min(540,W*0.6));

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
    .chip{display:inline-flex;align-items:center;gap:6px;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600;margin:3px;border:1px solid}
    .cdel{background:none;border:none;cursor:pointer;font-size:14px;line-height:1;padding:0}
    .add-inp{background:white;border:1px solid rgba(10,22,40,.12);border-radius:6px;padding:8px 12px;font-size:12px;color:#0A1628;outline:none;font-family:'Inter',sans-serif;width:96px}
    .add-inp:focus{border-color:#0A1628}
    .add-btn{background:#0A1628;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:10px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;letter-spacing:.08em}
    .sld{width:100%;height:2px;background:rgba(10,22,40,.1);outline:none;-webkit-appearance:none;cursor:pointer;border-radius:1px}
    .sld::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#0A1628;cursor:pointer;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.2)}
    .score-ring{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;border:3px solid;flex-shrink:0}
    .pair-row{display:flex;align-items:center;gap:12px;padding:11px 8px;border-bottom:1px solid rgba(10,22,40,.05);cursor:pointer;border-radius:6px;transition:background .1s}
    .pair-row:last-child{border-bottom:none}
    .pair-row:hover{background:rgba(10,22,40,.02)}
    .pair-row.sel{background:rgba(30,58,110,.04)}
    .badge{font-size:9px;font-weight:600;padding:2px 8px;border-radius:3px;white-space:nowrap;flex-shrink:0}
    .ep{background:rgba(30,58,110,.03);border:1px solid rgba(30,58,110,.08);border-radius:10px;padding:16px 20px;margin:4px 0 8px}
    .intro-box{background:#0A1628;border-radius:14px;padding:28px 32px;margin-bottom:14px;color:white}
    .ib-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .ib-item{background:rgba(255,255,255,.06);border-radius:10px;padding:14px 16px}
  `;

  return(
    <><style>{css}</style>
    <div className="cr">
      <div className="ey">ANALYSE · CORRÉLATION</div>
      <h1 className="h1">Réseau de corrélations<br/>de votre portefeuille.</h1>
      <p className="sub">Chaque bulle est un actif. Les liens montrent la corrélation entre deux actifs. Passez la souris sur une bulle pour voir ses connexions. Cliquez sur une paire pour comprendre <strong style={{color:"#0A1628",fontWeight:500}}>pourquoi</strong> ces actifs sont liés ou décorrélés.</p>

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
        )):<p style={{fontSize:12,color:"#8A9BB0",fontStyle:"italic"}}>Aucun portefeuille — utilisez les actifs personnalisés.</p>)}
        {source==="custom"&&(
          <div>
            <div style={{marginBottom:10,lineHeight:2.2}}>
              {items.map(it=>{
                const tc=TYPE_COLORS[it.type]??TYPE_COLORS.default;
                return(
                  <span key={it.id} className="chip" style={{background:tc.bg,borderColor:tc.border,color:tc.text}}>
                    <span style={{fontWeight:700}}>{it.id}</span>
                    <span style={{fontSize:9,opacity:.7,fontWeight:300}}> {assetName(it.id)}</span>
                    <button className="cdel" style={{color:tc.text,opacity:.5}} onClick={()=>setItems(p=>p.filter(x=>x.id!==it.id))}>×</button>
                  </span>
                );
              })}
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
              <span style={{fontSize:10,color:"#8A9BB0"}}>{items.length}/20</span>
              {[["etf","ETF"],["stock","Action"],["crypto","Crypto"]].map(([t,l])=>{
                const tc=TYPE_COLORS[t]??TYPE_COLORS.default;
                return(<div key={t} style={{display:"flex",alignItems:"center",gap:4}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:tc.border}}/>
                  <span style={{fontSize:10,color:"#8A9BB0"}}>{l}</span>
                </div>);
              })}
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
          <div className="card" style={{padding:16,overflow:"hidden"}}>
            <div ref={svgWrapRef} style={{width:"100%"}}>
              <NetworkGraph nodes={nodes} links={links} W={W-32} H={H}/>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
              {[["rgba(220,38,38,.7)","≥ 0.85 Redondance"],["rgba(251,146,60,.55)","≥ 0.70 Forte"],["rgba(250,204,21,.55)","≥ 0.50 Modérée"],["rgba(74,222,128,.5)","≥ 0.30 Faible"],["rgba(99,102,241,.45)","< 0.30 Décorrélés"]].map(([c,l])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:22,height:3,background:c,borderRadius:2}}/>
                  <span style={{fontSize:9,color:"#8A9BB0"}}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Score + top paires */}
          <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:14,marginBottom:14}}>
            <div className="card" style={{minWidth:170}}>
              <div className="ct">Diversification</div>
              <div style={{display:"flex",alignItems:"center",gap:16,marginTop:8}}>
                <div className="score-ring" style={{
                  borderColor:divScore>=65?"#16A34A":divScore>=45?"#D97706":"#DC2626",
                  color:divScore>=65?"#16A34A":divScore>=45?"#D97706":"#DC2626",
                }}>
                  <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:26,fontWeight:300,lineHeight:1}}>{divScore}</div>
                  <div style={{fontSize:8,opacity:.7}}>/100</div>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#0A1628",marginBottom:4}}>
                    {divScore>=70?"Excellent":divScore>=55?"Bien":divScore>=40?"Moyen":"Faible"}
                  </div>
                  <div style={{fontSize:11,color:"#8A9BB0",lineHeight:1.6}}>Corrél. moy. : {avgCorr.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="ct">Meilleurs diversifiants</div>
              <div className="cs">Les paires avec la corrélation la plus basse apportent le plus à votre portefeuille.</div>
              {allPairs.slice(-3).reverse().map(p=>{
                const b=corrBadge(p.value);
                return(
                  <div key={p.source+p.target} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#0A1628"}}>{p.source} × {p.target}</div>
                      <div style={{fontSize:10,color:"#8A9BB0"}}>{assetName(p.source)} · {assetName(p.target)}</div>
                    </div>
                    <span className="badge" style={{background:b.bg,color:b.color}}>{b.label}</span>
                    <div style={{fontSize:13,fontWeight:700,color:b.color,width:36,textAlign:"right"}}>{p.value.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section pédagogique */}
          <div className="intro-box">
            <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:22,fontWeight:300,marginBottom:16}}>Comprendre la corrélation entre actifs</div>
            <p style={{fontSize:12,color:"rgba(255,255,255,.5)",marginBottom:20,lineHeight:1.8,fontWeight:300}}>
              La corrélation mesure dans quelle mesure deux actifs évoluent ensemble. C'est toujours une <strong style={{color:"white",fontWeight:500}}>mesure par paire</strong>. Une bonne diversification consiste à combiner des actifs dont les corrélations sont basses.
            </p>
            <div className="ib-grid">
              {[
                {v:"1.0",col:"#F87171",l:"Corrélation parfaite",d:"Les deux actifs bougent exactement pareil. Aucune diversification — c'est comme avoir deux fois le même actif."},
                {v:"0.7",col:"#FCD34D",l:"Forte corrélation",d:"Les actifs évoluent souvent dans le même sens. Diversification limitée. Typique entre deux ETF actions mondiales."},
                {v:"0.3",col:"#4ADE80",l:"Faible corrélation",d:"Les actifs évoluent de façon largement indépendante. La vraie diversification commence ici — réduit la volatilité globale."},
                {v:"0.0",col:"#818CF8",l:"Aucune corrélation",d:"Mouvements totalement indépendants. Rare mais idéal. Exemple : BTC × Novo Nordisk."},
              ].map(({v,col,l,d})=>(
                <div key={v} className="ib-item">
                  <div style={{fontSize:9,color:"rgba(255,255,255,.4)",letterSpacing:".1em",marginBottom:4}}>{l}</div>
                  <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:28,fontWeight:300,color:col,marginBottom:6}}>{v}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.4)",lineHeight:1.65,fontWeight:300}}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tableau paires */}
          <div className="card">
            <div className="ct">Analyse de chaque paire</div>
            <div className="cs">Cliquez sur une paire pour comprendre pourquoi ces deux actifs sont corrélés ou décorrélés.</div>
            {allPairs.map(pair=>{
              const badge=corrBadge(pair.value);
              const isSel=selPair?.a===pair.source&&selPair?.b===pair.target;
              const tca=TYPE_COLORS[nodes.find(n=>n.id===pair.source)?.type??"etf"]??TYPE_COLORS.default;
              const tcb=TYPE_COLORS[nodes.find(n=>n.id===pair.target)?.type??"etf"]??TYPE_COLORS.default;
              return(
                <div key={pair.source+pair.target}>
                  <div className={`pair-row${isSel?" sel":""}`}
                    onClick={()=>setSelPair(isSel?null:{a:pair.source,b:pair.target})}>
                    <div style={{display:"flex",flexShrink:0}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:tca.bg,border:`2px solid ${tca.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <span style={{fontSize:7,fontWeight:700,color:tca.text}}>{pair.source.slice(0,4)}</span>
                      </div>
                      <div style={{width:26,height:26,borderRadius:"50%",background:tcb.bg,border:`2px solid ${tcb.border}`,display:"flex",alignItems:"center",justifyContent:"center",marginLeft:-5}}>
                        <span style={{fontSize:7,fontWeight:700,color:tcb.text}}>{pair.target.slice(0,4)}</span>
                      </div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#0A1628"}}>{pair.source} × {pair.target}</div>
                      <div style={{fontSize:10,color:"#8A9BB0",marginTop:1}}>{assetName(pair.source)} · {assetName(pair.target)}</div>
                    </div>
                    <span className="badge" style={{background:badge.bg,color:badge.color}}>{badge.label}</span>
                    <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:22,fontWeight:300,
                      color:pair.value>=0.75?"#DC2626":pair.value>=0.45?"#D97706":pair.value>=0.25?"#16A34A":"#6366F1",
                      width:44,textAlign:"right",flexShrink:0}}>{pair.value.toFixed(2)}</div>
                    <div style={{color:"#8A9BB0",fontSize:12,transition:"transform .2s",transform:isSel?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
                  </div>
                  {isSel&&(
                    <div className="ep">
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                        <div>
                          <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:18,fontWeight:400,color:"#0A1628"}}>{pair.source} × {pair.target}</div>
                          <div style={{fontSize:10,color:"#8A9BB0"}}>{corrLabel(pair.value)}</div>
                        </div>
                        <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:26,fontWeight:300,
                          color:pair.value>=0.75?"#DC2626":pair.value>=0.45?"#D97706":pair.value>=0.25?"#16A34A":"#6366F1",marginLeft:"auto"}}>
                          {pair.value.toFixed(2)}
                        </div>
                      </div>
                      <p style={{fontSize:12.5,color:"#3D4F63",lineHeight:1.85,fontWeight:300}}>{getPairExpl(pair.source,pair.target)}</p>
                      <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:9,color:"#8A9BB0",width:20}}>0</span>
                        <div style={{flex:1,height:5,background:"rgba(10,22,40,.07)",borderRadius:3,overflow:"hidden"}}>
                          <div style={{width:`${pair.value*100}%`,height:"100%",
                            background:pair.value>=0.75?"#DC2626":pair.value>=0.45?"#D97706":pair.value>=0.25?"#16A34A":"#6366F1",
                            borderRadius:3,transition:"width .5s"}}/>
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
    </div>
    </>
  );
}

export default function CorrPage(){
  return<Suspense fallback={<div style={{padding:40}}/>}><CorrInner/></Suspense>;
}
