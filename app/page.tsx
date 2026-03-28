"use client";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const steps = [
    {
      n: "01",
      title: "Créez votre compte",
      desc: "Inscription en 30 secondes avec votre email. Vos données sont chiffrées et ne sont jamais partagées ni revendues."
    },
    {
      n: "02",
      title: "Saisissez vos actifs",
      desc: "Recherchez chaque actif par nom, symbole boursier ou code ISIN. La quantité saisie × le cours en temps réel calcule automatiquement la valeur en euros de chaque ligne."
    },
    {
      n: "03",
      title: "Visualisez votre exposition",
      desc: "Une treemap interactive affiche la répartition de votre portefeuille. La taille de chaque bloc est proportionnelle au poids de l'actif. La couleur distingue ETF, actions et crypto."
    },
    {
      n: "04",
      title: "Répondez à 7 questions",
      desc: "Horizon d'investissement, tolérance au risque, capital disponible, perte maximale acceptable, filtres ESG, classes d'actifs souhaitées, zones géographiques — votre profil en 2 minutes."
    },
    {
      n: "05",
      title: "L'algorithme de Markowitz calcule",
      desc: "Notre moteur récupère 5 ans de données historiques sur Yahoo Finance, construit la matrice de covariance avec le shrinkage de Ledoit-Wolf, puis trace la frontière efficiente."
    },
    {
      n: "06",
      title: "Choisissez parmi 3 portefeuilles",
      desc: "Variance Minimale (risque le plus bas), Sharpe Maximum (meilleur rendement ajusté du risque), ou Utilité Maximale (équilibre selon votre profil). Chaque résultat affiche rendement attendu, volatilité, ratio de Sharpe et VaR à 95%."
    },
    {
      n: "07",
      title: "Suivez les dérives en temps réel",
      desc: "Après optimisation, Zero CGP surveille l'écart entre vos poids cibles et vos poids actuels. Une alerte se déclenche dès qu'un actif dérive de plus de 5% — vous restez toujours aligné sur votre stratégie."
    },
    {
      n: "08",
      title: "Projetez votre patrimoine",
      desc: "1 000 simulations Monte Carlo modélisent l'évolution de votre portefeuille sur 10, 20 ou 30 ans. Vous visualisez les trajectoires médianes, optimistes et pessimistes avec intervalles de confiance à 95%."
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,600;1,300&family=Inter:wght@300;400;500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}

        .snap-container{height:100vh;overflow-y:scroll;scroll-snap-type:y mandatory;-webkit-overflow-scrolling:touch}
        .snap-container::-webkit-scrollbar{display:none}

        .snap-section{scroll-snap-align:start;scroll-snap-stop:always;height:100vh;position:relative;overflow:hidden}
        .how-section{scroll-snap-align:start;scroll-snap-stop:always;min-height:100vh;position:relative;background:#FAFAF8}
        .cta-section{scroll-snap-align:start;scroll-snap-stop:always;height:100vh;position:relative}

        /* NAV */
        .nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:28px 52px;transition:background 0.4s}
        .nav.scrolled{background:rgba(250,250,248,0.94);backdrop-filter:blur(14px);border-bottom:1px solid rgba(10,22,40,.06)}
        .logo{font-family:'Cormorant Garant',serif;font-size:13px;font-weight:400;letter-spacing:.28em;color:#0A1628}
        .nav-actions{display:flex;align-items:center}
        .btn-connexion{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;color:#0A1628;background:transparent;border:1px solid rgba(10,22,40,.3);padding:10px 24px;cursor:pointer;position:relative;overflow:hidden;transition:color 0.5s}
        .btn-connexion::before{content:'';position:absolute;inset:0;background:#0A1628;transform:scaleX(0);transform-origin:left;transition:transform 0.5s cubic-bezier(0.4,0,0.2,1);z-index:-1}
        .btn-connexion:hover::before{transform:scaleX(1)}
        .btn-connexion:hover{color:white}
        .nav-sep{width:1px;height:26px;background:#0A1628;opacity:.15;margin:0 1px}
        .btn-inscrire{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;color:white;background:#0A1628;border:1px solid #0A1628;padding:10px 24px;cursor:pointer;transition:opacity 0.2s}
        .btn-inscrire:hover{opacity:.82}

        /* HERO */
        .hero-section{background:#FAFAF8;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 48px}
        canvas.bg-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
        .eyebrow{font-size:9px;font-weight:500;letter-spacing:.32em;color:#1E3A6E;margin-bottom:36px;position:relative;z-index:1}
        .hero-title{font-family:'Cormorant Garant',serif;font-weight:300;font-size:clamp(80px,11vw,118px);line-height:.88;color:#0A1628;letter-spacing:-.025em;position:relative;z-index:1}
        .hero-title em{font-style:italic;color:#1E3A6E}
        .hero-sub{font-size:13px;font-weight:300;color:#8A9BB0;line-height:1.9;margin:30px auto 50px;max-width:360px;position:relative;z-index:1}
        .btn-cta{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.18em;background:#0A1628;color:white;border:none;padding:17px 56px;cursor:pointer;transition:opacity 0.2s;position:relative;z-index:1}
        .btn-cta:hover{opacity:.82}

        /* SCROLL INDICATOR */
        .scroll-hint{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;z-index:2;opacity:0;animation:fadeInUp 1s 1.5s ease forwards}
        .scroll-hint span{font-size:8px;font-weight:500;letter-spacing:.22em;color:#8A9BB0}
        .scroll-arrow{width:1px;height:44px;background:linear-gradient(to bottom,transparent,#1E3A6E);position:relative;animation:arrowPulse 2s ease-in-out infinite}
        .scroll-arrow::after{content:'';position:absolute;bottom:-1px;left:50%;width:5px;height:5px;border-right:1px solid #1E3A6E;border-bottom:1px solid #1E3A6E;transform:translateX(-50%) rotate(45deg)}
        @keyframes arrowPulse{0%,100%{opacity:.3;transform:scaleY(1)}50%{opacity:1;transform:scaleY(1.08)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateX(-50%) translateY(14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

        /* HOW IT WORKS */
        .how-inner{padding:96px 52px 80px;max-width:1200px;margin:0 auto}
        .how-header{text-align:center;margin-bottom:72px}
        .how-eyebrow{font-size:9px;font-weight:500;letter-spacing:.32em;color:#1E3A6E;margin-bottom:18px}
        .how-title{font-family:'Cormorant Garant',serif;font-size:clamp(38px,5vw,54px);font-weight:300;color:#0A1628;letter-spacing:-.02em;line-height:1.1}
        .how-title em{font-style:italic;color:#1E3A6E}
        .steps-grid{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(10,22,40,.08);border-left:1px solid rgba(10,22,40,.08)}
        .step-card{padding:36px 30px;border-right:1px solid rgba(10,22,40,.08);border-bottom:1px solid rgba(10,22,40,.08);transition:background 0.3s;opacity:0;transform:translateY(18px)}
        .step-card.visible{opacity:1;transform:translateY(0)}
        .step-card:hover{background:rgba(10,22,40,.02)}
        .step-num{font-family:'Cormorant Garant',serif;font-size:11px;font-weight:300;color:#1E3A6E;letter-spacing:.12em;margin-bottom:18px;opacity:.5}
        .step-title{font-family:'Cormorant Garant',serif;font-size:18px;font-weight:400;color:#0A1628;margin-bottom:12px;line-height:1.25}
        .step-desc{font-size:11.5px;font-weight:300;color:#8A9BB0;line-height:1.9;letter-spacing:.01em}

        /* CTA FINAL */
        .cta-inner{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#0A1628;padding:0 48px}
        .cta-eyebrow{font-size:9px;font-weight:500;letter-spacing:.32em;color:rgba(255,255,255,.25);margin-bottom:22px}
        .cta-title{font-family:'Cormorant Garant',serif;font-size:clamp(40px,5.5vw,64px);font-weight:300;color:white;letter-spacing:-.025em;line-height:1.05;margin-bottom:16px}
        .cta-title em{font-style:italic;color:rgba(255,255,255,.4)}
        .cta-sub{font-size:12px;font-weight:300;color:rgba(255,255,255,.3);margin-bottom:48px;letter-spacing:.03em}
        .btn-cta-white{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.2em;background:white;color:#0A1628;border:none;padding:18px 60px;cursor:pointer;transition:opacity 0.2s}
        .btn-cta-white:hover{opacity:.88}
        .cta-footer{position:absolute;bottom:28px;left:0;right:0;display:flex;justify-content:space-between;padding:0 52px}
        .cta-footer-text{font-size:9px;color:rgba(255,255,255,.15);letter-spacing:.1em;font-family:'Cormorant Garant',serif}
      `}</style>

      <div className="snap-container" id="snapContainer">

        {/* ── SECTION 1 : HERO ── */}
        <section className="snap-section hero-section">
          <canvas className="bg-canvas" id="bgCanvas" />
          <p className="eyebrow">GESTION DE PATRIMOINE OPTIMISÉE</p>
          <h1 className="hero-title">Zero<br /><em>CGP.</em></h1>
          <p className="hero-sub">Optimisez votre portefeuille avec précision.<br />Zéro compromis sur vos rendements.</p>
          <button className="btn-cta" onClick={() => router.push("/auth/register")}>COMMENCER →</button>
          <div className="scroll-hint" id="scrollHint">
            <span>COMMENT ÇA FONCTIONNE</span>
            <div className="scroll-arrow" />
          </div>
        </section>

        {/* NAV fixe */}
        <nav className="nav" id="mainNav">
          <div className="logo">ZERO CGP</div>
          <div className="nav-actions">
            <button className="btn-connexion" onClick={() => router.push("/auth/login")}>CONNEXION</button>
            <div className="nav-sep" />
            <button className="btn-inscrire" onClick={() => router.push("/auth/register")}>S'INSCRIRE</button>
          </div>
        </nav>

        {/* ── SECTION 2 : HOW IT WORKS ── */}
        <section className="how-section">
          <div className="how-inner">
            <div className="how-header">
              <p className="how-eyebrow">LE PROCESSUS</p>
              <h2 className="how-title">Comment fonctionne<br /><em>Zero CGP ?</em></h2>
            </div>
            <div className="steps-grid">
              {steps.map((s) => (
                <div key={s.n} className="step-card">
                  <div className="step-num">{s.n}</div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 3 : CTA ── */}
        <section className="snap-section cta-section">
          <div className="cta-inner">
            <p className="cta-eyebrow">PRÊT À OPTIMISER</p>
            <h2 className="cta-title">Commencez<br /><em>gratuitement.</em></h2>
            <p className="cta-sub">Aucune carte bancaire requise · Données sécurisées · Gratuit</p>
            <button className="btn-cta-white" onClick={() => router.push("/auth/register")}>COMMENCER MAINTENANT →</button>
          </div>
          <div className="cta-footer">
            <span className="cta-footer-text">ZERO CGP</span>
            <span className="cta-footer-text">© 2025 TOUS DROITS RÉSERVÉS</span>
          </div>
        </section>

      </div>

      <script dangerouslySetInnerHTML={{ __html: `
      (function(){
        var container = document.getElementById('snapContainer');
        var nav = document.getElementById('mainNav');
        var hint = document.getElementById('scrollHint');

        // Nav change on scroll
        container.addEventListener('scroll', function(){
          if(nav) nav.classList.toggle('scrolled', container.scrollTop > 60);
        });

        // Click flèche → scroll section 2
        if(hint) hint.addEventListener('click', function(){
          container.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
        });

        // Canvas courbes animées
        var canvas = document.getElementById('bgCanvas');
        if(!canvas) return;
        var ctx = canvas.getContext('2d'), W, H, t = 0;
        function resize(){ W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
        resize(); window.addEventListener('resize', resize);
        var lines = [
          { yB:.60, amp:32, f:.75, sp:.0014, col:'rgba(30,58,110,0.08)',  w:1.1 },
          { yB:.70, amp:22, f:.90, sp:.0019, col:'rgba(30,58,110,0.055)', w:.65 },
          { yB:.50, amp:24, f:.65, sp:.0011, col:'rgba(30,58,110,0.05)',  w:.55 },
          { yB:.80, amp:17, f:1.0, sp:.0024, col:'rgba(30,58,110,0.038)', w:.4  },
          { yB:.40, amp:19, f:.55, sp:.0016, col:'rgba(30,58,110,0.032)', w:.35 },
        ];
        function drawLine(l){
          var pts = [], N = 14;
          for(var i=0;i<=N;i++){
            var x = (i/N)*W;
            var ph = (i/N)*Math.PI*2*l.f;
            var y = H*l.yB + Math.sin(t*l.sp*1000+ph)*l.amp + Math.cos(t*l.sp*680+ph*.7)*(l.amp*.38);
            pts.push([x,y]);
          }
          ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
          for(var j=1;j<pts.length-1;j++){
            ctx.quadraticCurveTo(pts[j][0],pts[j][1],(pts[j][0]+pts[j+1][0])/2,(pts[j][1]+pts[j+1][1])/2);
          }
          ctx.strokeStyle=l.col; ctx.lineWidth=l.w; ctx.stroke();
        }
        function animate(ts){ t=ts; ctx.clearRect(0,0,W,H); lines.forEach(drawLine); requestAnimationFrame(animate); }
        requestAnimationFrame(animate);

        // Apparition des cards au scroll
        var cards = document.querySelectorAll('.step-card');
        var obs = new IntersectionObserver(function(entries){
          entries.forEach(function(e){
            if(e.isIntersecting){
              var i = Array.from(cards).indexOf(e.target);
              setTimeout(function(){ e.target.classList.add('visible'); e.target.style.transition='opacity 0.6s ease, transform 0.6s ease'; }, i * 70);
            }
          });
        },{ threshold: 0.1 });
        cards.forEach(function(c){ obs.observe(c); });
      })();
      `}} />
    </>
  );
}
