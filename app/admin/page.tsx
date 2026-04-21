"use client";
import Link from "next/link";
import { useState } from "react";

const C = {
  navyText: "rgba(5,11,20,0.88)", textLight: "rgba(5,11,20,0.36)",
  borderCard: "rgba(5,11,20,0.09)",
};

const cards = [
  { title: "Utilisateurs", desc: "Voir tous les comptes, activité, support utilisateur", href: "/admin/users", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { title: "Portfolios", desc: "Vue transverse de tous les portefeuilles créés", href: "/admin/portfolios", icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" },
  { title: "Monitoring", desc: "Stats d'usage, performances API, erreurs", href: "#", icon: "M22 12h-4l-3 9L9 3l-3 9H2", disabled: true },
];

export default function AdminDashboard() {
  const [hov, setHov] = useState<string | null>(null);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(220,38,38,0.5)", marginBottom: 8 }}>
          Administration
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 500, color: C.navyText, letterSpacing: "-.02em", margin: 0 }}>
          Admin — Zero CGP
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {cards.map(c => (
          <Link key={c.title} href={c.href}
            onMouseEnter={() => !c.disabled && setHov(c.title)}
            onMouseLeave={() => setHov(null)}
            style={{
              padding: "28px 24px", borderRadius: 8, textDecoration: "none", display: "block",
              background: c.disabled ? "rgba(5,11,20,0.02)" : hov === c.title ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
              border: `0.5px solid ${C.borderCard}`,
              boxShadow: hov === c.title ? "0 4px 16px rgba(0,0,0,.04)" : "0 1px 3px rgba(0,0,0,.01)",
              opacity: c.disabled ? 0.5 : 1,
              cursor: c.disabled ? "default" : "pointer",
              transform: hov === c.title ? "translateY(-1px)" : "none",
              transition: "all 0.3s ease",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(5,11,20,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d={c.icon} />
              </svg>
              <span style={{ fontSize: 16, fontWeight: 500, color: C.navyText }}>{c.title}</span>
              {c.disabled && <span style={{ fontSize: 8, fontWeight: 500, padding: "2px 8px", borderRadius: 3, background: "rgba(5,11,20,0.04)", color: "rgba(5,11,20,0.28)", letterSpacing: ".08em", textTransform: "uppercase" }}>Bientôt</span>}
            </div>
            <div style={{ fontSize: 13, color: C.textLight, lineHeight: 1.6 }}>{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
