"use client";
import { useState, useEffect, useRef, ReactNode } from "react";

/* ─── Hook typing ───────────────────────────────────────── */
export function useTyping(text: string, started: boolean, speed = 72) {
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

/* ─── Constellation canvas (Markowitz abstrait) ─────────── */
type Node = { x:number; y:number; vx:number; vy:number };

function Constellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const N = 38;
    const nodes: Node[] = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - .5) * 0.22,
      vy: (Math.random() - .5) * 0.22,
    }));
    let raf: number;

    function draw() {
      const W = canvas!.offsetWidth;
      const H = canvas!.offsetHeight;
      canvas!.width  = W;
      canvas!.height = H;
      const ctx = canvas!.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);

      // Mise à jour positions
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      // Lignes entre nœuds proches
      const MAX_DIST = 130;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < MAX_DIST) {
            const alpha = (1 - d / MAX_DIST) * 0.10;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(180,200,230,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Points
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(180,200,230,0.30)";
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position:"absolute", inset:0,
      width:"100%", height:"100%",
      pointerEvents:"none", zIndex:0,
    }}/>
  );
}

/* ─── Phrases Markowitz flottantes ──────────────────────── */
const PHRASES = [
  "Analyse de 490+ actifs",
  "Optimisation de Sharpe",
  "Modèle de Markowitz",
  "Frontière efficiente",
  "Variance minimale",
  "10 000 simulations Monte Carlo",
  "Allocation optimale",
  "Ratio rendement / risque",
  "Portefeuille diversifié",
  "Gestion passive ETF",
];

type FloatPhrase = { text: string; x: number; y: number; opacity: number; speed: number };

function FloatingPhrases() {
  const [items, setItems] = useState<FloatPhrase[]>(() =>
    PHRASES.map((text, i) => ({
      text,
      x: 4 + Math.random() * 60,
      y: 8 + (i / PHRASES.length) * 84,
      opacity: 0.05 + Math.random() * 0.07,
      speed: 0.018 + Math.random() * 0.012,
    }))
  );

  useEffect(() => {
    let raf: number;
    function step() {
      setItems(prev => prev.map(p => ({
        ...p,
        y: p.y - p.speed > -5 ? p.y - p.speed : 105,
      })));
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      position:"absolute", inset:0,
      pointerEvents:"none", zIndex:1, overflow:"hidden",
    }}>
      {items.map((p, i) => (
        <div key={i} style={{
          position:"absolute",
          left:`${p.x}%`,
          top:`${p.y}%`,
          opacity: p.opacity,
          fontFamily:"'Inter',sans-serif",
          fontSize:10.5, fontWeight:300, letterSpacing:".10em",
          color:"rgba(200,218,240,1)",
          whiteSpace:"nowrap",
          transition:"none",
          userSelect:"none",
        }}>{p.text}</div>
      ))}
    </div>
  );
}

/* ─── Layout ─────────────────────────────────────────────── */
interface AuthLayoutProps {
  leftTitle1: string;
  leftTitle2: string;
  leftSub: ReactNode;
  children: ReactNode;
  typing1Done?: boolean;
}

export default function AuthLayout({
  leftTitle1, leftTitle2, leftSub, children, typing1Done,
}: AuthLayoutProps) {
  const [wave, setWave] = useState(false);

  function triggerWave() {
    setWave(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setWave(true)));
    setTimeout(() => setWave(false), 1000);
  }

  return (
    <div style={{
      minHeight:"100vh", background:"#050B14",
      display:"flex", position:"relative", overflow:"hidden",
      fontFamily:"'Inter',sans-serif",
    }}>
      {/* Glow doux gauche */}
      <div style={{
        position:"absolute", top:"15%", left:"-8%",
        width:"55%", height:"70%",
        background:"radial-gradient(ellipse, rgba(20,40,80,0.45) 0%, transparent 70%)",
        pointerEvents:"none", zIndex:0,
      }}/>

      {/* Onde focus */}
      {wave && (
        <div style={{
          position:"absolute", inset:0, zIndex:3, pointerEvents:"none",
          background:"linear-gradient(90deg, rgba(74,222,128,0.02) 0%, rgba(74,222,128,0.05) 40%, transparent 80%)",
          animation:"wave-glow 1.0s cubic-bezier(0.22,1,0.36,1) forwards",
        }}/>
      )}

      {/* ── Gauche ──────────────────────────────────────── */}
      <div style={{
        width:"46%", position:"relative", flexShrink:0,
        display:"flex", flexDirection:"column", justifyContent:"center",
        padding:"0 56px",
      }}>
        {/* Canvas constellation */}
        <Constellation/>
        {/* Phrases flottantes */}
        <FloatingPhrases/>

        {/* Masque dissolvant vers le centre */}
        <div style={{
          position:"absolute", inset:0, zIndex:2,
          background:"linear-gradient(90deg, transparent 0%, rgba(5,11,20,0.45) 60%, rgba(5,11,20,0.96) 88%)",
          pointerEvents:"none",
        }}/>
        {/* Masques haut/bas */}
        <div style={{
          position:"absolute", inset:0, zIndex:2,
          background:"linear-gradient(180deg, rgba(5,11,20,0.80) 0%, transparent 18%, transparent 82%, rgba(5,11,20,0.80) 100%)",
          pointerEvents:"none",
        }}/>

        {/* Contenu textuel */}
        <div style={{ position:"relative", zIndex:4 }}>
          {/* Logo */}
          <div style={{
            position:"absolute", top:-200, left:0,
            fontFamily:"'Cormorant Garant',serif",
            fontSize:12, fontWeight:400, letterSpacing:".38em",
            color:"rgba(229,231,235,0.38)", textTransform:"uppercase",
          }}>Zero CGP</div>

          {/* Trait sobre */}
          <div style={{
            width:24, height:"0.5px",
            background:"rgba(229,231,235,0.25)",
            marginBottom:24,
          }}/>

          {/* Titres */}
          <h1 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(38px,4.6vw,58px)",
            fontWeight:300, color:"rgba(229,231,235,0.92)",
            lineHeight:1.10, margin:"0 0 2px",
          }}>
            {leftTitle1}
            {!typing1Done && leftTitle1.length > 0 && (
              <span style={{
                color:"rgba(74,222,128,0.60)",
                animation:"typing-cursor 1.1s ease-in-out infinite",
              }}>|</span>
            )}
          </h1>
          <h1 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(38px,4.6vw,58px)",
            fontWeight:300, fontStyle:"italic",
            color:"rgba(229,231,235,0.28)",
            lineHeight:1.10, margin:"0 0 28px",
          }}>
            {leftTitle2}
            {typing1Done && (
              <span style={{
                color:"rgba(74,222,128,0.60)",
                animation:"typing-cursor 1.1s ease-in-out infinite",
              }}>|</span>
            )}
          </h1>

          <div style={{
            fontFamily:"'Inter',sans-serif",
            fontSize:13, fontWeight:300,
            color:"rgba(229,231,235,0.38)",
            lineHeight:1.85, maxWidth:280,
          }}>{leftSub}</div>
        </div>
      </div>

      {/* Ligne séparatrice pulsante */}
      <div style={{
        width:"0.5px", alignSelf:"stretch", flexShrink:0, zIndex:4,
        background:"rgba(229,231,235,0.06)",
        animation:"pulse-line 5s ease-in-out infinite",
      }}/>

      {/* ── Droite — formulaire ─────────────────────────── */}
      <div style={{
        flex:1, display:"flex", alignItems:"center",
        justifyContent:"center", padding:"48px 52px", zIndex:4,
      }}>
        {/* Halo derrière la carte */}
        <div style={{
          position:"absolute", width:"42%", height:"55%",
          background:"radial-gradient(ellipse, rgba(10,30,60,0.45) 0%, transparent 70%)",
          pointerEvents:"none",
        }}/>

        <div
          style={{
            width:"100%", maxWidth:368,
            background:"rgba(255,255,255,0.025)",
            backdropFilter:"blur(22px)",
            WebkitBackdropFilter:"blur(22px)",
            border:"0.5px solid rgba(255,255,255,0.07)",
            borderRadius:14, padding:"38px 34px 34px",
            boxShadow:"0 24px 64px rgba(5,11,20,0.65), inset 0 0.5px 0 rgba(255,255,255,0.05)",
            position:"relative",
          }}
          onFocus={triggerWave}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
