"use client";
import { useEffect, useRef, useState } from "react";

const NAVY = "#050B14";
const GREEN = "#4ade80";
const CREAM = "#F9F8F6";

interface Props { calcPct: number; currentStep: string; stepIdx: number }

export default function MarkowitzAnim({ calcPct, currentStep, stepIdx }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const initRef = useRef(false);
  const [phase, setPhase] = useState(0);

  // Map step index (0-8) to animation phase (0-4)
  useEffect(() => {
    if (stepIdx <= 1) setPhase(1);      // Données: nodes appear
    else if (stepIdx <= 3) setPhase(2); // Covariance: edges weave
    else if (stepIdx <= 6) setPhase(3); // Frontier/Sharpe: green glow
    else setPhase(4);                    // Final: pulse
  }, [stepIdx]);

  useEffect(() => {
    if (initRef.current || !svgRef.current) return;
    initRef.current = true;

    const svg = svgRef.current;
    const NS = "http://www.w3.org/2000/svg";
    const W = 500, H = 500, CX = W / 2, CY = H / 2;

    // Generate 12 nodes in organic constellation
    const nodes: { x: number; y: number; el: SVGCircleElement; label: string }[] = [];
    const LABELS = ["MSCI W", "SP500", "NASDAQ", "EU50", "EM", "GOV€", "GOLD", "REIT", "TECH", "HEALTH", "DIV", "BONDS"];
    const R = 160;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      // Organic offset
      const rOff = R + (Math.sin(i * 2.7) * 25) + (Math.cos(i * 1.3) * 15);
      const x = CX + Math.cos(angle) * rOff;
      const y = CY + Math.sin(angle) * rOff;

      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", String(x));
      c.setAttribute("cy", String(y));
      c.setAttribute("r", "0");
      c.setAttribute("fill", NAVY);
      c.setAttribute("opacity", "0");
      svg.appendChild(c);

      // Label
      const t = document.createElementNS(NS, "text");
      const labelX = CX + Math.cos(angle) * (rOff + 18);
      const labelY = CY + Math.sin(angle) * (rOff + 18);
      t.setAttribute("x", String(labelX));
      t.setAttribute("y", String(labelY));
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("dominant-baseline", "middle");
      t.setAttribute("font-family", "'Inter', sans-serif");
      t.setAttribute("font-size", "8");
      t.setAttribute("font-weight", "300");
      t.setAttribute("fill", NAVY);
      t.setAttribute("opacity", "0");
      t.setAttribute("letter-spacing", "0.5");
      t.textContent = LABELS[i];
      svg.appendChild(t);

      nodes.push({ x, y, el: c, label: LABELS[i] });
    }

    // Generate edges between all node pairs
    const edges: { el: SVGLineElement; d: number; i: number; j: number }[] = [];
    for (let i = 0; i < 12; i++) {
      for (let j = i + 1; j < 12; j++) {
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        const l = document.createElementNS(NS, "line");
        l.setAttribute("x1", String(nodes[i].x));
        l.setAttribute("y1", String(nodes[i].y));
        l.setAttribute("x2", String(nodes[j].x));
        l.setAttribute("y2", String(nodes[j].y));
        l.setAttribute("stroke", NAVY);
        l.setAttribute("stroke-width", "0.3");
        l.setAttribute("stroke-opacity", "0");
        // Insert edges before nodes so nodes render on top
        svg.insertBefore(l, svg.firstChild);
        edges.push({ el: l, d, i, j });
      }
    }

    // Store refs for phase transitions
    (svg as unknown as Record<string, unknown>).__nodes = nodes;
    (svg as unknown as Record<string, unknown>).__edges = edges;
  }, []);

  // Phase-driven animations
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const nodes = (svg as unknown as Record<string, unknown>).__nodes as { x: number; y: number; el: SVGCircleElement; label: string }[] | undefined;
    const edges = (svg as unknown as Record<string, unknown>).__edges as { el: SVGLineElement; d: number; i: number; j: number }[] | undefined;
    if (!nodes || !edges) return;

    const allTexts = svg.querySelectorAll("text");

    if (phase >= 1) {
      // Phase 1: Nodes fade in with stagger
      nodes.forEach((n, i) => {
        setTimeout(() => {
          n.el.style.transition = "r 0.8s cubic-bezier(.34,1.56,.64,1), opacity 0.8s ease";
          n.el.setAttribute("r", "3");
          n.el.setAttribute("opacity", "1");
          if (allTexts[i]) {
            allTexts[i].style.transition = "opacity 1s ease";
            allTexts[i].setAttribute("opacity", "0.3");
          }
        }, i * 80);
      });
    }

    if (phase >= 2) {
      // Phase 2: Edges weave in (correlation network builds)
      const sorted = [...edges].sort((a, b) => a.d - b.d); // closest first
      sorted.forEach((e, i) => {
        setTimeout(() => {
          e.el.style.transition = "stroke-opacity 0.6s ease";
          e.el.setAttribute("stroke-opacity", e.d < 200 ? "0.08" : "0.03");
        }, 800 + i * 15);
      });
    }

    if (phase >= 3) {
      // Phase 3: Efficient connections glow green
      const efficient = edges.filter(e => e.d < 250).slice(0, 20);
      efficient.forEach((e, i) => {
        setTimeout(() => {
          e.el.style.transition = "stroke 0.5s ease, stroke-opacity 0.5s ease, filter 0.5s ease";
          e.el.setAttribute("stroke", GREEN);
          e.el.setAttribute("stroke-opacity", e.d < 180 ? "0.25" : "0.12");
          e.el.style.filter = "drop-shadow(0 0 2px rgba(74,222,128,0.3))";
        }, i * 60);
      });
      // Nodes get green tint
      nodes.forEach((n, i) => {
        setTimeout(() => {
          n.el.style.transition = "fill 0.6s ease";
          n.el.setAttribute("fill", GREEN);
        }, 400 + i * 50);
      });
    }

    if (phase >= 4) {
      // Phase 4: Luminous pulse across network
      const pulseEdges = edges.filter(e => e.d < 250);
      pulseEdges.forEach((e, i) => {
        setTimeout(() => {
          e.el.setAttribute("stroke-opacity", "0.5");
          e.el.style.filter = "drop-shadow(0 0 4px rgba(74,222,128,0.5))";
          setTimeout(() => {
            e.el.style.transition = "stroke-opacity 1.5s ease, filter 1.5s ease";
            e.el.setAttribute("stroke-opacity", "0.2");
            e.el.style.filter = "drop-shadow(0 0 2px rgba(74,222,128,0.2))";
          }, 200);
        }, i * 30);
      });
      // Central glow
      nodes.forEach((n, i) => {
        setTimeout(() => {
          n.el.setAttribute("r", "5");
          n.el.style.filter = "drop-shadow(0 0 6px rgba(74,222,128,0.4))";
          setTimeout(() => {
            n.el.style.transition = "r 1s ease, filter 1s ease";
            n.el.setAttribute("r", "3");
            n.el.style.filter = "drop-shadow(0 0 2px rgba(74,222,128,0.2))";
          }, 300);
        }, i * 40);
      });
    }
  }, [phase]);

  return (
    <div style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .mx-tag { font-size:9px; letter-spacing:5px; text-transform:uppercase; color:rgba(5,11,20,0.22);
          font-family:'Inter',sans-serif; font-weight:400; animation:fadeUp 1s 0.3s both }
        .mx-title { font-family:'Cormorant Garamond','Cormorant Garant',serif; font-size:clamp(22px,3vw,36px);
          font-weight:300; color:${NAVY}; line-height:1.25; letter-spacing:-0.3px; margin:8px 0 0;
          animation:fadeUp 1s 0.5s both }
        .mx-title em { font-style:normal; font-weight:500 }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 40, minHeight: "70vh" }}>
        {/* Left: Steps list */}
        <div style={{ flex: "0 0 280px" }}>
          <div className="mx-tag">Calcul en cours</div>
          <h1 className="mx-title">Optimisation <em>du portefeuille…</em></h1>

          <div style={{ marginTop: 32 }}>
            {["Connexion aux données de marché", "Récupération des historiques",
              "Construction matrice de covariance", "Shrinkage Ledoit-Wolf",
              "Calcul frontière efficiente", "Maximisation ratio de Sharpe",
              "Calcul VaR 95% et CVaR", "Validation des contraintes", "Génération du rapport"
            ].map((label, i) => {
              const done = stepIdx > i;
              const active = stepIdx === i;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "8px 0",
                  opacity: done ? 1 : active ? 0.8 : 0.25,
                  transition: "opacity 0.5s ease",
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                    background: done ? GREEN : active ? NAVY : "rgba(5,11,20,0.15)",
                    boxShadow: done ? `0 0 6px ${GREEN}40` : "none",
                    transition: "all 0.5s ease",
                  }} />
                  <span style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 300,
                    color: done ? "rgba(5,11,20,0.5)" : active ? NAVY : "rgba(5,11,20,0.3)",
                    letterSpacing: 0.2,
                    transition: "color 0.5s ease",
                  }}>
                    {label}
                  </span>
                  {active && (
                    <span style={{
                      width: 4, height: 4, borderRadius: "50%", background: NAVY,
                      animation: "pulse 1.5s infinite",
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 24 }}>
            <div style={{
              height: 2, background: "rgba(5,11,20,0.05)", borderRadius: 1, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 1,
                background: `linear-gradient(90deg, ${NAVY}, ${GREEN})`,
                width: `${calcPct}%`,
                transition: "width 0.6s cubic-bezier(.16,1,.3,1)",
              }} />
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 300,
              color: "rgba(5,11,20,0.22)", letterSpacing: 1, textAlign: "right",
              marginTop: 6,
            }}>
              {calcPct}%
            </div>
          </div>
        </div>

        {/* Right: SVG Connectivity Matrix */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg
            ref={svgRef}
            viewBox="0 0 500 500"
            style={{ width: "100%", maxWidth: 420, height: "auto" }}
            preserveAspectRatio="xMidYMid meet"
          />
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1 }
          50% { opacity: 0.3 }
        }
      `}</style>
    </div>
  );
}
