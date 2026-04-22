"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminFetch } from "@/lib/adminFetch";

const C = {
  navyText: "rgba(5,11,20,0.88)", textMid: "rgba(5,11,20,0.52)",
  textLight: "rgba(5,11,20,0.36)", borderCard: "rgba(5,11,20,0.09)",
  sapphire: "#1a3a6a", gold: "#c9a84c", gUp: "rgba(22,90,52,0.75)", gDn: "rgba(155,50,48,0.75)",
  red: "#DC2626",
};

function eur(n: number) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n); }
function fpct(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`; }

export default function AdminPortfolioDetail() {
  const params = useParams();
  const pfId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First get portfolio info to find user_id
    adminFetch(`/api/admin/portfolios?limit=200`)
      .then(r => r.json())
      .then(d => {
        const pf = d.portfolios?.find((p: any) => p.id === pfId);
        if (!pf) { setLoading(false); return; }
        // Then fetch full portfolio data via user endpoint
        return adminFetch(`/api/admin/users/${pf.user_id}/portfolio/${pfId}`)
          .then(r => r.json())
          .then(full => setData({ ...full, userId: pf.user_id }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pfId]);

  if (loading) return <div style={{ padding: 40, color: C.textLight, textAlign: "center" }}>Chargement...</div>;
  if (!data?.portfolio) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 14, color: C.navyText, marginBottom: 8 }}>Portfolio introuvable</div>
      <Link href="/admin/portfolios" style={{ fontSize: 12, color: C.sapphire }}>← Retour à la liste</Link>
    </div>
  );

  const { portfolio: pf, assets, userId } = data;
  const perfColor = pf.perfSinceCreation >= 0 ? C.gUp : C.gDn;

  return (
    <div>
      <Link href="/admin/portfolios" style={{ fontSize: 11, color: C.textLight, textDecoration: "none", display: "block", marginBottom: 20 }}>← Portfolios</Link>

      <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 6, padding: "12px 18px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: C.red, fontSize: 12, fontWeight: 600 }}>
          MODE ADMIN — Portfolio de <Link href={`/admin/users/${userId}`} style={{ color: C.red, textDecoration: "underline" }}>{pf.userEmail}</Link>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".15em", textTransform: "uppercase", color: C.sapphire, opacity: .65 }}>{pf.name}</span>
          <span style={{ fontSize: 8, fontWeight: 600, padding: "2px 7px", borderRadius: 3, letterSpacing: ".06em", background: pf.type === "optimized" ? "rgba(201,168,76,0.12)" : "rgba(22,90,52,0.1)", color: pf.type === "optimized" ? C.gold : C.gUp }}>{pf.type === "optimized" ? "0CGP" : "ACTIF"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontSize: 34, fontWeight: 500, color: C.navyText, letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums" }}>{eur(pf.valeurActuelle)}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: perfColor }}>{fpct(pf.perfSinceCreation)}</span>
        </div>
        <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>Capital initial : {eur(pf.capitalInitial)} · Créé le {new Date(pf.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 500, color: C.navyText, marginBottom: 14 }}>Allocation ({assets.length} actifs)</h2>
      <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, overflow: "hidden" }}>
        {assets.map((a: any) => (
          <div key={a.symbol} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: `0.5px solid rgba(5,11,20,0.04)`, gap: 12 }}>
            <span style={{ fontSize: 9, fontWeight: 500, padding: "3px 8px", borderRadius: 4, background: a.type === "etf" ? "rgba(26,58,106,.08)" : "rgba(22,90,52,.08)", color: a.type === "etf" ? C.sapphire : C.gUp }}>{(a.type || "etf").toUpperCase()}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.navyText }}>{a.symbol}</span>
              <span style={{ fontSize: 11, color: C.textLight, marginLeft: 8 }}>{a.name}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.navyText, width: 60, textAlign: "right" }}>{a.weight.toFixed(1)}%</div>
            <div style={{ fontSize: 12, color: C.navyText, width: 80, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{eur(a.currentValue)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
