"use client";
import { useRouter } from "next/navigation";
export default function LandingPage() {
  const router = useRouter();
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,600;1,300&family=Inter:wght@300;400;500&display=swap');
        .landing-root{min-height:100vh;background:#FAFAF8;display:flex;flex-direction:column;position:relative;overflow:hidden;font-family:'Inter',sans-serif}
        .bg-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
        .nav{display:flex;justify-content:space-between;align-items:center;padding:30px 52px;position:relative;z-index:2}
        .logo{font-family:'Cormorant Garant',serif;font-size:13px;font-weight:400;letter-spacing:.28em;color:#0A1628}
        .nav-actions{display:flex;align-items:center}
        .btn-connexion{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;color:#0A1628;background:transparent;border:1px solid #0A1628;padding:10px 24px;cursor:pointer;position:relative;overflow:hidden;transition:color 0.5s ease}
        .btn-connexion::before{content:'';position:absolute;inset:0;background:#0A1628;transform:scaleX(0);transform-origin:left;transition:transform 0.5s cubic-bezier(0.4,0,0.2,1);z-index:-1}
        .btn-connexion:hover::before{transform:scaleX(1)}
        .btn-connexion:hover{color:white}
        .nav-sep{width:1px;height:28px;background:#0A1628;opacity:.2;margin:0 1px}
        .btn-inscrire{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;color:white;background:#0A1628;border:1px solid #0A1628;padding:10px 24px;cursor:pointer;transition:opacity 0.2s}
        .btn-inscrire:hover{opacity:.82}
        .hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 48px;position:relative;z-index:2}
        .eyebrow{font-size:9px;font-weight:500;letter-spacing:.3em;color:#1E3A6E;margin-bottom:32px}
        .title{font-family:'Cormorant Garant',serif;font-weight:300;font-size:clamp(72px,10vw,108px);line-height:.9;color:#0A1628;margin:0;letter-spacing:-.02em}
        .title em{font-style:italic;color:#1E3A6E}
        .subtitle{font-size:13px;font-weight:300;color:#8A9BB0;line-height:1.85;margin:28px 0 48px;letter-spacing:.02em;max-width:400px}
        .cta{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.18em;background:#0A1628;color:white;border:none;padding:18px 56px;cursor:pointer;transition:opacity 0.2s}
        .cta:hover{opacity:.82}
        .metrics{display:flex;border-top:1px solid rgba(10,22,40,.07);position:relative;z-index:2}
        .metric{flex:1;padding:28px 52px;border-right:1px solid rgba(10,22,40,.07)}
        .metric:last-child{border-right:none}
        .metric-n{font-family:'Cormorant Garant',serif;font-size:34px;font-weight:300;color:#0A1628;line-height:1}
        .metric-l{font-size:9px;font-weight:400;color:#8A9BB0;letter-spacing:.1em;margin-top:6px}
      `}</style>
      <div className="landing-root">
        <svg className="bg-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
          <polyline id="lc1" fill="none" stroke="#1E3A6E" strokeWidth="0.8" strokeOpacity="0.1"/>
          <polyline id="lc2" fill="none" stroke="#1E3A6E" strokeWidth="0.5" strokeOpacity="0.07"/>
          <polyline id="lc3" fill="none" stroke="#1E3A6E" strokeWidth="0.4" strokeOpacity="0.05"/>
        </svg>
        <nav className="nav">
          <div className="logo">ZERO CGP</div>
          <div className="nav-actions">
            <button className="btn-connexion" onClick={() => router.push("/auth/login")}>CONNEXION</button>
            <div className="nav-sep" />
            <button className="btn-inscrire" onClick={() => router.push("/auth/register")}>S'INSCRIRE</button>
          </div>
        </nav>
        <div className="hero">
          <p className="eyebrow">GESTION DE PATRIMOINE OPTIMISÉE</p>
          <h1 className="title">Zero<br /><em>CGP.</em></h1>
          <p className="subtitle">Optimisez votre portefeuille avec précision.<br />Zéro compromis sur vos rendements.</p>
          <button className="cta" onClick={() => router.push("/auth/register")}>COMMENCER →</button>
        </div>
        <div className="metrics">
          {[["33","ACTIFS CANDIDATS"],["3","MÉTHODES MARKOWITZ"],["1 000","SIMULATIONS MONTE CARLO"]].map(([n,l]) => (
            <div key={l} className="metric"><div className="metric-n">{n}</div><div className="metric-l">{l}</div></div>
          ))}
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `(function(){var p1=[[0,580],[150,540],[300,560],[450,510],[600,530],[750,490],[900,510],[1050,475],[1200,490]];var p2=[[0,630],[180,600],[360,618],[540,582],[720,600],[900,568],[1080,585],[1200,572]];var p3=[[0,510],[200,488],[400,505],[600,472],[800,490],[1000,458],[1200,472]];function s(pts){return pts.map(function(p){return p.join(',')}).join(' ')}var t=0;function a(){t+=0.002;var m1=p1.map(function(p,i){return[p[0],p[1]+Math.sin(t+i*.4)*6+Math.sin(t)*5]});var m2=p2.map(function(p,i){return[p[0],p[1]+Math.sin(t*.8+i*.5)*4+Math.cos(t*.7)*4]});var m3=p3.map(function(p,i){return[p[0],p[1]+Math.cos(t*1.1+i*.3)*4+Math.sin(t)*3]});var l1=document.getElementById('lc1');var l2=document.getElementById('lc2');var l3=document.getElementById('lc3');if(l1)l1.setAttribute('points',s(m1));if(l2)l2.setAttribute('points',s(m2));if(l3)l3.setAttribute('points',s(m3));requestAnimationFrame(a);}a();})();` }} />
    </>
  );
}
