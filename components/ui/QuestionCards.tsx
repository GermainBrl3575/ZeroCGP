"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const SAP = "#1a3a6a";
const EASE = "all 0.5s cubic-bezier(.16,1,.3,1)";

// ─── Global: only one tooltip open at a time ──────────────────
let globalCloseAll: (() => void) | null = null;

export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && globalCloseAll) globalCloseAll();
    const next = !open;
    if (next && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const openDown = rect.top < 200;
      const left = Math.max(10, Math.min(rect.left + rect.width / 2 - 150, window.innerWidth - 320));
      setPos(openDown
        ? { top: rect.bottom + 8, left }
        : { bottom: window.innerHeight - rect.top + 8, left });
    }
    setOpen(next);
    if (next) globalCloseAll = () => setOpen(false);
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      <button ref={btnRef} onClick={toggle} style={{
        width: 16, height: 16, borderRadius: "50%",
        background: "rgba(26,58,106,0.08)", border: "none",
        color: SAP, fontSize: 9, fontWeight: 700, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Georgia,serif", fontStyle: "italic", lineHeight: 1, flexShrink: 0,
      }}>i</button>
      {open && typeof document !== "undefined" && createPortal(
        <div style={{
          position: "fixed", zIndex: 99999,
          top: pos.top, bottom: pos.bottom, left: pos.left,
          width: 300, background: "#050B14", color: "rgba(255,255,255,.88)", borderRadius: 10,
          padding: "14px 16px", fontSize: 12, lineHeight: 1.7,
          fontWeight: 400, boxShadow: "0 8px 32px rgba(0,0,0,.3)",
          fontFamily: "Inter,sans-serif", whiteSpace: "pre-line",
        }}>
          {text}
        </div>,
        document.body
      )}
    </span>
  );
}

// ─── Risk dots (1-5) ──────────────────────────────────────────
function RiskDots({ level }: { level: number }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: i < level ? "rgba(5,11,20,0.3)" : "rgba(5,11,20,0.08)" }} />
      ))}
    </div>
  );
}

// ─── Pedagogical box ──────────────────────────────────────────
function PedaBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: 8, background: "rgba(26,58,106,0.03)", border: ".5px solid rgba(26,58,106,0.06)" }}>
      <div style={{ fontSize: 12, fontWeight: 400, color: "rgba(5,11,20,0.45)", lineHeight: 1.7, fontFamily: "Inter,sans-serif" }}>{children}</div>
    </div>
  );
}

// ─── Q1: Horizon ──────────────────────────────────────────────
const Q1_INFO: Record<string, string> = {
  "Moins de 2 ans": "Avec un horizon court, votre argent sera placé principalement en obligations et fonds monétaires — des placements stables mais avec peu de rendement. On évite les actions car elles peuvent baisser fortement à court terme.",
  "2 à 5 ans": "Sur cette durée, on peut commencer à investir une partie en actions tout en gardant une base sécurisée. Le portefeuille sera équilibré entre croissance et protection du capital.",
  "5 à 10 ans": "Sur 5 à 10 ans, les baisses temporaires des marchés ont le temps de se rattraper. On peut donc investir davantage en actions pour viser un meilleur rendement, même si la valeur fluctue.",
  "10 ans et plus": "C'est l'horizon idéal pour investir. Sur 10 ans ou plus, les marchés actions ont historiquement toujours été positifs. On maximise la part en actions pour profiter de la croissance long terme.",
};

export function Q1Timeline({ value, onSelect }: { value?: string; onSelect: (v: string) => void }) {
  const opts = [
    { val: "Moins de 2 ans", label: "< 2 ans", sub: "Privilégie la sécurité du capital" },
    { val: "2 à 5 ans", label: "2-5 ans", sub: "Équilibre rendement et stabilité" },
    { val: "5 à 10 ans", label: "5-10 ans", sub: "Accepte la volatilité pour plus de rendement" },
    { val: "10 ans et plus", label: "10+ ans", sub: "Maximise la croissance long terme" },
  ];
  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {opts.map((o, i) => {
          const sel = value === o.val;
          return (
            <div key={o.val} onClick={() => onSelect(o.val)} style={{
              borderRadius: 6, padding: "20px 22px", cursor: "pointer", position: "relative",
              border: sel ? `.5px solid rgba(26,58,106,.4)` : "0.5px solid rgba(5,11,20,.09)",
              background: sel ? "rgba(26,58,106,.04)" : "rgba(255,255,255,.72)",
              boxShadow: sel ? "0 4px 16px rgba(26,58,106,.08)" : "0 1px 2px rgba(0,0,0,.015)",
              transition: EASE, animation: `cardIn .4s cubic-bezier(.23,1,.32,1) both`, animationDelay: `${i * 0.06}s`,
            }}>
              <div style={{ position: "absolute", top: 12, right: 12 }}><InfoTip text={Q1_INFO[o.val]} /></div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(5,11,20,.88)", fontFamily: "Inter,sans-serif", marginBottom: 4 }}>{o.label}</div>
              <div style={{ fontSize: 11.5, fontWeight: 400, color: "rgba(5,11,20,.4)", fontFamily: "Inter,sans-serif", lineHeight: 1.4, paddingRight: 20 }}>{o.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Q2: Risk profile ─────────────────────────────────────────
export function Q2RiskCards({ value, onSelect }: { value?: string; onSelect: (v: string) => void }) {
  const opts = [
    { val: "Conservateur", ret: "+3%/an", risk: "-10% max", desc: "Sécurité maximale, croissance lente" },
    { val: "Modéré", ret: "+6%/an", risk: "-20% max", desc: "Bon équilibre risque/rendement" },
    { val: "Dynamique", ret: "+8%/an", risk: "-35% max", desc: "Plus de volatilité, plus de gains" },
    { val: "Agressif", ret: "+10%/an", risk: "-50% max", desc: "Rendement maximum, fortes variations" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 540, margin: "0 auto" }}>
      {opts.map((o, i) => {
        const sel = value === o.val;
        return (
          <div key={o.val} onClick={() => onSelect(o.val)} style={{
            borderRadius: 6, padding: "20px 22px", cursor: "pointer",
            border: sel ? `.5px solid rgba(26,58,106,.4)` : "0.5px solid rgba(5,11,20,.09)",
            background: sel ? "rgba(26,58,106,.04)" : "rgba(255,255,255,.72)",
            boxShadow: sel ? "0 4px 16px rgba(26,58,106,.08)" : "0 1px 2px rgba(0,0,0,.015)",
            transition: EASE, animation: `cardIn .4s cubic-bezier(.23,1,.32,1) both`, animationDelay: `${i * 0.06}s`,
          }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(5,11,20,.88)", fontFamily: "Inter,sans-serif", marginBottom: 6 }}>{o.val}</div>
            <div style={{ display: "flex", gap: 12, fontSize: 12, fontFamily: "Inter,sans-serif", marginBottom: 6 }}>
              <span style={{ color: "rgba(22,90,52,.7)", fontWeight: 500 }}>{o.ret}</span>
              <span style={{ color: "rgba(155,50,48,.6)", fontWeight: 400 }}>{o.risk}</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(5,11,20,.4)", fontFamily: "Inter,sans-serif", lineHeight: 1.4 }}>{o.desc}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Q3: Loss tolerance ───────────────────────────────────────
export function Q3LossBar({ value, onSelect }: { value?: string; onSelect: (v: string) => void }) {
  const opts = [
    { val: "−10% maximum", pct: 10, amount: "1 000€" },
    { val: "−20% maximum", pct: 20, amount: "2 000€" },
    { val: "−35% maximum", pct: 35, amount: "3 500€" },
    { val: "Pas de limite", pct: 50, amount: null },
  ];
  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <p style={{ fontSize: 13, color: "rgba(5,11,20,.52)", marginBottom: 20, fontFamily: "Inter,sans-serif", textAlign: "center" }}>
        Si votre portefeuille de 10 000€ baisse temporairement :
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {opts.map((o, i) => {
          const sel = value === o.val;
          return (
            <div key={o.val} onClick={() => onSelect(o.val)} style={{
              borderRadius: 6, padding: "16px 20px", cursor: "pointer",
              border: sel ? "0.5px solid rgba(155,50,48,.25)" : "0.5px solid rgba(5,11,20,.09)",
              background: sel ? "rgba(155,50,48,.03)" : "rgba(255,255,255,.72)",
              transition: EASE, animation: `cardIn .4s cubic-bezier(.23,1,.32,1) both`, animationDelay: `${i * 0.05}s`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(5,11,20,.88)", fontFamily: "Inter,sans-serif" }}>{o.val}</span>
                {o.amount && <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(155,50,48,.6)", fontVariantNumeric: "tabular-nums", fontFamily: "Inter,sans-serif" }}>{o.amount} de perte possible</span>}
              </div>
              {o.pct < 50 && <div style={{ height: 3, borderRadius: 2, background: "rgba(5,11,20,.04)", overflow: "hidden", marginTop: 8 }}>
                <div style={{ height: "100%", width: `${o.pct}%`, background: "rgba(155,50,48,.3)", borderRadius: 2, transition: EASE }} />
              </div>}
            </div>
          );
        })}
      </div>
      <PedaBox>
        Cette perte est <span style={{ fontWeight: 500 }}>temporaire</span>. Les marchés remontent toujours sur le long terme. Le S&P 500 a toujours récupéré ses pertes en moins de 5 ans. Investir, c'est accepter des hauts et des bas pour une tendance positive à long terme.
      </PedaBox>
    </div>
  );
}

// ─── Q4: ESG ──────────────────────────────────────────────────
export function Q4EsgCards({ value, onSelect }: { value?: string; onSelect: (v: string) => void }) {
  const opts = [
    { val: "Aucun filtre", title: "Aucun filtre", desc: "Performance maximale sans contrainte éthique" },
    { val: "Exclure armement & tabac", title: "Investissement responsable", desc: "Exclut armes, tabac, charbon. Performances similaires aux indices classiques." },
    { val: "ESG strict uniquement", title: "ESG Strict (SRI)", desc: "Top 25% des entreprises par secteur. Légèrement moins diversifié." },
  ];
  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <PedaBox>
        ESG signifie Environnement, Social, Gouvernance. Ces filtres excluent les entreprises controversées (armement, tabac, énergies fossiles) de votre portefeuille. Impact sur la performance : généralement neutre à légèrement positif sur le long terme.
      </PedaBox>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
        {opts.map((o, i) => {
          const sel = value === o.val;
          return (
            <div key={o.val} onClick={() => onSelect(o.val)} style={{
              borderRadius: 6, padding: "18px 22px", cursor: "pointer",
              border: sel ? ".5px solid rgba(26,58,106,.35)" : "0.5px solid rgba(5,11,20,.09)",
              background: sel ? "rgba(26,58,106,.03)" : "rgba(255,255,255,.72)",
              transition: EASE, animation: `cardIn .4s cubic-bezier(.23,1,.32,1) both`, animationDelay: `${i * 0.06}s`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(5,11,20,.88)", fontFamily: "Inter,sans-serif", marginBottom: 4 }}>{o.title}</div>
              <div style={{ fontSize: 11.5, fontWeight: 400, color: "rgba(5,11,20,.45)", fontFamily: "Inter,sans-serif", lineHeight: 1.5 }}>{o.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Q5: Asset classes ────────────────────────────────────────
const CLASSES: { key: string; title: string; sub: string; risk: number; detail: string }[] = [
  { key: "ETF", title: "ETF", sub: "Paniers d'actifs diversifiés", risk: 2, detail: "Réplique un indice (S&P 500, MSCI World). Diversifié, frais très faibles." },
  { key: "Actions", title: "Actions", sub: "Parts d'entreprises cotées", risk: 3, detail: "LVMH, Apple, ASML. Plus risqué qu'un ETF mais potentiel de gain plus élevé." },
  { key: "Obligations", title: "Obligations", sub: "Prêts à des États ou entreprises", risk: 1, detail: "Rendement modéré (~3-4%/an). Stabilise le portefeuille." },
  { key: "Or & Matières", title: "Or & Matières", sub: "Actifs tangibles, valeur refuge", risk: 2, detail: "Protège contre l'inflation et les crises. Pas de dividendes." },
  { key: "Immobilier", title: "Immobilier", sub: "REITs — immobilier coté", risk: 2, detail: "Exposition immobilière sans acheter un bien. Dividendes réguliers." },
  { key: "Crypto", title: "Crypto", sub: "Bitcoin, Ethereum", risk: 5, detail: "Très volatil (+100% ou -60%). À limiter à 2-5% du portefeuille." },
];

export function Q5AssetGrid({ selected, onToggle }: { selected: string[]; onToggle: (c: string) => void }) {
  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {CLASSES.map((c, i) => {
          const sel = selected.includes(c.key);
          return (
            <div key={c.key} onClick={() => onToggle(c.key)} style={{
              borderRadius: 6, padding: "16px 14px", cursor: "pointer",
              border: sel ? ".5px solid rgba(26,58,106,.35)" : "0.5px solid rgba(5,11,20,.09)",
              background: sel ? "rgba(26,58,106,.04)" : "rgba(255,255,255,.72)",
              transition: EASE, animation: `cardIn .4s cubic-bezier(.23,1,.32,1) both`, animationDelay: `${i * 0.05}s`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(5,11,20,.88)", fontFamily: "Inter,sans-serif", marginBottom: 3 }}>{c.title}</div>
              <div style={{ fontSize: 10.5, color: "rgba(5,11,20,.4)", fontFamily: "Inter,sans-serif", lineHeight: 1.4, marginBottom: 6 }}>{c.sub}</div>
              <RiskDots level={c.risk} />
              <div style={{ fontSize: 10, color: "rgba(5,11,20,.3)", fontFamily: "Inter,sans-serif", lineHeight: 1.4, marginTop: 8 }}>{c.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Q7: Diversification ──────────────────────────────────────
function DivIcon({ count }: { count: number }) {
  // 3 circles in a row, 8 in 2 rows, 12 in 3 rows of 4
  const rows = count <= 3 ? 1 : count <= 8 ? 2 : 3;
  const perRow = Math.ceil(count / rows);
  const positions: { cx: number; cy: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(perRow, count - r * perRow);
    const startX = (36 - inRow * 8) / 2 + 4;
    for (let c = 0; c < inRow; c++) {
      positions.push({ cx: startX + c * 8, cy: 5 + r * 8 });
    }
  }
  return (
    <svg width="36" height={rows * 8 + 2} viewBox={`0 0 36 ${rows * 8 + 2}`} fill="none">
      {positions.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r="2.5" stroke="rgba(5,11,20,0.25)" strokeWidth="0.8" />
      ))}
    </svg>
  );
}

export function Q7DivCards({ value, onSelect }: { value?: string; onSelect: (v: string) => void }) {
  const opts = [
    { val: "Concentre", label: "Simple", sub: "3-5 actifs", dots: 3, desc: "Comprendre chaque ligne. Facile à suivre." },
    { val: "Equilibre", label: "Équilibré", sub: "6-10 actifs", dots: 8, desc: "Meilleur compromis. Recommandé." },
    { val: "Large", label: "Maximum", sub: "10-15 actifs", dots: 12, desc: "Diversification maximale." },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, maxWidth: 560, margin: "0 auto" }}>
      {opts.map((o, i) => {
        const sel = value === o.val;
        return (
          <div key={o.val} onClick={() => onSelect(o.val)} style={{
            borderRadius: 6, padding: "20px 16px", cursor: "pointer", textAlign: "center",
            border: sel ? ".5px solid rgba(26,58,106,.4)" : "0.5px solid rgba(5,11,20,.09)",
            background: sel ? "rgba(26,58,106,.04)" : "rgba(255,255,255,.72)",
            boxShadow: sel ? "0 4px 16px rgba(26,58,106,.08)" : "0 1px 2px rgba(0,0,0,.015)",
            transition: EASE, animation: `cardIn .4s cubic-bezier(.23,1,.32,1) both`, animationDelay: `${i * 0.08}s`,
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><DivIcon count={o.dots} /></div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(5,11,20,.88)", fontFamily: "Inter,sans-serif" }}>{o.label}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: SAP, opacity: .6, fontFamily: "Inter,sans-serif", marginTop: 2, marginBottom: 8 }}>{o.sub}</div>
            <div style={{ fontSize: 10, color: "rgba(5,11,20,.4)", fontFamily: "Inter,sans-serif", lineHeight: 1.4 }}>{o.desc}</div>
          </div>
        );
      })}
    </div>
  );
}
