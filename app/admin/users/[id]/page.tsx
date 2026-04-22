"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminFetch } from "@/lib/adminFetch";

const C = {
  navyText: "rgba(5,11,20,0.88)", textMid: "rgba(5,11,20,0.52)",
  textLight: "rgba(5,11,20,0.36)", borderCard: "rgba(5,11,20,0.09)",
  sapphire: "#1a3a6a", gold: "#c9a84c", gUp: "rgba(22,90,52,0.8)",
};

type Portfolio = {
  id: string; name: string; type: string; created_at: string;
  asset_count: number; capital: number;
  assets: { symbol: string; name: string; type: string; weight: number; target_amount: number }[];
};

type UserData = {
  user: { id: string; email: string; created_at: string; last_sign_in_at: string | null; full_name: string | null; is_admin: boolean };
  portfolios: Portfolio[];
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function eur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default function AdminUserDetail() {
  const params = useParams();
  const userId = params.id as string;
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    adminFetch(`/api/admin/users/${userId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div style={{ padding: 40, color: C.textLight, textAlign: "center" }}>Chargement...</div>;
  if (error || !data) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 500, color: C.navyText, marginBottom: 8 }}>Utilisateur introuvable</div>
      <Link href="/admin/users" style={{ fontSize: 12, color: C.sapphire }}>← Retour à la liste</Link>
    </div>
  );

  const { user, portfolios } = data;
  const totalCapital = portfolios.reduce((s, p) => s + p.capital, 0);

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/users" style={{ fontSize: 11, color: C.textLight, textDecoration: "none" }}>← Utilisateurs</Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(5,11,20,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 500, color: C.navyText }}>
          {(user.full_name || user.email || "?")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: C.navyText, margin: 0 }}>{user.email}</h1>
            {user.is_admin && <span style={{ fontSize: 8, fontWeight: 600, padding: "2px 8px", borderRadius: 3, background: "rgba(220,38,38,0.1)", color: "#DC2626", letterSpacing: ".08em" }}>ADMIN</span>}
          </div>
          {user.full_name && <div style={{ fontSize: 13, color: C.textMid, marginTop: 2 }}>{user.full_name}</div>}
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>
            Inscrit le {fmtDate(user.created_at)} · Dernière connexion {user.last_sign_in_at ? fmtDate(user.last_sign_in_at) : "jamais"}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
        {[
          { label: "Portfolios", value: String(portfolios.length) },
          { label: "Capital total", value: eur(totalCapital) },
          { label: "Premier portfolio", value: portfolios.length > 0 ? fmtDate(portfolios[portfolios.length - 1].created_at) : "—" },
          { label: "Dernière activité", value: portfolios.length > 0 ? fmtDate(portfolios[0].created_at) : "—" },
        ].map(m => (
          <div key={m.label} style={{ padding: "16px 18px", borderRadius: 8, background: "white", border: `0.5px solid ${C.borderCard}` }}>
            <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: C.textLight, marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: C.navyText, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Portfolios */}
      <h2 style={{ fontSize: 16, fontWeight: 500, color: C.navyText, marginBottom: 16 }}>Portfolios</h2>
      {portfolios.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: C.textLight, fontSize: 13, background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}` }}>
          Aucun portfolio créé
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {portfolios.map(pf => (
            <div key={pf.id} style={{ padding: "20px 22px", borderRadius: 8, background: "white", border: `0.5px solid ${C.borderCard}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: C.navyText }}>{pf.name}</span>
                  <span style={{
                    fontSize: 8, fontWeight: 600, padding: "2px 7px", borderRadius: 3, letterSpacing: ".06em",
                    background: pf.type === "optimized" ? "rgba(201,168,76,0.12)" : "rgba(22,90,52,0.1)",
                    color: pf.type === "optimized" ? C.gold : C.gUp,
                  }}>{pf.type === "optimized" ? "0CGP" : "ACTIF"}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href={`/admin/users/${userId}/as-user/${pf.id}`} style={{
                    fontSize: 10, fontWeight: 500, color: C.sapphire, textDecoration: "none",
                    padding: "4px 10px", borderRadius: 4, border: `0.5px solid rgba(26,58,106,0.2)`,
                  }}>Voir comme utilisateur</Link>
                  <Link href={`/admin/portfolios/${pf.id}`} style={{
                    fontSize: 10, fontWeight: 500, color: C.textMid, textDecoration: "none",
                    padding: "4px 10px", borderRadius: 4, border: `0.5px solid ${C.borderCard}`,
                  }}>Détail</Link>
                </div>
              </div>
              <div style={{ display: "flex", gap: 24, fontSize: 12, color: C.textMid, marginBottom: 12 }}>
                <span>Capital : {eur(pf.capital)}</span>
                <span>{pf.asset_count} actifs</span>
                <span>Créé le {fmtDate(pf.created_at)}</span>
              </div>
              {/* Assets preview */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {pf.assets.slice(0, 8).map(a => (
                  <span key={a.symbol} style={{
                    fontSize: 10, padding: "3px 8px", borderRadius: 4,
                    background: "rgba(5,11,20,0.03)", color: C.textMid,
                  }}>{a.symbol} {a.weight.toFixed(1)}%</span>
                ))}
                {pf.assets.length > 8 && <span style={{ fontSize: 10, color: C.textLight }}>+{pf.assets.length - 8}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Future actions placeholder */}
      <div style={{ marginTop: 32, padding: "20px 22px", borderRadius: 8, background: "rgba(5,11,20,0.02)", border: `0.5px solid ${C.borderCard}` }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: C.textLight, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 12 }}>Actions (bientôt)</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["Exporter données RGPD", "Purger crypto orphelines", "Supprimer compte"].map(a => (
            <span key={a} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, background: "rgba(5,11,20,0.03)", color: "rgba(5,11,20,0.25)", cursor: "not-allowed" }}>{a}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
