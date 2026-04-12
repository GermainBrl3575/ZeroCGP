"use client";
import { useState, useEffect, ReactNode } from "react";

export function useTyping(text: string, started: boolean, speed = 78) {
  const [d, setD] = useState("");
  useEffect(() => {
    if (!started) return;
    setD("");
    let i = 0;
    const id = setInterval(() => { i++; setD(text.slice(0, i)); if (i >= text.length) clearInterval(id); }, speed);
    return () => clearInterval(id);
  }, [text, started, speed]);
  return d;
}

const C = {
  cream:"#F9F8F6", navy:"#050B14", navyText:"rgba(5,11,20,0.88)", navyMid:"#0c1a2e",
  sapphire:"#1a3a6a", sapphireGlow:"rgba(26,58,106,0.25)",
  sheet:"rgba(255,255,255,0.42)",
  sheetShadow:"0 1px 0 rgba(255,255,255,0.8) inset, 0 20px 50px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.012)",
};
export { C as AuthC };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap');
@keyframes grain{0%{transform:translate(0)}100%{transform:translate(-40px,-40px)}}
@keyframes glowDrift1{0%,100%{transform:translate(0,0) scale(1);opacity:.4}33%{transform:translate(50px,-35px) scale(1.15);opacity:.55}66%{transform:translate(-25px,25px) scale(.9);opacity:.35}}
@keyframes glowDrift2{0%,100%{transform:translate(0,0) scale(1);opacity:.25}50%{transform:translate(-40px,35px) scale(1.2);opacity:.4}}
@keyframes glowDrift3{0%,100%{transform:translate(0,0) scale(1);opacity:.18}40%{transform:translate(35px,20px) scale(1.1);opacity:.3}80%{transform:translate(-20px,-25px) scale(.85);opacity:.14}}
@keyframes frontierDraw{0%{stroke-dashoffset:800}100%{stroke-dashoffset:0}}
@keyframes dotAppear{0%{opacity:0}100%{opacity:.08}}
@keyframes optimalPoint{0%{r:0;opacity:0}100%{r:8;opacity:.12}}
@keyframes optimalDot{0%{r:0;opacity:0}100%{r:3;opacity:.1}}
`;

export function useStagger(loaded: boolean) {
  return (i: number): React.CSSProperties => ({
    opacity: loaded ? 1 : 0,
    transform: loaded ? "translateY(0)" : "translateY(16px)",
    transition: `opacity .7s cubic-bezier(.23,1,.32,1) ${0.15 + i * 0.1}s, transform .7s cubic-bezier(.23,1,.32,1) ${0.15 + i * 0.1}s`,
  });
}

interface P {
  title1: string; title2: string;
  leftSub: ReactNode; children: ReactNode;
}

export default function AuthLayout({ title1, title2, leftSub, children }: P) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);
  const stg = useStagger(loaded);

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        minHeight: "100vh", background: C.cream, display: "flex",
        position: "relative", overflow: "hidden", fontFamily: "Inter,sans-serif",
      }}>
        {/* Paper grain */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: .018, animation: "grain 8s linear infinite",
        }} />

        {/* Navy glow orbs */}
        <div style={{ position:"fixed",top:"-5%",right:"5%",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(26,58,106,.18) 0%,rgba(26,58,106,.06) 35%,rgba(26,58,106,.02) 55%,transparent 70%)",animation:"glowDrift1 12s ease-in-out infinite",pointerEvents:"none",zIndex:0 }}/>
        <div style={{ position:"fixed",bottom:"-5%",left:"-5%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(26,58,106,.12) 0%,rgba(26,58,106,.04) 35%,rgba(26,58,106,.01) 55%,transparent 70%)",animation:"glowDrift2 16s ease-in-out infinite",pointerEvents:"none",zIndex:0 }}/>
        <div style={{ position:"fixed",top:"30%",left:"35%",width:450,height:450,borderRadius:"50%",background:"radial-gradient(circle,rgba(26,58,106,.08) 0%,rgba(26,58,106,.02) 40%,transparent 65%)",animation:"glowDrift3 20s ease-in-out infinite",pointerEvents:"none",zIndex:0 }}/>

        {/* Markowitz watermark SVG */}
        <svg style={{ position:"fixed",top:"50%",left:"30%",transform:"translate(-50%,-50%)",width:700,height:460,pointerEvents:"none",zIndex:0 }} viewBox="0 0 700 460">
          {/* Grid lines */}
          {[0,1,2,3,4].map(i=><line key={`g${i}`} x1="40" y1={60+i*80} x2="660" y2={60+i*80} stroke={C.sapphire} strokeWidth="0.3" opacity="0.04"/>)}
          {/* Scatter dots */}
          {Array.from({length:30},(_,i)=>({x:60+(i*21.3)%580,y:80+(i*37.7)%300})).map((p,i)=>(
            <circle key={`d${i}`} cx={p.x} cy={p.y} r="3" fill={C.sapphire} opacity="0" style={{animation:`dotAppear .8s ease ${1.5+i*0.06}s both`}}/>
          ))}
          {/* Efficient frontier curve */}
          <path d="M60,400 Q140,350 220,295 Q300,245 380,215 Q460,190 540,182 Q620,178 660,185" fill="none" stroke={C.sapphire} strokeWidth="2" opacity="0.09" strokeDasharray="800" style={{animation:"frontierDraw 3s cubic-bezier(.16,1,.3,1) 0.8s both"}}/>
          {/* Second offset curve */}
          <path d="M60,420 Q150,375 240,325 Q330,280 420,255 Q510,235 600,230 Q650,228 680,235" fill="none" stroke={C.sapphire} strokeWidth="1" opacity="0.05" strokeDasharray="800" style={{animation:"frontierDraw 3s cubic-bezier(.16,1,.3,1) 2s both"}}/>
          {/* Capital Market Line */}
          <line x1="50" y1="380" x2="560" y2="120" stroke={C.sapphire} strokeWidth="0.8" strokeDasharray="4 3" opacity="0.06" style={{animation:"frontierDraw 2.5s ease 2s both"}}/>
          {/* Optimal point */}
          <circle cx="420" cy="168" r="0" fill="none" stroke={C.sapphire} strokeWidth="1.5" style={{animation:"optimalPoint 0.8s ease 3.2s both"}}/>
          <circle cx="420" cy="168" r="0" fill={C.sapphire} style={{animation:"optimalDot 0.6s ease 3.4s both"}}/>
        </svg>

        {/* Left — Welcome text */}
        <div style={{ flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"60px 80px",position:"relative",zIndex:1 }}>
          <div style={{ ...stg(0),position:"absolute",top:40,left:80,fontSize:11.5,fontWeight:500,letterSpacing:".3em",color:"rgba(5,11,20,0.36)",textTransform:"uppercase" }}>Zero CGP</div>
          <h1 style={stg(1)}>
            <span style={{ display:"block",fontFamily:"'Cormorant Garamond',serif",fontSize:48,fontWeight:600,color:C.navyText,letterSpacing:"-.02em",lineHeight:1.1 }}>{title1}</span>
            <span style={{ display:"block",fontFamily:"'Cormorant Garamond',serif",fontSize:48,fontWeight:600,fontStyle:"italic",color:C.sapphire,opacity:0.5,letterSpacing:"-.02em",lineHeight:1.1 }}>{title2}</span>
          </h1>
          <div style={{ ...stg(2),fontSize:14.5,fontWeight:400,color:"rgba(5,11,20,0.4)",lineHeight:1.8,marginTop:20,maxWidth:320 }}>{leftSub}</div>
        </div>

        {/* Right — Form in Sheet */}
        <div style={{ width:440,display:"flex",alignItems:"center",padding:"40px 60px 40px 0",position:"relative",zIndex:1 }}>
          <div style={{
            ...stg(3), width:"100%", background:C.sheet, borderRadius:12,
            border:"0.5px solid rgba(5,11,20,0.035)", boxShadow:C.sheetShadow,
            padding:"44px 40px", position:"relative",
            backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='.01'/%3E%3C/svg%3E")`,
          }}>
            <div style={{ position:"absolute",top:0,left:20,right:20,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,.65) 30%,rgba(255,255,255,.85) 50%,rgba(255,255,255,.65) 70%,transparent)" }}/>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
