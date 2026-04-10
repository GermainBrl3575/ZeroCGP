"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ═══ PALETTE ═══ */
export const C = {
  cream: "#F9F8F6", navy: "#050B14", navyText: "rgba(5,11,20,0.88)", navyMid: "#0c1a2e",
  sapphire: "#1a3a6a", sapphireAccent: "#2a5494", sapphireGlow: "rgba(26,58,106,0.25)",
  sapphireSoft: "rgba(26,58,106,0.05)", gold: "#c9a84c",
  bordeaux: "rgba(175,60,60,0.62)", bordeauxH: "rgba(175,60,60,0.92)",
  gUp: "rgba(22,90,52,0.75)", gDn: "rgba(150,50,48,0.75)",
  border: "rgba(5,11,20,0.07)", borderCard: "rgba(5,11,20,0.09)",
  text: "rgba(5,11,20,0.78)", textMid: "rgba(5,11,20,0.52)", textLight: "rgba(5,11,20,0.36)",
  sheet: "rgba(255,255,255,0.42)",
  sheetShadow: "0 1px 0 rgba(255,255,255,0.8) inset, 0 20px 50px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.012)",
};
export const CARD: React.CSSProperties = { borderRadius:6, border:`0.5px solid ${C.borderCard}`, padding:"17px 22px", background:"rgba(255,255,255,0.72)", boxShadow:"0 1px 2px rgba(0,0,0,0.015)" };
export const EASE = "0.7s cubic-bezier(.16,1,.3,1)";

/* ═══ NAV — mapped to existing Next.js routes ═══ */
const navItems = [
  { label:"Portfolio",     href:"/dashboard/portfolio",    icon:"grid" },
  { label:"Optimiseur",    href:"/dashboard/optimizer",    icon:"diamond" },
  { label:"Rééquilibrage", href:"/dashboard/rebalancing",  icon:"refresh" },
  { label:"Alertes",       href:"/dashboard/alerts",       icon:"bell" },
  { label:"Backtesting",   href:"/dashboard/backtesting",  icon:"layers" },
  { label:"Corrélation",   href:"/dashboard/correlation",  icon:"grid4" },
  { label:"Stress Tests",  href:"/dashboard/stress",       icon:"triangle" },
  { label:"Monte Carlo",   href:"/dashboard/montecarlo",   icon:"target" },
];

/* ═══ NAV ICONS ═══ */
function NavIcon({ type, active, hovered }: { type:string; active:boolean; hovered:boolean }) {
  const c = active ? "rgba(255,255,255,.95)" : hovered ? "rgba(255,255,255,.62)" : "rgba(255,255,255,.42)";
  const p: Record<string,unknown> = { width:16, height:16, viewBox:"0 0 24 24", fill:"none", stroke:c, strokeWidth:"0.8", strokeLinecap:"round", strokeLinejoin:"round", style:{transition:`stroke ${EASE}`} };
  const m: Record<string,JSX.Element> = {
    grid:<svg {...p as any}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    diamond:<svg {...p as any}><path d="M12 2L2 12l10 10 10-10L12 2z"/>{active&&<circle cx="12" cy="12" r="2" fill={C.sapphireAccent} stroke="none" opacity=".5"/>}</svg>,
    refresh:<svg {...p as any}><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>,
    bell:<svg {...p as any}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><circle cx="12" cy="21" r="1.5"/></svg>,
    layers:<svg {...p as any}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
    grid4:<svg {...p as any}><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
    triangle:<svg {...p as any}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>,
    target:<svg {...p as any}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  };
  return m[type] || null;
}

/* ═══ WATERMARK ═══ */
function Watermark() {
  const pts: {x:number;y:number}[] = [];
  for (let i=0;i<=50;i++){const t=i/50;pts.push({x:60+t*680,y:340-(Math.sqrt(t)*12-t*t*3)/10*280});}
  const d=pts.map((p,i)=>`${i?"L":"M"}${p.x},${p.y}`).join(" ");
  const dots=Array.from({length:30},(_,i)=>({x:80+(i*137.5)%640,y:110+(i*89.3)%210}));
  return <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:0.018}} viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
    {[0,1,2,3,4].map(i=><line key={i} x1="60" y1={60+i*70} x2="740" y2={60+i*70} stroke={C.navy} strokeWidth="0.25"/>)}
    {dots.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="2" fill={C.navy} opacity="0.25"/>)}
    <path d={d} fill="none" stroke={C.navy} strokeWidth="1.2" opacity="0.4"/>
    <line x1="60" y1="310" x2="580" y2="90" stroke={C.navy} strokeWidth="0.4" strokeDasharray="3 2.5" opacity="0.2"/>
  </svg>;
}

/* ═══ MARKET TICKER ═══ */
const mkAssets=[
  {name:"MSCI World Index",ticker:"CW8",base:485.2,r:2.5},{name:"S&P 500 Index",ticker:"ESE",base:5842.1,r:18},
  {name:"LVMH Moët Hennessy",ticker:"MC.PA",base:742.3,r:4.2},{name:"ASML Holding NV",ticker:"ASML",base:892.6,r:6.8},
  {name:"Apple Inc.",ticker:"AAPL",base:198.4,r:1.5},{name:"Novo Nordisk A/S",ticker:"NOVO-B",base:824.5,r:5.1},
  {name:"Euro Stoxx 50",ticker:"SX5E",base:4987.3,r:14},{name:"CAC 40",ticker:"PX1",base:7892.4,r:22},
  {name:"Nasdaq 100",ticker:"NDX",base:18245.6,r:55},{name:"Amundi MSCI Emerging",ticker:"AEEM",base:412.8,r:2.1},
];
function useMk(){
  const [p,sP]=useState(()=>mkAssets.map(a=>({...a,price:a.base+(Math.random()-.5)*a.r,chg:(Math.random()-.4)*1.1})));
  useEffect(()=>{const id=setInterval(()=>sP(pr=>pr.map(x=>{const n=Math.max(x.base*.96,Math.min(x.base*1.04,x.price+(Math.random()-.48)*x.r*.05));return{...x,price:n,chg:((n-x.base)/x.base)*100};})),5000);return()=>clearInterval(id);},[]);
  return p;
}
function Ticker({data}:{data:any[]}){
  const n=5;const [sA,ssA]=useState(0);const [sB,ssB]=useState(n);const [shA,sshA]=useState(true);const tk=useRef(0);
  useEffect(()=>{const id=setInterval(()=>{tk.current+=1;const nx=(tk.current*n)%data.length;if(shA){ssB(nx);sshA(false);}else{ssA(nx);sshA(true);}},8000);return()=>clearInterval(id);},[shA,data.length]);
  const gi=(o:number)=>Array.from({length:n},(_,i)=>data[(o+i)%data.length]);
  const rl=(items:any[])=>items.map((p:any,i:number)=>(
    <div key={p.ticker+i} style={{display:"flex",alignItems:"center",flex:1,paddingRight:12,borderRight:i<n-1?"0.5px solid rgba(5,11,20,0.05)":"none",marginRight:i<n-1?12:0}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,fontWeight:500,color:C.navyText,letterSpacing:"-0.01em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
        <div style={{fontSize:9,fontWeight:400,color:C.textLight,letterSpacing:"0.03em",marginTop:1}}>{p.ticker}</div>
      </div>
      <div style={{textAlign:"right" as const,marginLeft:8}}>
        <div style={{fontSize:11,fontWeight:500,color:C.navyText,fontVariantNumeric:"tabular-nums"}}>{p.price.toLocaleString("fr-FR",{minimumFractionDigits:1,maximumFractionDigits:1})}</div>
        <div style={{fontSize:9.5,fontWeight:400,fontVariantNumeric:"tabular-nums",color:p.chg>=0?C.gUp:C.gDn,marginTop:1}}>{p.chg>=0?"+":""}{p.chg.toFixed(2)}%</div>
      </div>
    </div>
  ));
  const ls=(v:boolean):React.CSSProperties=>({display:"flex",alignItems:"center",padding:"11px 0",position:"absolute",inset:0,opacity:v?1:0,transition:"opacity 1.6s cubic-bezier(.16,1,.3,1)"});
  return <div style={{position:"relative",height:44}}><div style={ls(shA)}>{rl(gi(sA))}</div><div style={ls(!shA)}>{rl(gi(sB))}</div></div>;
}

/* ═══ PAGE TRANSITION ═══ */
function PageTransition({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const [vis,sVis]=useState(true);
  const prevPath=useRef(pathname);
  useEffect(()=>{
    if(prevPath.current===pathname)return;
    prevPath.current=pathname;
    sVis(false);
    const t=setTimeout(()=>sVis(true),80);
    return()=>clearTimeout(t);
  },[pathname]);
  return <div style={{
    opacity:vis?1:0,
    transform:vis?"translateY(0)":"translateY(8px)",
    transition:"opacity .6s cubic-bezier(.16,1,.3,1), transform .6s cubic-bezier(.16,1,.3,1)",
  }}>{children}</div>;
}

/* ═══ EXPORTED COMPONENTS ═══ */
export function Sheet({children}:{children:React.ReactNode}){
  return <div style={{background:C.sheet,borderRadius:12,border:"0.5px solid rgba(5,11,20,0.035)",boxShadow:C.sheetShadow,padding:"48px 52px",position:"relative",width:"100%",height:"100%",minHeight:"100%",
    backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='.01'/%3E%3C/svg%3E")`}}>
    <div style={{position:"absolute",top:0,left:20,right:20,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,.65) 30%,rgba(255,255,255,.85) 50%,rgba(255,255,255,.65) 70%,transparent)"}}/>
    {children}
  </div>;
}
export function ShimmerButton({onClick,children}:{onClick?:()=>void;children:React.ReactNode}){
  const [h,sH]=useState(false);
  return <button onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{
    padding:"15px 40px",border:"none",borderRadius:6,position:"relative",overflow:"hidden",
    background:`linear-gradient(145deg,${C.navy},${C.navyMid})`,color:"rgba(255,255,255,.92)",
    fontSize:11.5,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",cursor:"pointer",
    boxShadow:h?`0 6px 28px rgba(5,11,20,.18),0 0 20px ${C.sapphireGlow}`:"0 3px 14px rgba(5,11,20,.1)",
    transition:`box-shadow 0.8s cubic-bezier(.16,1,.3,1),transform ${EASE}`,transform:h?"translateY(-.5px)":"none",
  }}>
    <div style={{position:"absolute",inset:0,pointerEvents:"none",borderRadius:6,
      background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,.08) 40%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.08) 60%,transparent 100%)",
      backgroundSize:"200% 100%",backgroundPosition:h?"100% 0":"-100% 0",transition:"background-position 2s cubic-bezier(.16,1,.3,1)"}}/>
    <span style={{position:"relative",zIndex:1}}>{children}</span>
  </button>;
}
export function OptionCard({label,selected,onClick}:{label:string;selected:boolean;onClick:()=>void}){
  const [h,sH]=useState(false);
  return <div onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{
    ...CARD,cursor:selected?"default":"pointer",fontSize:14,fontWeight:selected?500:400,letterSpacing:"-.005em",
    background:selected?`linear-gradient(145deg,${C.navy},${C.navyMid})`:h?"rgba(255,255,255,.88)":CARD.background,
    color:selected?"rgba(255,255,255,.93)":C.navyText,
    border:selected?".5px solid rgba(26,58,106,.45)":h?".5px solid rgba(5,11,20,.13)":CARD.border,
    boxShadow:selected?`0 4px 20px ${C.sapphireGlow},inset 0 1px 0 rgba(255,255,255,.04)`:h?"0 3px 14px rgba(0,0,0,.025)":CARD.boxShadow,
    transition:"all 0.5s cubic-bezier(.16,1,.3,1)",transform:h&&!selected?"translateY(-.5px)":"none",
  }}>{label}</div>;
}

/* ═══ LAYOUT ═══ */
export default function DashboardLayout({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const router=useRouter();
  const [hovNav,sHN]=useState<string|null>(null);
  const [profHov,sPH]=useState(false);
  const [userHov,sUH]=useState(false);
  const [loaded,sLd]=useState(false);
  const [portfolios,setPortfolios]=useState<{id:string;name:string;type:string}[]>([]);
  const [activeId,setActiveId]=useState("");
  const [userInitials,setUserInitials]=useState("U");
  const [userName,setUserName]=useState("Mon compte");
  const mk=useMk();

  useEffect(()=>{setTimeout(()=>sLd(true),80);},[]);

  // Load portfolios + user from Supabase
  useEffect(()=>{
    (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){router.push("/auth/login");return;}
      // User info
      const email=user.email||"";
      const name=user.user_metadata?.full_name||user.user_metadata?.name||email.split("@")[0]||"User";
      setUserName(name);
      setUserInitials(name.split(" ").map((w:string)=>w[0]).join("").toUpperCase().slice(0,2));
      // Portfolios
      const {data:pfs}=await supabase.from("portfolios").select("id,name,type").eq("user_id",user.id).order("created_at",{ascending:false});
      if(pfs&&pfs.length>0){setPortfolios(pfs);setActiveId(pfs[0].id);}
    })();
  },[]);

  async function handleLogout(){await supabase.auth.signOut();router.push("/");}

  return <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
      *{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',sans-serif !important}
      ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(5,11,20,.06);border-radius:3px}
      @keyframes sideIn{0%{opacity:0;transform:translateX(-8px) scale(.988)}100%{opacity:1;transform:translateX(0) scale(1)}}
      @keyframes breathe{0%,100%{opacity:.35}50%{opacity:.75}}
      @keyframes grain{0%{transform:translate(0)}100%{transform:translate(-40px,-40px)}}
      @keyframes cardIn{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
    `}</style>
    <div style={{display:"flex",height:"100vh",width:"100vw",background:C.cream,overflow:"hidden",position:"relative"}}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,opacity:.018,animation:"grain 8s linear infinite"}}/>

      {/* SIDEBAR */}
      <aside style={{width:252,minWidth:252,margin:12,borderRadius:10,position:"relative",zIndex:2,display:"flex",flexDirection:"column",
        animation:loaded?"sideIn .7s cubic-bezier(.23,1,.32,1) both":"none",
        background:"linear-gradient(168deg,rgba(18,36,62,.32) 0%,transparent 45%),linear-gradient(348deg,rgba(0,0,0,.12) 0%,transparent 35%),radial-gradient(ellipse at 25% 0%,rgba(25,48,82,.35) 0%,transparent 55%),radial-gradient(ellipse at 85% 100%,rgba(0,0,0,.15) 0%,transparent 45%),linear-gradient(180deg,#0f2038 0%,#091629 40%,#060e1c 100%)",
        boxShadow:"inset 0 1px 0 rgba(255,255,255,.05),inset 0 -1px 0 rgba(0,0,0,.18),0 0 0 .5px rgba(255,255,255,.03),0 4px 16px rgba(0,0,0,.18),0 12px 40px rgba(5,11,20,.2),0 20px 70px rgba(5,11,20,.08)",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,borderRadius:10,pointerEvents:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,opacity:.022,mixBlendMode:"overlay"}}/>
        <div style={{position:"absolute",top:0,left:14,right:14,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,.06) 30%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.06) 70%,transparent)",zIndex:1}}/>
        <div style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",flex:1}}>
          <div style={{padding:"26px 22px 20px",fontSize:11.5,fontWeight:500,letterSpacing:".3em",color:"rgba(255,255,255,.58)",textTransform:"uppercase"}}>Zero CGP</div>
          <div onMouseEnter={()=>sPH(true)} onMouseLeave={()=>sPH(false)} style={{margin:"0 12px 20px",padding:"11px 13px",borderRadius:8,cursor:"pointer",background:profHov?"linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.025))":"linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.01))",border:profHov?".5px solid rgba(255,255,255,.1)":".5px solid rgba(255,255,255,.055)",boxShadow:profHov?"inset 0 1px 0 rgba(255,255,255,.05),0 3px 10px rgba(0,0,0,.2)":"inset 0 1px 0 rgba(255,255,255,.03),0 2px 6px rgba(0,0,0,.15)",display:"flex",alignItems:"center",gap:10,transition:`all ${EASE}`,transform:profHov?"translateY(-.5px)":"none"}}>
            <div style={{width:28,height:28,borderRadius:7,background:profHov?"linear-gradient(135deg,rgba(201,168,76,.18),rgba(201,168,76,.07))":"linear-gradient(135deg,rgba(201,168,76,.1),rgba(201,168,76,.04))",border:`.5px solid rgba(201,168,76,${profHov?.28:.18})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8.5,fontWeight:600,letterSpacing:".04em",color:C.gold,transition:`all ${EASE}`}}>0CGP</div>
            <span style={{fontSize:12.5,fontWeight:400,flex:1,color:profHov?"rgba(255,255,255,.82)":"rgba(255,255,255,.68)",transition:`color ${EASE}`}}>{portfolios.find(p=>p.id===activeId)?.name||"Portfolio"}</span>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={profHov?"rgba(255,255,255,.35)":"rgba(255,255,255,.18)"} strokeWidth="1.5" strokeLinecap="round" style={{transition:`all ${EASE}`,transform:profHov?"rotate(180deg)":"none"}}><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div style={{padding:"0 22px",marginBottom:8}}><div style={{fontSize:8.5,fontWeight:500,letterSpacing:".18em",textTransform:"uppercase",color:"rgba(255,255,255,.35)",marginBottom:7}}>Navigation</div><div style={{height:".3px",background:"linear-gradient(90deg,rgba(255,255,255,.07),rgba(255,255,255,.02),transparent)"}}/></div>
          <nav style={{flex:1,display:"flex",flexDirection:"column",gap:1,padding:"0 9px"}}>
            {navItems.map(item=>{const active=pathname.startsWith(item.href);const hov=hovNav===item.href;return(
              <Link key={item.href} href={item.href} onMouseEnter={()=>sHN(item.href)} onMouseLeave={()=>sHN(null)} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 14px",borderRadius:8,textDecoration:"none",fontSize:13,fontWeight:active?500:400,letterSpacing:"-.005em",position:"relative",overflow:"hidden",color:active?"rgba(255,255,255,.95)":hov?"rgba(255,255,255,.68)":"rgba(255,255,255,.45)",background:active?"linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.025))":hov?"rgba(255,255,255,.02)":"transparent",boxShadow:active?"inset 0 1px 0 rgba(255,255,255,.05),inset 0 -1px 0 rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.08)":"none",border:active?".3px solid rgba(255,255,255,.07)":".3px solid transparent",transition:`color ${EASE},background ${EASE},border ${EASE},transform ${EASE}`,transform:hov&&!active?"translateX(1.5px)":"none"}}>
                {active&&<><div style={{position:"absolute",left:-9,top:"50%",transform:"translateY(-50%)",width:2.5,height:20,borderRadius:2,background:`linear-gradient(180deg,${C.sapphireAccent}85,${C.sapphireAccent}15)`,boxShadow:`0 0 12px ${C.sapphireGlow}`,animation:"breathe 3s ease infinite"}}/><div style={{position:"absolute",inset:0,borderRadius:8,pointerEvents:"none",background:"radial-gradient(ellipse at 16% 50%,rgba(26,58,106,.04),transparent 50%)"}}/></>}
                {hov&&!active&&<div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",width:2.5,height:2.5,borderRadius:"50%",background:"rgba(255,255,255,.18)"}}/>}
                <NavIcon type={item.icon} active={active} hovered={hov}/>{item.label}
              </Link>
            );})}
          </nav>
          <div style={{padding:"0 20px",marginBottom:12}}><div style={{height:".3px",marginBottom:10,background:"linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent)"}}/><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:4,height:4,borderRadius:"50%",background:C.gold,opacity:.6}}/><span style={{fontSize:9.5,fontWeight:400,color:"rgba(255,255,255,.38)"}}>Optimisation : il y a 26 jours</span></div></div>
          <div style={{margin:"0 9px 9px",padding:"13px",borderRadius:8,background:"rgba(255,255,255,.04)",border:".3px solid rgba(255,255,255,.045)"}}>
            <div onMouseEnter={()=>sUH(true)} onMouseLeave={()=>sUH(false)} onClick={handleLogout} style={{display:"flex",alignItems:"center",gap:11,cursor:"pointer",transition:`all ${EASE}`,transform:userHov?"translateY(-.5px)":"none"}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:userHov?"linear-gradient(145deg,#1d3050,#0e1a2c)":"linear-gradient(145deg,#182840,#0c1422)",border:`.5px solid rgba(255,255,255,${userHov?.12:.08})`,boxShadow:"inset 0 1.5px 3px rgba(255,255,255,.05),inset 0 -1.5px 3px rgba(0,0,0,.22),0 2px 6px rgba(0,0,0,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,letterSpacing:".04em",color:userHov?"rgba(255,255,255,.85)":"rgba(255,255,255,.65)",flexShrink:0,transition:`all ${EASE}`}}>{userInitials}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:500,marginBottom:2,color:userHov?"rgba(255,255,255,.85)":"rgba(255,255,255,.7)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",transition:`color ${EASE}`}}>{userName}</div><div style={{fontSize:9,fontWeight:500,letterSpacing:".08em",textTransform:"uppercase",color:userHov?C.bordeauxH:C.bordeaux,transition:`color ${EASE}`}}>Déconnexion</div></div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={userHov?"rgba(175,60,60,.65)":"rgba(175,60,60,.35)"} strokeWidth=".8" strokeLinecap="round" style={{transition:`stroke ${EASE}`}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0}}><Watermark/></div>
        <div style={{padding:"0 44px",borderBottom:`.5px solid ${C.border}`,position:"relative",zIndex:1,background:"rgba(249,248,246,.9)",backdropFilter:"blur(6px)",opacity:loaded?1:0,transition:"opacity .8s ease .4s"}}><Ticker data={mk}/></div>
        <div style={{flex:1,padding:"24px",overflow:"auto",position:"relative",zIndex:1}}><PageTransition>{children}</PageTransition></div>
      </main>
    </div>
  </>;
}
