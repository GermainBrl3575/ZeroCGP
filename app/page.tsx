"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
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

interface TooltipPayload {
  value: number;
  name: string;
  color: string;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: number;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: "#0A1628", borderRadius: 8, padding: "10px 14px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    }}>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginBottom: 6, letterSpacing: ".08em" }}>
        AN {label}
      </div>
      {payload.map(function(p) {
        return (
          <div key={p.name} style={{ color: "white", fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
            <span style={{ color: p.color, marginRight: 6, fontSize: 8 }}>●</span>
            {p.name} : <span style={{ color: p.color }}>{feur(p.value)}</span>
          </div>
        );
      })}
      {payload.length === 2 && (
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 6, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 6 }}>
          Manque à gagner : <span style={{ color: "#F87171" }}>{feur(payload[0].value - payload[1].value)}</span>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0, animId = 0;
    function resize() {
      W = canvas!.width  = canvas!.offsetWidth;
      H = canvas!.height = canvas!.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const N = 80;
    const basePoints: number[] = [];
    for (let i = 0; i <= N; i++) {
      const prog  = i / N;
      const trend = 0.85 - prog * 0.63;
      const micro = Math.sin(i * 1.7) * 0.022 + Math.sin(i * 3.1) * 0.012 +
                    Math.sin(i * 5.3) * 0.006 + (Math.random() - 0.5) * 0.018;
      basePoints.push(Math.max(0.08, Math.min(0.95, trend + micro)));
    }

    const DRAW_DURATION = 7000;
    const START = performance.now();
    let done = false;
    let oscT = 0;

    function getPoint(i: number, oscTime: number): [number, number] {
      const x = (i / N) * W;
      let y = H * basePoints[i];
      if (done) {
        y += Math.sin(oscTime * 0.0004 + i * 0.18) * 3.5 +
             Math.sin(oscTime * 0.0007 + i * 0.32) * 1.8;
      }
      return [x, Math.max(8, Math.min(H - 8, y))];
    }

    function drawCurve(pts: [number, number][]) {
      if (pts.length < 2) return;
      const last = pts[pts.length - 1];

      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let j = 1; j < pts.length - 1; j++) {
        ctx.quadraticCurveTo(pts[j][0], pts[j][1],
          (pts[j][0] + pts[j + 1][0]) / 2, (pts[j][1] + pts[j + 1][1]) / 2);
      }
      ctx.lineTo(last[0], H);
      ctx.lineTo(pts[0][0], H);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(30,58,110,0.07)");
      g.addColorStop(1, "rgba(30,58,110,0)");
      ctx.fillStyle = g;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let j = 1; j < pts.length - 1; j++) {
        ctx.quadraticCurveTo(pts[j][0], pts[j][1],
          (pts[j][0] + pts[j + 1][0]) / 2, (pts[j][1] + pts[j + 1][1]) / 2);
      }
      ctx.lineTo(last[0], last[1]);
      ctx.strokeStyle = "rgba(30,58,110,0.22)";
      ctx.lineWidth   = 2;
      ctx.lineJoin    = "round";
      ctx.stroke();

      if (!done) {
        ctx.beginPath();
        ctx.arc(last[0], last[1], 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(30,58,110,0.55)";
        ctx.fill();
      }
    }

    function animate(now: number) {
      ctx.clearRect(0, 0, W, H);
      if (!done) {
        const progress = Math.min((now - START) / DRAW_DURATION, 1);
        const vc   = Math.floor(progress * N);
        const frac = progress * N - vc;
        const pts: [number, number][] = [];
        for (let i = 0; i <= vc; i++) pts.push(getPoint(i, 0));
        if (vc < N && frac > 0) {
          const [x0, y0] = getPoint(vc, 0);
          const [x1, y1] = getPoint(Math.min(vc + 1, N), 0);
          pts.push([x0 + (x1 - x0) * frac, y0 + (y1 - y0) * frac]);
        }
        drawCurve(pts);
        if (progress >= 1) { done = true; oscT = now; }
      } else {
        oscT = now;
        const pts: [number, number][] = [];
        for (let i = 0; i <= N; i++) pts.push(getPoint(i, oscT));
        drawCurve(pts);
      }
      animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);
    return function() { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

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
      setActiveTab(Math.min(i, 2));
    }
    c.addEventListener("scroll", handle, { passive: true });
    return function() { c.removeEventListener("scroll", handle); };
  }, []);

  const steps = [
    { n:"01", title:"Créez votre compte",            desc:"Inscription en 30 secondes. Vos données sont chiffrées et ne sont jamais partagées." },
    { n:"02", title:"Saisissez vos actifs",           desc:"Recherchez chaque actif par nom, symbole ou ISIN. La valeur est calculée automatiquement en temps réel." },
    { n:"03", title:"Visualisez votre exposition",    desc:"Une treemap interactive affiche la répartition. Taille proportionnelle au poids, couleur par classe d'actif." },
    { n:"04", title:"Répondez à 7 questions",         desc:"Horizon, risque, capital, ESG, classes d'actifs, zones géographiques — votre profil en 2 minutes." },
    { n:"05", title:"L'algorithme de Markowitz calcule", desc:"5 ans de données historiques, matrice de covariance avec shrinkage de Ledoit-Wolf, frontière efficiente." },
    { n:"06", title:"Choisissez parmi 3 portefeuilles", desc:"Variance Minimale, Sharpe Maximum ou Utilité Maximale. Chaque résultat affiche rendement, volatilité et VaR." },
    { n:"07", title:"Suivez les dérives",             desc:"Zero CGP surveille vos poids cibles vs actuels. Alerte dès qu'un actif dérive de plus de 5%." },
    { n:"08", title:"Projetez votre patrimoine",      desc:"1 000 simulations Monte Carlo projettent votre portefeuille sur 10, 20 ou 30 ans." },
  ];

  const netEtf   = ((MSCI_GROSS - ETF_FEES) * 100).toFixed(1);
  const netCgp   = (MSCI_GROSS * 100 - cgpFees).toFixed(1);
  const pctPerdu = Math.round(manque / capital * 100);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,600;1,300&family=Inter:wght@300;400;500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
        .snap-container{height:100vh;overflow-y:scroll;scroll-snap-type:y mandatory;-webkit-overflow-scrolling:touch}
        .snap-container::-webkit-scrollbar{display:none}
        .nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;padding:0 52px;height:68px;transition:background 0.4s}
        .nav.scrolled{background:rgba(250,250,248,0.95);backdrop-filter:blur(14px);border-bottom:1px solid rgba(10,22,40,.06)}
        .logo{font-family:'Cormorant Garant',serif;font-size:13px;font-weight:400;letter-spacing:.28em;color:#0A1628;cursor:pointer}
        .nav-tabs{display:flex;align-items:center;gap:2px;background:rgba(10,22,40,.05);border-radius:8px;padding:4px}
        .nav-tab{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.1em;padding:7px 18px;border:none;background:transparent;color:#8A9BB0;cursor:pointer;border-radius:6px;transition:all 0.2s}
        .nav-tab:hover{color:#0A1628}
        .nav-tab.active{background:white;color:#0A1628;box-shadow:0 1px 4px rgba(0,0,0,.08)}
        .nav.scrolled .nav-tabs{background:rgba(10,22,40,.06)}
        .btn-connexion{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;color:#0A1628;background:transparent;border:1px solid rgba(10,22,40,.3);padding:9px 22px;cursor:pointer;position:relative;overflow:hidden;transition:color 0.5s}
        .btn-connexion::before{content:'';position:absolute;inset:0;background:#0A1628;transform:scaleX(0);transform-origin:left;transition:transform 0.5s cubic-bezier(0.4,0,0.2,1);z-index:-1}
        .btn-connexion:hover::before{transform:scaleX(1)}
        .btn-connexion:hover{color:white}
        .nav-sep{width:1px;height:24px;background:#0A1628;opacity:.15;margin:0 1px}
        .btn-inscrire{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;color:white;background:#0A1628;border:1px solid #0A1628;padding:9px 22px;cursor:pointer;transition:opacity 0.2s}
        .btn-inscrire:hover{opacity:.82}
        .hero-section{scroll-snap-align:start;scroll-snap-stop:always;height:100vh;background:#FAFAF8;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 48px;position:relative;overflow:hidden}
        .bg-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
        .eyebrow{font-size:9px;font-weight:500;letter-spacing:.32em;color:#1E3A6E;margin-bottom:32px;position:relative;z-index:1;animation:fadeUp 0.8s 0.3s ease both}
        .hero-title{font-family:'Cormorant Garant',serif;font-weight:300;font-size:clamp(80px,11vw,118px);line-height:.88;color:#0A1628;letter-spacing:-.025em;position:relative;z-index:1;animation:fadeUp 0.9s 0.5s ease both}
        .hero-title em{font-style:italic;color:#1E3A6E}
        .hero-sub{font-size:13px;font-weight:300;color:#5A6B80;line-height:1.9;margin:28px auto 44px;max-width:360px;position:relative;z-index:1;animation:fadeUp 0.8s 0.7s ease both}
        .btn-cta{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.18em;background:#0A1628;color:white;border:none;padding:17px 56px;cursor:pointer;transition:opacity 0.2s;position:relative;z-index:1;animation:fadeUp 0.8s 0.9s ease both}
        .btn-cta:hover{opacity:.82}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .scroll-hint{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;z-index:2;animation:fadeHint 1s 7.5s ease both}
        .scroll-hint span{font-size:8px;font-weight:500;letter-spacing:.22em;color:#8A9BB0}
        .scroll-arrow{width:1px;height:40px;background:linear-gradient(to bottom,transparent,#1E3A6E);position:relative;animation:arrowPulse 2s ease-in-out infinite}
        .scroll-arrow::after{content:'';position:absolute;bottom:-1px;left:50%;width:5px;height:5px;border-right:1px solid #1E3A6E;border-bottom:1px solid #1E3A6E;transform:translateX(-50%) rotate(45deg)}
        @keyframes arrowPulse{0%,100%{opacity:.3}50%{opacity:1}}
        @keyframes fadeHint{from{opacity:0;transform:translateX(-50%) translateY(14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .how-section{scroll-snap-align:start;scroll-snap-stop:always;min-height:100vh;background:#FAFAF8;padding:96px 52px 80px}
        .how-header{text-align:center;margin-bottom:20px}
        .how-eyebrow{font-size:9px;font-weight:500;letter-spacing:.32em;color:#1E3A6E;margin-bottom:18px}
        .how-title{font-family:'Cormorant Garant',serif;font-size:clamp(38px,5vw,54px);font-weight:300;color:#0A1628;letter-spacing:-.02em;line-height:1.1;margin-bottom:12px}
        .how-title em{font-style:italic;color:#1E3A6E}
        .how-mention{font-size:11px;font-weight:300;color:#4B5563;letter-spacing:.03em;margin-bottom:52px;line-height:1.7}
        .how-mention strong{color:#1E3A6E;font-weight:400}
        .steps-grid{display:grid;grid-template-columns:repeat(4,1fr);max-width:1160px;margin:0 auto;border-top:1px solid rgba(10,22,40,.08);border-left:1px solid rgba(10,22,40,.08)}
        .step-card{padding:32px 28px;border-right:1px solid rgba(10,22,40,.08);border-bottom:1px solid rgba(10,22,40,.08);background:#FAFAF8;transition:background 0.3s}
        .step-card:hover{background:rgba(10,22,40,.02)}
        .step-num{font-size:9px;font-weight:500;letter-spacing:.18em;color:#1E3A6E;margin-bottom:14px;opacity:.7}
        .step-title{font-family:'Cormorant Garant',serif;font-size:17px;font-weight:400;color:#0A1628;margin-bottom:10px;line-height:1.25}
        .step-desc{font-size:11.5px;font-weight:400;color:#3D4F63;line-height:1.85}
        .sim-section{scroll-snap-align:start;scroll-snap-stop:always;min-height:100vh;background:#FAFAF8;padding:96px 52px 80px;overflow-y:auto}
        .sim-header{text-align:center;margin-bottom:44px}
        .sim-eyebrow{font-size:9px;font-weight:500;letter-spacing:.32em;color:#1E3A6E;margin-bottom:18px}
        .sim-title{font-family:'Cormorant Garant',serif;font-size:clamp(36px,5vw,52px);font-weight:300;color:#0A1628;letter-spacing:-.02em;line-height:1.1;margin-bottom:14px}
        .sim-title em{font-style:italic;color:#1E3A6E}
        .sim-sub{font-size:12px;font-weight:300;color:#4B5563;line-height:1.7;max-width:560px;margin:0 auto}
        .sliders-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;max-width:900px;margin:0 auto 36px;background:white;border-radius:16px;padding:32px 40px}
        .slider-item label{font-size:9px;font-weight:500;letter-spacing:.16em;color:#8A9BB0;display:block;margin-bottom:12px}
        .slider-val{font-family:'Cormorant Garant',serif;font-size:28px;font-weight:300;color:#0A1628;margin-bottom:10px;letter-spacing:-.02em;line-height:1}
        .slider-val em{font-style:normal;font-size:14px;color:#6B7280;font-family:'Inter',sans-serif;font-weight:300}
        input[type=range]{width:100%;height:2px;background:rgba(10,22,40,.1);border-radius:1px;outline:none;-webkit-appearance:none;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#0A1628;cursor:pointer;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.2)}
        .sim-cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;max-width:900px;margin:0 auto 28px}
        .sim-card{border-radius:14px;padding:22px 24px}
        .sim-card-label{font-size:9px;font-weight:500;letter-spacing:.14em;margin-bottom:10px}
        .sim-card-val{font-family:'Cormorant Garant',serif;font-size:32px;font-weight:300;letter-spacing:-.02em;line-height:1}
        .sim-card-sub{font-size:11px;font-weight:300;margin-top:6px;line-height:1.5}
        .cta-section{scroll-snap-align:start;scroll-snap-stop:always;height:100vh;background:#0A1628;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 48px;position:relative}
        .cta-eyebrow{font-size:9px;font-weight:500;letter-spacing:.32em;color:rgba(255,255,255,.25);margin-bottom:22px}
        .cta-title{font-family:'Cormorant Garant',serif;font-size:clamp(40px,5.5vw,64px);font-weight:300;color:white;letter-spacing:-.025em;line-height:1.05;margin-bottom:16px}
        .cta-title em{font-style:italic;color:rgba(255,255,255,.4)}
        .cta-sub{font-size:12px;font-weight:300;color:rgba(255,255,255,.45);margin-bottom:48px}
        .btn-cta-white{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.2em;background:white;color:#0A1628;border:none;padding:18px 60px;cursor:pointer;transition:opacity 0.2s}
        .btn-cta-white:hover{opacity:.88}
        .cta-footer{position:absolute;bottom:28px;left:0;right:0;display:flex;justify-content:space-between;padding:0 52px}
        .cta-footer-logo{font-family:'Cormorant Garant',serif;font-size:11px;letter-spacing:.22em;color:rgba(255,255,255,.15)}
        .cta-footer-copy{font-size:9px;color:rgba(255,255,255,.15);letter-spacing:.08em}
      `}</style>

      <nav className="nav" id="mainNav">
        <div style={{ flex:1 }}>
          <div className="logo" onClick={function(){scrollTo(0);}}>ZERO CGP</div>
        </div>
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)" }}>
          <div className="nav-tabs">
            {["Accueil","Comment ça fonctionne","Simulation"].map(function(tab, i) {
              return (
                <button key={tab} className={"nav-tab" + (activeTab === i ? " active" : "")}
                  onClick={function(){scrollTo(i);}}>
                  {tab.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ flex:1, display:"flex", justifyContent:"flex-end", alignItems:"center" }}>
          <button className="btn-connexion" onClick={function(){router.push("/auth/login");}}>CONNEXION</button>
          <div className="nav-sep" />
          <button className="btn-inscrire" onClick={function(){router.push("/auth/register");}}>S'INSCRIRE</button>
        </div>
      </nav>

      <div className="snap-container" ref={containerRef} id="snapContainer">

        <section className="hero-section">
          <canvas ref={canvasRef} className="bg-canvas" />
          <p className="eyebrow">GESTION DE PATRIMOINE OPTIMISÉE</p>
          <h1 className="hero-title">Zero<br /><em>CGP.</em></h1>
          <p className="hero-sub">
            Optimisez votre portefeuille avec précision.<br />
            Zéro compromis sur vos rendements.
          </p>
          <button className="btn-cta" onClick={function(){router.push("/auth/register");}}>
            COMMENCER →
          </button>
          <div className="scroll-hint" onClick={function(){scrollTo(1);}}>
            <span>COMMENT ÇA FONCTIONNE</span>
            <div className="scroll-arrow" />
          </div>
        </section>

        <section className="how-section">
          <div className="how-header">
            <p className="how-eyebrow">LE PROCESSUS</p>
            <h2 className="how-title">Comment fonctionne<br /><em>Zero CGP ?</em></h2>
            <p className="how-mention">
              Modèles mathématiques utilisés par les <strong>banques privées</strong>,<br />
              <strong>family offices</strong> et <strong>conseillers en gestion de patrimoine</strong>
            </p>
          </div>
          <div className="steps-grid">
            {steps.map(function(s) {
              return (
                <div key={s.n} className="step-card">
                  <div className="step-num">ÉTAPE {s.n}</div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="sim-section">
          <div className="sim-header">
            <p className="sim-eyebrow">SIMULATION</p>
            <h2 className="sim-title">Combien vous coûte<br /><em>votre banquier ?</em></h2>
            <p className="sim-sub">
              Le MSCI World affiche <strong style={{color:"#0A1628",fontWeight:500}}>+8%/an en moyenne</strong> sur 30 ans.
              Après {cgpFees}% de frais CGP, il ne vous reste que {netCgp}% — soit des centaines de milliers d'euros perdus.
            </p>
          </div>

          <div className="sliders-row">
            <div className="slider-item">
              <label>CAPITAL INITIAL</label>
              <div className="slider-val">{feur(capital)}</div>
              <input type="range" min={10000} max={1000000} step={5000}
                value={capital} onChange={function(e){setCapital(Number(e.target.value));}} />
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:9,color:"#9CA3AF"}}>
                <span>10 k€</span><span>1 M€</span>
              </div>
            </div>
            <div className="slider-item">
              <label>DURÉE</label>
              <div className="slider-val">{years} <em>ans</em></div>
              <input type="range" min={5} max={40} step={1}
                value={years} onChange={function(e){setYears(Number(e.target.value));}} />
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:9,color:"#9CA3AF"}}>
                <span>5 ans</span><span>40 ans</span>
              </div>
            </div>
            <div className="slider-item">
              <label>FRAIS CGP / BANQUE</label>
              <div className="slider-val">{cgpFees.toFixed(1)} <em>%/an</em></div>
              <input type="range" min={0.5} max={4} step={0.1}
                value={cgpFees} onChange={function(e){setCgpFees(Number(e.target.value));}} />
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:9,color:"#9CA3AF"}}>
                <span>0,5%</span><span>4%</span>
              </div>
            </div>
          </div>

          <div className="sim-cards">
            <div className="sim-card" style={{background:"#EFF6FF"}}>
              <div className="sim-card-label" style={{color:"#1E3A6E"}}>AVEC ZERO CGP (ETF 0,20%)</div>
              <div className="sim-card-val" style={{color:"#0A1628"}}>{feur(etfFinal)}</div>
              <div className="sim-card-sub" style={{color:"#3D6B9A"}}>
                Rendement net : <strong>{netEtf}%/an</strong>
              </div>
            </div>
            <div className="sim-card" style={{background:"#FEF2F2"}}>
              <div className="sim-card-label" style={{color:"#991B1B"}}>AVEC BANQUE / CGP ({cgpFees}%)</div>
              <div className="sim-card-val" style={{color:"#7F1D1D"}}>{feur(cgpFinal)}</div>
              <div className="sim-card-sub" style={{color:"#B91C1C"}}>
                Rendement net : <strong>{netCgp}%/an</strong>
              </div>
            </div>
            <div className="sim-card" style={{background:"#0A1628"}}>
              <div className="sim-card-label" style={{color:"rgba(255,255,255,0.45)"}}>MANQUE À GAGNER</div>
              <div className="sim-card-val" style={{color:"#F87171"}}>{feur(manque)}</div>
              <div className="sim-card-sub" style={{color:"rgba(255,255,255,0.45)"}}>
                soit <strong style={{color:"#FCA5A5"}}>{pctPerdu}%</strong> de patrimoine en moins
              </div>
            </div>
          </div>

          <div style={{background:"white",borderRadius:16,padding:"28px 24px",maxWidth:900,margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{fontFamily:"'Cormorant Garant',serif",fontSize:20,fontWeight:400,color:"#0A1628"}}>
                Trajectoire sur {years} ans
              </h3>
              <div style={{display:"flex",gap:20}}>
                {[["#1E3A6E","ETF MSCI World"],["#FCA5A5","Banque / CGP"]].map(function(item) {
                  return (
                    <div key={item[1]} style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:20,height:2,background:item[0],borderRadius:1}}/>
                      <span style={{fontSize:11,color:"#6B7280"}}>{item[1]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{top:5,right:10,left:10,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,22,40,.05)" />
                <XAxis dataKey="an" tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false}
                  tickFormatter={function(v) { return v === 0 ? "Départ" : "An " + v; }}
                  interval={Math.floor(years / 5)} />
                <YAxis tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false}
                  tickFormatter={function(v) { return Math.round(v/1000) + "k€"; }} width={56} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="ETF MSCI World (Zero CGP)"
                  stroke="#1E3A6E" strokeWidth={2.5} dot={false}
                  activeDot={{r:5,fill:"#1E3A6E",stroke:"white",strokeWidth:2}} />
                <Line type="monotone" dataKey="Banque / CGP"
                  stroke="#FCA5A5" strokeWidth={2} dot={false} strokeDasharray="6 3"
                  activeDot={{r:5,fill:"#FCA5A5",stroke:"white",strokeWidth:2}} />
              </LineChart>
            </ResponsiveContainer>
            <p style={{fontSize:10,color:"#6B7280",textAlign:"center",marginTop:12,letterSpacing:".04em"}}>
              Basé sur le rendement historique du MSCI World (+8%/an sur 30 ans). Simulation à titre indicatif, hors fiscalité.
            </p>
          </div>

          <div style={{textAlign:"center",marginTop:32}}>
            <button className="btn-inscrire" style={{padding:"16px 52px",fontSize:11,letterSpacing:".14em"}}
              onClick={function(){router.push("/auth/register");}}>
              RÉCUPÉRER MES {feur(manque)} →
            </button>
          </div>
        </section>

        <section className="cta-section">
          <p className="cta-eyebrow">PRÊT À OPTIMISER</p>
          <h2 className="cta-title">Commencez<br /><em>gratuitement.</em></h2>
          <p className="cta-sub">Aucune carte bancaire requise · Données sécurisées · Gratuit</p>
          <button className="btn-cta-white" onClick={function(){router.push("/auth/register");}}>
            COMMENCER MAINTENANT →
          </button>
          <div className="cta-footer">
            <span className="cta-footer-logo">ZERO CGP</span>
            <span className="cta-footer-copy">© 2025 TOUS DROITS RÉSERVÉS</span>
          </div>
        </section>

      </div>
    </>
  );
}
