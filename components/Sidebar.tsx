"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/dashboard/portfolio",   icon: "▦", label: "Portfolio"    },
  { href: "/dashboard/optimizer",   icon: "◈", label: "Optimiseur"   },
  { href: "/dashboard/rebalancing", icon: "⊜", label: "Rééquilibrage"},
  { href: "/dashboard/alerts",      icon: "◉", label: "Alertes"      },
  { href: "/dashboard/backtesting", icon: "◷", label: "Backtesting"  },
  { href: "/dashboard/correlation", icon: "⊞", label: "Corrélation"  },
  { href: "/dashboard/stress",      icon: "◬", label: "Stress Tests" },
  { href: "/dashboard/montecarlo",  icon: "⊕", label: "Monte Carlo"  },
];

interface SidebarProps {
  portfolios?: Array<{ id: string; name: string }>;
  activePortfolioId?: string;
  onSelectPortfolio?: (id: string) => void;
}

export default function Sidebar({ portfolios = [], activePortfolioId, onSelectPortfolio }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropOpen, setDropOpen] = useState(false);
  const activePf = portfolios.find(p => p.id === activePortfolioId);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400&family=Inter:wght@300;400;500&display=swap');
        .sb{width:260px;min-height:100vh;background:#0A1628;display:flex;flex-direction:column;flex-shrink:0;font-family:'Inter',sans-serif}
        .sb-header{padding:28px 22px 24px;border-bottom:1px solid rgba(255,255,255,.05)}
        .sb-logo{font-family:'Cormorant Garant',serif;font-size:13px;font-weight:400;letter-spacing:.28em;color:white;margin-bottom:18px;display:block;text-decoration:none}
        .sb-dropdown{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:6px;padding:10px 13px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:background 0.2s;position:relative}
        .sb-dropdown:hover{background:rgba(255,255,255,.08)}
        .sb-dropdown-text{font-size:11px;color:rgba(255,255,255,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;font-weight:300}
        .sb-dropdown-arrow{font-size:8px;color:rgba(255,255,255,.2);flex-shrink:0}
        .sb-dropdown-menu{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#0E1F3A;border:1px solid rgba(255,255,255,.08);border-radius:6px;overflow:hidden;z-index:50}
        .sb-dropdown-item{display:block;width:100%;text-align:left;padding:10px 13px;font-size:11px;color:rgba(255,255,255,.4);background:none;border:none;cursor:pointer;font-family:'Inter',sans-serif;font-weight:300;transition:all 0.15s}
        .sb-dropdown-item:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.7)}
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
      `}</style>
      <aside className="sb">
        <div className="sb-header">
          <Link href="/" className="sb-logo">ZERO CGP</Link>
          <div className="sb-dropdown" onClick={() => setDropOpen(!dropOpen)}>
            <span className="sb-dropdown-text">{activePf?.name ?? "Sélectionner un portefeuille"}</span>
            <span className="sb-dropdown-arrow">▾</span>
            {dropOpen && portfolios.length > 0 && (
              <div className="sb-dropdown-menu">
                {portfolios.map(pf => (
                  <button key={pf.id} className="sb-dropdown-item"
                    onClick={() => { onSelectPortfolio?.(pf.id); setDropOpen(false); }}>
                    {pf.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <nav className="sb-nav">
          <div className="sb-section">NAVIGATION</div>
          {NAV.map(({ href, icon, label }) => (
            <Link key={href} href={href} className={`sb-link${pathname === href ? " active" : ""}`}>
              <span className="sb-link-icon">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sb-footer">
          <div className="sb-avatar">U</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="sb-user-name">Mon compte</div>
            <button className="sb-logout" onClick={handleLogout}>DÉCONNEXION</button>
          </div>
        </div>
      </aside>
    </>
  );
}
