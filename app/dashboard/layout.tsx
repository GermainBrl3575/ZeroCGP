"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  { label:"Accueil",       href:"/dashboard",              icon:"home" },
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
    home:<svg {...p as any}><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>,
    grid:<svg {...p as any}><circle cx="12" cy="12" r="10"/><path d="M12 2V12H22"/><path d="M12 12L19.07 5.93" opacity=".4"/></svg>,
    diamond:<svg {...p as any}><path d="M4 18L8 10L14 14L20 4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="20" cy="4" r="2.5"/><path d="M20 1.5V4H22.5" strokeWidth=".6"/></svg>,
    refresh:<svg {...p as any}><rect x="2" y="14" width="5" height="8" rx="1" fill={c} opacity=".3"/><rect x="9" y="8" width="5" height="14" rx="1" fill={c} opacity=".3"/><rect x="16" y="11" width="5" height="11" rx="1" fill={c} opacity=".3"/><path d="M4.5 12L11.5 6L18.5 9" strokeLinecap="round" strokeWidth="1"/><path d="M16.5 9L18.5 9L18.5 7" strokeLinecap="round" strokeWidth=".8"/></svg>,
    bell:<svg {...p as any}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><circle cx="12" cy="21" r="1.5"/>{active&&<circle cx="19" cy="5" r="3" fill={c} stroke="none" opacity=".7"/>}</svg>,
    layers:<svg {...p as any}><circle cx="12" cy="12" r="10"/><path d="M12 6V12L16 14" strokeLinecap="round"/><path d="M4 18L2 20" strokeLinecap="round" opacity=".5"/></svg>,
    grid4:<svg {...p as any}><circle cx="6" cy="6" r="3.5"/><circle cx="18" cy="18" r="3.5"/><circle cx="18" cy="6" r="3.5"/><line x1="8.5" y1="7.5" x2="15.5" y2="16.5" opacity=".5"/><line x1="9" y1="5" x2="14.5" y2="5" opacity=".5"/><line x1="18" y1="9.5" x2="18" y2="14.5" opacity=".5"/></svg>,
    triangle:<svg {...p as any}><path d="M2 8L8 6L12 9L16 4" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 4L18 12L22 20" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1.5 1.5" opacity=".6"/><line x1="2" y1="22" x2="22" y2="22" strokeWidth=".4" opacity=".3"/></svg>,
    target:<svg {...p as any}><path d="M2 20Q6 4,12 12Q18 20,22 6" strokeLinecap="round" strokeWidth=".6" opacity=".3"/><path d="M2 18Q7 8,12 14Q17 18,22 8" strokeLinecap="round" strokeWidth=".6" opacity=".4"/><path d="M2 16Q8 6,12 10Q16 16,22 4" strokeLinecap="round" strokeWidth=".6" opacity=".5"/><path d="M2 14Q6 2,12 8Q18 14,22 2" strokeLinecap="round" strokeWidth="1" opacity=".8"/></svg>,
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

/* ═══ MARKET TICKER (live from Yahoo Finance) ═══ */
function useLiveTicker(){
  const [data,setData]=useState<{symbol:string;name:string;price:number;changePercent:number}[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let mounted=true;
    const doFetch=()=>{
      fetch("/api/market/live").then(r=>r.json()).then(d=>{
        if(!mounted)return;
        if(d.tickers&&d.tickers.length>0)setData(d.tickers);
        setLoading(false);
      }).catch(()=>{if(mounted){setLoading(false);setTimeout(doFetch,30000);}});
    };
    doFetch();
    const id=setInterval(doFetch,60000);
    return()=>{mounted=false;clearInterval(id);};
  },[]);
  return {data,loading};
}
function TickerSkeleton(){
  return <div style={{display:"flex",alignItems:"center",height:44,gap:24,padding:"11px 0"}}>
    {Array.from({length:5}).map((_,i)=><div key={i} style={{flex:1,display:"flex",justifyContent:"space-between",alignItems:"center",paddingRight:12,borderRight:i<4?"0.5px solid rgba(5,11,20,0.05)":"none",marginRight:i<4?12:0}}>
      <div><div style={{width:80,height:10,background:"rgba(5,11,20,.04)",borderRadius:3,marginBottom:4}}/><div style={{width:40,height:8,background:"rgba(5,11,20,.03)",borderRadius:3}}/></div>
      <div style={{textAlign:"right"}}><div style={{width:50,height:10,background:"rgba(5,11,20,.04)",borderRadius:3,marginBottom:4}}/><div style={{width:35,height:8,background:"rgba(5,11,20,.03)",borderRadius:3,marginLeft:"auto"}}/></div>
    </div>)}
  </div>;
}
function Ticker({data,loading}:{data:any[];loading:boolean}){
  if(loading&&data.length===0)return <TickerSkeleton/>;
  if(data.length===0)return null;
  const n=5;const [sA,ssA]=useState(0);const [sB,ssB]=useState(n);const [shA,sshA]=useState(true);const tk=useRef(0);
  useEffect(()=>{const id=setInterval(()=>{tk.current+=1;const nx=(tk.current*n)%data.length;if(shA){ssB(nx);sshA(false);}else{ssA(nx);sshA(true);}},8000);return()=>clearInterval(id);},[shA,data.length]);
  const gi=(o:number)=>Array.from({length:n},(_,i)=>data[(o+i)%data.length]);
  const rl=(items:any[])=>items.map((p:any,i:number)=>(
    <div key={p.symbol+i} style={{display:"flex",alignItems:"center",flex:1,paddingRight:12,borderRight:i<n-1?"0.5px solid rgba(5,11,20,0.05)":"none",marginRight:i<n-1?12:0}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,fontWeight:500,color:C.navyText,letterSpacing:"-0.01em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
        <div style={{fontSize:9,fontWeight:400,color:C.textLight,letterSpacing:"0.03em",marginTop:1}}>{p.symbol}</div>
      </div>
      <div style={{textAlign:"right" as const,marginLeft:8}}>
        <div style={{fontSize:11,fontWeight:500,color:C.navyText,fontVariantNumeric:"tabular-nums"}}>{p.price.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        <div style={{fontSize:9.5,fontWeight:400,fontVariantNumeric:"tabular-nums",color:p.changePercent>=0?C.gUp:C.gDn,marginTop:1}}>{p.changePercent>=0?"+":""}{p.changePercent.toFixed(2)}%</div>
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
function getUrlId():string{
  if(typeof window==="undefined")return "";
  return new URLSearchParams(window.location.search).get("id")??"";
}

export default function DashboardLayout({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const router=useRouter();
  const [hovNav,sHN]=useState<string|null>(null);
  const [profHov,sPH]=useState(false);
  const [userHov,sUH]=useState(false);
  const [loaded,sLd]=useState(false);
  const [loading,setLoading]=useState(true);
  const [portfolios,setPortfolios]=useState<{id:string;name:string;type:string}[]>([]);
  const [activeId,setActiveId]=useState("");
  const [userInitials,setUserInitials]=useState("U");
  const [userName,setUserName]=useState("Mon compte");
  const [dropOpen,setDropOpen]=useState(false);
  const [editModal,setEditModal]=useState(false);
  const [editTarget,setEditTarget]=useState<{id:string;name:string;type:string}|null>(null);
  const [editName,setEditName]=useState("");
  const [editType,setEditType]=useState("manual");
  const [editErr,setEditErr]=useState("");
  const [delConfirm,setDelConfirm]=useState(false);
  const dropRef=useRef<HTMLDivElement>(null);
  const {data:mk,loading:mkLoading}=useLiveTicker();

  useEffect(()=>{setTimeout(()=>sLd(true),80);},[]);

  // Load portfolios + user from Supabase (exact same logic as before refonte)
  const loadPortfolios=useCallback(async()=>{
    const {data}=await supabase.auth.getUser();
    if(!data.user){router.push("/auth/login");return;}
    // User info
    const email=data.user.email||"";
    const name=data.user.user_metadata?.full_name||data.user.user_metadata?.name||email.split("@")[0]||"User";
    setUserName(name);
    setUserInitials(name.split(" ").map((w:string)=>w[0]).join("").toUpperCase().slice(0,2));
    // Portfolios
    const {data:pfs}=await supabase.from("portfolios").select("id,name,type").eq("user_id",data.user.id).order("created_at",{ascending:false});
    if(pfs&&pfs.length>0){
      setPortfolios(pfs);
      const urlId=getUrlId();
      if(urlId&&pfs.find((p:any)=>p.id===urlId)){setActiveId(urlId);}
      else{setActiveId((prev:string)=>prev&&pfs.find((p:any)=>p.id===prev)?prev:pfs[0].id);}
    }
    setLoading(false);
  },[router]);

  // Reload on pathname change (navigating between pages)
  useEffect(()=>{loadPortfolios();},[loadPortfolios,pathname]);

  // Sync activeId from URL ?id= (back/forward navigation)
  useEffect(()=>{
    function syncUrlId(){
      const urlId=getUrlId();
      if(urlId&&portfolios.find(p=>p.id===urlId)){setActiveId(urlId);}
    }
    window.addEventListener("popstate",syncUrlId);
    return()=>window.removeEventListener("popstate",syncUrlId);
  },[portfolios]);

  function selectPortfolio(id:string){setDropOpen(false);router.push(`/dashboard/portfolio?id=${id}`);}
  function openEdit(pf:{id:string;name:string;type:string},e:React.MouseEvent){
    e.stopPropagation();setEditTarget(pf);setEditName(pf.name);setEditType(pf.type);
    setEditErr("");setDelConfirm(false);setEditModal(true);setDropOpen(false);
  }
  async function handleSaveEdit(){
    if(!editTarget||!editName.trim()){setEditErr("Nom obligatoire.");return;}
    const {error}=await supabase.from("portfolios").update({name:editName.trim(),type:editType}).eq("id",editTarget.id);
    if(error){setEditErr("Erreur.");return;}
    setEditModal(false);window.location.reload();
  }
  async function handleDelete(){
    if(!editTarget)return;
    await supabase.from("portfolio_assets").delete().eq("portfolio_id",editTarget.id);
    await supabase.from("portfolios").delete().eq("id",editTarget.id);
    setEditModal(false);router.push("/dashboard/portfolio");window.location.reload();
  }
  // Close dropdown on click outside
  useEffect(()=>{
    function handleClick(e:MouseEvent){if(dropRef.current&&!dropRef.current.contains(e.target as Node))setDropOpen(false);}
    if(dropOpen)document.addEventListener("mousedown",handleClick);
    return()=>document.removeEventListener("mousedown",handleClick);
  },[dropOpen]);
  async function handleLogout(){await supabase.auth.signOut();router.push("/");}

  if(loading)return <div style={{minHeight:"100vh",background:C.cream,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:"rgba(5,11,20,.2)",fontSize:11,letterSpacing:".2em",fontFamily:"'Inter',sans-serif"}}>CHARGEMENT...</div></div>;

  return <>{editModal&&editTarget&&(
    <div onClick={()=>setEditModal(false)} style={{position:"fixed",inset:0,background:"rgba(5,11,20,.5)",backdropFilter:"blur(4px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:12,padding:"32px 36px",width:400,boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
        <div style={{fontSize:22,fontWeight:500,color:"rgba(5,11,20,.88)",letterSpacing:"-.02em",marginBottom:6}}>Modifier le portefeuille</div>
        <div style={{fontSize:11,color:"rgba(5,11,20,.4)",marginBottom:22}}>Renommer, changer le type ou supprimer.</div>
        <label style={{fontSize:9,fontWeight:500,letterSpacing:".14em",color:"rgba(5,11,20,.36)",display:"block",marginBottom:7,textTransform:"uppercase"}}>Nom</label>
        <input value={editName} onChange={e=>{setEditName(e.target.value);setEditErr("");}} style={{width:"100%",background:"#FAFAF8",border:"0.5px solid rgba(5,11,20,.08)",borderRadius:6,padding:"11px 13px",fontSize:13,color:"rgba(5,11,20,.88)",outline:"none",marginBottom:14}}/>
        <label style={{fontSize:9,fontWeight:500,letterSpacing:".14em",color:"rgba(5,11,20,.36)",display:"block",marginBottom:7,textTransform:"uppercase"}}>Type</label>
        <div style={{display:"flex",background:"rgba(5,11,20,.04)",borderRadius:6,padding:3,gap:3,marginBottom:18}}>
          <button onClick={()=>setEditType("active")} style={{flex:1,padding:"8px 4px",fontSize:9,fontWeight:500,border:"none",borderRadius:4,cursor:"pointer",textAlign:"center",background:editType==="active"||editType==="manual"?"#050B14":"transparent",color:editType==="active"||editType==="manual"?"white":"rgba(5,11,20,.36)",transition:`all ${EASE}`}}>ACTIF — Appliqué</button>
          <button onClick={()=>setEditType("optimized")} style={{flex:1,padding:"8px 4px",fontSize:9,fontWeight:500,border:"none",borderRadius:4,cursor:"pointer",textAlign:"center",background:editType==="optimized"?"#050B14":"transparent",color:editType==="optimized"?"white":"rgba(5,11,20,.36)",transition:`all ${EASE}`}}>0CGP — Simulation</button>
        </div>
        {editErr&&<div style={{fontSize:11,color:"rgba(180,40,40,.8)",marginBottom:10}}>{editErr}</div>}
        <div style={{display:"flex",gap:8}}>
          {!delConfirm?(<>
            <button onClick={()=>setEditModal(false)} style={{flex:1,padding:"12px 6px",fontSize:10,fontWeight:500,letterSpacing:".1em",border:"none",borderRadius:6,cursor:"pointer",background:"rgba(5,11,20,.04)",color:"rgba(5,11,20,.4)",transition:`all ${EASE}`}}>ANNULER</button>
            <button onClick={()=>setDelConfirm(true)} style={{flex:1,padding:"12px 6px",fontSize:10,fontWeight:500,letterSpacing:".1em",border:"1px solid #FECACA",borderRadius:6,cursor:"pointer",background:"#FEF2F2",color:"#DC2626",transition:`all ${EASE}`}}>SUPPRIMER</button>
            <button onClick={handleSaveEdit} style={{flex:1,padding:"12px 6px",fontSize:10,fontWeight:500,letterSpacing:".1em",border:"none",borderRadius:6,cursor:"pointer",background:"#050B14",color:"white",transition:`all ${EASE}`}}>ENREGISTRER</button>
          </>):(<>
            <button onClick={()=>setDelConfirm(false)} style={{flex:1,padding:"12px 6px",fontSize:10,fontWeight:500,border:"none",borderRadius:6,cursor:"pointer",background:"rgba(5,11,20,.04)",color:"rgba(5,11,20,.4)"}}>RETOUR</button>
            <button onClick={handleDelete} style={{flex:1,padding:"12px 6px",fontSize:10,fontWeight:500,border:"none",borderRadius:6,cursor:"pointer",background:"#DC2626",color:"white"}}>CONFIRMER</button>
          </>)}
        </div>
      </div>
    </div>
  )}
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
          <div ref={dropRef} onMouseEnter={()=>sPH(true)} onMouseLeave={()=>sPH(false)} onClick={()=>setDropOpen(!dropOpen)} style={{margin:"0 12px 20px",padding:"11px 13px",borderRadius:8,cursor:"pointer",position:"relative",zIndex:100,background:profHov?"linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.025))":"linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.01))",border:profHov?".5px solid rgba(255,255,255,.1)":".5px solid rgba(255,255,255,.055)",boxShadow:profHov?"inset 0 1px 0 rgba(255,255,255,.05),0 3px 10px rgba(0,0,0,.2)":"inset 0 1px 0 rgba(255,255,255,.03),0 2px 6px rgba(0,0,0,.15)",display:"flex",alignItems:"center",gap:10,transition:`all ${EASE}`,transform:profHov?"translateY(-.5px)":"none"}}>
            <div style={{width:28,height:28,borderRadius:7,background:profHov?"linear-gradient(135deg,rgba(201,168,76,.18),rgba(201,168,76,.07))":"linear-gradient(135deg,rgba(201,168,76,.1),rgba(201,168,76,.04))",border:`.5px solid rgba(201,168,76,${profHov?.28:.18})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8.5,fontWeight:600,letterSpacing:".04em",color:C.gold,transition:`all ${EASE}`}}>0CGP</div>
            <span style={{fontSize:12.5,fontWeight:400,flex:1,color:profHov?"rgba(255,255,255,.82)":"rgba(255,255,255,.68)",transition:`color ${EASE}`,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{portfolios.find(p=>p.id===activeId)?.name||"Portfolio"}</span>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={profHov?"rgba(255,255,255,.35)":"rgba(255,255,255,.18)"} strokeWidth="1.5" strokeLinecap="round" style={{transition:`all ${EASE}`,transform:dropOpen?"rotate(180deg)":"none"}}><polyline points="6 9 12 15 18 9"/></svg>
            {dropOpen&&portfolios.length>0&&(
              <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"100%",marginTop:4,left:0,right:0,zIndex:100,background:"rgba(10,20,40,.95)",backdropFilter:"blur(12px)",border:".5px solid rgba(255,255,255,.08)",borderRadius:8,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.3)"}}>
                {portfolios.map(pf=>{const isActive=pf.id===activeId;return(
                  <div key={pf.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",fontSize:12,fontWeight:isActive?500:300,cursor:"pointer",transition:`all ${EASE}`,background:isActive?"rgba(255,255,255,.06)":"transparent",color:isActive?"rgba(255,255,255,.9)":"rgba(255,255,255,.5)"}}>
                    <span style={{fontSize:8,fontWeight:600,padding:"2px 6px",borderRadius:3,letterSpacing:".06em",flexShrink:0,background:pf.type==="optimized"?"rgba(180,140,0,.35)":pf.type==="active"?"rgba(22,90,52,.25)":"rgba(22,90,52,.25)",color:pf.type==="optimized"?"rgba(255,220,60,.95)":pf.type==="active"?"rgba(130,255,160,.9)":"rgba(130,255,160,.9)"}}>{pf.type==="optimized"?"0CGP":"ACTIF"}</span>
                    <span onClick={()=>selectPortfolio(pf.id)} style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",transition:`color ${EASE}`}}>{pf.name}</span>
                    <button onClick={e=>openEdit(pf,e)} style={{background:"rgba(255,255,255,.05)",border:".5px solid rgba(255,255,255,.08)",color:"rgba(255,255,255,.3)",fontSize:9,padding:"2px 7px",borderRadius:3,cursor:"pointer",transition:`all ${EASE}`,flexShrink:0}}>✎</button>
                  </div>
                );})}
                <div style={{borderTop:".5px solid rgba(255,255,255,.06)",padding:"10px 14px"}}><button onClick={()=>{router.push("/dashboard/entry");setDropOpen(false);}} style={{background:"none",border:"none",color:"rgba(255,255,255,.3)",fontSize:11,fontWeight:300,cursor:"pointer",padding:0,transition:`color ${EASE}`}}>+ Nouveau portefeuille</button></div>
              </div>
            )}
          </div>
          <div style={{padding:"0 22px",marginBottom:8}}><div style={{fontSize:8.5,fontWeight:500,letterSpacing:".18em",textTransform:"uppercase",color:"rgba(255,255,255,.35)",marginBottom:7}}>Navigation</div><div style={{height:".3px",background:"linear-gradient(90deg,rgba(255,255,255,.07),rgba(255,255,255,.02),transparent)"}}/></div>
          <nav style={{flex:1,display:"flex",flexDirection:"column",gap:1,padding:"0 9px",position:"relative",zIndex:1}}>
            {navItems.map(item=>{const active=item.href==="/dashboard"?pathname==="/dashboard":pathname.startsWith(item.href);const hov=hovNav===item.href;return(
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
        <div style={{padding:"0 44px",borderBottom:`.5px solid ${C.border}`,position:"relative",zIndex:1,background:"rgba(249,248,246,.9)",backdropFilter:"blur(6px)",opacity:loaded?1:0,transition:"opacity .8s ease .4s"}}><Ticker data={mk} loading={mkLoading}/></div>
        <div style={{flex:1,padding:"24px",overflow:"auto",position:"relative",zIndex:1}}><PageTransition>{children}</PageTransition></div>
      </main>
    </div>
  </>;
}
