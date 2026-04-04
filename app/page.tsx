"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, useMotionValue, animate } from "framer-motion";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip,
} from "recharts";

const MSCI_GROSS = 0.08;
const ETF_FEES   = 0.002;

function buildTrajectory(capital: number, years: number, annualFees: number) {
  const netRate = MSCI_GROSS - annualFees;
  return Array.from({ length: years + 1 }, (_, y) => ({
    an: y,
    value: Math.round(capital * Math.pow(1 + netRate, y)),
  }));
}

function feur(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(n);
}

interface TooltipPayload { value: number; name: string; color: string; }
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: number; }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background:"rgba(10,22,40,0.92)", backdropFilter:"blur(12px)", borderRadius:10, padding:"10px 14px", border:"1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ color:"rgba(255,255,255,0.4)", fontSize:10, marginBottom:6, letterSpacing:".1em" }}>AN {label}</div>
      {payload.map(function(p) {
        return (
          <div key={p.name} style={{ color:"white", fontSize:13, fontWeight:600, marginBottom:3 }}>
            <span style={{ color:p.color, marginRight:6, fontSize:8 }}>●</span>
            {p.name} : <span style={{ color:p.color }}>{feur(p.value)}</span>
          </div>
        );
      })}
      {payload.length === 2 && (
        <div style={{ color:"rgba(255,255,255,0.3)", fontSize:10, marginTop:6, borderTop:"1px solid rgba(255,255,255,0.1)", paddingTop:6 }}>
          Manque à gagner : <span style={{ color:"#F87171" }}>{feur(payload[0].value - payload[1].value)}</span>
        </div>
      )}
    </div>
  );
}

// ── Courbe SVG boursière ──────────────────────────────────────
// Points normalisés [x%,y%] simulant une vraie courbe de marché
// avec pics et creux anguleux
const CURVE_PTS: [number,number][] = [
  [0,72],[3,68],[6,71],[9,62],[12,58],[15,64],[17,52],[20,48],
  [23,54],[26,44],[29,50],[31,38],[34,42],[37,32],[40,38],
  [42,28],[45,34],[48,22],[51,30],[54,18],[57,24],[59,14],
  [62,20],[65,10],[68,16],[71,8],[74,14],[77,6],[80,12],
  [83,4],[86,10],[89,6],[92,2],[96,5],[100,0],
];

function buildSVGPath(pts: [number,number][], W: number, H: number, pad=40): string {
  const toX = (px: number) => pad + (px/100)*(W-pad*2);
  const toY = (py: number) => pad + (py/100)*(H-pad*2);
  let d = `M ${toX(pts[0][0])} ${toY(pts[0][1])}`;
  for (let i=1; i<pts.length; i++) {
    const [x,y] = pts[i];
    const [px,py] = pts[i-1];
    const cpx = toX(px + (x-px)*0.5);
    const cpy = toY(py);
    const cpx2 = toX(x - (x-px)*0.1);
    const cpy2 = toY(y);
    d += ` C ${cpx} ${cpy}, ${cpx2} ${cpy2}, ${toX(x)} ${toY(y)}`;
  }
  return d;
}

function buildAreaPath(pts: [number,number][], W: number, H: number, pad=40): string {
  const line = buildSVGPath(pts, W, H, pad);
  const lastX = pad + (pts[pts.length-1][0]/100)*(W-pad*2);
  const firstX = pad + (pts[0][0]/100)*(W-pad*2);
  const bottom = H - pad + 16;
  return `${line} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`;
}

function HeroCurve() {
  const W = 900, H = 260, PAD = 40;
  const linePath = buildSVGPath(CURVE_PTS, W, H, PAD);
  const areaPath = buildAreaPath(CURVE_PTS, W, H, PAD);

  // Position du dernier point pour le glowy dot
  const lastPt = CURVE_PTS[CURVE_PTS.length-1];
  const dotX = PAD + (lastPt[0]/100)*(W-PAD*2);
  const dotY = PAD + (lastPt[1]/100)*(H-PAD*2);

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { pathLength: { duration: 2.2, ease: "easeInOut" }, opacity: { duration: 0.3 } }
    }
  };
  const areaVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { delay: 0.4, duration: 1.8 } }
  };
  const dotVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { delay: 2.2, duration: 0.4, type:"spring", stiffness:300 } }
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%" height="100%"
      style={{ overflow:"visible", filter:"drop-shadow(0 0 12px rgba(74,127,191,0.18))" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E3A6E" stopOpacity="0.18"/>
          <stop offset="60%" stopColor="#1E3A6E" stopOpacity="0.05"/>
          <stop offset="100%" stopColor="#1E3A6E" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4A7FBF" stopOpacity="0.4"/>
          <stop offset="50%" stopColor="#2A5FA0" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#1E3A6E" stopOpacity="1"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="dotGlow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        {/* Grille de fond subtile */}
        <pattern id="grid" width="60" height="40" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 40" fill="none" stroke="rgba(10,22,40,0.04)" strokeWidth="1"/>
        </pattern>
      </defs>

      {/* Grille */}
      <rect width={W} height={H} fill="url(#grid)" opacity="0.5"/>

      {/* Axe Y labels */}
      {[0,25,50,75,100].map(y => {
        const yPos = PAD + (y/100)*(H-PAD*2);
        return (
          <g key={y}>
            <line x1={PAD-8} y1={yPos} x2={W-PAD+8} y2={yPos}
              stroke="rgba(10,22,40,0.05)" strokeWidth="1" strokeDasharray="3 4"/>
          </g>
        );
      })}

      {/* Area fill */}
      <motion.path
        d={areaPath}
        fill="url(#areaGrad)"
        variants={areaVariants}
        initial="hidden"
        animate="visible"
      />

      {/* Ligne principale */}
      <motion.path
        d={linePath}
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
        variants={pathVariants}
        initial="hidden"
        animate="visible"
      />

      {/* Glowy dot à l'extrémité */}
      <motion.g variants={dotVariants} initial="hidden" animate="visible">
        {/* Halo externe */}
        <circle cx={dotX} cy={dotY} r="10" fill="#1E3A6E" opacity="0.12"/>
        <circle cx={dotX} cy={dotY} r="6"  fill="#1E3A6E" opacity="0.20"/>
        {/* Point principal */}
        <circle cx={dotX} cy={dotY} r="4"  fill="#4A7FBF" filter="url(#dotGlow)"/>
        <circle cx={dotX} cy={dotY} r="2.5" fill="white" opacity="0.9"/>
      </motion.g>

      {/* Label performance */}
      <motion.g
        initial={{ opacity:0, y:8 }}
        animate={{ opacity:1, y:0 }}
        transition={{ delay:2.4, duration:0.5 }}
      >
        <rect x={dotX-34} y={dotY-32} width={68} height={22} rx="6"
          fill="rgba(10,22,40,0.85)" stroke="rgba(74,127,191,0.3)" strokeWidth="1"/>
        <text x={dotX} y={dotY-17} textAnchor="middle"
          style={{ fontSize:11, fontWeight:700, fill:"#4ADE80", fontFamily:"Inter,sans-serif", letterSpacing:"0.04em" }}>
          +242%
        </text>
      </motion.g>
    </svg>
  );
}

// ── Effet de grain CSS (noise texture) ───────────────────────
const GRAIN_CSS = `
  @keyframes grain {
    0%,100%{transform:translate(0,0)}
    10%{transform:translate(-2%,-3%)}
    20%{transform:translate(-4%,2%)}
    30%{transform:translate(3%,-4%)}
    40%{transform:translate(-1%,5%)}
    50%{transform:translate(-3%,2%)}
    60%{transform:translate(4%,-1%)}
    70%{transform:translate(2%,4%)}
    80%{transform:translate(-4%,-2%)}
    90%{transform:translate(3%,3%)}
  }
  .grain-overlay::before {
    content:"";
    position:fixed;
    inset:-200%;
    width:400%;height:400%;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    opacity:0.022;
    animation:grain 0.8s steps(2) infinite;
    pointer-events:none;
    z-index:1;
  }
  @keyframes shine {
    0%   { left:-80%; }
    40%,100% { left:130%; }
  }
  .btn-shine {
    position:relative;
    overflow:hidden;
  }
  .btn-shine::after {
    content:"";
    position:absolute;
    top:0;left:-80%;
    width:50%;height:100%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent);
    transform:skewX(-15deg);
    animation:shine 3.5s ease-in-out infinite;
  }
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400;600&family=Inter:wght@300;400;500;600&display=swap');
`;

// ── Landing page principale ───────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [capital, setCapital] = useState(150000);
  const [years, setYears] = useState(15);
  const [cgpFees, setCgpFees] = useState(2.5);

  const cgpTraj  = buildTrajectory(capital, years, cgpFees / 100);
  const etfTraj  = buildTrajectory(capital, years, ETF_FEES);
  const cgpFinal = cgpTraj[years].value;
  const etfFinal = etfTraj[years].value;
  const manque   = etfFinal - cgpFinal;

  const chartData = Array.from({ length: years + 1 }, function(_, i) {
    return {
      an: i,
      "ETF MSCI World (Zero CGP)": etfTraj[i].value,
      "Banque / CGP": cgpTraj[i].value,
    };
  });

  function scrollTo(idx: number) {
    const c = containerRef.current;
    if (!c) return;
    setActiveTab(idx);
    c.scrollTo({ top: idx * window.innerHeight, behavior: "smooth" });
  }

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    function handle() {
      const i = Math.round(c!.scrollTop / window.innerHeight);
      setActiveTab(i);
    }
    c.addEventListener("scroll", handle, { passive: true });
    return () => c.removeEventListener("scroll", handle);
  }, []);

  // Variants stagger
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15, delayChildren: 1.8 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 22 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22,1,0.36,1] } }
  };

  return (
    <>
      <style>{GRAIN_CSS}</style>
      {/* Container snap scroll */}
      <div
        ref={containerRef}
        style={{ height:"100vh", overflowY:"scroll", scrollSnapType:"y mandatory", scrollBehavior:"smooth" }}
      >

        {/* ══ SECTION 1 — HERO ══════════════════════════════════ */}
        <section className="grain-overlay" style={{
          height:"100vh", scrollSnapAlign:"start",
          background:"#FBFBFD",
          display:"flex", flexDirection:"column",
          position:"relative", overflow:"hidden",
        }}>

          {/* Nav */}
          <nav style={{
            position:"absolute", top:0, left:0, right:0, zIndex:10,
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"28px 48px",
          }}>
            <span style={{
              fontFamily:"'Cormorant Garant',serif",
              fontSize:14, fontWeight:400, letterSpacing:".32em",
              color:"#0A1628", textTransform:"uppercase",
            }}>Zero CGP</span>

            <div style={{ display:"flex", gap:4 }}>
              {["Accueil","Comment ça fonctionne","Simulation"].map((label, i) => (
                <button key={i} onClick={() => scrollTo(i)} style={{
                  background:"none", border:"none", cursor:"pointer",
                  fontFamily:"'Inter',sans-serif",
                  fontSize:11, fontWeight:500, letterSpacing:".10em",
                  color: activeTab===i ? "#0A1628" : "#8A9BB0",
                  padding:"8px 16px", borderRadius:6,
                  transition:"color .2s",
                  textTransform:"uppercase",
                }}>
                  {label}
                </button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale:1.03 }}
              whileTap={{ scale:0.98 }}
              onClick={() => router.push("/auth/login")}
              style={{
                background:"none", border:"1px solid rgba(10,22,40,0.18)",
                fontFamily:"'Inter',sans-serif",
                fontSize:11, fontWeight:500, letterSpacing:".12em",
                color:"#0A1628", padding:"9px 22px", borderRadius:8,
                cursor:"pointer", textTransform:"uppercase",
              }}
            >
              Connexion
            </motion.button>
          </nav>

          {/* Courbe en arrière-plan — pleine largeur, bas de l'écran */}
          <div style={{
            position:"absolute", bottom:0, left:0, right:0,
            height:"62%", zIndex:1,
            opacity:0.9,
          }}>
            <HeroCurve />
          </div>

          {/* Contenu Hero */}
          <div style={{
            flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            textAlign:"center", position:"relative", zIndex:2,
            padding:"0 24px",
            paddingTop:80,
          }}>

            {/* Badge */}
            <motion.div
              initial={{ opacity:0, y:-12 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:0.3, duration:0.6 }}
              style={{
                display:"inline-flex", alignItems:"center", gap:8,
                background:"rgba(10,22,40,0.04)",
                border:"1px solid rgba(10,22,40,0.08)",
                borderRadius:100, padding:"5px 16px",
                marginBottom:28,
              }}
            >
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#16A34A", display:"inline-block" }}/>
              <span style={{
                fontFamily:"'Inter',sans-serif",
                fontSize:10, fontWeight:500, letterSpacing:".14em",
                color:"#3D4F63", textTransform:"uppercase",
              }}>Alternative aux CGP traditionnels</span>
            </motion.div>

            {/* Titre principal — stagger après la courbe */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.h1
                variants={itemVariants}
                style={{
                  fontFamily:"'Cormorant Garant',serif",
                  fontSize:"clamp(46px,6.5vw,88px)",
                  fontWeight:300,
                  letterSpacing:"-.03em",
                  lineHeight:1.02,
                  color:"#0A1628",
                  margin:"0 0 10px",
                  maxWidth:760,
                }}
              >
                Investissez comme
                <br/>
                <span style={{ fontStyle:"italic", color:"#1E3A6E" }}>une institution.</span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                style={{
                  fontFamily:"'Inter',sans-serif",
                  fontSize:15, fontWeight:300, letterSpacing:".01em",
                  color:"#5A6B80", lineHeight:1.7,
                  maxWidth:480, margin:"0 auto 36px",
                }}
              >
                L'algorithme de Markowitz, réservé aux family offices,
                <br/>accessible gratuitement.
              </motion.p>

              {/* CTA */}
              <motion.div variants={itemVariants} style={{ display:"flex", gap:12, justifyContent:"center", alignItems:"center" }}>
                <motion.button
                  className="btn-shine"
                  whileHover={{ scale:1.04, boxShadow:"0 8px 32px rgba(10,22,40,0.18)" }}
                  whileTap={{ scale:0.97 }}
                  onClick={() => router.push("/auth/register")}
                  style={{
                    background:"#0A1628",
                    color:"white",
                    border:"none",
                    fontFamily:"'Inter',sans-serif",
                    fontSize:11, fontWeight:500, letterSpacing:".16em",
                    padding:"15px 36px", borderRadius:8,
                    cursor:"pointer", textTransform:"uppercase",
                    boxShadow:"0 2px 16px rgba(10,22,40,0.12)",
                  }}
                >
                  Commencer gratuitement
                </motion.button>

                <motion.button
                  whileHover={{ scale:1.02 }}
                  onClick={() => scrollTo(1)}
                  style={{
                    background:"none", border:"none",
                    fontFamily:"'Inter',sans-serif",
                    fontSize:11, fontWeight:400, letterSpacing:".12em",
                    color:"#8A9BB0", cursor:"pointer",
                    textTransform:"uppercase",
                    display:"flex", alignItems:"center", gap:8,
                  }}
                >
                  En savoir plus
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L7 13M7 13L2 8M7 13L12 8" stroke="#8A9BB0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.button>
              </motion.div>

              {/* Métriques */}
              <motion.div
                variants={itemVariants}
                style={{
                  display:"flex", gap:40, justifyContent:"center",
                  marginTop:48,
                }}
              >
                {[
                  { v:"490+", l:"Actifs analysés" },
                  { v:"0 €",  l:"Frais de conseil" },
                  { v:"≈8%",  l:"Rendement MSCI World 30A" },
                ].map(({ v, l }) => (
                  <div key={l} style={{ textAlign:"center" }}>
                    <div style={{
                      fontFamily:"'Cormorant Garant',serif",
                      fontSize:28, fontWeight:400, letterSpacing:"-.02em",
                      color:"#0A1628", lineHeight:1,
                    }}>{v}</div>
                    <div style={{
                      fontFamily:"'Inter',sans-serif",
                      fontSize:9, fontWeight:500, letterSpacing:".14em",
                      color:"#8A9BB0", marginTop:5, textTransform:"uppercase",
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
            transition={{ delay:3.5, duration:1 }}
            style={{
              position:"absolute", bottom:28, left:"50%", transform:"translateX(-50%)",
              zIndex:5, display:"flex", flexDirection:"column", alignItems:"center", gap:6,
            }}
          >
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:8, letterSpacing:".16em", color:"#B0BEC5", textTransform:"uppercase" }}>Défiler</span>
            <motion.div
              animate={{ y:[0,6,0] }}
              transition={{ repeat:Infinity, duration:1.6, ease:"easeInOut" }}
              style={{ width:1, height:20, background:"linear-gradient(to bottom, #B0BEC5, transparent)" }}
            />
          </motion.div>
        </section>

        {/* ══ SECTION 2 — COMMENT ÇA FONCTIONNE ════════════════ */}
        <section style={{
          height:"100vh", scrollSnapAlign:"start",
          background:"#0A1628",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          padding:"0 48px",
        }}>
          <motion.div
            initial={{ opacity:0, y:30 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:0.8, ease:[0.22,1,0.36,1] }}
            style={{ textAlign:"center", maxWidth:720 }}
          >
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500, letterSpacing:".22em", color:"rgba(255,255,255,0.25)", marginBottom:20, textTransform:"uppercase" }}>
              Comment ça fonctionne
            </div>
            <h2 style={{
              fontFamily:"'Cormorant Garant',serif",
              fontSize:"clamp(32px,4vw,52px)",
              fontWeight:300, letterSpacing:"-.02em",
              color:"white", lineHeight:1.1, marginBottom:16,
            }}>
              7 questions.<br/>
              <span style={{ color:"rgba(255,255,255,0.4)" }}>Un portefeuille sur mesure.</span>
            </h2>
            <p style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:300, color:"rgba(255,255,255,0.4)", lineHeight:1.8 }}>
              Notre algorithme filtre 490+ actifs, télécharge 5 ans de données<br/>
              Yahoo Finance et calcule la frontière efficiente de Markowitz.
            </p>
          </motion.div>

          <div style={{ display:"flex", gap:1, marginTop:48, width:"100%", maxWidth:800 }}>
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
                transition={{ delay:i*0.12, duration:0.6 }}
                style={{
                  flex:1, padding:"24px 20px",
                  background:"rgba(255,255,255,0.04)",
                  borderLeft:"1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontFamily:"'Cormorant Garant',serif", fontSize:32, fontWeight:300, color:"rgba(255,255,255,0.12)", marginBottom:12 }}>{n}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:500, letterSpacing:".08em", color:"white", marginBottom:6, textTransform:"uppercase" }}>{t}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:300, color:"rgba(255,255,255,0.35)", lineHeight:1.6 }}>{d}</div>
              </motion.div>
            ))}
          </div>

          <motion.button
            initial={{ opacity:0 }}
            whileInView={{ opacity:1 }}
            viewport={{ once:true }}
            transition={{ delay:0.6 }}
            whileHover={{ scale:1.03 }}
            onClick={() => router.push("/auth/register")}
            style={{
              marginTop:40, background:"white", color:"#0A1628",
              border:"none", borderRadius:8,
              fontFamily:"'Inter',sans-serif",
              fontSize:11, fontWeight:500, letterSpacing:".14em",
              padding:"14px 36px", cursor:"pointer", textTransform:"uppercase",
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
          padding:"0 48px",
        }}>
          <motion.div
            initial={{ opacity:0, y:24 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:0.7 }}
            style={{ width:"100%", maxWidth:860 }}
          >
            <div style={{ textAlign:"center", marginBottom:32 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500, letterSpacing:".22em", color:"#8A9BB0", marginBottom:12, textTransform:"uppercase" }}>Simulation</div>
              <h2 style={{
                fontFamily:"'Cormorant Garant',serif",
                fontSize:"clamp(28px,3.5vw,46px)",
                fontWeight:300, letterSpacing:"-.02em",
                color:"#0A1628", marginBottom:6,
              }}>
                Combien perdez-vous chaque année ?
              </h2>
              <p style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:"#8A9BB0", fontWeight:300 }}>
                Comparez les frais de votre CGP actuel vs une stratégie ETF passive.
              </p>
            </div>

            {/* Sliders */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:24, marginBottom:28 }}>
              {[
                { label:"Capital", val:feur(capital), min:10000, max:1000000, step:10000, v:capital, set:(n:number)=>setCapital(n) },
                { label:"Durée", val:`${years} ans`, min:5, max:40, step:1, v:years, set:(n:number)=>setYears(n) },
                { label:"Frais CGP (%/an)", val:`${cgpFees.toFixed(1)}%`, min:0.5, max:4, step:0.1, v:cgpFees, set:(n:number)=>setCgpFees(n) },
              ].map(({ label, val, min, max, step, v, set }) => (
                <div key={label}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500, letterSpacing:".12em", color:"#8A9BB0", textTransform:"uppercase" }}>{label}</span>
                    <span style={{ fontFamily:"'Cormorant Garant',serif", fontSize:18, fontWeight:400, color:"#0A1628" }}>{val}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={v}
                    onChange={(e) => set(Number(e.target.value))}
                    style={{ width:"100%", height:2, background:"rgba(10,22,40,0.1)", outline:"none", WebkitAppearance:"none", cursor:"pointer", borderRadius:1 }}
                  />
                </div>
              ))}
            </div>

            {/* Graphique */}
            <div style={{ background:"white", borderRadius:12, padding:"24px", boxShadow:"0 2px 20px rgba(10,22,40,0.04)" }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <XAxis dataKey="an" tick={{ fontSize:10, fill:"#aaa" }} tickLine={false} axisLine={false} tickFormatter={(v:number)=>`An ${v}`} interval={Math.floor(years/4)}/>
                  <YAxis tick={{ fontSize:10, fill:"#aaa" }} tickLine={false} axisLine={false} tickFormatter={(v:number)=>v>=1e6?`${(v/1e6).toFixed(1)}M€`:`${Math.round(v/1000)}k€`} width={56}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Line type="monotone" dataKey="ETF MSCI World (Zero CGP)" stroke="#16A34A" strokeWidth={2.5} dot={false} activeDot={{ r:5, fill:"#16A34A" }}/>
                  <Line type="monotone" dataKey="Banque / CGP" stroke="#DC2626" strokeWidth={2} dot={false} strokeDasharray="5 3" activeDot={{ r:4, fill:"#DC2626" }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Résultat */}
            <div style={{
              marginTop:16, display:"flex", alignItems:"center", justifyContent:"space-between",
              background:"#0A1628", borderRadius:10, padding:"16px 24px",
            }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:300, color:"rgba(255,255,255,0.45)", letterSpacing:".04em" }}>
                Manque à gagner avec votre CGP sur {years} ans
              </div>
              <div style={{ fontFamily:"'Cormorant Garant',serif", fontSize:26, fontWeight:300, color:"#F87171" }}>
                {feur(manque)}
              </div>
              <motion.button
                whileHover={{ scale:1.04 }}
                onClick={() => router.push("/auth/register")}
                style={{
                  background:"white", color:"#0A1628", border:"none",
                  fontFamily:"'Inter',sans-serif",
                  fontSize:10, fontWeight:500, letterSpacing:".14em",
                  padding:"10px 24px", borderRadius:8, cursor:"pointer",
                  textTransform:"uppercase",
                }}
              >
                Récupérer {feur(manque)} →
              </motion.button>
            </div>
          </motion.div>
        </section>

      </div>
    </>
  );
}
