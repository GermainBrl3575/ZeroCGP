"use client";
import { useMemo } from "react";

const NAVY = "#050B14";
const SAPPHIRE = "#2a5494";
const SAPPHIRE_GLOW = "rgba(26,58,106,0.4)";

interface Props { calcPct: number; currentStep: string; stepIdx: number }

export default function MarkowitzAnim({ calcPct, currentStep, stepIdx }: Props) {
  // Generate stable nodes and edges once
  const { nodes, edges } = useMemo(() => {
    const W = 500, CX = W / 2, CY = W / 2, R = 160;
    const LABELS = ["MSCI W","SP500","NASDAQ","EU50","EM","GOV€","GOLD","REIT","TECH","HEALTH","DIV","BONDS"];
    const ns = LABELS.map((label, i) => {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const rOff = R + Math.sin(i * 2.7) * 25 + Math.cos(i * 1.3) * 15;
      return { x: CX + Math.cos(angle) * rOff, y: CY + Math.sin(angle) * rOff, label, angle, rOff };
    });
    const es: { x1: number; y1: number; x2: number; y2: number; d: number }[] = [];
    for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
      const d = Math.hypot(ns[i].x - ns[j].x, ns[i].y - ns[j].y);
      es.push({ x1: ns[i].x, y1: ns[i].y, x2: ns[j].x, y2: ns[j].y, d });
    }
    return { nodes: ns, edges: es };
  }, []);

  // Phase from stepIdx
  const phase = stepIdx <= 1 ? 1 : stepIdx <= 3 ? 2 : stepIdx <= 6 ? 3 : 4;

  const STEPS = [
    "Connexion aux données de marché", "Récupération des historiques",
    "Construction matrice de covariance", "Shrinkage Ledoit-Wolf",
    "Calcul frontière efficiente", "Maximisation ratio de Sharpe",
    "Calcul VaR 95% et CVaR", "Validation des contraintes", "Génération du rapport"
  ];

  return (
    <div style={{ width: "100%", maxWidth: 880, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 48, minHeight: "65vh" }}>
        {/* Left: Steps + Progress */}
        <div style={{ flex: "0 0 260px" }}>
          <div style={{ fontSize: 9, letterSpacing: 5, textTransform: "uppercase", color: "rgba(5,11,20,.22)", marginBottom: 12, fontFamily: "'Inter',sans-serif", fontWeight: 400 }}>
            Calcul en cours
          </div>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(22px,2.8vw,32px)", fontWeight: 500, color: "rgba(5,11,20,.88)", lineHeight: 1.25, letterSpacing: "-0.03em", margin: "0 0 28px" }}>
            Optimisation du portefeuille…
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {STEPS.map((label, i) => {
              const done = stepIdx > i;
              const active = stepIdx === i;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "7px 0",
                  opacity: done ? 1 : active ? 0.8 : 0.2,
                  transition: "opacity 0.6s ease",
                }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                    background: done ? SAPPHIRE : active ? NAVY : "rgba(5,11,20,.15)",
                    boxShadow: done ? `0 0 8px ${SAPPHIRE_GLOW}` : "none",
                    transition: "all 0.5s ease",
                  }} />
                  <span style={{
                    fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 300,
                    color: done ? "rgba(5,11,20,.45)" : active ? NAVY : "rgba(5,11,20,.2)",
                    letterSpacing: 0.2, transition: "color 0.5s ease",
                  }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 24 }}>
            <div style={{ height: 2, background: "rgba(5,11,20,.04)", borderRadius: 1, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 1,
                background: `linear-gradient(90deg, ${NAVY}40, ${SAPPHIRE})`,
                boxShadow: `0 0 6px ${SAPPHIRE_GLOW}`,
                width: `${calcPct}%`,
                transition: "width 0.7s cubic-bezier(.16,1,.3,1)",
              }} />
            </div>
            <div style={{
              fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 300,
              color: "rgba(5,11,20,.2)", letterSpacing: 1, textAlign: "right", marginTop: 6,
            }}>
              {calcPct}%
            </div>
          </div>
        </div>

        {/* Right: SVG Matrix */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 500 500" style={{ width: "100%", maxWidth: 400, height: "auto" }}>
            {/* Edges */}
            {edges.map((e, i) => {
              const show = phase >= 2;
              const glow = phase >= 3 && e.d < 250;
              const pulse = phase >= 4 && e.d < 200;
              return (
                <line key={`e${i}`}
                  x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                  stroke={glow ? SAPPHIRE : NAVY}
                  strokeWidth={glow ? 0.6 : 0.4}
                  strokeOpacity={pulse ? 0.5 : glow ? 0.35 : show ? (e.d < 200 ? 0.12 : 0.05) : 0}
                  style={{
                    transition: `stroke-opacity 0.8s ease ${i * 0.01}s, stroke 0.5s ease`,
                    filter: glow ? `drop-shadow(0 0 ${pulse ? 6 : 3}px ${SAPPHIRE_GLOW})` : "none",
                  }}
                />
              );
            })}
            {/* Nodes */}
            {nodes.map((n, i) => (
              <g key={`n${i}`}>
                <circle
                  cx={n.x} cy={n.y}
                  r={phase >= 1 ? (phase >= 4 ? 5 : 3.5) : 0}
                  fill={phase >= 3 ? SAPPHIRE : NAVY}
                  opacity={phase >= 1 ? 0.9 : 0}
                  style={{
                    transition: `r 0.6s cubic-bezier(.34,1.56,.64,1) ${i * 0.06}s, fill 0.5s ease, opacity 0.6s ease ${i * 0.06}s`,
                    filter: phase >= 4 ? `drop-shadow(0 0 6px ${SAPPHIRE_GLOW})` : "none",
                  }}
                />
                <text
                  x={250 + Math.cos(n.angle) * (n.rOff + 18)}
                  y={250 + Math.sin(n.angle) * (n.rOff + 18)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="'Inter',sans-serif" fontSize={7.5} fontWeight={300}
                  fill={NAVY} letterSpacing={0.5}
                  opacity={phase >= 1 ? 0.45 : 0}
                  style={{ transition: `opacity 0.8s ease ${i * 0.06 + 0.3}s` }}
                >
                  {n.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
