"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function LandingPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0, animId = 0;

    function resize() {
      W = canvas!.width = canvas!.offsetWidth;
      H = canvas!.height = canvas!.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // 3 courbes lentes, tendance haussière douce
    const curves = [
      { yStart: 0.80, yEnd: 0.52, amp: 22, f: 0.6,  sp: 0.00006, col: "rgba(30,58,110,0.11)", w: 1.2 },
      { yStart: 0.90, yEnd: 0.65, amp: 16, f: 0.45, sp: 0.00004, col: "rgba(30,58,110,0.07)", w: 0.7 },
      { yStart: 0.70, yEnd: 0.40, amp: 12, f: 0.75, sp: 0.00008, col: "rgba(30,58,110,0.05)", w: 0.5 },
    ];

    let t = 0;

    function drawCurve(c: typeof curves[0]) {
      const N = 24;
      const pts: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const prog = i / N;
        const x = prog * W;
        const yBase = H * (c.yStart + (c.yEnd - c.yStart) * prog);
        const ph = prog * Math.PI * 2 * c.f;
        const y = yBase
          + Math.sin(t * c.sp * 1000 + ph) * c.amp
          + Math.cos(t * c.sp * 600 + ph * 0.6) * (c.amp * 0.3);
        pts.push([x, y]);
      }
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let j = 1; j < pts.length - 1; j++) {
        const mx = (pts[j][0] + pts[j+1][0]) / 2;
        const my = (pts[j][1] + pts[j+1][1]) / 2;
        ctx.quadraticCurveTo(pts[j][0], pts[j][1], mx, my);
      }
      ctx.strokeStyle = c.col;
      ctx.lineWidth = c.w;
      ctx.stroke();
    }

    function animate(ts: number) {
      t = ts;
      ctx.clearRect(0, 0, W, H);
      curves.forEach(drawCurve);
      animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const steps = [
    { n: "01", title: "Créez votre compte", desc: "Inscription en 30 secondes avec votre email. Vos données sont chiffrées et ne sont jamais partagées ni revendues." },
    { n: "02", title: "Saisissez vos actifs", desc: "Recherchez chaque actif par nom, symbole boursier ou code ISIN. La quantité × le cours temps réel calcule automatiquement la valeur en euros." },
    { n: "03", title: "Visualisez votre exposition", desc: "Une treemap interactive affiche la répartition de votre portefeuille. Taille proportionnelle au poids, couleur par classe d'actif." },
    { n: "04", title: "Répondez à 7 questions", desc: "Horizon, tolérance au risque, capital, perte max acceptable, filtres ESG, classes d'actifs, zones géographiques — votre profil en 2 minutes." },
    { n: "05", title: "L'algorithme de Markowitz calcule", desc: "5 ans de données historiques, matrice de covariance avec shrinkage de Ledoit-Wolf, frontière efficiente calculée en temps réel." },
    { n: "06", title: "Choisissez parmi 3 portefeuilles", desc: "Variance Minimale, Sharpe Maximum ou Utilité Maximale. Chaque résultat affiche rendement, volatilité, ratio de Sharpe et VaR 95%." },
    { n: "07", title: "Suivez les dérives en temps réel", desc: "Zero CGP surveille l'écart entre vos poids cibles et actuels. Une alerte se déclenche dès qu'un actif dérive de plus de 5%." },
    { n: "08", title: "Projetez votre patrimoine", desc: "1 000 simulations Monte Carlo projettent votre portefeuille sur 10, 20 ou 30 ans avec intervalles de confiance à 95%." },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,600;1,300&family=Inter:wght@300;400;500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
        .snap-container{height:100vh;overflow-y:scroll;scroll-snap-type:y mandatory;-webkit-overflow-scrolling:touch}
        .snap-container::-webkit-scrollbar{display:none}

        .nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:28px 52px;transition:background 0.4s}
        .nav.scrolled{background:rgba(250,250,248,0.95);backdrop-filter:blur(14px);border-bottom:1px solid rgba(10,22,40,.06)}
        .logo{font-family:'Cormorant Garant',serif;font-size:13px;font-weight:400;letter-spacing:.28em;color:#0A1628}
        .nav-actions{display:flex;align-items:center}
        .btn-connexion{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;color:#0A1628;background:transparent;border:1px solid rgba(10,22,40,.3);padding:10px 24px;cursor:pointer;position:relative;overflow:hidden;transition:color 0.5s}
        .btn-connexion::before{content:'';position:absolute;inset:0;background:#0A1628;transform:scaleX(0);transform-origin:left;transition:transform 0.5s cubic-bezier(0.4,0,0.2,1);z-index:-1}
        .btn-connexion:hover::before{transform:scaleX(1)}
        .btn-connexion:hover{color:white}
        .nav-sep{width:1px;height:26px;background:#0A1628;opacity:.15;margin:0 1px}
        .btn-inscrire{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;color:white;background:#0A1628;border:1px solid #0A1628;padding:10px 24px;cursor:pointer;transition:opacity 0.2s}
        .btn-inscrire:hover{opacity:.82}

        .hero-section{scroll-snap-align:start;scroll-snap-stop:always;height:100vh;background:#FAFAF8;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 48px;position:relative;overflow:hidden}
        .bg-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
        .eyebrow{font-size:9px;font-weight:500;letter-spacing:.32em;color:#1E3A6E;margin-bottom:32px;position:relative;z-index:1}
        .hero-title{font-family:'Cormorant Garant',serif;font-weight:300;font-size:clamp(80px,11vw,118px);line-height:.88;color:#0A1628;letter-spacing:-.025em;position:relative;z-index:1}
        .hero-title em{font-style:italic;color:#1E3A6E}
        .hero-sub{font-size:13px;font-weight:300;color:#8A9BB0;line-height:1.9;margin:28px auto 44px;max-width:360px;position:relative;z-index:1}
        .btn-cta{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.18em;background:#0A1628;color:white;border:none;padding:17px 56px;cursor:pointer;transition:opacity 0.2s;position:relative;z-index:1}
        .btn-cta:hover{opacity:.82}

        .scroll-hint{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;z-index:2;animation:fadeHint 1s 1.6s ease both}
        .scroll-hint span{font-size:8px;font-weight:500;letter-spacing:.22em;color:#8A9BB0}
        .scroll-arrow{width:1px;height:44px;background:linear-gradient(to bottom,transparent,#1E3A6E);position:relative;animation:arrowPulse 2s ease-in-out infinite}
        .scroll-arrow::after{content:'';position:absolute;bottom:-1px;left:50%;width:5px;height:5px;border-right:1px solid #1E3A6E;border-bottom:1px solid #1E3A6E;transform:translateX(-50%) rotate(45deg)}
        @keyframes arrowPulse{0%,100%{opacity:.3}50%{opacity:1}}
        @keyframes fadeHint{from{opacity:0;transform:translateX(-50%) translateY(14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

        .how-section{scroll-snap-align:start;scroll-snap-stop:always;min-height:100vh;background:#FAFAF8;padding:100px 52px 80px}
        .how-header{text-align:center;margin-bottom:20px}
        .how-eyebrow{font-size:9px;font-weight:500;letter-spacing:.32em;color:#1E3A6E;margin-bottom:18px}
        .how-title{font-family:'Cormorant Garant',serif;font-size:clamp(38px,5vw,54px);font-weight:300;color:#0A1628;letter-spacing:-.02em;line-height:1.1;margin-bottom:12px}
        .how-title em{font-style:italic;color:#1E3A6E}
        .how-mention{font-size:11px;font-weight:300;color:#8A9BB0;letter-spacing:.03em;margin-bottom:56px;line-height:1.7}
        .how-mention strong{color:#1E3A6E;font-weight:400}
        .steps-grid{display:grid;grid-template-columns:repeat(4,1fr);max-width:1160px;margin:0 auto;border-top:1px solid rgba(10,22,40,.08);border-left:1px solid rgba(10,22,40,.08)}
        .step-card{padding:34px 30px;border-right:1px solid rgba(10,22,40,.08);border-bottom:1px solid rgba(10,22,40,.08);background:#FAFAF8;transition:background 0.3s}
        .step-card:hover{background:rgba(10,22,40,.025)}
        .step-num{font-size:9px;font-weight:500;letter-spacing:.18em;color:#1E3A6E;margin-bottom:16px;opacity:.7}
        .step-title{font-family:'Cormorant Garant',serif;font-size:18px;font-weight:400;color:#0A1628;margin-bottom:11px;line-height:1.25}
        .step-desc{font-size:12px;font-weight:400;color:#3D4F63;line-height:1.85}

        .cta-section{scroll-snap-align:start;scroll-snap-stop:always;height:100vh;background:#0A1628;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 48px;position:relative}
        .cta-eyebrow{font-size:9px;font-weight:500;letter-spacing:.32em;color:rgba(255,255,255,.25);margin-bottom:22px}
        .cta-title{font-family:'Cormorant Garant',serif;font-size:clamp(40px,5.5vw,64px);font-weight:300;color:white;letter-spacing:-.025em;line-height:1.05;margin-bottom:16px}
        .cta-title em{font-style:italic;color:rgba(255,255,255,.4)}
        .cta-sub{font-size:12px;font-weight:300;color:rgba(255,255,255,.3);margin-bottom:48px}
        .btn-cta-white{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.2em;background:white;color:#0A1628;border:none;padding:18px 60px;cursor:pointer;transition:opacity 0.2s}
        .btn-cta-white:hover{opacity:.88}
        .cta-footer{position:absolute;bottom:28px;left:0;right:0;display:flex;justify-content:space-between;padding:0 52px}
        .cta-footer-logo{font-family:'Cormorant Garant',serif;font-size:11px;letter-spacing:.22em;color:rgba(255,255,255,.15)}
        .cta-footer-copy{font-size:9px;color:rgba(255,255,255,.12);letter-spacing:.08em}
      `}</style>

      <nav className="nav" id="mainNav">
        <div className="logo">ZERO CGP</div>
        <div className="nav-actions">
          <button className="btn-connexion" onClick={() => router.push("/auth/login")}>CONNEXION</button>
          <div className="nav-sep" />
          <button className="btn-inscrire" onClick={() => router.push("/auth/register")}>S'INSCRIRE</button>
        </div>
      </nav>

      <div className="snap-container" id="snapContainer">

        {/* ── HERO ── */}
        <section className="hero-section">
          <canvas ref={canvasRef} className="bg-canvas" />
          <p className="eyebrow">GESTION DE PATRIMOINE OPTIMISÉE</p>
          <h1 className="hero-title">Zero<br /><em>CGP.</em></h1>
          <p className="hero-sub">
            Optimisez votre portefeuille avec précision.<br />
            Zéro compromis sur vos rendements.
          </p>
          <button className="btn-cta" onClick={() => router.push("/auth/register")}>COMMENCER →</button>
          <div className="scroll-hint" id="scrollHint">
            <span>COMMENT ÇA FONCTIONNE</span>
            <div className="scroll-arrow" />
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
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
            {steps.map((s) => (
              <div key={s.n} className="step-card">
                <div className="step-num">ÉTAPE {s.n}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="cta-section">
          <p className="cta-eyebrow">PRÊT À OPTIMISER</p>
          <h2 className="cta-title">Commencez<br /><em>gratuitement.</em></h2>
          <p className="cta-sub">Aucune carte bancaire requise · Données sécurisées · Gratuit</p>
          <button className="btn-cta-white" onClick={() => router.push("/auth/register")}>COMMENCER MAINTENANT →</button>
          <div className="cta-footer">
            <span className="cta-footer-logo">ZERO CGP</span>
            <span className="cta-footer-copy">© 2025 TOUS DROITS RÉSERVÉS</span>
          </div>
        </section>

      </div>

      <script dangerouslySetInnerHTML={{ __html: `(function(){
        var container=document.getElementById('snapContainer');
        var nav=document.getElementById('mainNav');
        var hint=document.getElementById('scrollHint');
        container.addEventListener('scroll',function(){
          if(nav)nav.classList.toggle('scrolled',container.scrollTop>60);
        });
        if(hint)hint.addEventListener('click',function(){
          container.scrollTo({top:window.innerHeight,behavior:'smooth'});
        });
      })();`}} />
    </>
  );
}
