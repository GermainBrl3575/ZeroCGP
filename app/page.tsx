"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion, useAnimation, animate, useMotionValue, useTransform } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const NAVY = "#0A1628";
const NAVY_MID = "#1E3A6E";
const MSCI_GROSS = 0.08;
const ETF_FEES = 0.002;

function buildTrajectory(capital: number, years: number, annualFees: number) {
  const netRate = MSCI_GROSS - annualFees;
  return Array.from({ length: years + 1 }, (_, y) => ({
    an: y, value: Math.round(capital * Math.pow(1 + netRate, y)),
  }));
}
function feur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n);
}

interface TTP { value:number; name:string; color:string }
function CustomTooltip({ active, payload, label }: { active?:boolean; payload?:TTP[]; label?:number }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"rgba(10,22,40,0.92)", backdropFilter:"blur(16px)", borderRadius:10, padding:"10px 14px", border:"1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ color:"rgba(255,255,255,0.4)", fontSize:10, marginBottom:6, letterSpacing:".1em" }}>AN {label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color:"white", fontSize:13, fontWeight:600, marginBottom:3 }}>
          <span style={{ color:p.color, marginRight:6 }}>●</span>{p.name} : <span style={{ color:p.color }}>{feur(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div style={{ color:"rgba(255,255,255,0.3)", fontSize:10, marginTop:6, borderTop:"1px solid rgba(255,255,255,0.1)", paddingTop:6 }}>
          Manque à gagner : <span style={{ color:"#F87171" }}>{feur(payload[0].value - payload[1].value)}</span>
        </div>
      )}
    </div>
  );
}

// ── Points de la courbe boursière (normalisés 0-100) ─────────
// Simulant une vraie trajectoire haussière avec pics et creux marqués
const RAW_PTS: [number, number][] = [
  [0,78],[2,74],[4,76],[6,68],[8,72],[10,62],[12,66],[14,56],
  [16,60],[18,50],[20,55],[22,45],[24,50],[26,40],[28,46],
  [30,36],[32,42],[34,30],[36,36],[38,25],[40,32],[42,20],
  [44,28],[46,16],[48,24],[50,12],[52,20],[54,8],[56,16],
  [58,5],[60,13],[62,2],[64,10],[66,1],[68,8],[70,0],
  [72,6],[74,2],[76,4],[78,1],[80,3],[82,0.5],[84,2],
  [86,1],[88,0.5],[90,1.2],[92,0.8],[94,1.5],[96,0.6],[100,0],
];

// Construction du path SVG avec cubic bezier pour courbe organique mais précise
function buildLinePath(pts: [number,number][], W: number, H: number): string {
  const px = (x: number) => (x / 100) * W;
  const py = (y: number) => 24 + (y / 100) * (H - 32);
  let d = `M ${px(pts[0][0])} ${py(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cpx1 = px(x0 + (x1 - x0) * 0.4);
    const cpy1 = py(y0 + (y1 - y0) * 0.1);
    const cpx2 = px(x0 + (x1 - x0) * 0.6);
    const cpy2 = py(y0 + (y1 - y0) * 0.9);
    d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${px(x1)} ${py(y1)}`;
  }
  return d;
}

function buildAreaPath(pts: [number,number][], W: number, H: number): string {
  const line = buildLinePath(pts, W, H);
  const lastX = (pts[pts.length - 1][0] / 100) * W;
  const firstX = (pts[0][0] / 100) * W;
  return `${line} L ${lastX} ${H} L ${firstX} ${H} Z`;
}

// Calculer position XY du dernier point
function getLastPt(W: number, H: number): [number, number] {
  const last = RAW_PTS[RAW_PTS.length - 1];
  return [(last[0] / 100) * W, 24 + (last[1] / 100) * (H - 32)];
}

// ── Composant courbe edge-to-edge ────────────────────────────
function HeroCurve({ height = 340 }: { height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [W, setW] = useState(1400);
  const pathRef = useRef<SVGPathElement>(null);
  const [dotPos, setDotPos] = useState<[number,number]>([0, 0]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function measure() {
      setW(window.innerWidth);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!W) return;
    const [lx, ly] = getLastPt(W, height);
    setDotPos([lx, ly]);
    setReady(true);
  }, [W, height]);

  const H = height;
  const linePath = buildLinePath(RAW_PTS, W, H);
  const areaPath = buildAreaPath(RAW_PTS, W, H);
  const [dotX, dotY] = dotPos;

  // Animation du path via pathLength
  const lineVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1, opacity: 1,
      transition: { pathLength: { duration: 5, ease: [0.43, 0.13, 0.23, 0.96] }, opacity: { duration: 0.5 } }
    }
  };
  const areaVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { delay: 1.2, duration: 3.5 } }
  };

  if (!ready) return null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      style={{ display:"block", overflow:"visible" }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NAVY_MID} stopOpacity="0.10"/>
          <stop offset="55%" stopColor={NAVY_MID} stopOpacity="0.03"/>
          <stop offset="100%" stopColor={NAVY_MID} stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4A7FBF" stopOpacity="0.3"/>
          <stop offset="40%" stopColor="#2A5FA0" stopOpacity="0.75"/>
          <stop offset="100%" stopColor={NAVY} stopOpacity="1"/>
        </linearGradient>
        <filter id="lineGlow" x="-5%" y="-50%" width="110%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      {/* Area fill — très subtil, opacité 0.05 effective */}
      <motion.path
        d={areaPath}
        fill="url(#areaGrad)"
        variants={areaVariants}
        initial="hidden"
        animate="visible"
      />

      {/* Ligne principale */}
      <motion.path
        ref={pathRef}
        d={linePath}
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter="url(#lineGlow)"
        variants={lineVariants}
        initial="hidden"
        animate="visible"
      />

      {/* Glowy dot à l'extrémité */}
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 4.8, duration: 0.6, type: "spring", stiffness: 280, damping: 22 }}
        style={{ transformOrigin: `${dotX}px ${dotY}px` }}
      >
        {/* Halo lointain */}
        <circle cx={dotX} cy={dotY} r={18} fill={NAVY} opacity="0.06"/>
        <circle cx={dotX} cy={dotY} r={10} fill={NAVY} opacity="0.10"/>
        {/* Point */}
        <circle cx={dotX} cy={dotY} r={5} fill="#4A7FBF" filter="url(#dotGlow)"/>
        <circle cx={dotX} cy={dotY} r={3} fill="white" opacity="0.95"/>

        {/* Badge +242% ancré au dot */}
        <motion.g
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 5.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <rect x={dotX - 38} y={dotY - 38} width={76} height={24} rx={6}
            fill={NAVY} fillOpacity="0.88" stroke="rgba(74,127,191,0.4)" strokeWidth="0.5"/>
          <text x={dotX} y={dotY - 21} textAnchor="middle"
            style={{ fontSize:11, fontWeight:700, fill:"#4ADE80", fontFamily:"Inter,sans-serif", letterSpacing:"0.06em" }}>
            +242%
          </text>
        </motion.g>
      </motion.g>
    </svg>
  );
}

// ── Noise grain overlay ──────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500&display=swap');

@keyframes grain {
  0%,100%{transform:translate(0,0)}10%{transform:translate(-3%,-4%)}20%{transform:translate(-5%,3%)}
  30%{transform:translate(4%,-5%)}40%{transform:translate(-2%,6%)}50%{transform:translate(-4%,2%)}
  60%{transform:translate(5%,-2%)}70%{transform:translate(2%,5%)}80%{transform:translate(-5%,-3%)}
  90%{transform:translate(3%,4%)}
}
@keyframes shine {
  0%   { transform: translateX(-100%) skewX(-15deg); }
  40%,100% { transform: translateX(200%) skewX(-15deg); }
}

.hero-grain::after {
  content:"";
  position:absolute;inset:-100%;width:300%;height:300%;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity:0.028;
  pointer-events:none;
  animation:grain 0.9s steps(2) infinite;
  z-index:2;
}

.btn-cta {
  position:relative;
  overflow:hidden;
  cursor:pointer;
}
.btn-cta::after {
  content:"";
  position:absolute;
  top:0;left:0;
  width:40%;height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent);
  transform:translateX(-100%) skewX(-15deg);
  animation:shine 4s ease-in-out infinite;
}

input[type=range] {
  -webkit-appearance:none;
  height:1.5px;
  background:rgba(10,22,40,0.12);
  outline:none;
  cursor:pointer;
  border-radius:1px;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance:none;
  width:14px;height:14px;
  border-radius:50%;
  background:#0A1628;
  border:2.5px solid white;
  box-shadow:0 1px 4px rgba(0,0,0,0.18);
}
`;

// ── Landing ──────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [capital, setCapital] = useState(150000);
  const [years, setYears] = useState(15);
  const [cgpFees, setCgpFees] = useState(2.5);
  const [heroH, setHeroH] = useState(340);

  useEffect(() => {
    function resize() { setHeroH(Math.round(window.innerHeight * 0.48)); }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const handle = () => setActiveTab(Math.round(c.scrollTop / window.innerHeight));
    c.addEventListener("scroll", handle, { passive:true });
    return () => c.removeEventListener("scroll", handle);
  }, []);

  function scrollTo(idx: number) {
    const c = containerRef.current;
    if (!c) return;
    setActiveTab(idx);
    c.scrollTo({ top: idx * window.innerHeight, behavior:"smooth" });
  }

  const cgpTraj = buildTrajectory(capital, years, cgpFees / 100);
  const etfTraj = buildTrajectory(capital, years, ETF_FEES);
  const manque  = etfTraj[years].value - cgpTraj[years].value;
  const chartData = Array.from({ length: years + 1 }, (_, i) => ({
    an: i,
    "ETF MSCI World (Zero CGP)": etfTraj[i].value,
    "Banque / CGP": cgpTraj[i].value,
  }));

  // Stagger variants — déclenchés APRÈS la courbe
  const wrapV = { hidden:{}, visible:{ transition:{ staggerChildren:0.18, delayChildren:4.4 } } };
  const itemV = {
    hidden:{ opacity:0, y:20 },
    visible:{ opacity:1, y:0, transition:{ duration:0.85, ease:[0.22,1,0.36,1] } }
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div
        ref={containerRef}
        style={{ height:"100vh", overflowY:"scroll", scrollSnapType:"y mandatory" }}
      >

        {/* ══ HERO ══════════════════════════════════════════════ */}
        <section
          className="hero-grain"
          style={{
            height:"100vh", scrollSnapAlign:"start",
            background:"radial-gradient(ellipse 80% 60% at 50% 40%, #F4F6FA 0%, #FBFBFD 55%, #F8F7F5 100%)",
            display:"flex", flexDirection:"column",
            position:"relative", overflow:"hidden",
          }}
        >

          {/* Nav */}
          <nav style={{
            position:"absolute", top:0, left:0, right:0,
            zIndex:10, display:"flex", alignItems:"center",
            justifyContent:"space-between", padding:"26px 52px",
          }}>
            <span style={{
              fontFamily:"'Cormorant Garant',serif",
              fontSize:13, fontWeight:400, letterSpacing:".34em",
              color:NAVY, textTransform:"uppercase",
            }}>Zero CGP</span>

            <div style={{ display:"flex", gap:2 }}>
              {["Accueil","Comment ça fonctionne","Simulation"].map((label, i) => (
                <button key={i} onClick={() => scrollTo(i)} style={{
                  background:"none", border:"none", cursor:"pointer",
                  fontFamily:"'Inter',sans-serif",
                  fontSize:10, fontWeight:500, letterSpacing:".12em",
                  color: activeTab===i ? NAVY : "rgba(10,22,40,0.38)",
                  padding:"8px 18px", borderRadius:6,
                  transition:"color .2s", textTransform:"uppercase",
                }}>{label}</button>
              ))}
            </div>

            <button
              onClick={() => router.push("/auth/login")}
              style={{
                background:"none",
                border:"1px solid rgba(10,22,40,0.15)",
                fontFamily:"'Inter',sans-serif",
                fontSize:10, fontWeight:500, letterSpacing:".12em",
                color:NAVY, padding:"9px 22px", borderRadius:8,
                cursor:"pointer", textTransform:"uppercase",
                transition:"border-color .2s, background .2s",
              }}
            >Connexion</button>
          </nav>

          {/* ── Courbe EDGE-TO-EDGE ─────────────────────────── */}
          {/* z-index:3 = derrière le titre (z-index:4) mais au-dessus du fond */}
          <div style={{
            position:"absolute",
            bottom:0, left:0, right:0,
            width:"100vw",
            height: heroH,
            zIndex: 3,
            pointerEvents:"none",
          }}>
            <HeroCurve height={heroH} />
          </div>

          {/* ── Contenu centré ──────────────────────────────── */}
          <div style={{
            flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            textAlign:"center",
            padding:"80px 24px 0",
            position:"relative",
            zIndex: 5,   // devant tout
          }}>

            {/* Badge */}
            <motion.div
              initial={{ opacity:0, y:-10 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:0.4, duration:0.6 }}
              style={{
                display:"inline-flex", alignItems:"center", gap:7,
                background:"rgba(10,22,40,0.04)",
                border:"0.5px solid rgba(10,22,40,0.1)",
                borderRadius:100, padding:"5px 16px",
                marginBottom:30,
              }}
            >
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#16A34A", flexShrink:0 }}/>
              <span style={{
                fontFamily:"'Inter',sans-serif",
                fontSize:10, fontWeight:500, letterSpacing:".14em",
                color:"rgba(10,22,40,0.5)", textTransform:"uppercase",
              }}>Alternative aux CGP traditionnels</span>
            </motion.div>

            {/* Titre — z-index:4 pour passer devant la courbe */}
            <motion.div
              variants={wrapV}
              initial="hidden"
              animate="visible"
              style={{ position:"relative", zIndex:4 }}
            >
              <motion.h1
                variants={itemV}
                style={{
                  fontFamily:"'Cormorant Garant',serif",
                  fontSize:"clamp(48px,6.8vw,92px)",
                  fontWeight:300, fontStyle:"italic",
                  letterSpacing:"-.025em",
                  lineHeight:1.0,
                  color:NAVY, margin:"0 0 8px",
                  maxWidth:780,
                }}
              >
                Investissez comme
              </motion.h1>

              <motion.h1
                variants={itemV}
                style={{
                  fontFamily:"'Cormorant Garant',serif",
                  fontSize:"clamp(48px,6.8vw,92px)",
                  fontWeight:300,
                  letterSpacing:"-.025em",
                  lineHeight:1.0,
                  color:NAVY_MID, margin:"0 0 28px",
                  maxWidth:780,
                }}
              >
                une institution.
              </motion.h1>

              {/* Sous-titre */}
              <motion.p
                variants={itemV}
                style={{
                  fontFamily:"'Inter',sans-serif",
                  fontSize:14, fontWeight:300, letterSpacing:".01em",
                  color:"rgba(10,22,40,0.48)", lineHeight:1.75,
                  maxWidth:440, margin:"0 auto 36px",
                }}
              >
                L'algorithme de Markowitz,<br/>
                réservé aux family offices, accessible gratuitement.
              </motion.p>

              {/* CTA */}
              <motion.div
                variants={itemV}
                style={{ display:"flex", gap:12, justifyContent:"center", alignItems:"center" }}
              >
                <motion.button
                  className="btn-cta"
                  whileHover={{ scale:1.04, boxShadow:"0 6px 28px rgba(10,22,40,0.14)" }}
                  whileTap={{ scale:0.97 }}
                  onClick={() => router.push("/auth/register")}
                  style={{
                    background:"rgba(10,22,40,0.92)",
                    backdropFilter:"blur(12px)",
                    WebkitBackdropFilter:"blur(12px)",
                    color:"white", border:"1px solid rgba(255,255,255,0.08)",
                    fontFamily:"'Inter',sans-serif",
                    fontSize:10, fontWeight:500, letterSpacing:".18em",
                    padding:"15px 38px", borderRadius:8,
                    boxShadow:"0 2px 12px rgba(10,22,40,0.10)",
                    textTransform:"uppercase",
                  }}
                >
                  Commencer gratuitement
                </motion.button>

                <motion.button
                  whileHover={{ x: 3 }}
                  onClick={() => scrollTo(1)}
                  style={{
                    background:"none", border:"none",
                    fontFamily:"'Inter',sans-serif",
                    fontSize:10, fontWeight:400, letterSpacing:".12em",
                    color:"rgba(10,22,40,0.38)", cursor:"pointer",
                    textTransform:"uppercase", display:"flex",
                    alignItems:"center", gap:8,
                  }}
                >
                  Découvrir
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v10M6 11L2 7M6 11L10 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.button>
              </motion.div>

              {/* Métriques */}
              <motion.div
                variants={itemV}
                style={{ display:"flex", gap:44, justifyContent:"center", marginTop:52 }}
              >
                {[
                  { v:"490+", l:"Actifs analysés" },
                  { v:"0 €",  l:"Frais de conseil" },
                  { v:"≈8%",  l:"Rendement MSCI 30A" },
                ].map(({ v, l }) => (
                  <div key={l} style={{ textAlign:"center" }}>
                    <div style={{
                      fontFamily:"'Cormorant Garant',serif",
                      fontSize:30, fontWeight:400, letterSpacing:"-.02em",
                      color:NAVY, lineHeight:1,
                    }}>{v}</div>
                    <div style={{
                      fontFamily:"'Inter',sans-serif",
                      fontSize:9, fontWeight:500, letterSpacing:".16em",
                      color:"rgba(10,22,40,0.35)", marginTop:6, textTransform:"uppercase",
                    }}>{l}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ delay:5.8, duration:1 }}
            style={{
              position:"absolute", bottom:24, left:"50%", transform:"translateX(-50%)",
              zIndex:6, display:"flex", flexDirection:"column", alignItems:"center", gap:5,
            }}
          >
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:8, letterSpacing:".18em", color:"rgba(10,22,40,0.28)", textTransform:"uppercase" }}>Défiler</span>
            <motion.div
              animate={{ y:[0,6,0] }}
              transition={{ repeat:Infinity, duration:1.8, ease:"easeInOut" }}
              style={{ width:"0.5px", height:22, background:"linear-gradient(to bottom, rgba(10,22,40,0.28), transparent)" }}
            />
          </motion.div>
        </section>

        {/* ══ SECTION 2 — COMMENT ÇA FONCTIONNE ════════════════ */}
        <section style={{
          height:"100vh", scrollSnapAlign:"start",
          background:NAVY,
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          padding:"0 52px",
        }}>
          <motion.div
            initial={{ opacity:0, y:30 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:0.9, ease:[0.22,1,0.36,1] }}
            style={{ textAlign:"center", maxWidth:680 }}
          >
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500, letterSpacing:".22em", color:"rgba(255,255,255,0.22)", marginBottom:18, textTransform:"uppercase" }}>
              Comment ça fonctionne
            </div>
            <h2 style={{
              fontFamily:"'Cormorant Garant',serif",
              fontSize:"clamp(34px,4.5vw,56px)",
              fontWeight:300, fontStyle:"italic",
              letterSpacing:"-.02em", color:"white",
              lineHeight:1.08, marginBottom:14,
            }}>
              7 questions.<br/>
              <span style={{ color:"rgba(255,255,255,0.38)", fontStyle:"normal" }}>Un portefeuille sur mesure.</span>
            </h2>
            <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:300, color:"rgba(255,255,255,0.38)", lineHeight:1.8 }}>
              Notre algorithme filtre 490+ actifs, télécharge 5 ans de données Yahoo Finance<br/>et calcule la frontière efficiente de Markowitz en 10 000 simulations.
            </p>
          </motion.div>

          <div style={{ display:"flex", gap:0, marginTop:48, width:"100%", maxWidth:820 }}>
            {[
              { n:"01", t:"Votre profil", d:"Horizon, risque, ESG, géographie" },
              { n:"02", t:"Filtrage", d:"490+ actifs → 12–40 pertinents" },
              { n:"03", t:"Markowitz", d:"10 000 simulations Monte Carlo" },
              { n:"04", t:"Résultats", d:"3 portefeuilles optimaux comparés" },
            ].map(({ n, t, d }, i) => (
              <motion.div
                key={n}
                initial={{ opacity:0, y:20 }}
                whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }}
                transition={{ delay:i*0.1, duration:0.6 }}
                style={{
                  flex:1, padding:"24px 22px",
                  borderLeft:"0.5px solid rgba(255,255,255,0.07)",
                  background: i===0?"rgba(255,255,255,0.03)":"transparent",
                }}
              >
                <div style={{ fontFamily:"'Cormorant Garant',serif", fontSize:34, fontWeight:300, color:"rgba(255,255,255,0.1)", marginBottom:14 }}>{n}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:500, letterSpacing:".1em", color:"rgba(255,255,255,0.75)", marginBottom:7, textTransform:"uppercase" }}>{t}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:300, color:"rgba(255,255,255,0.32)", lineHeight:1.65 }}>{d}</div>
              </motion.div>
            ))}
          </div>

          <motion.button
            initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }}
            transition={{ delay:0.5 }} whileHover={{ scale:1.03 }}
            onClick={() => router.push("/auth/register")}
            style={{
              marginTop:40, background:"white", color:NAVY,
              border:"none", borderRadius:8,
              fontFamily:"'Inter',sans-serif",
              fontSize:10, fontWeight:500, letterSpacing:".14em",
              padding:"14px 38px", cursor:"pointer", textTransform:"uppercase",
            }}
          >
            Optimiser mon portefeuille →
          </motion.button>
        </section>

        {/* ══ SECTION 3 — SIMULATION ════════════════════════════ */}
        <section style={{
          height:"100vh", scrollSnapAlign:"start",
          background:"#F5F4F1",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          padding:"0 52px",
        }}>
          <motion.div
            initial={{ opacity:0, y:24 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:0.8 }}
            style={{ width:"100%", maxWidth:860 }}
          >
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500, letterSpacing:".22em", color:"#8A9BB0", marginBottom:10, textTransform:"uppercase" }}>Simulation</div>
              <h2 style={{ fontFamily:"'Cormorant Garant',serif", fontSize:"clamp(28px,3.8vw,48px)", fontWeight:300, letterSpacing:"-.02em", color:NAVY, marginBottom:6 }}>
                Combien perdez-vous chaque année ?
              </h2>
              <p style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:"#8A9BB0", fontWeight:300 }}>
                Comparez les frais de votre CGP actuel vs une stratégie ETF passive.
              </p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:28, marginBottom:24 }}>
              {[
                { label:"Capital", val:feur(capital), min:10000, max:1000000, step:10000, v:capital, set:(n:number)=>setCapital(n) },
                { label:"Durée", val:`${years} ans`, min:5, max:40, step:1, v:years, set:(n:number)=>setYears(n) },
                { label:"Frais CGP (%/an)", val:`${cgpFees.toFixed(1)}%`, min:0.5, max:4, step:0.1, v:cgpFees, set:(n:number)=>setCgpFees(n) },
              ].map(({ label, val, min, max, step, v, set }) => (
                <div key={label}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500, letterSpacing:".12em", color:"#8A9BB0", textTransform:"uppercase" }}>{label}</span>
                    <span style={{ fontFamily:"'Cormorant Garant',serif", fontSize:19, fontWeight:400, color:NAVY }}>{val}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={v}
                    onChange={(e) => set(Number(e.target.value))} style={{ width:"100%" }}/>
                </div>
              ))}
            </div>

            <div style={{ background:"white", borderRadius:12, padding:"22px", boxShadow:"0 1px 16px rgba(10,22,40,0.04)" }}>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={chartData}>
                  <XAxis dataKey="an" tick={{ fontSize:10, fill:"#aaa" }} tickLine={false} axisLine={false} tickFormatter={(v:number)=>`An ${v}`} interval={Math.floor(years/4)}/>
                  <YAxis tick={{ fontSize:10, fill:"#aaa" }} tickLine={false} axisLine={false} tickFormatter={(v:number)=>v>=1e6?`${(v/1e6).toFixed(1)}M€`:`${Math.round(v/1000)}k€`} width={54}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Line type="monotone" dataKey="ETF MSCI World (Zero CGP)" stroke="#16A34A" strokeWidth={2.5} dot={false} activeDot={{ r:4 }}/>
                  <Line type="monotone" dataKey="Banque / CGP" stroke="#DC2626" strokeWidth={2} dot={false} strokeDasharray="5 3" activeDot={{ r:4 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              marginTop:14, display:"flex", alignItems:"center", justifyContent:"space-between",
              background:NAVY, borderRadius:10, padding:"15px 24px",
            }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:300, color:"rgba(255,255,255,0.4)", letterSpacing:".04em" }}>
                Manque à gagner sur {years} ans
              </div>
              <div style={{ fontFamily:"'Cormorant Garant',serif", fontSize:28, fontWeight:300, color:"#F87171" }}>
                {feur(manque)}
              </div>
              <motion.button
                whileHover={{ scale:1.04 }}
                onClick={() => router.push("/auth/register")}
                style={{
                  background:"white", color:NAVY, border:"none",
                  fontFamily:"'Inter',sans-serif",
                  fontSize:10, fontWeight:500, letterSpacing:".14em",
                  padding:"10px 24px", borderRadius:8, cursor:"pointer", textTransform:"uppercase",
                }}
              >Récupérer {feur(manque)} →</motion.button>
            </div>
          </motion.div>
        </section>

      </div>
    </>
  );
}
