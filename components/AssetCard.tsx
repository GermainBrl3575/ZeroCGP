"use client";
import { useState, useEffect } from "react";

interface AssetInfo {
  symbol: string;
  name: string;
  sector: string;
  description: string;
  isin: string | null;
  country: string | null;
  inception_year: number | null;
  cached: boolean;
}

interface PerfData {
  "1S"?: string; "1M": string; "6M": string; "1A": string; "5A": string; "10A": string;
}

interface Props {
  symbol: string;
  name: string;
  weight: number;
  amount: number;
  type: string;
  perf?: PerfData;
}

const TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  etf:      { bg: "#EFF6FF", color: "#1D4ED8" },
  stock:    { bg: "#F0FDF4", color: "#15803D" },
  crypto:   { bg: "#FFFBEB", color: "#92400E" },
  index:    { bg: "#F5F3FF", color: "#6D28D9" },
  commodity:{ bg: "#FFF7ED", color: "#C2410C" },
  forex:    { bg: "#F0F9FF", color: "#0369A1" },
};

export default function AssetCard({ symbol, name, weight, amount, type, perf }: Props) {
  const [info, setInfo] = useState<AssetInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function loadInfo() {
    if (info || loading) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/market/describe?symbol=${symbol}`);
      const d = await r.json();
      setInfo(d);
    } catch {}
    setLoading(false);
  }

  function toggle() {
    setOpen(o => !o);
    if (!open) loadInfo();
  }

  const tc = TYPE_COLOR[type] || TYPE_COLOR.stock;
  const NAVY = "#0A1628";

  return (
    <div style={{
      background: "white",
      border: "0.5px solid rgba(10,22,40,0.08)",
      borderRadius: 12,
      marginBottom: 10,
      overflow: "hidden",
      transition: "box-shadow .2s",
    }}>
      {/* Header — toujours visible */}
      <div
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center",
          padding: "14px 18px", cursor: "pointer", gap: 12,
        }}
      >
        {/* Badge type */}
        <span style={{
          fontSize: 9, fontWeight: 700, padding: "3px 8px",
          borderRadius: 4, background: tc.bg, color: tc.color,
          letterSpacing: ".06em", flexShrink: 0,
        }}>{type.toUpperCase()}</span>

        {/* Nom + symbole */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{symbol}</div>
          <div style={{
            fontSize: 11, color: "#8A9BB0", marginTop: 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{name}</div>
        </div>

        {/* Poids + montant */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>
            {weight.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: "#8A9BB0" }}>
            {new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(amount)}
          </div>
        </div>

        {/* Chevron */}
        <div style={{
          marginLeft: 8, color: "#8A9BB0", fontSize: 10,
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform .2s",
        }}>▼</div>
      </div>

      {/* Barre de poids */}
      <div style={{ height: 2, background: "rgba(10,22,40,0.04)" }}>
        <div style={{
          height: "100%", width: `${Math.min(weight, 100)}%`,
          background: `linear-gradient(90deg, #0A1628, #2563EB)`,
          transition: "width .6s cubic-bezier(.16,1,.3,1)",
        }}/>
      </div>

      {/* Détail expandable */}
      {open && (
        <div style={{
          padding: "16px 18px",
          borderTop: "0.5px solid rgba(10,22,40,0.06)",
          background: "#FAFAFA",
        }}>
          {loading ? (
            <div style={{
              fontSize: 11, color: "#8A9BB0", letterSpacing: ".1em",
              animation: "pulse 1.5s infinite",
            }}>Analyse en cours…</div>
          ) : info ? (
            <>
              {/* Description */}
              <p style={{
                fontSize: 12.5, color: "#374151", lineHeight: 1.65,
                marginBottom: 14, fontFamily: "'Inter',sans-serif",
              }}>{info.description}</p>

              {/* Métadonnées */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: 8, marginBottom: 14,
              }}>
                {[
                  { label: "Secteur",    val: info.sector },
                  { label: "Pays",       val: info.country || "—" },
                  { label: "Création",   val: info.inception_year ? String(info.inception_year) : "—" },
                  { label: "ISIN",       val: info.isin || "—", mono: true },
                ].map(({ label, val, mono }) => (
                  <div key={label} style={{
                    background: "white", borderRadius: 8,
                    padding: "8px 12px",
                    border: "0.5px solid rgba(10,22,40,0.07)",
                  }}>
                    <div style={{ fontSize: 8.5, color: "#8A9BB0", letterSpacing: ".12em", marginBottom: 3, textTransform: "uppercase" }}>
                      {label}
                    </div>
                    <div style={{
                      fontSize: mono ? 10.5 : 12, fontWeight: 500, color: NAVY,
                      fontFamily: mono ? "'Roboto Mono',monospace" : "inherit",
                    }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Performances historiques */}
              {perf && (
                <div>
                  <div style={{ fontSize: 8.5, color: "#8A9BB0", letterSpacing: ".12em", marginBottom: 8, textTransform: "uppercase" }}>
                    Performances historiques
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["1S","1M","6M","1A","5A","10A"] as const).map(p => {
                      const val = perf[p];
                      const num = parseFloat(val);
                      const isPos = !isNaN(num) && num >= 0;
                      const isNeg = !isNaN(num) && num < 0;
                      return (
                        <div key={p} style={{
                          flex: 1, textAlign: "center",
                          background: isPos ? "#F0FDF4" : isNeg ? "#FEF2F2" : "white",
                          borderRadius: 8, padding: "8px 4px",
                          border: `0.5px solid ${isPos ? "rgba(22,163,74,0.2)" : isNeg ? "rgba(220,38,38,0.2)" : "rgba(10,22,40,0.07)"}`,
                        }}>
                          <div style={{ fontSize: 8, color: "#8A9BB0", marginBottom: 4, letterSpacing: ".08em" }}>{p}</div>
                          <div style={{
                            fontSize: 12, fontWeight: 700,
                            color: isPos ? "#16A34A" : isNeg ? "#DC2626" : "#8A9BB0",
                            fontFamily: "'Roboto Mono',monospace",
                          }}>
                            {isNaN(num) ? val : `${num >= 0 ? "+" : ""}${val}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 11, color: "#8A9BB0" }}>Informations non disponibles.</div>
          )}
        </div>
      )}
    </div>
  );
}
