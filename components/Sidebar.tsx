// components/Sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/dashboard/portfolio",  icon: "▦", label: "Portfolio" },
  { href: "/dashboard/optimizer",  icon: "◈", label: "Optimiseur" },
  { href: "/dashboard/rebalancing",icon: "⊜", label: "Rééquilibrage" },
  { href: "/dashboard/alerts",     icon: "◉", label: "Alertes" },
  { href: "/dashboard/backtesting",icon: "◷", label: "Backtesting" },
  { href: "/dashboard/correlation",icon: "⊞", label: "Corrélation" },
  { href: "/dashboard/stress",     icon: "◬", label: "Stress Tests" },
  { href: "/dashboard/montecarlo", icon: "⊕", label: "Monte Carlo" },
];

interface SidebarProps {
  portfolios?: Array<{ id: string; name: string }>;
  activePortfolioId?: string;
  onSelectPortfolio?: (id: string) => void;
}

export default function Sidebar({
  portfolios = [],
  activePortfolioId,
  onSelectPortfolio,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropOpen, setDropOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const activePf = portfolios.find((p) => p.id === activePortfolioId);

  return (
    <aside className="w-[250px] min-h-screen bg-[#111] flex flex-col flex-shrink-0">
      {/* Logo + Sélecteur */}
      <div className="px-5 py-6 border-b border-white/[0.06]">
        <div className="text-white text-sm font-bold tracking-[0.14em] mb-4">
          ZERO CGT
        </div>

        {/* Dropdown portefeuille */}
        <div className="relative">
          <button
            onClick={() => setDropOpen(!dropOpen)}
            className="w-full flex items-center justify-between bg-white/[0.07] rounded-lg px-3 py-2.5 text-left"
          >
            <span className="text-white/60 text-xs truncate">
              {activePf?.name ?? "Sélectionner un portefeuille"}
            </span>
            <span className="text-white/25 text-[9px] ml-2">▾</span>
          </button>

          {dropOpen && portfolios.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1A] border border-white/10 rounded-lg overflow-hidden z-50">
              {portfolios.map((pf) => (
                <button
                  key={pf.id}
                  onClick={() => {
                    onSelectPortfolio?.(pf.id);
                    setDropOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-xs text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {pf.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-2.5 py-4 flex-1">
        <p className="text-white/20 text-[8px] font-bold tracking-[0.14em] px-2.5 pb-2.5">
          NAVIGATION
        </p>
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm transition-all"
              style={{
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                borderLeft: `2px solid ${active ? "#D5001C" : "transparent"}`,
                color: active ? "white" : "rgba(255,255,255,0.38)",
                fontWeight: active ? 600 : 400,
              }}
            >
              <span className="text-sm w-4 text-center">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Compte */}
      <div className="px-5 py-4 border-t border-white/[0.06] flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: "#D5001C" }}
        >
          U
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-medium truncate">Mon compte</div>
          <button
            onClick={handleLogout}
            className="text-white/28 text-[10px] hover:text-white/50 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  );
}
