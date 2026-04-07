"use client";
import { useState, useEffect, useRef, ReactNode } from "react";

/* ─── Hook typing ─────────────────────────────────── */
export function useTyping(text: string, started: boolean, speed = 78) {
  const [d, setD] = useState("");
  useEffect(() => {
    if (!started) return;
    setD("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setD(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, started]);
  return d;
}

/* ─── Courbes frontière efficiente (canvas SVG-like) ─ */
function EfficientFrontier() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const W = c.offsetWidth, H = c.offsetHeight;
    c.width = W; c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    // Dessiner 4 courbes paraboliques — frontière efficiente stylisée
    const curves = [
      { start: [W*0.05, H*0.92], cp1: [W*0.25, H*0.35], cp2: [W*0.60, H*0.08], end: [W*0.95, H*0.04], op: 0.025 },
      { start: [W*0.05, H*0.96], cp1: [W*0.30, H*0.50], cp2: [W*0.65, H*0.18], end: [W*0.95, H*0.14], op: 0.018 },
      { start: [W*0.05, H*0.88], cp1: [W*0.20, H*0.22], cp2: [W*0.55, H*0.02], end: [W*0.90, H*0.01], op: 0.014 },
      { start: [W*0.10, H*0.99], cp1: [W*0.35, H*0.65], cp2: [W*0.70, H*0.30], end: [W*0.98, H*0.25], op: 0.010 },
    ];

    curves.forEach(({ start, cp1, cp2, end, op }) => {
      ctx.beginPath();
      ctx.moveTo(start[0], start[1]);
      ctx.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], end[0], end[1]);
      ctx.strokeStyle = `rgba(10,22,40,${op})`;
      ctx.lineWidth = 1.0;
      ctx.stroke();
    });

    // Points sur la frontière — Sharpe, Min Variance, Max Utility
    const pts = [
      { x: W*0.48, y: H*0.14, label: "Sharpe Max" },
      { x: W*0.22, y: H*0.44, label: "Var. Min" },
      { x: W*0.68, y: H*0.08, label: "Utilité Max" },
    ];
    pts.forEach(({ x, y, label }) => {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10,22,40,0.12)";
      ctx.fill();
      ctx.font = "8px Inter, sans-serif";
      ctx.fillStyle = "rgba(10,22,40,0.08)";
      ctx.fillText(label, x + 5, y - 3);
    });

    // Axes discrets
    ctx.beginPath();
    ctx.moveTo(W*0.05, H*0.05); ctx.lineTo(W*0.05, H*0.96);
    ctx.moveTo(W*0.05, H*0.96); ctx.lineTo(W*0.96, H*0.96);
    ctx.strokeStyle = "rgba(10,22,40,0.06)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }, []);

  return <canvas ref={ref} style={{
    position:"absolute", inset:0,
    width:"100%", height:"100%",
    pointerEvents:"none", zIndex:1,
  }}/>;
}

/* ─── Constellation légère ────────────────────────── */
type Node = { x:number; y:number; vx:number; vy:number };
function Constellation() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const N = 22;
    const nodes: Node[] = Array.from({length:N}, () => ({
      x: Math.random()*c.offsetWidth, y: Math.random()*c.offsetHeight,
      vx: (Math.random()-.5)*.15, vy: (Math.random()-.5)*.15,
    }));
    let raf: number;
    function draw() {
      const W=c!.offsetWidth, H=c!.offsetHeight;
      c!.width=W; c!.height=H;
      const ctx=c!.getContext("2d")!;
      ctx.clearRect(0,0,W,H);
      nodes.forEach(n=>{
        n.x+=n.vx; n.y+=n.vy;
        if(n.x<0||n.x>W) n.vx*=-1;
        if(n.y<0||n.y>H) n.vy*=-1;
      });
      for(let i=0;i<N;i++) for(let j=i+1;j<N;j++){
        const dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d<120){
          ctx.beginPath();
          ctx.moveTo(nodes[i].x,nodes[i].y);
          ctx.lineTo(nodes[j].x,nodes[j].y);
          ctx.strokeStyle=`rgba(10,22,40,${(1-d/120)*.04})`;
          ctx.lineWidth=0.4; ctx.stroke();
        }
      }
      nodes.forEach(n=>{
        ctx.beginPath(); ctx.arc(n.x,n.y,1,0,Math.PI*2);
        ctx.fillStyle="rgba(10,22,40,0.12)"; ctx.fill();
      });
      raf=requestAnimationFrame(draw);
    }
    draw();
    return()=>cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={ref} style={{
    position:"absolute",inset:0,width:"100%",height:"100%",
    pointerEvents:"none",zIndex:0,
  }}/>;
}

/* ─── Layout ──────────────────────────────────────── */
interface P {
  leftTitle1:string; leftTitle2:string;
  leftSub:ReactNode; children:ReactNode;
  typing1Done?:boolean;
}
export default function AuthLayout({leftTitle1,leftTitle2,leftSub,children,typing1Done}:P) {
  return (
    <div style={{
      minHeight:"100vh",
      // Dégradé radial : crème HG → bleu nuit désaturé BD
      background:"radial-gradient(ellipse 140% 120% at 8% 6%, #F9F8F6 0%, #F2EDE6 28%, #DDE3EC 58%, #C8D2E0 78%, #1E2D42 100%)",
      display:"flex", position:"relative", overflow:"hidden",
    }}>
      {/* Grain subtil cohérence Hero */}
      <div className="hero-grain" style={{
        position:"absolute",inset:0,pointerEvents:"none",zIndex:0,
      }}/>

      {/* ── Gauche — texte sur fond crème ──────────── */}
      <div style={{
        width:"46%", position:"relative", flexShrink:0,
        display:"flex", flexDirection:"column", justifyContent:"center",
        padding:"0 56px",
      }}>
        {/* Constellation très légère */}
        <Constellation/>
        {/* Courbes frontière efficiente */}
        <EfficientFrontier/>

        {/* Logo */}
        <div style={{
          position:"absolute", top:36, left:56, zIndex:4,
          fontFamily:"'Cormorant Garant',serif",
          fontSize:12, fontWeight:400, letterSpacing:".38em",
          color:"rgba(10,22,40,0.38)", textTransform:"uppercase",
        }}>Zero CGP</div>

        {/* Contenu */}
        <div style={{position:"relative",zIndex:4}}>
          <div style={{
            width:20, height:"0.5px",
            background:"rgba(10,22,40,0.20)", marginBottom:22,
          }}/>
          <h1 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(36px,4.4vw,54px)",
            fontWeight:300, color:"rgba(10,22,40,0.90)",
            lineHeight:1.10, margin:"0 0 2px",
          }}>
            {leftTitle1}
            {!typing1Done && leftTitle1.length>0 && (
              <span style={{color:"rgba(45,90,67,0.60)",animation:"typing-cursor 1.1s infinite"}}>|</span>
            )}
          </h1>
          <h1 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(36px,4.4vw,54px)",
            fontWeight:300, fontStyle:"italic",
            color:"rgba(10,22,40,0.26)",
            lineHeight:1.10, margin:"0 0 24px",
          }}>
            {leftTitle2}
            {typing1Done && (
              <span style={{color:"rgba(45,90,67,0.60)",animation:"typing-cursor 1.1s infinite"}}>|</span>
            )}
          </h1>
          <div style={{
            fontFamily:"'Inter',sans-serif",
            fontSize:12.5, fontWeight:300,
            color:"rgba(10,22,40,0.44)",
            lineHeight:1.85, maxWidth:268,
          }}>{leftSub}</div>
        </div>
      </div>

      {/* Ligne séparatrice — très douce sur fond dégradé */}
      <div style={{
        width:"0.5px", alignSelf:"stretch", flexShrink:0, zIndex:4,
        background:"linear-gradient(180deg, rgba(10,22,40,0.06) 0%, rgba(10,22,40,0.14) 50%, rgba(255,255,255,0.10) 100%)",
        animation:"pulse-line 5s ease-in-out infinite",
      }}/>

      {/* ── Droite — formulaire glassmorphism pont ─── */}
      <div style={{
        flex:1, display:"flex", alignItems:"center",
        justifyContent:"center", padding:"48px 52px",
        position:"relative", zIndex:4,
      }}>
        <div style={{
          width:"100%", maxWidth:372,
          // Verre givré légèrement teinté bleu nuit — laisse voir le dégradé
          background:"rgba(10,22,40,0.06)",
          backdropFilter:"blur(24px)",
          WebkitBackdropFilter:"blur(24px)",
          border:"0.5px solid rgba(255,255,255,0.55)",
          borderRadius:14,
          padding:"38px 34px 34px",
          boxShadow:[
            "0 4px 32px rgba(10,22,40,0.12)",
            "0 20px 60px rgba(10,22,40,0.08)",
            "inset 0 1px 0 rgba(255,255,255,0.70)",
            "inset 0 -0.5px 0 rgba(10,22,40,0.06)",
          ].join(", "),
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
