"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";

const EASE = "0.7s cubic-bezier(.16,1,.3,1)";
const C = {
  gold: "#c9a84c", sapphire: "#1a3a6a", sapphireAccent: "#2a5494",
  sapphireGlow: "rgba(26,58,106,0.25)", bordeaux: "rgba(175,60,60,0.62)", bordeauxH: "rgba(175,60,60,0.92)",
};

const NAV = [
  { href:"/dashboard/portfolio",   ic:"grid",     label:"Portfolio" },
  { href:"/dashboard/optimizer",   ic:"diamond",  label:"Optimiseur" },
  { href:"/dashboard/rebalancing", ic:"refresh",  label:"Rééquilibrage" },
  { href:"/dashboard/alerts",      ic:"bell",     label:"Alertes" },
  { href:"/dashboard/backtesting", ic:"layers",   label:"Backtesting" },
  { href:"/dashboard/correlation", ic:"grid4",    label:"Corrélation" },
  { href:"/dashboard/stress",      ic:"triangle", label:"Stress Tests" },
  { href:"/dashboard/montecarlo",  ic:"target",   label:"Monte Carlo" },
];

function NI({ t, a, h }: { t: string; a: boolean; h: boolean }) {
  const c = a ? "rgba(255,255,255,.95)" : h ? "rgba(255,255,255,.62)" : "rgba(255,255,255,.42)";
  const p = { width:16, height:16, viewBox:"0 0 24 24", fill:"none", stroke:c, strokeWidth:"0.8", strokeLinecap:"round" as const, strokeLinejoin:"round" as const, style:{transition:`stroke ${EASE}`} };
  const m: Record<string, JSX.Element> = {
    grid: <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    diamond: <svg {...p}><path d="M12 2L2 12l10 10 10-10L12 2z"/>{a&&<circle cx="12" cy="12" r="2" fill={C.sapphireAccent} stroke="none" opacity=".5"/>}</svg>,
    refresh: <svg {...p}><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>,
    bell: <svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><circle cx="12" cy="21" r="1.5"/></svg>,
    layers: <svg {...p}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
    grid4: <svg {...p}><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
    triangle: <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>,
    target: <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  };
  return m[t] || null;
}

interface Portfolio { id:string; name:string; type:"manual"|"optimized" }
interface SidebarProps { portfolios?: Portfolio[]; activePortfolioId?: string }

function SidebarInner({ portfolios=[], activePortfolioId="" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dropOpen, setDropOpen] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Portfolio|null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"manual"|"optimized">("manual");
  const [editErr, setEditErr] = useState("");
  const [delConfirm, setDelConfirm] = useState(false);
  const [hovNav, setHovNav] = useState<string|null>(null);
  const [profHov, setProfHov] = useState(false);
  const [userHov, setUserHov] = useState(false);

  const urlId = searchParams.get("id") ?? "";
  const curId = urlId || activePortfolioId;
  const activePf = portfolios.find(p => p.id === curId) ?? portfolios[0];

  async function handleLogout() { await supabase.auth.signOut(); router.push("/"); }
  function selectPortfolio(id: string) { setDropOpen(false); router.push(`/dashboard/portfolio?id=${id}`); }
  function openEdit(pf: Portfolio, e: React.MouseEvent) {
    e.stopPropagation(); setEditTarget(pf); setEditName(pf.name); setEditType(pf.type);
    setEditErr(""); setDelConfirm(false); setEditModal(true); setDropOpen(false);
  }
  async function handleSaveEdit() {
    if (!editTarget||!editName.trim()) { setEditErr("Nom obligatoire."); return; }
    const { error } = await supabase.from("portfolios").update({name:editName.trim(),type:editType}).eq("id",editTarget.id);
    if (error) { setEditErr("Erreur."); return; }
    setEditModal(false); window.location.reload();
  }
  async function handleDelete() {
    if (!editTarget) return;
    await supabase.from("portfolio_assets").delete().eq("portfolio_id",editTarget.id);
    await supabase.from("portfolios").delete().eq("id",editTarget.id);
    setEditModal(false); router.push("/dashboard/portfolio"); window.location.reload();
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        @keyframes sideIn{0%{opacity:0;transform:translateX(-8px) scale(.988)}100%{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes breathe{0%,100%{opacity:.35}50%{opacity:.75}}
        .mo{position:fixed;inset:0;background:rgba(10,22,40,.65);z-index:500;display:flex;align-items:center;justify-content:center}
        .mo-box{background:white;border-radius:16px;padding:32px 36px;width:400px;box-shadow:0 24px 64px rgba(0,0,0,.25);font-family:'Inter',sans-serif}
        .mo-h{font-size:22px;font-weight:500;color:#050B14;margin-bottom:6px;letter-spacing:-.02em}
        .mo-s{font-size:11px;color:rgba(5,11,20,.4);margin-bottom:22px;font-weight:400}
        .mo-lbl{font-size:9px;font-weight:500;letter-spacing:.14em;color:rgba(5,11,20,.36);display:block;margin-bottom:7px;text-transform:uppercase}
        .mo-inp{width:100%;background:#FAFAF8;border:1px solid rgba(5,11,20,.08);border-radius:6px;padding:11px 13px;font-size:13px;color:#050B14;outline:none;font-family:'Inter',sans-serif;margin-bottom:14px}
        .mo-inp:focus{border-color:#050B14}
        .mo-tog{display:flex;background:rgba(5,11,20,.04);border-radius:6px;padding:3px;gap:3px;margin-bottom:18px}
        .mo-tb{flex:1;padding:8px 4px;font-size:9px;font-weight:500;border:none;border-radius:4px;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;text-align:center}
        .mo-tb.on{background:#050B14;color:white}.mo-tb.off{background:transparent;color:rgba(5,11,20,.36)}
        .mo-row{display:flex;gap:8px}
        .mo-btn{flex:1;padding:12px 6px;font-size:10px;font-weight:500;letter-spacing:.1em;border:none;border-radius:6px;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;text-transform:uppercase}
        .mo-cancel{background:rgba(5,11,20,.04);color:rgba(5,11,20,.4)}.mo-cancel:hover{background:rgba(5,11,20,.08)}
        .mo-save{background:#050B14;color:white}.mo-save:hover{opacity:.82}
        .mo-del{background:#FEF2F2;color:#DC2626;border:1px solid #FECACA}.mo-del:hover{background:#FEE2E2}
        .mo-delc{background:#DC2626;color:white}
        .mo-err{font-size:11px;color:#DC2626;margin-bottom:10px}
      `}</style>

      {/* Edit modal */}
      {editModal && editTarget && (
        <div className="mo" onClick={()=>setEditModal(false)}>
          <div className="mo-box" onClick={e=>e.stopPropagation()}>
            <div className="mo-h">Modifier le portefeuille</div>
            <div className="mo-s">Renommer, changer le type ou supprimer.</div>
            <label className="mo-lbl">Nom</label>
            <input className="mo-inp" value={editName} onChange={e=>{setEditName(e.target.value);setEditErr("");}}/>
            <label className="mo-lbl">Type</label>
            <div className="mo-tog">
              <button className={`mo-tb ${editType==="manual"?"on":"off"}`} onClick={()=>setEditType("manual")}>INIT — Saisi à la main</button>
              <button className={`mo-tb ${editType==="optimized"?"on":"off"}`} onClick={()=>setEditType("optimized")}>0CGP — Optimisé</button>
            </div>
            {editErr&&<div className="mo-err">{editErr}</div>}
            <div className="mo-row">
              {!delConfirm ? (<>
                <button className="mo-btn mo-cancel" onClick={()=>setEditModal(false)}>Annuler</button>
                <button className="mo-btn mo-del" onClick={()=>setDelConfirm(true)}>Supprimer</button>
                <button className="mo-btn mo-save" onClick={handleSaveEdit}>Enregistrer</button>
              </>) : (<>
                <button className="mo-btn mo-cancel" onClick={()=>setDelConfirm(false)}>Retour</button>
                <button className="mo-btn mo-delc" onClick={handleDelete}>Confirmer suppression</button>
              </>)}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside style={{
        width:252, minWidth:252, margin:12, borderRadius:10, position:"relative", zIndex:2,
        display:"flex", flexDirection:"column", overflow:"hidden",
        animation:"sideIn .7s cubic-bezier(.23,1,.32,1) both",
        background:"linear-gradient(168deg,rgba(18,36,62,.32) 0%,transparent 45%),linear-gradient(348deg,rgba(0,0,0,.12) 0%,transparent 35%),radial-gradient(ellipse at 25% 0%,rgba(25,48,82,.35) 0%,transparent 55%),radial-gradient(ellipse at 85% 100%,rgba(0,0,0,.15) 0%,transparent 45%),linear-gradient(180deg,#0f2038 0%,#091629 40%,#060e1c 100%)",
        boxShadow:"inset 0 1px 0 rgba(255,255,255,.05),inset 0 -1px 0 rgba(0,0,0,.18),0 0 0 .5px rgba(255,255,255,.03),0 4px 16px rgba(0,0,0,.18),0 12px 40px rgba(5,11,20,.2)",
      }}>
        {/* Grain */}
        <div style={{position:"absolute",inset:0,borderRadius:10,pointerEvents:"none",opacity:.022,mixBlendMode:"overlay",
          backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`}}/>
        {/* Edge highlight */}
        <div style={{position:"absolute",top:0,left:14,right:14,height:1,zIndex:1,
          background:"linear-gradient(90deg,transparent,rgba(255,255,255,.06) 30%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.06) 70%,transparent)"}}/>

        <div style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",flex:1}}>
          {/* Logo */}
          <Link href="/" style={{display:"block",padding:"26px 22px 20px",fontSize:11.5,fontWeight:500,letterSpacing:".3em",color:"rgba(255,255,255,.58)",textTransform:"uppercase",textDecoration:"none",fontFamily:"'Inter',sans-serif"}}>
            Zero CGP
          </Link>

          {/* Profile selector */}
          <div onMouseEnter={()=>setProfHov(true)} onMouseLeave={()=>setProfHov(false)}
            onClick={()=>setDropOpen(!dropOpen)}
            style={{
              margin:"0 12px 20px",padding:"11px 13px",borderRadius:8,cursor:"pointer",
              background:profHov?"linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.025))":"linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.01))",
              border:profHov?".5px solid rgba(255,255,255,.1)":".5px solid rgba(255,255,255,.055)",
              boxShadow:profHov?"inset 0 1px 0 rgba(255,255,255,.05),0 3px 10px rgba(0,0,0,.2)":"inset 0 1px 0 rgba(255,255,255,.03),0 2px 6px rgba(0,0,0,.15)",
              display:"flex",alignItems:"center",gap:10,position:"relative",
              transition:`all ${EASE}`,transform:profHov?"translateY(-.5px)":"none",
            }}>
            <div style={{width:28,height:28,borderRadius:7,
              background:profHov?"linear-gradient(135deg,rgba(201,168,76,.18),rgba(201,168,76,.07))":"linear-gradient(135deg,rgba(201,168,76,.1),rgba(201,168,76,.04))",
              border:`.5px solid rgba(201,168,76,${profHov?.28:.18})`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:8.5,fontWeight:600,letterSpacing:".04em",color:C.gold,transition:`all ${EASE}`}}>
              0CGP
            </div>
            <span style={{fontSize:12.5,fontWeight:400,flex:1,color:profHov?"rgba(255,255,255,.82)":"rgba(255,255,255,.68)",transition:`color ${EASE}`,fontFamily:"'Inter',sans-serif"}}>
              {activePf?.name ?? "Papa"}
            </span>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={profHov?"rgba(255,255,255,.35)":"rgba(255,255,255,.18)"} strokeWidth="1.5" strokeLinecap="round" style={{transition:`all ${EASE}`,transform:profHov?"rotate(180deg)":"none"}}><polyline points="6 9 12 15 18 9"/></svg>

            {/* Dropdown */}
            {dropOpen && portfolios.length > 0 && (
              <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#0E1F3A",border:"1px solid rgba(255,255,255,.08)",borderRadius:6,overflow:"hidden",zIndex:50,boxShadow:"0 8px 24px rgba(0,0,0,.3)"}}>
                {portfolios.map(pf=>(
                  <div key={pf.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 13px",fontSize:11,color:"rgba(255,255,255,.5)",fontFamily:"'Inter',sans-serif",transition:`background ${EASE}`,background:pf.id===curId?"rgba(255,255,255,.08)":"transparent",cursor:"pointer"}}
                    onClick={()=>selectPortfolio(pf.id)}>
                    <span style={{fontSize:8,fontWeight:600,padding:"2px 6px",borderRadius:3,letterSpacing:".06em",background:pf.type==="optimized"?"rgba(180,140,0,.35)":"rgba(30,58,110,.6)",color:pf.type==="optimized"?"rgba(255,220,60,.95)":"rgba(200,220,255,.85)"}}>{pf.type==="optimized"?"0CGP":"INIT"}</span>
                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"rgba(255,255,255,.7)"}}>{pf.name}</span>
                    <button onClick={e=>openEdit(pf,e)} style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.07)",color:"rgba(255,255,255,.3)",fontSize:9,padding:"2px 7px",borderRadius:3,cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:`all ${EASE}`}}>✎</button>
                  </div>
                ))}
                <div style={{borderTop:"1px solid rgba(255,255,255,.06)",padding:"8px 13px"}}>
                  <button onClick={()=>{router.push("/dashboard/entry");setDropOpen(false);}} style={{background:"none",border:"none",color:"rgba(255,255,255,.25)",fontSize:10,cursor:"pointer",fontFamily:"'Inter',sans-serif",padding:0}}>+ Nouveau portefeuille</button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation label */}
          <div style={{padding:"0 22px",marginBottom:8}}>
            <div style={{fontSize:8.5,fontWeight:500,letterSpacing:".18em",textTransform:"uppercase",color:"rgba(255,255,255,.35)",marginBottom:7,fontFamily:"'Inter',sans-serif"}}>Navigation</div>
            <div style={{height:".3px",background:"linear-gradient(90deg,rgba(255,255,255,.07),rgba(255,255,255,.02),transparent)"}}/>
          </div>

          {/* Nav items */}
          <nav style={{flex:1,display:"flex",flexDirection:"column",gap:1,padding:"0 9px"}}>
            {NAV.map(item=>{
              const active = pathname.startsWith(item.href.split("?")[0]);
              const hov = hovNav === item.href;
              return (
                <Link key={item.href} href={item.href}
                  onMouseEnter={()=>setHovNav(item.href)} onMouseLeave={()=>setHovNav(null)}
                  style={{
                    display:"flex",alignItems:"center",gap:11,padding:"10px 14px",borderRadius:8,
                    cursor:"pointer",fontSize:13,fontWeight:active?500:400,letterSpacing:"-.005em",
                    textAlign:"left",position:"relative",overflow:"hidden",textDecoration:"none",
                    color:active?"rgba(255,255,255,.95)":hov?"rgba(255,255,255,.68)":"rgba(255,255,255,.45)",
                    background:active?"linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.025))":hov?"rgba(255,255,255,.02)":"transparent",
                    boxShadow:active?"inset 0 1px 0 rgba(255,255,255,.05),inset 0 -1px 0 rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.08)":"none",
                    border:active?".3px solid rgba(255,255,255,.07)":".3px solid transparent",
                    transition:`color ${EASE},background ${EASE},border ${EASE},transform ${EASE}`,
                    transform:hov&&!active?"translateX(1.5px)":"none",
                    fontFamily:"'Inter',sans-serif",
                  }}>
                  {active&&<>
                    <div style={{position:"absolute",left:-9,top:"50%",transform:"translateY(-50%)",width:2.5,height:20,borderRadius:2,background:`linear-gradient(180deg,${C.sapphireAccent}85,${C.sapphireAccent}15)`,boxShadow:`0 0 12px ${C.sapphireGlow}`,animation:"breathe 3s ease infinite"}}/>
                    <div style={{position:"absolute",inset:0,borderRadius:8,pointerEvents:"none",background:"radial-gradient(ellipse at 16% 50%,rgba(26,58,106,.04),transparent 50%)"}}/>
                  </>}
                  {hov&&!active&&<div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",width:2.5,height:2.5,borderRadius:"50%",background:"rgba(255,255,255,.18)"}}/>}
                  <NI t={item.ic} a={active} h={hov}/>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Status */}
          <div style={{padding:"0 20px",marginBottom:12}}>
            <div style={{height:".3px",marginBottom:10,background:"linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:4,height:4,borderRadius:"50%",background:C.gold,opacity:.6}}/>
              <span style={{fontSize:9.5,fontWeight:400,color:"rgba(255,255,255,.38)",fontFamily:"'Inter',sans-serif"}}>Optimisation : il y a 26 jours</span>
            </div>
          </div>

          {/* User footer */}
          <div style={{margin:"0 9px 9px",padding:"13px",borderRadius:8,background:"rgba(255,255,255,.04)",border:".3px solid rgba(255,255,255,.045)"}}>
            <div onMouseEnter={()=>setUserHov(true)} onMouseLeave={()=>setUserHov(false)}
              onClick={handleLogout}
              style={{display:"flex",alignItems:"center",gap:11,cursor:"pointer",transition:`all ${EASE}`,transform:userHov?"translateY(-.5px)":"none"}}>
              <div style={{
                width:36,height:36,borderRadius:"50%",
                background:userHov?"linear-gradient(145deg,#1d3050,#0e1a2c)":"linear-gradient(145deg,#182840,#0c1422)",
                border:`.5px solid rgba(255,255,255,${userHov?.12:.08})`,
                boxShadow:"inset 0 1.5px 3px rgba(255,255,255,.05),inset 0 -1.5px 3px rgba(0,0,0,.22),0 2px 6px rgba(0,0,0,.18)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:12,fontWeight:500,letterSpacing:".04em",
                color:userHov?"rgba(255,255,255,.85)":"rgba(255,255,255,.65)",
                flexShrink:0,transition:`all ${EASE}`,fontFamily:"'Inter',sans-serif",
              }}>U</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:500,marginBottom:2,color:userHov?"rgba(255,255,255,.85)":"rgba(255,255,255,.7)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",transition:`color ${EASE}`,fontFamily:"'Inter',sans-serif"}}>Mon compte</div>
                <div style={{fontSize:9,fontWeight:500,letterSpacing:".08em",textTransform:"uppercase",color:userHov?C.bordeauxH:C.bordeaux,transition:`color ${EASE}`,fontFamily:"'Inter',sans-serif"}}>Déconnexion</div>
              </div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={userHov?"rgba(175,60,60,.65)":"rgba(175,60,60,.35)"} strokeWidth=".8" strokeLinecap="round" style={{transition:`stroke ${EASE}`}}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={<aside style={{width:252,minWidth:252,margin:12,borderRadius:10,background:"linear-gradient(180deg,#0f2038,#060e1c)"}}/>}>
      <SidebarInner {...props}/>
    </Suspense>
  );
}
