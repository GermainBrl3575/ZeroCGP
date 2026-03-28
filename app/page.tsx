"use client";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const steps = [
    { n: "01", title: "Créez votre compte", desc: "Inscription en 30 secondes. Vos données sont chiffrées et ne sont jamais partagées." },
    { n: "02", title: "Saisissez votre portefeuille", desc: "Entrez vos actifs par nom, symbole ou ISIN. Les prix se calculent automatiquement en temps réel." },
    { n: "03", title: "Visualisez votre exposition", desc: "Une heatmap interactive révèle immédiatement la concentration et les déséquilibres de votre portefeuille." },
    { n: "04", title: "Répondez à 7 questions", desc: "Horizon, tolérance au risque, zones géographiques, filtres ESG — votre profil investisseur en 2 minutes." },
    { n: "05", title: "L'algorithme optimise", desc: "Markowitz calcule la frontière efficiente sur 5 ans de données historiques avec shrinkage de Ledoit-Wolf." },
    { n: "06", title: "Choisissez votre méthode", desc: "3 portefeuilles optimaux : variance minimale, ratio de Sharpe maximum, ou utilité maximale." },
    { n: "07", title: "Suivez les dérives", desc: "Des alertes automatiques vous préviennent quand votre portefeuille s'écarte de ses cibles d'allocation." },
    { n: "08", title: "Simulez l'avenir", desc: "1 000 simulations Monte Carlo projettent votre patrimoine sur 10, 20 ou 30 ans avec intervalles de confiance." },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,600;1,300&family=Inter:wght@300;400;500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        html{scroll-behavior:smooth}
        body{background:#FAFAF8;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}
        .nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:28px 52px;transition:background 0.4s,backdrop-filter 0.4s}
        .nav.scrolled{background:rgba(250,250,248,0.92);backdrop-filter:blur(12px);border-bottom:1px solid rgba(10,22,40,.06)}
        .logo{font-family:'Cormorant Garant',serif;font-size:13px;font-weight:400;letter-spacing:.28em;color:#0A1628}
        .nav-actions{display:flex;align-items:center}
        .btn-connexion{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;color:#0A1628;background:transparent;border:1px solid rgba(10,22,40,.35);padding:10px 24px;cursor:pointer;position:relative;overflow:hidden;transition:color 0.5s ease}
        .btn-connexion::before{content:'';position:absolute;inset:0;background:#0A1628;transform:scaleX(0);transform-origin:left;transition:transform 0.5s cubic-bezier(0.4,0,0.2,1);z-index:-1}
        .btn-connexion:hover::before{transform:scaleX(1)}
        .btn-connexion:hover{color:white}
        .nav-sep{width:1px;height:26px;background:#0A1628;opacity:.15;margin:0 1px}
        .btn-inscrire{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;color:white;background:#0A1628;border:1px solid #0A1628;padding:10px 24px;cursor:pointer;transition:opacity 0.2s}
        .btn-inscrire:hover{opacity:.82}
        .hero-section{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 48px 80px;position:relative;overflow:hidden}
        .eyebrow{font-size:9px;font-weight:500;letter-spacing:.32em;color:#1E3A6E;margin-bottom:36px;position:relative;z-index:1}
        .hero-title{font-family:'Cormorant Garant',serif;font-weight:300;font-size:clamp(80px,11vw,120px);line-height:.88;color:#0A1628;letter-spacing:-.025em;position:relative;z-index:1}
        .hero-title em{font-style:italic;color:#1E3A6E}
        .hero-sub{font-size:13px;font-weight:300;color:#8A9BB0;line-height:1.9;margin:32px auto 52px;letter-spacing:.02em;max-width:380px;position:relative;z-index:1}
        .btn-cta{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.18em;background:#0A1628;color:white;border:none;padding:18px 58px;cursor:pointer;transition:opacity 0.2s;position:relative;z-index:1}
        .btn-cta:hover{opacity:.82}
        .scroll-hint{position:absolute;bottom:44px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;z-index:2;opacity:0;animation:fadeInUp 1s 1.4s ease forwards}
        .scroll-hint span{font-size:8px;font-weight:500;letter-spacing:.22em;color:#8A9BB0}
        .scroll-arrow{width:1px;height:44px;background:linear-gradient(to bottom,transparent,#1E3A6E);position:relative;animation:arrowPulse 2s infinite}
        .scroll-arrow::after{content:'';position:absolute;bottom:0;left:50%;width:5px;height:5px;border-right:1px solid #1E3A6E;border-bottom:1px solid #1E3A6E;transform:translateX(-50%) rotate(45deg)}
        @keyframes arrowPulse{0%,100%{opacity:.3}50%{opacity:1}}
        @keyframes fadeInUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .how-section{background:#FAFAF8;padding:120px 52px;position:relative}
        .how-header{text-align:center;margin-bottom:88px}
        .how-eyebrow{font-size:9px;font-weight:500;letter-spacing:.32em;color:#1E3A6E;margin-bottom:20px}
        .how-title{font-family:'Cormorant Garant',serif;font-size:clamp(40px,5vw,58px);font-weight:300;color:#0A1628;letter-spacing:-.02em;line-height:1.1}
        .how-title em{font-style:italic;color:#1E3A6E}
        .steps-grid{display:grid;grid-template-columns:repeat(4,1fr);max-width:1100px;margin:0 auto}
        .step-card{padding:40px 36px;border-right:1px solid rgba(10,22,40,.07);border-bottom:1px solid rgba(10,22,40,.07);transition:background 0.3s;opacity:0;transform:translateY(20px)}
        .step-card:hover{background:rgba(10,22,40,.025)}
        .step-card:nth-child(4n){border-right:none}
        .step-card:nth-child(5),.step-card:nth-child(6),.step-card:nth-child(7),.step-card:nth-child(8){border-bottom:none}
        .step-num{font-family:'Cormorant Garant',serif;font-size:13px;font-weight:300;color:#1E3A6E;letter-spacing:.1em;margin-bottom:20px;opacity:.6}
        .step-title{font-family:'Cormorant Garant',serif;font-size:20px;font-weight:400;color:#0A1628;margin-bottom:14px;line-height:1.2}
        .step-desc{font-size:12px;font-weight:300;color:#8A9BB0;line-height:1.85;letter-spacing:.01em}
        .cta-section{background:#0A1628;padding:100px 52px;text-align:center}
        .cta-eyebrow{font-size:9px;font-weight:500;letter-spacing:.32em;color:rgba(255,255,255,.3);margin-bottom:24px}
        .cta-title{font-family:'Cormorant Garant',serif;font-size:clamp(36px,5vw,56px);font-weight:300;color:white;letter-spacing:-.02em;margin-bottom:16px;line-height:1.1}
        .cta-title em{font-style:italic;color:rgba(255,255,255,.45)}
        .cta-sub{font-size:13px;font-weight:300;color:rgba(255,255,255,.35);margin-bottom:48px;letter-spacing:.02em}
        .btn-cta-white{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.18em;background:white;color:#0A1628;border:none;padding:18px 58px;cursor:pointer;transition:opacity 0.2s}
        .btn-cta-white:hover{opacity:.88}
        .footer{background:#0A1628;border-top:1px solid rgba(255,255,255,.06);padding:28px 52px;display:flex;justify-content:space-between;align-items:center}
        .footer-logo{font-family:'Cormorant Garant',serif;font-size:12px;font-weight:400;letter-spacing:.24em;color:rgba(255,255,255,.3)}
        .footer-copy{font-size:10px;color:rgba(255,255,255,.2);letter-spacing:.06em}
        canvas.bg-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
      `}</style>

      <nav className="nav" id="main-nav">
        <div className="logo">ZERO CGP</div>
        <div className="nav-actions">
          <button className="btn-connexion" onClick={() => router.push("/auth/login")}>CONNEXION</button>
          <div className="nav-sep" />
          <button className="btn-inscrire" onClick={() => router.push("/auth/register")}>S'INSCRIRE</button>
        </div>
      </nav>

      <section className="hero-section" id="hero">
        <canvas className="bg-canvas" id="bgCanvas" />
        <p className="eyebrow">GESTION DE PATRIMOINE OPTIMISÉE</p>
        <h1 className="hero-title">Zero<br /><em>CGP.</em></h1>
        <p className="hero-sub">Optimisez votre portefeuille avec précision.<br />Zéro compromis sur vos rendements.</p>
        <button className="btn-cta" onClick={() => router.push("/auth/register")}>COMMENCER →</button>
        <div className="scroll-hint" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>
          <span>COMMENT ÇA FONCTIONNE</span>
          <div className="scroll-arrow" />
        </div>
      </section>

      <section className="how-section" id="how">
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
      </section>

      <section className="cta-section">
        <p className="cta-eyebrow">PRÊT À OPTIMISER</p>
        <h2 className="cta-title">Commencez<br /><em>gratuitement.</em></h2>
        <p className="cta-sub">Aucune carte bancaire requise · Données sécurisées</p>
        <button className="btn-cta-white" onClick={() => router.push("/auth/register")}>COMMENCER MAINTENANT →</button>
      </section>

      <footer className="footer">
        <div className="footer-logo">ZERO CGP</div>
        <div className="footer-copy">© 2025 ZERO CGP · TOUS DROITS RÉSERVÉS</div>
      </footer>

      <script dangerouslySetInnerHTML={{ __html: `(function(){
        window.addEventListener('scroll',function(){var n=document.getElementById('main-nav');if(n)n.classList.toggle('scrolled',window.scrollY>40);});
        var canvas=document.getElementById('bgCanvas');
        if(!canvas)return;
        var ctx=canvas.getContext('2d'),W,H,t=0;
        function resize(){W=canvas.width=canvas.offsetWidth;H=canvas.height=canvas.offsetHeight;}
        resize();window.addEventListener('resize',resize);
        var lines=[
          {yBase:.62,amp:28,freq:.8, speed:.0015,color:'rgba(30,58,110,0.09)',w:1},
          {yBase:.72,amp:20,freq:.9, speed:.002, color:'rgba(30,58,110,0.06)',w:.6},
          {yBase:.52,amp:22,freq:.7, speed:.0012,color:'rgba(30,58,110,0.05)',w:.5},
          {yBase:.82,amp:16,freq:1.0,speed:.0025,color:'rgba(30,58,110,0.04)',w:.4},
          {yBase:.42,amp:18,freq:.6, speed:.0018,color:'rgba(30,58,110,0.03)',w:.35}
        ];
        function drawLine(l){
          var pts=[];
          for(var i=0;i<=12;i++){var x=(i/12)*W;var y=H*l.yBase+Math.sin(t*l.speed*1000+(i/12)*Math.PI*2*l.freq)*l.amp+Math.cos(t*l.speed*700+(i/12)*Math.PI*1.4*l.freq)*(l.amp*.4);pts.push([x,y]);}
          ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
          for(var j=1;j<pts.length-1;j++){var mx=(pts[j][0]+pts[j+1][0])/2;var my=(pts[j][1]+pts[j+1][1])/2;ctx.quadraticCurveTo(pts[j][0],pts[j][1],mx,my);}
          ctx.strokeStyle=l.color;ctx.lineWidth=l.w;ctx.stroke();
        }
        function animate(ts){t=ts;ctx.clearRect(0,0,W,H);lines.forEach(drawLine);requestAnimationFrame(animate);}
        requestAnimationFrame(animate);
        var cards=document.querySelectorAll('.step-card');
        var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.style.transition='opacity 0.7s '+((Array.from(cards).indexOf(e.target))*0.08)+'s ease, transform 0.7s '+((Array.from(cards).indexOf(e.target))*0.08)+'s ease';e.target.style.opacity='1';e.target.style.transform='translateY(0)';}});},{threshold:0.1});
        cards.forEach(function(c){obs.observe(c);});
      })();`}} />
    </>
  );
}
