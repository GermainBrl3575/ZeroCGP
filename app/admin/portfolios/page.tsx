"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const C = {
  navyText: "rgba(5,11,20,0.88)", textMid: "rgba(5,11,20,0.52)",
  textLight: "rgba(5,11,20,0.36)", borderCard: "rgba(5,11,20,0.09)",
  sapphire: "#1a3a6a", gold: "#c9a84c", gUp: "rgba(22,90,52,0.8)",
};

type PF = {
  id: string; name: string; type: string; created_at: string;
  user_id: string; user_email: string; asset_count: number; capital: number;
};

function eur(n: number) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); }

export default function AdminPortfoliosPage() {
  const [portfolios, setPortfolios] = useState<PF[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    const params = typeFilter !== "all" ? `?type=${typeFilter}` : "";
    fetch(`/api/admin/portfolios${params}`)
      .then(r => r.json()).then(d => { if (d.portfolios) setPortfolios(d.portfolios); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [typeFilter]);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(220,38,38,0.5)", marginBottom: 8 }}>Administration</div>
        <h1 style={{ fontSize: 24, fontWeight: 500, color: C.navyText, letterSpacing: "-.02em", margin: "0 0 16px" }}>Portfolios</h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          {[{ v: "all", l: "Tous" }, { v: "optimized", l: "0CGP" }, { v: "active", l: "Actif" }, { v: "manual", l: "Manuel" }].map(f => (
            <button key={f.v} onClick={() => { setLoading(true); setTypeFilter(f.v); }} style={{
              padding: "6px 14px", borderRadius: 5, fontSize: 11, fontWeight: typeFilter === f.v ? 500 : 400,
              background: typeFilter === f.v ? C.navyText : "transparent",
              color: typeFilter === f.v ? "white" : C.textMid,
              border: typeFilter === f.v ? "none" : `0.5px solid ${C.borderCard}`,
              cursor: "pointer", fontFamily: "Inter,sans-serif",
            }}>{f.l}</button>
          ))}
          <span style={{ fontSize: 12, color: C.textLight, marginLeft: 8 }}>{portfolios.length} portfolio{portfolios.length > 1 ? "s" : ""}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ color: C.textLight, fontSize: 12, padding: 40, textAlign: "center" }}>Chargement...</div>
      ) : (
        <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 70px 90px 70px 100px 70px", padding: "10px 20px", borderBottom: `0.5px solid ${C.borderCard}`, background: "rgba(5,11,20,0.02)" }}>
            {["Nom", "Utilisateur", "Type", "Capital", "Actifs", "Créé le", ""].map(h => (
              <div key={h} style={{ fontSize: 9, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: C.textLight }}>{h}</div>
            ))}
          </div>

          {portfolios.map(pf => (
            <div key={pf.id} style={{
              display: "grid", gridTemplateColumns: "2fr 1.5fr 70px 90px 70px 100px 70px",
              padding: "12px 20px", borderBottom: `0.5px solid rgba(5,11,20,0.04)`, alignItems: "center",
              transition: "background 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(5,11,20,0.015)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: C.navyText }}>{pf.name}</div>
              <Link href={`/admin/users/${pf.user_id}`} style={{ fontSize: 12, color: C.sapphire, textDecoration: "none" }}>{pf.user_email}</Link>
              <span style={{
                fontSize: 8, fontWeight: 600, padding: "2px 7px", borderRadius: 3, letterSpacing: ".06em",
                background: pf.type === "optimized" ? "rgba(201,168,76,0.12)" : "rgba(22,90,52,0.1)",
                color: pf.type === "optimized" ? C.gold : C.gUp, display: "inline-block", width: "fit-content",
              }}>{pf.type === "optimized" ? "0CGP" : pf.type === "active" ? "ACTIF" : "INIT"}</span>
              <div style={{ fontSize: 12, color: C.navyText, fontVariantNumeric: "tabular-nums" }}>{eur(pf.capital)}</div>
              <div style={{ fontSize: 12, color: C.textMid }}>{pf.asset_count}</div>
              <div style={{ fontSize: 11, color: C.textMid }}>{fmtDate(pf.created_at)}</div>
              <Link href={`/admin/portfolios/${pf.id}`} style={{ fontSize: 11, fontWeight: 500, color: C.sapphire, textDecoration: "none", padding: "3px 8px", borderRadius: 4, border: `0.5px solid rgba(26,58,106,0.2)` }}>Voir</Link>
            </div>
          ))}

          {portfolios.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textLight, fontSize: 13 }}>Aucun portfolio</div>}
        </div>
      )}
    </div>
  );
}
