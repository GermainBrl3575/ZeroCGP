"use client";
import { useState, useEffect, useRef } from "react";
import { adminFetch } from "@/lib/adminFetch";

const C = {
  navyText: "rgba(5,11,20,0.88)", textMid: "rgba(5,11,20,0.52)",
  textLight: "rgba(5,11,20,0.36)", borderCard: "rgba(5,11,20,0.09)",
  sapphire: "#1a3a6a", gUp: "rgba(22,90,52,0.75)", gDn: "rgba(155,50,48,0.75)",
};

function fmtTime(d: string) {
  const dt = new Date(d);
  const diff = Date.now() - dt.getTime();
  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Leaflet map component (loaded dynamically to avoid SSR issues)
function VisitorMap({ points }: { points: { lat: number; lon: number; city: string; country: string; count?: number }[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Dynamic import to avoid SSR
    import("leaflet").then(L => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, { zoomControl: true, scrollWheelZoom: true }).setView([46.6, 2.3], 6);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // Cluster points by city
      const cityMap: Record<string, { lat: number; lon: number; count: number; country: string }> = {};
      points.forEach(p => {
        const key = `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;
        if (!cityMap[key]) cityMap[key] = { lat: p.lat, lon: p.lon, count: 0, country: p.country };
        cityMap[key].count++;
      });

      Object.entries(cityMap).forEach(([, info]) => {
        const radius = Math.min(20, 5 + info.count * 3);
        L.circleMarker([info.lat, info.lon], {
          radius,
          fillColor: "#1a3a6a",
          color: "#1a3a6a",
          weight: 1,
          opacity: 0.7,
          fillOpacity: 0.35,
        }).addTo(map).bindPopup(
          `<b>${points.find(p => p.lat.toFixed(2) === info.lat.toFixed(2))?.city || "?"}</b><br/>${info.count} visite${info.count > 1 ? "s" : ""}`
        );
      });

      // Fit bounds if points exist
      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon] as [number, number]));
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      }

      mapInstance.current = map;
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [points]);

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={mapRef} style={{ width: "100%", height: 400, borderRadius: 6, overflow: "hidden" }} />
    </>
  );
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
  const frPoints = geoPoints.filter((p: any) => p.lat && p.lon);

  // Compute additional stats
  const avgPerDay = byDay.length > 0 ? Math.round(stats.total_all / byDay.length * 10) / 10 : 0;
  const topCountry = byCountry[0] ? `${byCountry[0][0]} (${byCountry[0][1]})` : "—";
  const topPage = byPage[0] ? byPage[0][0] : "—";

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(220,38,38,0.5)", marginBottom: 8 }}>Administration</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 24, fontWeight: 500, color: C.navyText, letterSpacing: "-.02em", margin: 0 }}>Analytics & Visiteurs</h1>
          <div style={{ display: "flex", gap: 4 }}>
            {[{ d: 1, l: "24h" }, { d: 7, l: "7j" }, { d: 30, l: "30j" }, { d: 90, l: "90j" }].map(({ d, l }) => (
              <button key={d} onClick={() => setDays(d)} style={{
                padding: "6px 14px", borderRadius: 5, fontSize: 11, fontWeight: days === d ? 500 : 400,
                background: days === d ? C.navyText : "transparent", color: days === d ? "white" : C.textMid,
                border: days === d ? "none" : `0.5px solid ${C.borderCard}`, cursor: "pointer", fontFamily: "Inter,sans-serif",
              }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row 1 — Visits (site arrivals) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        {[
          { label: "Visites (arrivées)", value: stats.total_visits, sub: `${avgPerDay}/jour en moyenne` },
          { label: "Visiteurs uniques", value: stats.unique_visitors, sub: "par adresse IP" },
          { label: "Connexions", value: stats.total_logins, sub: `${stats.unique_users} utilisateur${stats.unique_users > 1 ? "s" : ""} unique${stats.unique_users > 1 ? "s" : ""}` },
          { label: "Pays principal", value: topCountry, sub: `${byCountry.length} pays au total`, small: true },
        ].map(s => (
          <div key={s.label} style={{ padding: "16px 18px", borderRadius: 8, background: "white", border: `0.5px solid ${C.borderCard}` }}>
            <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: C.textLight, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: s.small ? 16 : 26, fontWeight: 500, color: C.navyText, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.textLight, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Stats row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total événements", value: stats.total_all },
          { label: "IPs uniques (tout)", value: stats.unique_ips },
          { label: "Page la plus vue", value: topPage, small: true },
          { label: "Villes (France)", value: byCity.filter((c: any) => c[1].count > 0).length },
        ].map(s => (
          <div key={s.label} style={{ padding: "14px 16px", borderRadius: 8, background: "white", border: `0.5px solid ${C.borderCard}` }}>
            <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: C.textLight, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: s.small ? 12 : 20, fontWeight: 500, color: C.navyText, fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, padding: 20, marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: C.navyText, marginBottom: 4 }}>Carte des visiteurs</h3>
        <p style={{ fontSize: 11, color: C.textLight, marginBottom: 12 }}>Zoomez et cliquez sur un point pour voir le détail. Taille proportionnelle au nombre de visites.</p>
        {frPoints.length > 0 ? (
          <VisitorMap points={frPoints} />
        ) : (
          <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF8", borderRadius: 6, color: C.textLight }}>Pas encore de visiteurs géolocalisés</div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        {/* Countries */}
        <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: C.navyText, marginBottom: 12 }}>Répartition par pays</h3>
          {byCountry.length === 0 ? (
            <div style={{ color: C.textLight, fontSize: 12, padding: 20, textAlign: "center" }}>Pas de données</div>
          ) : byCountry.slice(0, 15).map(([country, count]: [string, number]) => (
            <div key={country} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", borderBottom: `0.5px solid rgba(5,11,20,0.04)` }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.navyText, width: 30 }}>{country}</span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(26,58,106,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(count / (byCountry[0]?.[1] || 1)) * 100}%`, background: C.sapphire, borderRadius: 2, opacity: 0.5 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.navyText, fontVariantNumeric: "tabular-nums", width: 40, textAlign: "right" }}>{count}</span>
              <span style={{ fontSize: 10, color: C.textLight, width: 35, textAlign: "right" }}>{stats.total_all > 0 ? Math.round(count / stats.total_all * 100) : 0}%</span>
            </div>
          ))}
        </div>

        {/* Cities France */}
        <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: C.navyText, marginBottom: 12 }}>Villes (France)</h3>
          {byCity.length === 0 ? (
            <div style={{ color: C.textLight, fontSize: 12, padding: 20, textAlign: "center" }}>Pas de données</div>
          ) : byCity.slice(0, 15).map(([city, info]: [string, any]) => (
            <div key={city} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", borderBottom: `0.5px solid rgba(5,11,20,0.04)` }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.navyText, flex: 1 }}>{city}</span>
              <div style={{ width: 80, height: 4, borderRadius: 2, background: "rgba(26,58,106,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(info.count / (byCity[0]?.[1]?.count || 1)) * 100}%`, background: C.sapphire, borderRadius: 2, opacity: 0.5 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.navyText, fontVariantNumeric: "tabular-nums", width: 30, textAlign: "right" }}>{info.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Visits by day chart */}
      <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, padding: 20, marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: C.navyText, marginBottom: 12 }}>Visites par jour</h3>
        {byDay.length > 0 ? (
          <div style={{ position: "relative" }}>
            <svg viewBox={`0 0 ${Math.max(byDay.length * 24 + 40, 200)} 140`} style={{ width: "100%", height: 140 }}>
              {/* Grid lines */}
              {[0, 1, 2, 3].map(i => <line key={i} x1="30" y1={20 + i * 25} x2={byDay.length * 24 + 40} y2={20 + i * 25} stroke="rgba(5,11,20,0.04)" strokeWidth="0.5" />)}
              {/* Bars */}
              {byDay.map(([day, count]: [string, number], i: number) => {
                const maxCount = Math.max(...byDay.map((d: any) => d[1]));
                const h = maxCount > 0 ? (count / maxCount) * 80 : 0;
                return (
                  <g key={day}>
                    <rect x={i * 24 + 34} y={100 - h} width="16" height={h} rx="3" fill={C.sapphire} opacity="0.35">
                      <title>{day}: {count} visite{count > 1 ? "s" : ""}</title>
                    </rect>
                    <text x={i * 24 + 42} y={100 - h - 4} textAnchor="middle" fontSize="7" fill={C.textMid} fontFamily="Inter,sans-serif">{count > 0 ? count : ""}</text>
                    {(i % Math.max(1, Math.floor(byDay.length / 10)) === 0) && (
                      <text x={i * 24 + 42} y="118" textAnchor="middle" fontSize="7" fill={C.textLight} fontFamily="Inter,sans-serif">{day.slice(5)}</text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        ) : <div style={{ color: C.textLight, fontSize: 12, textAlign: "center", padding: 20 }}>Pas de données</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Top pages */}
        <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: C.navyText, marginBottom: 12 }}>Pages les plus visitées</h3>
          {byPage.map(([page, count]: [string, number], i: number) => (
            <div key={page} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `0.5px solid rgba(5,11,20,0.04)` }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: C.textLight, width: 16 }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: C.textMid, fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.navyText, fontVariantNumeric: "tabular-nums" }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Recent visits */}
        <div style={{ background: "white", borderRadius: 8, border: `0.5px solid ${C.borderCard}`, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: C.navyText, marginBottom: 12 }}>Dernières visites</h3>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            {recent.map((v: any, i: number) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: `0.5px solid rgba(5,11,20,0.04)` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: v.user_email ? C.sapphire : C.navyText }}>
                    {v.user_email || v.ip}
                  </span>
                  <span style={{ fontSize: 10, color: C.textLight }}>{fmtTime(v.created_at)}</span>
                </div>
                <div style={{ display: "flex", gap: 8, fontSize: 10, color: C.textLight }}>
                  <span>{v.city ? `${v.city}, ${v.country}` : v.country || "?"}</span>
                  <span>·</span>
                  <span style={{ fontFamily: "monospace" }}>{v.path}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
