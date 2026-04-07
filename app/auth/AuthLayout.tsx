"use client";
import { useState, useEffect, useRef, ReactNode } from "react";

/* ─── Hook typing ─────────────────────────────── */
export function useTyping(text: string, started: boolean, speed = 75) {
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

/* ─── Constellation canvas (fond crème — très subtil) ─── */
type Node = { x:number; y:number; vx:number; vy:number };

function Constellation() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const N = 28;
    const nodes: Node[] = Array.from({length:N}, () => ({
      x: Math.random() * c.offsetWidth,
      y: Math.random() * c.offsetHeight,
      vx: (Math.random()-.5) * 0.18,
      vy: (Math.random()-.5) * 0.18,
    }));
    let raf: number;
    function draw() {
      const W = c!.offsetWidth, H = c!.offsetHeight;
      c!.width = W; c!.height = H;
      const ctx = c!.getContext("2d")!;
      ctx.clearRect(0,0,W,H);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x<0||n.x>W) n.vx*=-1;
        if (n.y<0||n.y>H) n.vy*=-1;
      });
      for (let i=0;i<N;i++) for (let j=i+1;j<N;j++) {
        const dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if (d<140) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x,nodes[i].y);
          ctx.lineTo(nodes[j].x,nodes[j].y);
          ctx.strokeStyle=`rgba(10,22,40,${(1-d/140)*0.06})`;
          ctx.lineWidth=0.5; ctx.stroke();
        }
      }
      nodes.forEach(n=>{
        ctx.beginPath();
        ctx.arc(n.x,n.y,1.1,0,Math.PI*2);
        ctx.fillStyle="rgba(10,22,40,0.14)"; ctx.fill();
      });
      raf=requestAnimationFrame(draw);
    }
    draw();
    return ()=>cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={ref} style={{
    position:"absolute",inset:0,width:"100%",height:"100%",
    pointerEvents:"none",zIndex:0,
  }}/>;
}

/* ─── Phrases Markowitz flottantes — version crème ─────── */
const PHRASES = [
  "Analyse de 490+ actifs","Optimisation de Sharpe",
  "Modèle de Markowitz","Frontière efficiente",
  "Variance minimale","Simulation Monte Carlo",
  "Allocation optimale","Ratio rendement / risque",
  "Gestion passive ETF","Diversification mondiale",
];
type FP = {text:string;x:number;y:number;speed:number;op:number};

function FloatingPhrases() {
  const [items,setItems] = useState<FP[]>(()=>
    PHRASES.map((text,i)=>({
      text, x:3+Math.random()*62, y:5+(i/PHRASES.length)*90,
      speed:0.014+Math.random()*0.010, op:0.04+Math.random()*0.05,
    }))
  );
  useEffect(()=>{
    let raf:number;
    function step(){
      setItems(p=>p.map(f=>({...f,y:f.y-f.speed>-5?f.y-f.speed:105})));
      raf=requestAnimationFrame(step);
    }
    raf=requestAnimationFrame(step);
    return()=>cancelAnimationFrame(raf);
  },[]);
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:1,overflow:"hidden"}}>
      {items.map((p,i)=>(
        <div key={i} style={{
          position:"absolute",left:`${p.x}%`,top:`${p.y}%`,
          opacity:p.op,
          fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:300,
          letterSpacing:".10em",color:"rgba(10,22,40,0.85)",
          whiteSpace:"nowrap",userSelect:"none",
        }}>{p.text}</div>
      ))}
    </div>
  );
}

/* ─── Layout principal ──────────────────────────────────── */
interface AuthLayoutProps {
  leftTitle1:string; leftTitle2:string;
  leftSub:ReactNode; children:ReactNode;
  typing1Done?:boolean;
}

export default function AuthLayout({
  leftTitle1,leftTitle2,leftSub,children,typing1Done,
}:AuthLayoutProps) {
  return (
    <div style={{
      minHeight:"100vh",
      // Fond crème — identique à la Hero
      background:"radial-gradient(ellipse 110% 90% at 12% 8%, #F9F8F6 0%, #F5F2EE 45%, #ECE7E1 100%)",
      display:"flex", position:"relative", overflow:"hidden",
      fontFamily:"'Inter',sans-serif",
    }}>
      {/* Grain subtil (cohérence Hero) */}
      <div className="hero-grain" style={{
        position:"absolute",inset:0,pointerEvents:"none",zIndex:0,
      }}/>

      {/* ── Gauche — fond crème, texte navy ──────────────── */}
      <div style={{
        width:"46%",position:"relative",flexShrink:0,
        display:"flex",flexDirection:"column",justifyContent:"center",
        padding:"0 56px",
      }}>
        <Constellation/>
        <FloatingPhrases/>

        {/* Masque dissolution vers le centre */}
        <div style={{
          position:"absolute",inset:0,zIndex:2,
          background:"linear-gradient(90deg,transparent 0%,rgba(242,238,232,0.35) 55%,rgba(236,231,225,0.97) 86%)",
          pointerEvents:"none",
        }}/>

        {/* Logo */}
        <div style={{
          position:"absolute",top:36,left:56,zIndex:4,
          fontFamily:"'Cormorant Garant',serif",
          fontSize:12,fontWeight:400,letterSpacing:".38em",
          color:"rgba(10,22,40,0.40)",textTransform:"uppercase",
        }}>Zero CGP</div>

        {/* Contenu textuel */}
        <div style={{position:"relative",zIndex:4}}>
          {/* Trait discret */}
          <div style={{
            width:22,height:"0.5px",
            background:"rgba(10,22,40,0.22)",marginBottom:22,
          }}/>

          {/* Titres — bleu nuit profond sur crème */}
          <h1 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(38px,4.5vw,56px)",
            fontWeight:300,color:"rgba(10,22,40,0.92)",
            lineHeight:1.10,margin:"0 0 2px",
          }}>
            {leftTitle1}
            {!typing1Done&&leftTitle1.length>0&&(
              <span style={{color:"rgba(45,90,67,0.65)",animation:"typing-cursor 1.1s ease-in-out infinite"}}>|</span>
            )}
          </h1>
          <h1 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(38px,4.5vw,56px)",
            fontWeight:300,fontStyle:"italic",
            color:"rgba(10,22,40,0.30)",
            lineHeight:1.10,margin:"0 0 26px",
          }}>
            {leftTitle2}
            {typing1Done&&(
              <span style={{color:"rgba(45,90,67,0.65)",animation:"typing-cursor 1.1s ease-in-out infinite"}}>|</span>
            )}
          </h1>

          <div style={{
            fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:300,
            color:"rgba(10,22,40,0.46)",lineHeight:1.85,maxWidth:270,
          }}>{leftSub}</div>
        </div>
      </div>

      {/* Ligne séparatrice — très fine, ton crème foncé */}
      <div style={{
        width:"0.5px",alignSelf:"stretch",flexShrink:0,zIndex:4,
        background:"rgba(10,22,40,0.10)",
        animation:"pulse-line 5s ease-in-out infinite",
      }}/>

      {/* ── Droite — formulaire sombre glassmorphism ─────── */}
      <div style={{
        flex:1,display:"flex",alignItems:"center",
        justifyContent:"center",padding:"48px 52px",
        position:"relative",zIndex:4,
      }}>
        {/* Halo sombre derrière la carte */}
        <div style={{
          position:"absolute",top:"50%",left:"50%",
          transform:"translate(-50%,-50%)",
          width:"80%",height:"80%",
          background:"radial-gradient(ellipse, rgba(5,11,20,0.18) 0%, transparent 72%)",
          pointerEvents:"none",
        }}/>

        <div style={{
          width:"100%",maxWidth:372,
          // Verre dépoli sombre sur fond crème
          background:"rgba(5,11,20,0.82)",
          backdropFilter:"blur(22px)",
          WebkitBackdropFilter:"blur(22px)",
          border:"0.5px solid rgba(255,255,255,0.08)",
          borderRadius:14,padding:"38px 34px 34px",
          boxShadow:"0 32px 80px rgba(5,11,20,0.28), 0 8px 24px rgba(5,11,20,0.18), inset 0 0.5px 0 rgba(255,255,255,0.06)",
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
