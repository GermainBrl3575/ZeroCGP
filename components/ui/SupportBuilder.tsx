"use client";
import { useState } from "react";

const NAVY = "#050B14";

const SUPPORTS = [
  { type: "PEA", label: "PEA", desc: "Fiscalité avantageuse après 5 ans · Plafond 150 000 €" },
  { type: "CTO", label: "Compte-Titres (CTO)", desc: "Aucune restriction · Flat Tax 30%" },
  { type: "AV", label: "Assurance-Vie", desc: "Enveloppe fiscale long terme · Fonds en UC" },
  { type: "crypto", label: "Crypto", desc: "Bitcoin, Ethereum · Via exchange ou cold wallet" },
];

const BANKS: Record<string, string[]> = {
  PEA: ["BoursoBank", "Fortuneo", "Bourse Direct", "BNP Paribas", "Société Générale", "Crédit Agricole", "LCL", "Hello Bank", "Degiro", "Trade Republic", "Saxo Bank", "Autre"],
  CTO: ["Interactive Brokers", "Degiro", "BoursoBank", "Fortuneo", "Saxo Bank", "Trade Republic", "Revolut", "Bourse Direct", "Autre"],
  AV: ["BoursoBank", "Fortuneo", "Linxea", "Lucya Cardif", "Autre"],
  crypto: ["Binance", "Coinbase", "Kraken", "Autre"],
};

interface Compte { type: string; banque: string; pct: number }
interface Props { value: string; onChange: (json: string) => void; onSubmit: () => void }

export default function SupportBuilder({ value, onChange, onSubmit }: Props) {
  let comptes: Compte[] = [];
  try { comptes = JSON.parse(value || "[]"); } catch { comptes = []; }

  function hasSupport(t: string) { return comptes.some(c => c.type === t); }

  function toggleSupport(t: string) {
    let next: Compte[];
    if (hasSupport(t)) {
      next = comptes.filter(c => c.type !== t);
    } else {
      next = [...comptes, { type: t, banque: "", pct: 0 }];
    }
    if (next.length > 0) {
      const pctEach = Math.round(100 / next.length);
      next = next.map((c, i) => ({ ...c, pct: i === next.length - 1 ? 100 - pctEach * (next.length - 1) : pctEach }));
    }
    onChange(JSON.stringify(next));
  }

  function setBanque(t: string, b: string) {
    const next = comptes.map(c => c.type === t ? { ...c, banque: b } : c);
    onChange(JSON.stringify(next));
  }

  const allHaveBanque = comptes.length > 0 && comptes.every(c => c.banque);

  return (
    <div style={{ maxWidth: 580 }}>
      <p style={{ fontSize: 12, color: "rgba(5,11,20,.35)", marginBottom: 24, fontWeight: 300, fontFamily: "'Inter',sans-serif" }}>
        Ajoutez vos comptes. Pour chaque support, choisissez votre banque ou courtier.
      </p>

      {SUPPORTS.map(s => {
        const active = hasSupport(s.type);
        const compte = comptes.find(c => c.type === s.type);
        return (
          <div key={s.type} style={{ marginBottom: 14 }}>
            <button
              onClick={() => toggleSupport(s.type)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
                background: active ? "rgba(5,11,20,.03)" : "white",
                border: `1px solid ${active ? NAVY : "rgba(5,11,20,.08)"}`,
                borderRadius: active ? "8px 8px 0 0" : "8px",
                cursor: "pointer", fontFamily: "'Inter',sans-serif",
                fontSize: 13, color: NAVY, textAlign: "left" as const,
                fontWeight: active ? 400 : 300, transition: "all .2s",
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: 4,
                border: `1.5px solid ${active ? NAVY : "rgba(5,11,20,.15)"}`,
                background: active ? NAVY : "white",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {active && <span style={{ color: "white", fontSize: 11 }}>✓</span>}
              </span>
              <div>
                <div>{s.label}</div>
                <div style={{ fontSize: 10, color: "rgba(5,11,20,.3)", fontWeight: 300, marginTop: 2 }}>{s.desc}</div>
              </div>
              {compte && <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(5,11,20,.3)", fontWeight: 300 }}>{compte.pct}%</div>}
            </button>
            {active && (
              <div style={{ padding: "12px 18px", border: "1px solid rgba(5,11,20,.08)", borderTop: "none", borderRadius: "0 0 8px 8px", background: "white" }}>
                <select
                  value={compte?.banque || ""}
                  onChange={e => setBanque(s.type, e.target.value)}
                  style={{
                    width: "100%", padding: "10px 14px", fontSize: 12,
                    border: "1px solid rgba(5,11,20,.08)", borderRadius: 6,
                    background: "#FAFAF9", color: NAVY, fontFamily: "'Inter',sans-serif",
                    fontWeight: 300, cursor: "pointer",
                  }}
                >
                  <option value="">Choisir votre banque…</option>
                  {(BANKS[s.type] || []).map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}
          </div>
        );
      })}

      {allHaveBanque && (
        <button
          onClick={onSubmit}
          style={{
            marginTop: 16, width: "100%", fontFamily: "'Inter',sans-serif",
            fontSize: 10, fontWeight: 400, letterSpacing: ".18em",
            background: NAVY, color: "white", border: "none",
            padding: "18px 44px", cursor: "pointer", transition: "all 0.25s",
            textTransform: "uppercase" as const,
          }}
        >
          Lancer l'optimisation →
        </button>
      )}
    </div>
  );
}
