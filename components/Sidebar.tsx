"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href:"/dashboard/portfolio",   icon:"▦", label:"Portfolio"    },
  { href:"/dashboard/optimizer",   icon:"◈", label:"Optimiseur"   },
  { href:"/dashboard/rebalancing", icon:"⊜", label:"Rééquilibrage"},
  { href:"/dashboard/alerts",      icon:"◉", label:"Alertes"      },
  { href:"/dashboard/backtesting", icon:"◷", label:"Backtesting"  },
  { href:"/dashboard/correlation", icon:"⊞", label:"Corrélation"  },
  { href:"/dashboard/stress",      icon:"◬", label:"Stress Tests" },
  { href:"/dashboard/montecarlo",  icon:"⊕", label:"Monte Carlo"  },
];

interface Portfolio { id:string; name:string; type:"manual"|"optimized" }
interface SidebarProps { portfolios?: Portfolio[]; activePortfolioId?: string; }

function SidebarInner({ portfolios = [], activePortfolioId = "" }: SidebarProps) {
  const pathname     = usePathname();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [dropOpen,   setDropOpen]   = useState(false);
  const [editModal,  setEditModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<Portfolio|null>(null);
  const [editName,   setEditName]   = useState("");
  const [editType,   setEditType]   = useState<"manual"|"optimized">("manual");
  const [editErr,    setEditErr]    = useState("");
  const [delConfirm, setDelConfirm] = useState(false);

  // Lire l'id actif depuis l'URL (useSearchParams) — toujours à jour
  const urlId    = searchParams.get("id") ?? "";
  const curId    = urlId || activePortfolioId;
  const activePf = portfolios.find(p => p.id === curId) ?? portfolios[0];

  async function handleLogout() { await supabase.auth.signOut(); router.push("/"); }

  function selectPortfolio(id: string) {
    setDropOpen(false);
    router.push(`/dashboard/portfolio?id=${id}`);
  }

  function openEdit(pf: Portfolio, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTarget(pf); setEditName(pf.name); setEditType(pf.type);
    setEditErr(""); setDelConfirm(false); setEditModal(true); setDropOpen(false);
  }

  async function handleSaveEdit() {
    if (!editTarget || !editName.trim()) { setEditErr("Le nom est obligatoire."); return; }
    if (portfolios.find(p => p.name === editName.trim() && p.id !== editTarget.id)) {
      setEditErr(`"${editName}" existe déjà.`); return;
    }
    const { error } = await supabase.from("portfolios")
      .update({ name: editName.trim(), type: editType }).eq("id", editTarget.id);
    if (error) { setEditErr("Erreur sauvegarde."); return; }
    setEditModal(false); window.location.reload();
  }

  async function handleDelete() {
    if (!editTarget) return;
    await supabase.from("portfolio_assets").delete().eq("portfolio_id", editTarget.id);
    await supabase.from("portfolios").delete().eq("id", editTarget.id);
    setEditModal(false); router.push("/dashboard/portfolio"); window.location.reload();
  }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400&family=Inter:wght@300;400;500&display=swap');
    .sb{width:260px;min-height:100vh;background:#0A1628;display:flex;flex-direction:column;flex-shrink:0;font-family:'Inter',sans-serif}
    .sb-hd{padding:28px 22px 20px;border-bottom:1px solid rgba(255,255,255,.05)}
    .sb-logo{font-family:'Cormorant Garant',serif;font-size:13px;font-weight:400;letter-spacing:.28em;color:white;margin-bottom:16px;display:block;text-decoration:none}
    .sb-new{display:block;width:100%;text-align:center;padding:10px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);font-size:10px;font-weight:500;letter-spacing:.1em;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;text-decoration:none}
    .sb-new:hover{background:rgba(255,255,255,.12);color:white}
    .sb-dd{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:6px;padding:10px 13px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;position:relative;user-select:none}
    .sb-dd:hover{background:rgba(255,255,255,.08)}
    .sb-dd-l{display:flex;align-items:center;gap:7px;min-width:0;overflow:hidden}
    .sb-dd-txt{font-size:11px;color:rgba(255,255,255,.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:300}
    .sb-arr{font-size:8px;color:rgba(255,255,255,.2);flex-shrink:0}
    .sb-menu{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#0E1F3A;border:1px solid rgba(255,255,255,.08);border-radius:6px;overflow:hidden;z-index:50;box-shadow:0 8px 24px rgba(0,0,0,.3)}
    .sb-item{display:flex;align-items:center;gap:8px;padding:10px 13px;font-size:11px;color:rgba(255,255,255,.5);font-family:'Inter',sans-serif;transition:background .12s}
    .sb-item:hover{background:rgba(255,255,255,.05)}
    .sb-item.cur{background:rgba(255,255,255,.08)}
    .sb-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;cursor:pointer;color:rgba(255,255,255,.7)}
    .sb-name:hover{color:white}
    .sb-badge{font-size:8px;font-weight:600;padding:2px 6px;border-radius:3px;letter-spacing:.06em;flex-shrink:0;white-space:nowrap}
    .b-init{background:rgba(30,58,110,.6);color:rgba(200,220,255,.85)}
    .b-opt{background:rgba(180,140,0,.35);color:rgba(255,220,60,.95)}
    .sb-edit{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.3);font-size:9px;padding:2px 7px;border-radius:3px;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;flex-shrink:0}
    .sb-edit:hover{background:rgba(255,255,255,.12);color:rgba(255,255,255,.7)}
    .sb-nav{padding:16px 10px;flex:1}
    .sb-sec{font-size:7px;font-weight:500;letter-spacing:.18em;color:rgba(255,255,255,.15);padding:0 12px 10px;margin-top:8px}
    .sb-lnk{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:0 6px 6px 0;font-size:12px;font-weight:400;text-decoration:none;transition:all .15s;border-left:2px solid transparent;color:rgba(255,255,255,.3)}
    .sb-lnk:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.6)}
    .sb-lnk.on{background:rgba(255,255,255,.07);border-left-color:#4A7FBF;color:white;font-weight:500}
    .sb-ico{font-size:13px;width:16px;text-align:center;flex-shrink:0}
    .sb-ft{padding:16px 22px;border-top:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:12px}
    .sb-av{width:28px;height:28px;border-radius:50%;background:#1E3A6E;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:500;flex-shrink:0}
    .sb-un{font-size:11px;color:rgba(255,255,255,.5)}
    .sb-out{font-size:9px;color:rgba(255,255,255,.18);cursor:pointer;background:none;border:none;font-family:'Inter',sans-serif;display:block;padding:0;transition:color .2s}
    .sb-out:hover{color:rgba(255,255,255,.5)}
    .mo{position:fixed;inset:0;background:rgba(10,22,40,.65);z-index:500;display:flex;align-items:center;justify-content:center}
    .mo-box{background:white;border-radius:16px;padding:32px 36px;width:400px;box-shadow:0 24px 64px rgba(0,0,0,.25)}
    .mo-h{font-family:'Cormorant Garant',serif;font-size:24px;font-weight:300;color:#0A1628;margin-bottom:6px}
    .mo-s{font-size:11px;color:#8A9BB0;margin-bottom:22px;font-weight:300}
    .mo-lbl{font-size:9px;font-weight:500;letter-spacing:.14em;color:#8A9BB0;display:block;margin-bottom:7px}
    .mo-inp{width:100%;background:#FAFAF8;border:1px solid rgba(10,22,40,.12);border-radius:8px;padding:11px 13px;font-size:13px;color:#0A1628;outline:none;font-family:'Inter',sans-serif;margin-bottom:14px}
    .mo-inp:focus{border-color:#0A1628}
    .mo-tog{display:flex;background:rgba(10,22,40,.05);border-radius:6px;padding:3px;gap:3px;margin-bottom:18px}
    .mo-tb{flex:1;padding:8px 4px;font-size:9px;font-weight:500;border:none;border-radius:4px;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;text-align:center}
    .mo-tb.on{background:#0A1628;color:white}
    .mo-tb.off{background:transparent;color:#8A9BB0}
    .mo-row{display:flex;gap:8px}
    .mo-btn{flex:1;padding:12px 6px;font-size:10px;font-weight:500;letter-spacing:.1em;border:none;border-radius:8px;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s}
    .mo-cancel{background:rgba(10,22,40,.05);color:#8A9BB0}.mo-cancel:hover{background:rgba(10,22,40,.1)}
    .mo-save{background:#0A1628;color:white}.mo-save:hover{opacity:.82}
    .mo-del{background:#FEF2F2;color:#DC2626;border:1px solid #FECACA}.mo-del:hover{background:#FEE2E2}
    .mo-delc{background:#DC2626;color:white}
    .mo-err{font-size:11px;color:#DC2626;margin-bottom:10px}
  `;

  return (
    <>
      <style>{CSS}</style>
      {editModal && editTarget && (
        <div className="mo" onClick={() => setEditModal(false)}>
          <div className="mo-box" onClick={e => e.stopPropagation()}>
            <div className="mo-h">Modifier le portefeuille</div>
            <div className="mo-s">Renommer, changer le type ou supprimer.</div>
            <label className="mo-lbl">NOM</label>
            <input className="mo-inp" value={editName} onChange={e=>{setEditName(e.target.value);setEditErr("");}}/>
            <label className="mo-lbl">TYPE</label>
            <div className="mo-tog">
              <button className={`mo-tb ${editType==="manual"?"on":"off"}`} onClick={()=>setEditType("manual")}>INIT — Saisi à la main</button>
              <button className={`mo-tb ${editType==="optimized"?"on":"off"}`} onClick={()=>setEditType("optimized")}>0CGP — Optimisé</button>
            </div>
            {editErr && <div className="mo-err">{editErr}</div>}
            <div className="mo-row">
              {!delConfirm ? (
                <>
                  <button className="mo-btn mo-cancel" onClick={()=>setEditModal(false)}>ANNULER</button>
                  <button className="mo-btn mo-del" onClick={()=>setDelConfirm(true)}>SUPPRIMER</button>
                  <button className="mo-btn mo-save" onClick={handleSaveEdit}>ENREGISTRER</button>
                </>
              ) : (
                <>
                  <button className="mo-btn mo-cancel" onClick={()=>setDelConfirm(false)}>← RETOUR</button>
                  <button className="mo-btn mo-delc" onClick={handleDelete}>CONFIRMER SUPPRESSION</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <aside className="sb">
        <div className="sb-hd">
          <Link href="/" className="sb-logo">ZERO CGP</Link>
          {portfolios.length === 0 ? (
            <Link href="/dashboard/entry" className="sb-new">+ RENSEIGNER MON PORTEFEUILLE</Link>
          ) : (
            <div className="sb-dd" onClick={()=>setDropOpen(!dropOpen)}>
              <div className="sb-dd-l">
                <span className={`sb-badge ${activePf?.type==="optimized"?"b-opt":"b-init"}`}>
                  {activePf?.type==="optimized"?"0CGP":"INIT"}
                </span>
                <span className="sb-dd-txt">{activePf?.name ?? "—"}</span>
              </div>
              <span className="sb-arr">▾</span>
              {dropOpen && (
                <div className="sb-menu" onClick={e=>e.stopPropagation()}>
                  {portfolios.map(pf => (
                    <div key={pf.id} className={`sb-item${pf.id===curId?" cur":""}`}>
                      <span className={`sb-badge ${pf.type==="optimized"?"b-opt":"b-init"}`}>
                        {pf.type==="optimized"?"0CGP":"INIT"}
                      </span>
                      <span className="sb-name" onClick={()=>selectPortfolio(pf.id)}>{pf.name}</span>
                      <button className="sb-edit" onClick={e=>openEdit(pf,e)}>✎</button>
                    </div>
                  ))}
                  <div style={{borderTop:"1px solid rgba(255,255,255,.06)",padding:"8px 13px"}}>
                    <button style={{background:"none",border:"none",color:"rgba(255,255,255,.25)",fontSize:10,cursor:"pointer",fontFamily:"'Inter',sans-serif",padding:0}} onClick={()=>{router.push("/dashboard/entry");setDropOpen(false);}}>+ Nouveau portefeuille</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <nav className="sb-nav">
          <div className="sb-sec">NAVIGATION</div>
          {NAV.map(({href,icon,label})=>(
            <Link key={href} href={href} className={`sb-lnk${pathname.startsWith(href.split("?")[0])?" on":""}`}>
              <span className="sb-ico">{icon}</span>{label}
            </Link>
          ))}
        </nav>
        <div className="sb-ft">
          <div className="sb-av">U</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="sb-un">Mon compte</div>
            <button className="sb-out" onClick={handleLogout}>DÉCONNEXION</button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={
      <aside style={{width:260,minHeight:"100vh",background:"#0A1628",flexShrink:0}}/>
    }>
      <SidebarInner {...props}/>
    </Suspense>
  );
}
