"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/adminFetch";

const C = {
  navyText: "rgba(5,11,20,0.88)", textMid: "rgba(5,11,20,0.52)",
  textLight: "rgba(5,11,20,0.36)", borderCard: "rgba(5,11,20,0.09)",
  sapphire: "#1a3a6a",
};

type User = {
  id: string; email: string; created_at: string; last_sign_in_at: string | null;
  full_name: string | null; portfolio_count: number; last_portfolio_at: string | null;
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function fmtRelative(d: string | null): string {
  if (!d) return "Jamais";
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 30) return `Il y a ${days}j`;
  return fmtDate(d);
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/users")
      .then(r => r.json())
      .then(d => { if (d.users) setUsers(d.users); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? users.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(220,38,38,0.5)", marginBottom: 8 }}>
          Administration
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 500, color: C.navyText, letterSpacing: "-.02em", margin: "0 0 16px" }}>
          Utilisateurs
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <input
            type="text" placeholder="Rechercher par email ou nom..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              padding: "10px 16px", fontSize: 13, fontWeight: 400, width: 320,
              border: `0.5px solid ${C.borderCard}`, borderRadius: 6,
              background: "rgba(255,255,255,0.72)", outline: "none",
              fontFamily: "Inter,sans-serif", color: C.navyText,
            }}
          />
          <span style={{ fontSize: 12, color: C.textLight }}>
            {filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ color: C.textLight, fontSize: 12, padding: 40, textAlign: "center" }}>Chargement...</div>
      ) : (
        <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, overflow: "hidden" }}>
          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 120px 120px 80px 120px 70px",
            padding: "10px 20px", borderBottom: `0.5px solid ${C.borderCard}`,
            background: "rgba(5,11,20,0.02)",
          }}>
            {["Email", "Inscription", "Dernière connexion", "Portfolios", "Dernier portfolio", ""].map(h => (
              <div key={h} style={{ fontSize: 9, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: C.textLight }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map(u => (
            <div key={u.id} style={{
              display: "grid", gridTemplateColumns: "2fr 120px 120px 80px 120px 70px",
              padding: "14px 20px", borderBottom: `0.5px solid rgba(5,11,20,0.04)`,
              alignItems: "center", transition: "background 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(5,11,20,0.015)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.navyText }}>{u.email}</div>
                {u.full_name && <div style={{ fontSize: 11, color: C.textMid, marginTop: 2 }}>{u.full_name}</div>}
              </div>
              <div style={{ fontSize: 12, color: C.textMid }}>{fmtDate(u.created_at)}</div>
              <div style={{ fontSize: 12, color: C.textMid }}>{fmtRelative(u.last_sign_in_at)}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.navyText, fontVariantNumeric: "tabular-nums" }}>{u.portfolio_count}</div>
              <div style={{ fontSize: 12, color: C.textMid }}>{fmtRelative(u.last_portfolio_at)}</div>
              <div>
                <Link href={`/admin/users/${u.id}`} style={{
                  fontSize: 11, fontWeight: 500, color: C.sapphire,
                  textDecoration: "none", padding: "4px 10px", borderRadius: 4,
                  border: `0.5px solid rgba(26,58,106,0.2)`,
                }}>Voir</Link>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: C.textLight, fontSize: 13 }}>
              {search ? "Aucun utilisateur trouvé" : "Aucun utilisateur"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
