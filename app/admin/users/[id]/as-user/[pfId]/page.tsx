"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const C = {
  navyText: "rgba(5,11,20,0.88)", textMid: "rgba(5,11,20,0.52)",
  textLight: "rgba(5,11,20,0.36)", borderCard: "rgba(5,11,20,0.09)",
  sapphire: "#1a3a6a", gold: "#c9a84c", gUp: "rgba(22,90,52,0.75)", gDn: "rgba(155,50,48,0.75)",
  red: "#DC2626",
};

function eur(n: number) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n); }
function fpct(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`; }

type Asset = { id: string; symbol: string; name: string; type: string; weight: number; targetAmount: number; currentPrice: number; currentValue: number; perfs: Record<string, number> };

export default function AsUserPortfolioPage() {
  const params = useParams();
  const userId = params.id as string;
  const pfId = params.pfId as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}/portfolio/${pfId}`)
      .then(r => r.json()).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false));
  }, [userId, pfId]);

  if (loading) return <div style={{ padding: 40, color: C.textLight, textAlign: "center" }}>Chargement du portfolio...</div>;
  if (!data?.portfolio) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 14, color: C.navyText, marginBottom: 8 }}>Portfolio introuvable</div>
      <Link href={`/admin/users/${userId}`} style={{ fontSize: 12, color: C.sapphire }}>← Retour à la fiche</Link>
    </div>
  );

  const { portfolio: pf, assets } = data as { portfolio: any; assets: Asset[] };
  const perfColor = pf.perfSinceCreation >= 0 ? C.gUp : C.gDn;

  return (
    <div>
      <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 6, padding: "12px 18px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: C.red, fontSize: 12, fontWeight: 600 }}>MODE ADMIN — Portfolio de {pf.userEmail} en lecture seule.</div>
        <Link href={`/admin/users/${userId}`} style={{ color: C.red, fontSize: 11, textDecoration: "underline" }}>← Retour à la fiche</Link>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
        {[{ label: "Valeur actuelle", value: eur(pf.valeurActuelle) }, { label: "Performance", value: fpct(pf.perfSinceCreation), color: perfColor }, { label: "Actifs", value: String(assets.length) }].map(s => (
          <div key={s.label} style={{ padding: "16px 18px", borderRadius: 8, background: "white", border: `0.5px solid ${C.borderCard}` }}>
            <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: C.textLight, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: s.color || C.navyText, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 500, color: C.navyText, marginBottom: 14 }}>Allocation</h2>
      <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 70px 80px 100px 80px", padding: "10px 20px", borderBottom: `0.5px solid ${C.borderCard}`, background: "rgba(5,11,20,0.02)" }}>
          {["Actif", "Type", "Poids", "Valeur", "Perf 1M"].map(h => (<div key={h} style={{ fontSize: 9, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: C.textLight }}>{h}</div>))}
        </div>
        {assets.map(a => (
          <div key={a.symbol} style={{ display: "grid", gridTemplateColumns: "2fr 70px 80px 100px 80px", padding: "12px 20px", borderBottom: `0.5px solid rgba(5,11,20,0.04)`, alignItems: "center" }}>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: C.navyText }}>{a.symbol}</div><div style={{ fontSize: 11, color: C.textLight, marginTop: 1 }}>{a.name}</div></div>
            <span style={{ fontSize: 9, fontWeight: 500, padding: "3px 8px", borderRadius: 4, background: a.type === "etf" ? "rgba(26,58,106,.08)" : "rgba(22,90,52,.08)", color: a.type === "etf" ? C.sapphire : C.gUp, display: "inline-block", width: "fit-content" }}>{(a.type || "etf").toUpperCase()}</span>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.navyText }}>{a.weight.toFixed(1)}%</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.navyText, fontVariantNumeric: "tabular-nums" }}>{eur(a.currentValue)}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: (a.perfs["1M"] || 0) >= 0 ? C.gUp : C.gDn, fontVariantNumeric: "tabular-nums" }}>{a.perfs["1M"] != null ? fpct(a.perfs["1M"]) : "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
