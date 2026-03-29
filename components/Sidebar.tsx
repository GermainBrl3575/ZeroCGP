"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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

interface SidebarProps {
  portfolios?: Portfolio[];
  activePortfolioId?: string;
}

export default function Sidebar({ portfolios = [], activePortfolioId = "" }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [dropOpen,   setDropOpen]   = useState(false);
  const [editModal,  setEditModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<Portfolio|null>(null);
  const [editName,   setEditName]   = useState("");
  const [editType,   setEditType]   = useState<"manual"|"optimized">("manual");
  const [editErr,    setEditErr]    = useState("");
  const [delConfirm, setDelConfirm] = useState(false);

  // La pastille affichée = le portefeuille dont l'id === activePortfolioId (passé par le layout)
  const activePf = portfolios.find(p => p.id === activePortfolioId) ?? portfolios[0];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function selectPortfolio(id: string) {
    setDropOpen(false);
    router.push(`/dashboard/portfolio?id=${id}`);
  }

  function openEdit(pf: Portfolio, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTarget(pf);
    setEditName(pf.name);
    setEditType(pf.type);
    setEditErr("");
    setDelConfirm(false);
    setEditModal(true);
    setDropOpen(false);
  }

  async function handleSaveEdit() {
    if (!editTarget || !editName.trim()) { setEditErr("Le nom est obligatoire."); return; }
    const dup = portfolios.find(p => p.name === editName.trim() && p.id !== editTarget.id);
    if (dup) { setEditErr(`Un portefeuille "${editName}" existe déjà.`); return; }
    const { error } = await supabase.from("portfolios")
      .update({ name: editName.trim(), type: editType })
      .eq("id", editTarget.id);
    if (error) { setEditErr("Erreur lors de la sauvegarde."); return; }
    setEditModal(false);
    window.location.reload();
  }

  async function handleDelete() {
    if (!editTarget) return;
    await supabase.from("portfolio_assets").delete().eq("portfolio_id", editTarget.id);
    await supabase.from("portfolios").delete().eq("id", editTarget.id);
    setEditModal(false);
    router.push("/dashboard/portfolio");
    window.location.reload();
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400&family=Inter:wght@300;400;500&display=swap');
        .sb{width:260px;min-height:100vh;background:#0A1628;display:flex;flex-direction:column;flex-shrink:0;font-family:'Inter',sans-serif}
        .sb-header{padding:28px 22px 20px;border-bottom:1px solid rgba(255,255,255,.05)}
        .sb-logo{font-family:'Cormorant Garant',serif;font-size:13px;font-weight:400;letter-spacing:.28em;color:white;margin-bottom:16px;display:block;text-decoration:none}
        .sb-btn-entry{display:block;width:100%;text-align:center;padding:10px 13px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.7);font-size:10px;font-weight:500;letter-spacing:.1em;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.2s;text-decoration:none}
        .sb-btn-entry:hover{background:rgba(255,255,255,.13);color:white}
        .sb-dropdown{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:6px;padding:10px 13px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;transition:background 0.2s;position:relative;user-select:none}
        .sb-dropdown:hover{background:rgba(255,255,255,.08)}
        .sb-dd-left{display:flex;align-items:center;gap:7px;min-width:0;overflow:hidden}
        .sb-dropdown-text{font-size:11px;color:rgba(255,255,255,.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:300}
        .sb-dropdown-arrow{font-size:8px;color:rgba(255,255,255,.2);flex-shrink:0}
        .sb-dropdown-menu{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#0E1F3A;border:1px solid rgba(255,255,255,.08);border-radius:6px;overflow:hidden;z-index:50;box-shadow:0 8px 24px rgba(0,0,0,.3)}
        .sb-dd-item{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:10px 13px;font-size:11px;color:rgba(255,255,255,.45);background:none;border:none;cursor:default;font-family:'Inter',sans-serif;font-weight:300;transition:background 0.12s}
        .sb-dd-item:hover{background:rgba(255,255,255,.04)}
        .sb-dd-item.cur{background:rgba(255,255,255,.07)}
        .sb-dd-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;cursor:pointer;color:rgba(255,255,255,.7)}
        .sb-dd-name:hover{color:white}
        .sb-badge{font-size:8px;font-weight:600;padding:2px 6px;border-radius:3px;letter-spacing:.06em;flex-shrink:0;white-space:nowrap}
        .sb-badge-init{background:rgba(30,58,110,0.6);color:rgba(200,220,255,.85)}
        .sb-badge-opt{background:rgba(180,140,0,0.35);color:rgba(255,220,60,.95)}
        .sb-edit-btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.35);font-size:9px;padding:2px 7px;border-radius:3px;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.15s;flex-shrink:0}
        .sb-edit-btn:hover{background:rgba(255,255,255,.14);color:rgba(255,255,255,.75)}
        .sb-nav{padding:16px 10px;flex:1}
        .sb-section{font-size:7px;font-weight:500;letter-spacing:.18em;color:rgba(255,255,255,.18);padding:0 12px 10px;margin-top:8px}
        .sb-link{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:0 6px 6px 0;font-size:12px;font-weight:400;text-decoration:none;transition:all 0.15s;border-left:2px solid transparent;color:rgba(255,255,255,.32)}
        .sb-link:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.6)}
        .sb-link.active{background:rgba(255,255,255,.07);border-left-color:#4A7FBF;color:white;font-weight:500}
        .sb-link-icon{font-size:13px;width:16px;text-align:center;flex-shrink:0}
        .sb-footer{padding:16px 22px;border-top:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:12px}
        .sb-avatar{width:28px;height:28px;border-radius:50%;background:#1E3A6E;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:500;flex-shrink:0}
        .sb-user-name{font-size:11px;color:rgba(255,255,255,.55);font-weight:400}
        .sb-logout{font-size:9px;color:rgba(255,255,255,.2);cursor:pointer;background:none;border:none;font-family:'Inter',sans-serif;letter-spacing:.06em;transition:color 0.2s;display:block;padding:0}
        .sb-logout:hover{color:rgba(255,255,255,.5)}
        .modal-overlay{position:fixed;inset:0;background:rgba(10,22,40,.65);z-index:500;display:flex;align-items:center;justify-content:center}
        .modal-box{background:white;border-radius:16px;padding:32px 36px;width:400px;box-shadow:0 24px 64px rgba(0,0,0,.25)}
        .modal-title{font-family:'Cormorant Garant',serif;font-size:24px;font-weight:300;color:#0A1628;margin-bottom:6px;letter-spacing:-.02em}
        .modal-sub{font-size:11px;color:#8A9BB0;margin-bottom:24px;font-weight:300}
        .modal-label{font-size:9px;font-weight:500;letter-spacing:.14em;color:#8A9BB0;display:block;margin-bottom:8px}
        .modal-input{width:100%;background:#FAFAF8;border:1px solid rgba(10,22,40,.12);border-radius:8px;padding:11px 13px;font-size:13px;color:#0A1628;outline:none;font-family:'Inter',sans-serif;margin-bottom:16px}
        .modal-input:focus{border-color:#0A1628}
        .modal-toggle{display:flex;background:rgba(10,22,40,.05);border-radius:6px;padding:3px;gap:3px;margin-bottom:20px}
        .modal-toggle-btn{flex:1;padding:8px 4px;font-size:9px;font-weight:500;border:none;border-radius:4px;cursor:pointer;font-family:'Inter',sans-serif;letter-spacing:.06em;transition:all 0.15s;text-align:center}
        .modal-toggle-btn.on{background:#0A1628;color:white;box-shadow:0 1px 3px rgba(0,0,0,.15)}
        .modal-toggle-btn.off{background:transparent;color:#8A9BB0}
        .modal-actions{display:flex;gap:8px}
        .modal-btn{flex:1;padding:12px 8px;font-size:10px;font-weight:500;letter-spacing:.1em;border:none;border-radius:8px;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.2s}
        .modal-btn-cancel{background:rgba(10,22,40,.05);color:#8A9BB0}
        .modal-btn-cancel:hover{background:rgba(10,22,40,.1)}
        .modal-btn-save{background:#0A1628;color:white}
        .modal-btn-save:hover{opacity:.82}
        .modal-btn-del{background:#FEF2F2;color:#DC2626;border:1px solid #FECACA}
        .modal-btn-del:hover{background:#FEE2E2}
        .modal-btn-del-confirm{background:#DC2626;color:white}
        .modal-err{font-size:11px;color:#DC2626;margin-bottom:10px}
      `}</style>

      {/* Modal édition */}
      {editModal && editTarget && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Modifier le portefeuille</div>
            <div className="modal-sub">Renommer, changer le type ou supprimer.</div>
            <label className="modal-label">NOM</label>
            <input className="modal-input" value={editName}
              onChange={e => { setEditName(e.target.value); setEditErr(""); }}
              placeholder="Mon portefeuille" />
            <label className="modal-label">TYPE</label>
            <div className="modal-toggle">
              <button className={`modal-toggle-btn ${editType==="manual"?"on":"off"}`}
                onClick={() => setEditType("manual")}>
                INIT — Saisi à la main
              </button>
              <button className={`modal-toggle-btn ${editType==="optimized"?"on":"off"}`}
                onClick={() => setEditType("optimized")}>
                0CGP — Optimisé
              </button>
            </div>
            {editErr && <div className="modal-err">{editErr}</div>}
            <div className="modal-actions">
              {!delConfirm ? (
                <>
                  <button className="modal-btn modal-btn-cancel" onClick={() => setEditModal(false)}>ANNULER</button>
                  <button className="modal-btn modal-btn-del" onClick={() => setDelConfirm(true)}>SUPPRIMER</button>
                  <button className="modal-btn modal-btn-save" onClick={handleSaveEdit}>ENREGISTRER</button>
                </>
              ) : (
                <>
                  <button className="modal-btn modal-btn-cancel" onClick={() => setDelConfirm(false)}>← RETOUR</button>
                  <button className="modal-btn modal-btn-del-confirm" onClick={handleDelete}>
                    CONFIRMER LA SUPPRESSION
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <aside className="sb">
        <div className="sb-header">
          <Link href="/" className="sb-logo">ZERO CGP</Link>

          {portfolios.length === 0 ? (
            <Link href="/dashboard/entry" className="sb-btn-entry">
              + RENSEIGNER MON PORTEFEUILLE
            </Link>
          ) : (
            <div className="sb-dropdown" onClick={() => setDropOpen(!dropOpen)}>
              <div className="sb-dd-left">
                <span className={`sb-badge ${activePf?.type==="optimized"?"sb-badge-opt":"sb-badge-init"}`}>
                  {activePf?.type==="optimized" ? "0CGP" : "INIT"}
                </span>
                <span className="sb-dropdown-text">{activePf?.name ?? "Sélectionner"}</span>
              </div>
              <span className="sb-dropdown-arrow">▾</span>

              {dropOpen && (
                <div className="sb-dropdown-menu" onClick={e => e.stopPropagation()}>
                  {portfolios.map(pf => (
                    <div key={pf.id}
                      className={`sb-dd-item${pf.id===activePortfolioId?" cur":""}`}>
                      <span className={`sb-badge ${pf.type==="optimized"?"sb-badge-opt":"sb-badge-init"}`}>
                        {pf.type==="optimized"?"0CGP":"INIT"}
                      </span>
                      <span className="sb-dd-name" onClick={() => selectPortfolio(pf.id)}>
                        {pf.name}
                      </span>
                      <button className="sb-edit-btn" onClick={e => openEdit(pf, e)}>✎</button>
                    </div>
                  ))}
                  <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", padding:"8px 13px" }}>
                    <button style={{
                      background:"none", border:"none",
                      color:"rgba(255,255,255,.28)", fontSize:10,
                      cursor:"pointer", fontFamily:"'Inter',sans-serif",
                      padding:0, letterSpacing:".04em",
                    }} onClick={() => { router.push("/dashboard/entry"); setDropOpen(false); }}>
                      + Nouveau portefeuille
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="sb-nav">
          <div className="sb-section">NAVIGATION</div>
          {NAV.map(({ href, icon, label }) => (
            <Link key={href} href={href}
              className={`sb-link${pathname.startsWith(href.split("?")[0]) ? " active" : ""}`}>
              <span className="sb-link-icon">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="sb-footer">
          <div className="sb-avatar">U</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="sb-user-name">Mon compte</div>
            <button className="sb-logout" onClick={handleLogout}>DÉCONNEXION</button>
          </div>
        </div>
      </aside>
    </>
  );
}
