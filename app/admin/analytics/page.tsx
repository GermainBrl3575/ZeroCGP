"use client";
import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/adminFetch";

const C = {
  navyText: "rgba(5,11,20,0.88)", textMid: "rgba(5,11,20,0.52)",
  textLight: "rgba(5,11,20,0.36)", borderCard: "rgba(5,11,20,0.09)",
  sapphire: "#1a3a6a", gUp: "rgba(22,90,52,0.75)",
};

// France SVG viewBox: roughly lat 41-51, lon -5 to 10
// Simple projection: x = (lon + 5) * 40, y = (51 - lat) * 40
function projFR(lat: number, lon: number): [number, number] {
  return [(lon + 5) * 40, (51 - lat) * 40];
}

function fmtTime(d: string) {
  const dt = new Date(d);
  const now = Date.now();
  const diff = now - dt.getTime();
  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    adminFetch(`/api/admin/analytics?days=${days}`)
      .then(r => r.json()).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div style={{ padding: 40, color: C.textLight, textAlign: "center" }}>Chargement analytics...</div>;
  if (!data?.stats) return <div style={{ padding: 40, color: C.textLight }}>Erreur de chargement</div>;

  const { stats, byCountry, byCity, byPage, byDay, recent, geoPoints } = data;

  // France points for map
  const frPoints = geoPoints.filter((p: any) => p.country === "FR" && p.lat && p.lon);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(220,38,38,0.5)", marginBottom: 8 }}>Administration</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 24, fontWeight: 500, color: C.navyText, letterSpacing: "-.02em", margin: 0 }}>Analytics & Visiteurs</h1>
          <div style={{ display: "flex", gap: 4 }}>
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)} style={{
                padding: "6px 14px", borderRadius: 5, fontSize: 11, fontWeight: days === d ? 500 : 400,
                background: days === d ? C.navyText : "transparent", color: days === d ? "white" : C.textMid,
                border: days === d ? "none" : `0.5px solid ${C.borderCard}`, cursor: "pointer", fontFamily: "Inter,sans-serif",
              }}>{d}j</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Visites totales", value: stats.total_visits },
          { label: "Visiteurs uniques (IP)", value: stats.unique_ips },
          { label: "Utilisateurs connectés", value: stats.unique_users },
          { label: "Visites connectées", value: stats.logged_in_visits },
        ].map(s => (
          <div key={s.label} style={{ padding: "16px 18px", borderRadius: 8, background: "white", border: `0.5px solid ${C.borderCard}` }}>
            <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: C.textLight, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 500, color: C.navyText, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        {/* Map of France */}
        <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: C.navyText, marginBottom: 12 }}>Carte des visiteurs (France)</h3>
          <svg viewBox="0 0 600 400" style={{ width: "100%", height: "auto", background: "#FAFAF8", borderRadius: 6 }}>
            {/* France outline approximation */}
            <path d="M240,20 L360,10 L400,40 L420,80 L440,120 L460,160 L440,200 L460,240 L480,280 L460,320 L420,360 L380,380 L340,390 L300,380 L260,360 L220,340 L180,300 L160,260 L140,220 L120,180 L140,140 L160,100 L180,60 L220,30 Z"
              fill="rgba(26,58,106,0.04)" stroke="rgba(26,58,106,0.15)" strokeWidth="1" />
            {/* Visitor dots */}
            {frPoints.map((p: any, i: number) => {
              const [x, y] = projFR(p.lat, p.lon);
              return <circle key={i} cx={x} cy={y} r="4" fill={C.sapphire} opacity="0.4" />;
            })}
            {/* City labels for top cities */}
            {byCity.slice(0, 8).map(([city, info]: [string, any]) => {
              if (!info.lat || !info.lon) return null;
              const [x, y] = projFR(info.lat, info.lon);
              return (
                <g key={city}>
                  <circle cx={x} cy={y} r={Math.min(12, 4 + info.count * 2)} fill={C.sapphire} opacity="0.6" />
                  <text x={x} y={y - 14} textAnchor="middle" fontSize="9" fill={C.navyText} fontFamily="Inter,sans-serif" fontWeight="500">{city}</text>
                  <text x={x} y={y - 4} textAnchor="middle" fontSize="7" fill={C.textMid} fontFamily="Inter,sans-serif">{info.count}</text>
                </g>
              );
            })}
            {frPoints.length === 0 && <text x="300" y="200" textAnchor="middle" fontSize="12" fill={C.textLight}>Pas encore de visiteurs géolocalisés</text>}
          </svg>
        </div>

        {/* Top countries */}
        <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: C.navyText, marginBottom: 12 }}>Pays</h3>
          {byCountry.length === 0 ? (
            <div style={{ color: C.textLight, fontSize: 12, padding: 20, textAlign: "center" }}>Pas de données</div>
          ) : byCountry.slice(0, 10).map(([country, count]: [string, number]) => (
            <div key={country} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `0.5px solid rgba(5,11,20,0.04)` }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.navyText, width: 30 }}>{country}</span>
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(26,58,106,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(count / (byCountry[0]?.[1] || 1)) * 100}%`, background: C.sapphire, borderRadius: 2, opacity: 0.5 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.navyText, fontVariantNumeric: "tabular-nums", width: 40, textAlign: "right" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Visits by day chart */}
      <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, padding: 20, marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: C.navyText, marginBottom: 12 }}>Visites par jour</h3>
        {byDay.length > 0 ? (
          <svg viewBox={`0 0 ${byDay.length * 20 + 20} 120`} style={{ width: "100%", height: 120 }}>
            {byDay.map(([day, count]: [string, number], i: number) => {
              const maxCount = Math.max(...byDay.map((d: any) => d[1]));
              const h = maxCount > 0 ? (count / maxCount) * 80 : 0;
              return (
                <g key={day}>
                  <rect x={i * 20 + 10} y={100 - h} width="14" height={h} rx="2" fill={C.sapphire} opacity="0.4" />
                  {i % 7 === 0 && <text x={i * 20 + 17} y="115" textAnchor="middle" fontSize="6" fill={C.textLight}>{day.slice(5)}</text>}
                </g>
              );
            })}
          </svg>
        ) : <div style={{ color: C.textLight, fontSize: 12, textAlign: "center", padding: 20 }}>Pas de données</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Top pages */}
        <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: C.navyText, marginBottom: 12 }}>Pages les plus visitées</h3>
          {byPage.map(([page, count]: [string, number]) => (
            <div key={page} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `0.5px solid rgba(5,11,20,0.04)` }}>
              <span style={{ fontSize: 12, color: C.textMid, fontFamily: "monospace" }}>{page}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.navyText }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Recent visits */}
        <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: C.navyText, marginBottom: 12 }}>Dernières visites</h3>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            {recent.map((v: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `0.5px solid rgba(5,11,20,0.04)`, fontSize: 11 }}>
                <span style={{ color: C.textLight, width: 80, flexShrink: 0 }}>{fmtTime(v.created_at)}</span>
                <span style={{ color: v.user_email ? C.sapphire : C.textMid, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {v.user_email || v.ip}
                </span>
                <span style={{ color: C.textLight, width: 60, flexShrink: 0 }}>{v.city || v.country || "?"}</span>
                <span style={{ color: C.textLight, fontFamily: "monospace", fontSize: 10 }}>{v.path}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
