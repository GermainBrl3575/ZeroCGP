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

const CSS = `
@keyframes authFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes authGrain{0%,100%{transform:translate(0,0)}10%{transform:translate(-5%,-10%)}30%{transform:translate(3%,2%)}50%{transform:translate(-3%,5%)}70%{transform:translate(5%,-5%)}90%{transform:translate(-5%,10%)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
`;

interface P {
  leftTitle1: string; leftTitle2: string;
  leftSub: ReactNode; children: ReactNode;
  typing1Done?: boolean;
}

export default function AuthLayout({ leftTitle1, leftTitle2, leftSub, children, typing1Done }: P) {
  return (
    <>
      <style>{CSS}</style>
      <div style={{
        minHeight: "100vh", background: "#F9F8F6",
        display: "flex", position: "relative", overflow: "hidden",
        fontFamily: "Inter,sans-serif",
      }}>
        {/* Grain texture */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='.018'/%3E%3C/svg%3E")`,
          animation: "authGrain 8s steps(10) infinite",
        }} />

        {/* Watermark Markowitz */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.012, zIndex: 0 }} viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
          {[0, 1, 2, 3, 4].map(i => <line key={i} x1="60" y1={60 + i * 70} x2="740" y2={60 + i * 70} stroke="#050B14" strokeWidth="0.25" />)}
          <path d={`M60,340 ${Array.from({ length: 51 }, (_, i) => { const t = i / 50; return `L${60 + t * 680},${340 - (Math.sqrt(t) * 12 - t * t * 3) / 10 * 280}`; }).join(" ")}`} fill="none" stroke="#050B14" strokeWidth="1.2" />
          <line x1="60" y1="310" x2="580" y2="90" stroke="#050B14" strokeWidth="0.4" strokeDasharray="3 2.5" />
        </svg>

        {/* Left — Welcome text */}
        <div style={{
          width: "46%", position: "relative", flexShrink: 0,
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "0 56px", zIndex: 2,
        }}>
          {/* Logo */}
          <div style={{
            position: "absolute", top: 36, left: 56, zIndex: 4,
            fontSize: 11.5, fontWeight: 500, letterSpacing: ".3em",
            color: "rgba(5,11,20,0.36)", textTransform: "uppercase",
          }}>ZERO CGP</div>

          <div style={{ position: "relative", zIndex: 4 }}>
            <div style={{ width: 20, height: "0.5px", background: "rgba(5,11,20,0.15)", marginBottom: 22 }} />
            <h1 style={{
              fontSize: 42, fontWeight: 500, color: "rgba(5,11,20,0.88)",
              letterSpacing: "-.03em", lineHeight: 1.10, margin: "0 0 2px",
              animation: "authFadeUp .5s ease both", animationDelay: "0.1s",
            }}>
              {leftTitle1}
            </h1>
            <h1 style={{
              fontSize: 42, fontWeight: 500, color: "rgba(5,11,20,0.25)",
              letterSpacing: "-.03em", lineHeight: 1.10, margin: "0 0 24px",
              animation: "authFadeUp .5s ease both", animationDelay: "0.2s",
            }}>
              {leftTitle2}
            </h1>
            <div style={{
              fontSize: 14, fontWeight: 400,
              color: "rgba(5,11,20,0.4)", lineHeight: 1.8, maxWidth: 300,
              animation: "authFadeUp .5s ease both", animationDelay: "0.3s",
            }}>{leftSub}</div>
          </div>
        </div>

        {/* Separator */}
        <div style={{
          width: "0.5px", alignSelf: "stretch", flexShrink: 0, zIndex: 4,
          background: "linear-gradient(180deg, transparent 10%, rgba(5,11,20,0.06) 50%, transparent 90%)",
        }} />

        {/* Right — Form in Sheet */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center",
          justifyContent: "center", padding: "48px 52px",
          position: "relative", zIndex: 4,
        }}>
          <div style={{
            width: "100%", maxWidth: 400,
            background: "rgba(255,255,255,0.42)", borderRadius: 12,
            border: "0.5px solid rgba(5,11,20,0.035)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.8) inset, 0 20px 50px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.012)",
            padding: "48px 44px", position: "relative",
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='.01'/%3E%3C/svg%3E")`,
            animation: "authFadeUp .6s ease both", animationDelay: "0.3s",
          }}>
            {/* Top light edge */}
            <div style={{
              position: "absolute", top: 0, left: 20, right: 20, height: 1,
              background: "linear-gradient(90deg,transparent,rgba(255,255,255,.65) 30%,rgba(255,255,255,.85) 50%,rgba(255,255,255,.65) 70%,transparent)",
            }} />
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
