"use client";
import { useState, useEffect, useRef, ReactNode } from "react";

/* ── Types ─────────────────────────────────────────────── */
type Tick = { sym: string; val: string; chg: string; pos: boolean };

/* ── Données financières factices — style Bloomberg ─────── */
const TICKERS: Tick[] = [
  { sym:"MSCI WLD",  val:"3 842.14", chg:"+1.24%", pos:true  },
  { sym:"S&P 500",   val:"5 211.49", chg:"+0.87%", pos:true  },
  { sym:"CAC 40",    val:"8 134.22", chg:"-0.31%", pos:false },
  { sym:"EURUSD",    val:"1.0842",   chg:"+0.12%", pos:true  },
  { sym:"MSCI EM",   val:"1 142.66", chg:"+1.56%", pos:true  },
  { sym:"BTP 10Y",   val:"3.78%",    chg:"+0.04", pos:false  },
  { sym:"GOLD",      val:"2 354.80", chg:"+0.66%", pos:true  },
  { sym:"OAT 10Y",   val:"3.11%",    chg:"-0.02", pos:true   },
  { sym:"DAX",       val:"18 420.06",chg:"+0.44%", pos:true  },
  { sym:"AMUNDI WLD",val:"512.30",   chg:"+1.18%", pos:true  },
  { sym:"VIX",       val:"13.42",    chg:"-5.21%", pos:true  },
  { sym:"EUR/CHF",   val:"0.9724",   chg:"+0.08%", pos:true  },
  { sym:"MARKOWITZ", val:"0.200%",   chg:"TER ETF", pos:true },
  { sym:"LYXOR WLD", val:"38.14",    chg:"+0.92%", pos:true  },
  { sym:"BNPP S&P",  val:"44.28",    chg:"+0.83%", pos:true  },
  { sym:"NIKKEI",    val:"38 741",   chg:"+0.33%", pos:true  },
];

/* ── Hook typing ────────────────────────────────────────── */
export function useTyping(text: string, started: boolean, speed = 52) {
  const [d, setD] = useState("");
  useEffect(() => {
    if (!started) return;
    setD("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setD(text.slice(0,i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, started]);
  return d;
}

/* ── Grille Bloomberg animée ────────────────────────────── */
function TickerGrid() {
  const [offsets, setOffsets] = useState<number[]>(TICKERS.map((_,i) => i * 52));

  useEffect(() => {
    let raf: number;
    const SPEED = 0.28; // px/frame — très lent
    const HEIGHT = TICKERS.length * 52;
    function step() {
      setOffsets(prev => prev.map(y => {
        const next = y - SPEED;
        return next < -52 ? next + HEIGHT : next;
      }));
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      position:"absolute", top:0, left:0, right:0, bottom:0,
      overflow:"hidden", pointerEvents:"none", zIndex:0,
    }}>
      {/* Masque de dissolution vers le centre */}
      <div style={{
        position:"absolute", inset:0, zIndex:2,
        background:"linear-gradient(90deg, transparent 0%, rgba(5,11,20,0.60) 55%, rgba(5,11,20,0.98) 80%)",
      }}/>
      {/* Masque haut/bas */}
      <div style={{
        position:"absolute", inset:0, zIndex:2,
        background:"linear-gradient(180deg, rgba(5,11,20,0.85) 0%, transparent 20%, transparent 80%, rgba(5,11,20,0.85) 100%)",
      }}/>
      {/* Lignes de tickers */}
      {TICKERS.map((t, i) => (
        <div key={t.sym} style={{
          position:"absolute",
          top: offsets[i] ?? i*52,
          left:0, right:0,
          display:"flex", alignItems:"center", gap:16,
          padding:"0 28px",
          height:52,
          borderBottom:"0.5px solid rgba(229,231,235,0.04)",
          opacity: 0.55,
          transition:"none",
        }}>
          <span style={{
            fontFamily:"'Roboto Mono','JetBrains Mono',monospace",
            fontSize:9.5, fontWeight:400, letterSpacing:".12em",
            color:"rgba(229,231,235,0.40)", minWidth:80,
          }}>{t.sym}</span>
          <span style={{
            fontFamily:"'Roboto Mono',monospace",
            fontSize:12, fontWeight:300,
            color:"rgba(229,231,235,0.55)", minWidth:72,
          }}>{t.val}</span>
          <span style={{
            fontFamily:"'Roboto Mono',monospace",
            fontSize:10, fontWeight:300,
            color: t.pos ? "rgba(74,222,128,0.55)" : "rgba(248,113,113,0.55)",
          }}>{t.chg}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Layout principal ───────────────────────────────────── */
interface AuthLayoutProps {
  leftTitle1: string;
  leftTitle2: string;
  leftSub: ReactNode;
  children: ReactNode;
  typing1Done?: boolean;
}

export default function AuthLayout({
  leftTitle1, leftTitle2, leftSub, children, typing1Done
}: AuthLayoutProps) {
  const [wave, setWave] = useState(false);

  function triggerWave() {
    setWave(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setWave(true)));
    setTimeout(() => setWave(false), 950);
  }

  return (
    <div style={{
      minHeight:"100vh", background:"#050B14",
      display:"flex", position:"relative", overflow:"hidden",
    }}>
      {/* Glow ambiant gauche */}
      <div style={{
        position:"absolute", top:"20%", left:"-10%",
        width:"50%", height:"60%",
        background:"radial-gradient(ellipse, rgba(10,22,40,0.70) 0%, transparent 70%)",
        pointerEvents:"none", zIndex:1,
      }}/>

      {/* Onde focus */}
      {wave && (
        <div style={{
          position:"absolute", inset:0, zIndex:3, pointerEvents:"none",
          background:"linear-gradient(90deg, rgba(74,222,128,0.025) 0%, rgba(74,222,128,0.06) 40%, transparent 75%)",
          animation:"wave-glow 0.9s cubic-bezier(0.22,1,0.36,1) forwards",
        }}/>
      )}

      {/* ── Gauche — grille Bloomberg + titre ───────────── */}
      <div style={{
        width:"46%", position:"relative", flexShrink:0,
        display:"flex", flexDirection:"column", justifyContent:"center",
        padding:"0 52px",
      }}>
        <TickerGrid/>

        {/* Contenu au-dessus */}
        <div style={{ position:"relative", zIndex:4 }}>
          {/* Logo */}
          <div style={{
            position:"absolute", top:-220, left:0,
            fontFamily:"'Cormorant Garant',serif",
            fontSize:12, fontWeight:400, letterSpacing:".38em",
            color:"rgba(229,231,235,0.45)", textTransform:"uppercase",
          }}>Zero CGP</div>

          {/* Trait vert */}
          <div style={{
            width:28, height:"0.5px",
            background:"rgba(74,222,128,0.50)", marginBottom:22,
          }}/>

          {/* Titres */}
          <h1 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(40px,4.8vw,62px)", fontWeight:300,
            color:"rgba(229,231,235,0.90)", lineHeight:1.08, margin:"0 0 2px",
          }}>{leftTitle1}
            {!typing1Done && leftTitle1.length > 0 && (
              <span style={{ color:"rgba(74,222,128,0.85)",
                animation:"typing-cursor 1s infinite" }}>|</span>
            )}
          </h1>
          <h1 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(40px,4.8vw,62px)", fontWeight:300, fontStyle:"italic",
            color:"rgba(229,231,235,0.32)", lineHeight:1.08, margin:"0 0 22px",
          }}>{leftTitle2}
            {typing1Done && leftTitle2.length > 0 && (
              <span style={{ color:"rgba(74,222,128,0.85)",
                animation:"typing-cursor 1s infinite" }}>|</span>
            )}
          </h1>
          <div style={{
            fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:300,
            color:"rgba(229,231,235,0.35)", lineHeight:1.75, maxWidth:260,
          }}>{leftSub}</div>
        </div>
      </div>

      {/* Ligne séparatrice pulsante */}
      <div style={{
        width:"0.5px", alignSelf:"stretch", flexShrink:0, zIndex:4,
        background:"rgba(229,231,235,0.07)",
        animation:"pulse-line 4s ease-in-out infinite",
      }}/>

      {/* ── Droite — formulaire glassmorphism ────────────── */}
      <div style={{
        flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        padding:"48px 52px", position:"relative", zIndex:4,
      }}>
        {/* Glow derrière le card */}
        <div style={{
          position:"absolute", top:"50%", left:"50%",
          transform:"translate(-50%,-50%)",
          width:"70%", height:"60%",
          background:"radial-gradient(ellipse, rgba(74,222,128,0.03) 0%, transparent 70%)",
          pointerEvents:"none",
        }}/>

        <div style={{
          width:"100%", maxWidth:370,
          background:"rgba(255,255,255,0.02)",
          backdropFilter:"blur(20px)",
          WebkitBackdropFilter:"blur(20px)",
          border:"0.5px solid rgba(255,255,255,0.06)",
          borderRadius:14, padding:"40px 36px 36px",
          position:"relative",
          boxShadow:"0 32px 64px rgba(5,11,20,0.60), 0 0 0 0.5px rgba(255,255,255,0.04) inset",
        }}>
          {/* Clone props onFocus vers triggerWave */}
          <div className="auth-form-wrap" data-wave="true"
            onFocus={triggerWave}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
