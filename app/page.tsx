"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const NAVY     = "#0A1628";
const NAVY_MID = "#1E3A6E";
const MSCI_GROSS = 0.08;
const ETF_FEES   = 0.002;

function buildTrajectory(capital: number, years: number, annualFees: number) {
  const netRate = MSCI_GROSS - annualFees;
  return Array.from({ length: years + 1 }, (_, y) => ({
    an: y, value: Math.round(capital * Math.pow(1 + netRate, y)),
  }));
}
function feur(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(n);
}

interface TTP { value: number; name: string; color: string }
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TTP[]; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(10,22,40,0.94)", backdropFilter: "blur(16px)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginBottom: 6, letterSpacing: ".1em" }}>AN {label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: "white", fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
          <span style={{ color: p.color, marginRight: 6 }}>●</span>{p.name} :&nbsp;<span style={{ color: p.color }}>{feur(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 6, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 6 }}>
          Écart : <span style={{ color: "#F87171" }}>{feur(payload[0].value - payload[1].value)}</span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GÉOMÉTRIE — Tendance haussière institutionnelle
// Grandes vagues amples, pente générale ascendante, épuré
// y=0 = sommet écran, y=100 = bas de la zone SVG
// ══════════════════════════════════════════════════════════════
const BULL_PTS: [number, number][] = [
  //  x%    y%    — commentaire
  [   0,   72 ],  // Départ modeste, mi-hauteur
  [   8,   62 ],  // Légère montée initiale
  [  16,   68 ],  // Petite hésitation (creux #1 — très doux)
  [  24,   50 ],  // Première grande hausse
  [  32,   56 ],  // Légère respiration (creux #2 — amplidude réduite)
  [  40,   38 ],  // Deuxième vague haussière ample
  [  48,   44 ],  // Micro-correction institutionnelle
  [  58,   22 ],  // Accélération — cassure vers le haut
  [  66,   28 ],  // Courte consolidation au sommet
  [  76,   10 ],  // Envolée finale — sprint
  [  86,   14 ],  // Légère stabilisation au sommet
  [  93,    4 ],  // Nouveau sommet
  [ 100,    0 ],  // Pointe finale — extrémité écran
];

// Path SVG avec cubic bézier — tracé fluide et organique
// Tension 0.4 pour des courbes amples sans zigzags
function buildCubicPath(pts: [number, number][], W: number, H: number, padY = 28): string {
  const px = (x: number) => (x / 100) * W;
  const py = (y: number) => padY + (y / 100) * (H - padY - 8);

  let d = `M ${px(pts[0][0]).toFixed(2)} ${py(pts[0][1]).toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    // Tension 0.38 — courbes souples mais pas trop rondes
    const t = 0.38;
    const cpx1 = px(x0 + (x1 - x0) * t);
    const cpy1 = py(y0);
    const cpx2 = px(x1 - (x1 - x0) * t);
    const cpy2 = py(y1);
    d += ` C ${cpx1.toFixed(2)} ${cpy1.toFixed(2)}, ${cpx2.toFixed(2)} ${cpy2.toFixed(2)}, ${px(x1).toFixed(2)} ${py(y1).toFixed(2)}`;
  }
  return d;
}

function buildAreaPath(pts: [number, number][], W: number, H: number): string {
  const line = buildCubicPath(pts, W, H);
  const lastX = ((pts[pts.length - 1][0]) / 100) * W;
  const firstX = ((pts[0][0]) / 100) * W;
  return `${line} L ${lastX.toFixed(2)} ${H} L ${firstX.toFixed(2)} ${H} Z`;
}

// Position XY du dernier point
function getEndPoint(W: number, H: number, padY = 28): [number, number] {
  const last = BULL_PTS[BULL_PTS.length - 1];
  return [
    (last[0] / 100) * W,
    padY + (last[1] / 100) * (H - padY - 8),
  ];
}

// ══════════════════════════════════════════════════════════════
// COMPOSANT COURBE
// ══════════════════════════════════════════════════════════════
function InstitutionalCurve({ H = 360 }: { H?: number }) {
  const [W, setW] = useState(1600);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    function measure() { setW(window.innerWidth); }
    measure();
    setMounted(true);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  if (!mounted) return null;

  const linePath = buildCubicPath(BULL_PTS, W, H);
  const areaPath = buildAreaPath(BULL_PTS, W, H);
  const [dotX, dotY] = getEndPoint(W, H);

  // Badge positionné à gauche du dot pour rester visible
  const badgeW = 80;
  const badgeH = 26;
  const badgeX = Math.max(8, dotX - badgeW - 18);
  const badgeY = dotY - badgeH - 12;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      style={{ display: "block", overflow: "visible" }}
      preserveAspectRatio="none"
    >
      <defs>
        {/* Dégradé area — opacité max 0.03 */}
        <linearGradient id="ig-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={NAVY_MID} stopOpacity="0.09" />
          <stop offset="70%"  stopColor={NAVY_MID} stopOpacity="0.02" />
          <stop offset="100%" stopColor={NAVY_MID} stopOpacity="0"    />
        </linearGradient>

        {/* Dégradé ligne — sobre au début, intense à la pointe */}
        <linearGradient id="ig-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={NAVY_MID} stopOpacity="0.22" />
          <stop offset="50%"  stopColor="#2A5FA0"  stopOpacity="0.65" />
          <stop offset="80%"  stopColor="#1D4ED8"  stopOpacity="0.88" />
          <stop offset="100%" stopColor="#3B82F6"  stopOpacity="1"    />
        </linearGradient>

        {/* Filtre lueur douce sur la ligne */}
        <filter id="ig-glow" x="-1%" y="-120%" width="102%" height="340%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="1"   result="b2" />
          <feMerge>
            <feMergeNode in="b1" />
            <feMergeNode in="b2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Filtre lueur dot */}
        <filter id="ig-dot" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b2" />
          <feMerge>
            <feMergeNode in="b1" />
            <feMergeNode in="b2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Area fill — quasi-invisible, volume subtil */}
      <motion.path
        d={areaPath}
        fill="url(#ig-area)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 2.5 }}
      />

      {/* Courbe principale — strokeLinejoin et strokeLinecap round */}
      <motion.path
        d={linePath}
        fill="none"
        stroke="url(#ig-line)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter="url(#ig-glow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 2.5, ease: [0.25, 1, 0.5, 1] },
          opacity:    { duration: 0.3 },
        }}
      />

      {/* Glowy dot — synchronisé fin de courbe */}
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          delay: 2.4,
          type: "spring",
          stiffness: 320,
          damping: 18,
        }}
        style={{ transformOrigin: `${dotX}px ${dotY}px` }}
      >
        <circle cx={dotX} cy={dotY} r={20} fill="#3B82F6" opacity="0.06" />
        <circle cx={dotX} cy={dotY} r={10} fill="#3B82F6" opacity="0.12" />
        <circle cx={dotX} cy={dotY} r={5}  fill="#60A5FA" filter="url(#ig-dot)" />
        <circle cx={dotX} cy={dotY} r={2.5} fill="white" opacity="0.96" />
      </motion.g>

      {/* Badge +242% — spring synchronisé, ancré à la pointe */}
      <motion.g
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          delay: 2.55,
          type: "spring",
          stiffness: 260,
          damping: 16,
        }}
        style={{ transformOrigin: `${badgeX + badgeW / 2}px ${badgeY + badgeH / 2}px` }}
      >
        {/* Fond du badge */}
        <rect
          x={badgeX} y={badgeY}
          width={badgeW} height={badgeH}
          rx={7}
          fill="rgba(10,22,40,0.84)"
          stroke="rgba(59,130,246,0.4)"
          strokeWidth="0.75"
        />
        {/* Petite ligne de connexion badge → dot */}
        <line
          x1={badgeX + badgeW} y1={badgeY + badgeH / 2}
          x2={dotX - 7}        y2={dotY}
          stroke="rgba(96,165,250,0.22)"
          strokeWidth="0.5"
          strokeDasharray="2 3"
        />
        <text
          x={badgeX + badgeW / 2} y={badgeY + badgeH - 8}
          textAnchor="middle"
          style={{
            fontSize: 12,
            fontWeight: 700,
            fill: "#4ADE80",
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.06em",
          }}
        >
          +242%
        </text>
      </motion.g>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
// CSS GLOBAL
// ══════════════════════════════════════════════════════════════
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500&display=swap');

@keyframes grain {
  0%,100%{transform:translate(0,0)}
  10%{transform:translate(-3%,-5%)} 20%{transform:translate(-5%,3%)}
  30%{transform:translate(4%,-5%)}  40%{transform:translate(-2%,6%)}
  50%{transform:translate(-4%,2%)}  60%{transform:translate(5%,-2%)}
  70%{transform:translate(2%,5%)}   80%{transform:translate(-5%,-3%)}
  90%{transform:translate(3%,4%)}
}
.hero-grain::after {
  content:"";position:absolute;inset:-100%;width:300%;height:300%;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity:0.026;pointer-events:none;
  animation:grain 0.9s steps(2) infinite;z-index:2;
}
@keyframes shine {
  0%   { transform:translateX(-100%) skewX(-16deg); }
  38%,100%{ transform:translateX(220%) skewX(-16deg); }
}
.btn-cta { position:relative;overflow:hidden;cursor:pointer; }
.btn-cta::after {
  content:"";position:absolute;top:0;left:0;
  width:35%;height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent);
  transform:translateX(-100%) skewX(-16deg);
  animation:shine 4s ease-in-out infinite;
}
input[type=range]{
  -webkit-appearance:none;height:1.5px;
  background:rgba(10,22,40,0.12);outline:none;cursor:pointer;border-radius:1px;
}
input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none;width:13px;height:13px;border-radius:50%;
  background:#0A1628;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.18);
}
`;

// ══════════════════════════════════════════════════════════════
// LANDING PAGE
// ══════════════════════════════════════════════════════════════
export default function LandingPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab]   = useState(0);
  const [capital,   setCapital]     = useState(150000);
  const [years,     setYears]       = useState(15);
  const [cgpFees,   setCgpFees]     = useState(2.5);
  const [heroH,     setHeroH]       = useState(360);

  useEffect(() => {
    function resize() { setHeroH(Math.round(window.innerHeight * 0.50)); }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const handle = () => setActiveTab(Math.round(c.scrollTop / window.innerHeight));
    c.addEventListener("scroll", handle, { passive: true });
    return () => c.removeEventListener("scroll", handle);
  }, []);

  function scrollTo(idx: number) {
    setActiveTab(idx);
    containerRef.current?.scrollTo({ top: idx * window.innerHeight, behavior: "smooth" });
  }

  const cgpTraj  = buildTrajectory(capital, years, cgpFees / 100);
  const etfTraj  = buildTrajectory(capital, years, ETF_FEES);
  const manque   = etfTraj[years].value - cgpTraj[years].value;
  const chartData = Array.from({ length: years + 1 }, (_, i) => ({
    an: i,
    "ETF MSCI World (Zero CGP)": etfTraj[i].value,
    "Banque / CGP":               cgpTraj[i].value,
  }));

  // Stagger déclenché après la courbe (delay 2.6s)
  const wrapV = {
    hidden:   {},
    visible:  { transition: { staggerChildren: 0.15, delayChildren: 2.6 } },
  };
  const itemV = {
    hidden:   { opacity: 0, y: 16 },
    visible:  { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div
        ref={containerRef}
        style={{ height: "100vh", overflowY: "scroll", scrollSnapType: "y mandatory" }}
      >

        {/* ═════════════════════ HERO ═══════════════════════════ */}
        <section
          className="hero-grain"
          style={{
            height: "100vh", scrollSnapAlign: "start",
            background: "radial-gradient(ellipse 72% 58% at 50% 36%, #F2F5FA 0%, #FBFBFD 50%, #F7F6F3 100%)",
            display: "flex", flexDirection: "column",
            position: "relative", overflow: "hidden",
          }}
        >
          {/* Nav */}
          <nav style={{
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "28px 52px",
          }}>
            <span style={{
              fontFamily: "'Cormorant Garant',serif",
              fontSize: 12, fontWeight: 400, letterSpacing: ".38em",
              color: NAVY, textTransform: "uppercase",
            }}>Zero CGP</span>

            <div style={{ display: "flex", gap: 2 }}>
              {["Accueil", "Comment ça fonctionne", "Simulation"].map((label, i) => (
                <button key={i} onClick={() => scrollTo(i)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Inter',sans-serif",
                  fontSize: 9, fontWeight: 500, letterSpacing: ".13em",
                  color: activeTab === i ? NAVY : "rgba(10,22,40,0.32)",
                  padding: "8px 18px", borderRadius: 6,
                  transition: "color .2s", textTransform: "uppercase",
                }}>{label}</button>
              ))}
            </div>

            <button
              onClick={() => router.push("/auth/login")}
              style={{
                background: "none", border: "0.5px solid rgba(10,22,40,0.18)",
                fontFamily: "'Inter',sans-serif",
                fontSize: 9, fontWeight: 500, letterSpacing: ".13em",
                color: NAVY, padding: "9px 22px", borderRadius: 7,
                cursor: "pointer", textTransform: "uppercase",
              }}
            >Connexion</button>
          </nav>

          {/* Courbe edge-to-edge — z:3, derrière le titre z:4 */}
          <div style={{
            position: "absolute",
            bottom: 0, left: 0,
            width: "100vw",
            height: heroH,
            zIndex: 3,
            pointerEvents: "none",
          }}>
            <InstitutionalCurve H={heroH} />
          </div>

          {/* Contenu centré — z:5 */}
          <div style={{
            flex: 1,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            textAlign: "center",
            padding: "80px 24px 0",
            position: "relative",
            zIndex: 5,
          }}>

            {/* Badge catégorie */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "rgba(10,22,40,0.04)",
                border: "0.5px solid rgba(10,22,40,0.1)",
                borderRadius: 100, padding: "5px 16px", marginBottom: 26,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16A34A", flexShrink: 0 }} />
              <span style={{
                fontFamily: "'Inter',sans-serif",
                fontSize: 9, fontWeight: 500, letterSpacing: ".16em",
                color: "rgba(10,22,40,0.46)", textTransform: "uppercase",
              }}>Optimisation institutionnelle</span>
            </motion.div>

            {/* Titre — z:4, passe devant la courbe */}
            <motion.div
              variants={wrapV}
              initial="hidden"
              animate="visible"
              style={{ position: "relative", zIndex: 4 }}
            >
              <motion.h1
                variants={itemV}
                style={{
                  fontFamily: "'Cormorant Garant',serif",
                  fontSize: "clamp(46px,6.4vw,86px)",
                  fontWeight: 300, fontStyle: "italic",
                  letterSpacing: "-.028em", lineHeight: 1.01,
                  color: NAVY, opacity: 0.95,
                  margin: "0 0 4px", maxWidth: 800,
                }}
              >Investissez comme</motion.h1>

              <motion.h1
                variants={itemV}
                style={{
                  fontFamily: "'Cormorant Garant',serif",
                  fontSize: "clamp(46px,6.4vw,86px)",
                  fontWeight: 300,
                  letterSpacing: "-.028em", lineHeight: 1.01,
                  color: NAVY_MID, opacity: 0.95,
                  margin: "0 0 24px", maxWidth: 800,
                }}
              >une institution.</motion.h1>

              <motion.p
                variants={itemV}
                style={{
                  fontFamily: "'Inter',sans-serif",
                  fontSize: 13.5, fontWeight: 300, letterSpacing: ".01em",
                  color: "rgba(10,22,40,0.45)", lineHeight: 1.78,
                  maxWidth: 420, margin: "0 auto 34px",
                }}
              >
                L'algorithme de Markowitz,<br />
                réservé aux family offices, accessible gratuitement.
              </motion.p>

              {/* CTA */}
              <motion.div
                variants={itemV}
                style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center" }}
              >
                <motion.button
                  className="btn-cta"
                  whileHover={{ scale: 1.04, boxShadow: "0 8px 30px rgba(10,22,40,0.15)" }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push("/auth/register")}
                  style={{
                    background: "rgba(10,22,40,0.92)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.07)",
                    fontFamily: "'Inter',sans-serif",
                    fontSize: 9, fontWeight: 500, letterSpacing: ".20em",
                    padding: "15px 40px", borderRadius: 8,
                    boxShadow: "0 2px 12px rgba(10,22,40,0.10)",
                    textTransform: "uppercase",
                  }}
                >
                  Commencer gratuitement
                </motion.button>

                <motion.button
                  whileHover={{ x: 3 }}
                  onClick={() => scrollTo(1)}
                  style={{
                    background: "none", border: "none",
                    fontFamily: "'Inter',sans-serif",
                    fontSize: 9, fontWeight: 400, letterSpacing: ".14em",
                    color: "rgba(10,22,40,0.30)", cursor: "pointer",
                    textTransform: "uppercase",
                    display: "flex", alignItems: "center", gap: 7,
                  }}
                >
                  Découvrir
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M5.5 1v9M5.5 10L2 7M5.5 10L9 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.button>
              </motion.div>

              {/* Métriques */}
              <motion.div
                variants={itemV}
                style={{ display: "flex", gap: 50, justifyContent: "center", marginTop: 48 }}
              >
                {[
                  { v: "490+", l: "Actifs analysés" },
                  { v: "0 €",  l: "Frais de conseil" },
                  { v: "≈8%",  l: "MSCI World 30 ans" },
                ].map(({ v, l }) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <div style={{
                      fontFamily: "'Cormorant Garant',serif",
                      fontSize: 29, fontWeight: 400, letterSpacing: "-.02em",
                      color: NAVY, lineHeight: 1, opacity: 0.88,
                    }}>{v}</div>
                    <div style={{
                      fontFamily: "'Inter',sans-serif",
                      fontSize: 8.5, fontWeight: 500, letterSpacing: ".18em",
                      color: "rgba(10,22,40,0.30)", marginTop: 6, textTransform: "uppercase",
                    }}>{l}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 4.2, duration: 1.2 }}
            style={{
              position: "absolute", bottom: 24, left: "50%",
              transform: "translateX(-50%)",
              zIndex: 6, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 5,
            }}
          >
            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 7.5, letterSpacing: ".2em", color: "rgba(10,22,40,0.22)", textTransform: "uppercase" }}>Défiler</span>
            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ repeat: Infinity, duration: 1.9, ease: "easeInOut" }}
              style={{ width: "0.5px", height: 22, background: "linear-gradient(to bottom, rgba(10,22,40,0.22), transparent)" }}
            />
          </motion.div>
        </section>

        {/* ═══════════════ SECTION 2 ════════════════════════════ */}
        <section style={{
          height: "100vh", scrollSnapAlign: "start",
          background: NAVY,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 52px",
        }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{ textAlign: "center", maxWidth: 680 }}
          >
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 8.5, fontWeight: 500, letterSpacing: ".24em", color: "rgba(255,255,255,0.2)", marginBottom: 18, textTransform: "uppercase" }}>
              Comment ça fonctionne
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garant',serif",
              fontSize: "clamp(34px,4.5vw,58px)",
              fontWeight: 300, fontStyle: "italic",
              color: "white", lineHeight: 1.05, marginBottom: 14,
            }}>
              7 questions.<br />
              <span style={{ color: "rgba(255,255,255,0.35)", fontStyle: "normal" }}>Un portefeuille sur mesure.</span>
            </h2>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 300, color: "rgba(255,255,255,0.35)", lineHeight: 1.82 }}>
              Notre algorithme filtre 490+ actifs, charge 5 ans de données Yahoo Finance<br />
              et calcule la frontière efficiente de Markowitz en 10 000 simulations.
            </p>
          </motion.div>

          <div style={{ display: "flex", marginTop: 48, width: "100%", maxWidth: 820 }}>
            {[
              { n: "01", t: "Votre profil",  d: "Horizon, risque, ESG, géographie" },
              { n: "02", t: "Filtrage",       d: "490+ actifs → 12–40 pertinents"  },
              { n: "03", t: "Markowitz",      d: "10 000 simulations Monte Carlo"   },
              { n: "04", t: "Résultats",      d: "3 portefeuilles optimaux"         },
            ].map(({ n, t, d }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.09, duration: 0.6 }}
                style={{
                  flex: 1, padding: "22px 20px",
                  borderLeft: "0.5px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontFamily: "'Cormorant Garant',serif", fontSize: 34, fontWeight: 300, color: "rgba(255,255,255,0.08)", marginBottom: 14 }}>{n}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: ".10em", color: "rgba(255,255,255,0.7)", marginBottom: 7, textTransform: "uppercase" }}>{t}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 300, color: "rgba(255,255,255,0.28)", lineHeight: 1.65 }}>{d}</div>
              </motion.div>
            ))}
          </div>

          <motion.button
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ delay: 0.4 }} whileHover={{ scale: 1.03 }}
            onClick={() => router.push("/auth/register")}
            style={{
              marginTop: 40, background: "white", color: NAVY, border: "none",
              borderRadius: 8, fontFamily: "'Inter',sans-serif",
              fontSize: 9, fontWeight: 500, letterSpacing: ".16em",
              padding: "14px 38px", cursor: "pointer", textTransform: "uppercase",
            }}
          >Optimiser mon portefeuille →</motion.button>
        </section>

        {/* ═══════════════ SECTION 3 ════════════════════════════ */}
        <section style={{
          height: "100vh", scrollSnapAlign: "start",
          background: "#F5F4F1",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 52px",
        }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            style={{ width: "100%", maxWidth: 860 }}
          >
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 8.5, fontWeight: 500, letterSpacing: ".22em", color: "#8A9BB0", marginBottom: 10, textTransform: "uppercase" }}>Simulation</div>
              <h2 style={{ fontFamily: "'Cormorant Garant',serif", fontSize: "clamp(28px,3.8vw,48px)", fontWeight: 300, letterSpacing: "-.02em", color: NAVY, marginBottom: 6 }}>
                Combien perdez-vous chaque année ?
              </h2>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#8A9BB0", fontWeight: 300 }}>
                Frais de gestion actuels vs stratégie ETF passive.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 28, marginBottom: 24 }}>
              {[
                { label: "Capital",      val: feur(capital),           min: 10000, max: 1000000, step: 10000, v: capital,  set: (n: number) => setCapital(n)  },
                { label: "Durée",        val: `${years} ans`,           min: 5,     max: 40,     step: 1,     v: years,    set: (n: number) => setYears(n)    },
                { label: "Frais (%/an)", val: `${cgpFees.toFixed(1)}%`, min: 0.5,   max: 4,      step: 0.1,   v: cgpFees,  set: (n: number) => setCgpFees(n)  },
              ].map(({ label, val, min, max, step, v, set }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 8.5, fontWeight: 500, letterSpacing: ".12em", color: "#8A9BB0", textTransform: "uppercase" }}>{label}</span>
                    <span style={{ fontFamily: "'Cormorant Garant',serif", fontSize: 19, fontWeight: 400, color: NAVY }}>{val}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={v}
                    onChange={(e) => set(Number(e.target.value))} style={{ width: "100%" }} />
                </div>
              ))}
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: "22px", boxShadow: "0 1px 16px rgba(10,22,40,0.04)" }}>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={chartData}>
                  <XAxis dataKey="an" tick={{ fontSize: 10, fill: "#aaa" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `An ${v}`} interval={Math.floor(years / 4)} />
                  <YAxis tick={{ fontSize: 10, fill: "#aaa" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M€` : `${Math.round(v / 1000)}k€`} width={54} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="ETF MSCI World (Zero CGP)" stroke="#16A34A" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Banque / CGP" stroke="#DC2626" strokeWidth={2} dot={false} strokeDasharray="5 3" activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              marginTop: 14, display: "flex", alignItems: "center",
              justifyContent: "space-between",
              background: NAVY, borderRadius: 10, padding: "15px 24px",
            }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 300, color: "rgba(255,255,255,0.38)", letterSpacing: ".04em" }}>
                Manque à gagner sur {years} ans
              </div>
              <div style={{ fontFamily: "'Cormorant Garant',serif", fontSize: 28, fontWeight: 300, color: "#F87171" }}>
                {feur(manque)}
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }}
                onClick={() => router.push("/auth/register")}
                style={{
                  background: "white", color: NAVY, border: "none",
                  fontFamily: "'Inter',sans-serif",
                  fontSize: 9, fontWeight: 500, letterSpacing: ".14em",
                  padding: "10px 24px", borderRadius: 8, cursor: "pointer", textTransform: "uppercase",
                }}
              >Récupérer {feur(manque)} →</motion.button>
            </div>
          </motion.div>
        </section>

      </div>
    </>
  );
}
