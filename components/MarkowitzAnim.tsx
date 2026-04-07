"use client";
import { useEffect, useRef } from "react";

const CSS = `
@keyframes calcFin { to { opacity:1 } }
.ca-tag  { font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(5,11,20,.22);margin-bottom:.5rem;opacity:0;animation:calcFin 1s .3s forwards;font-family:'Inter',sans-serif;font-weight:400 }
.ca-h1   { font-family:'Cormorant Garant',serif;font-size:clamp(20px,2.8vw,32px);font-weight:300;color:#050B14;line-height:1.25;letter-spacing:-.3px;opacity:0;animation:calcFin 1s .5s forwards;margin:0 }
.ca-wrap { width:clamp(140px,18vw,240px);margin:1rem auto 0;opacity:0;animation:calcFin 1s .8s forwards }
.ca-bar  { height:1.5px;background:rgba(5,11,20,.05);overflow:hidden }
.ca-fill { height:100%;background:linear-gradient(90deg,#050B14,#4ade80);transition:width .6s cubic-bezier(.16,1,.3,1) }
.ca-pct  { font-size:10px;font-weight:300;color:rgba(5,11,20,.22);margin-top:5px;letter-spacing:1px;text-align:center;font-family:'Inter',sans-serif }
.ca-step { margin-top:.6rem;height:16px;opacity:0;animation:calcFin 1s 1s forwards;text-align:center }
.ca-step span { font-size:11px;font-weight:300;color:rgba(5,11,20,.26);letter-spacing:.3px;font-family:'Inter',sans-serif }
`;

interface Props { calcPct: number; currentStep: string }

export default function MarkowitzAnim({ calcPct, currentStep }: Props) {
  const svgRef  = useRef<SVGSVGElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current || !svgRef.current) return;
    doneRef.current = true;

    const svg   = svgRef.current;
    const NS    = "http://www.w3.org/2000/svg";
    const NAVY  = "#050B14";
    const GREEN = "#4ade80";
    const S     = 0.12;

    function pt(vol: number, ret: number) {
      return { x: 60 + vol * 880, y: 540 - ret * 480 };
    }

    // Actifs
    const assets = Array.from({ length: 35 }, () => {
      const vol = 0.06 + Math.random() * 0.8;
      const ret = Math.max(0.04, Math.min(0.92, 0.08 + vol * 0.55 + (Math.random() - .5) * 0.3));
      return { ...pt(vol, ret) };
    });

    // Portfolios Monte Carlo
    const portfolios = Array.from({ length: 2500 }, () => {
      const ws: number[] = []; let s = 0;
      for (let j = 0; j < 35; j++) { const w = Math.random(); ws.push(w); s += w; }
      let pV = 0, pR = 0;
      ws.forEach((w, j) => { pR += (w/s)*assets[j].y; pV += (w/s)*assets[j].x; }); // approximation visuelle
      return { x: Math.max(80, Math.min(920, pV * (0.4 + Math.random() * 0.4))),
               y: Math.max(60, Math.min(520, pR * (0.5 + Math.random() * 0.5))) };
    });

    // Frontière efficiente
    const frontier: {x:number;y:number}[] = [];
    for (let t = 0; t <= 1; t += 0.008) {
      const ret = 0.1 + t * 0.78;
      frontier.push(pt(0.07 + 0.18 * Math.pow(ret - 0.5, 2) + 0.06, ret));
    }
    const optPt = frontier[Math.floor(frontier.length * 0.68)];

    // Créer groupes
    const gCovar  = document.createElementNS(NS, "g");
    const gCloud  = document.createElementNS(NS, "g");
    const gAssets = document.createElementNS(NS, "g");
    const pathEl  = document.createElementNS(NS, "path");
    const gOpt    = document.createElementNS(NS, "g");
    const gSharpe = document.createElementNS(NS, "g");
    [gCloud, gCovar, gAssets, pathEl, gOpt, gSharpe].forEach(el => svg.appendChild(el));
    pathEl.setAttribute("fill", "none");
    pathEl.setAttribute("stroke", GREEN);
    pathEl.setAttribute("stroke-width", "0");

    const cloudEls = portfolios.map(p => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", String(p.x)); c.setAttribute("cy", String(p.y));
      c.setAttribute("r", "0"); c.setAttribute("fill", NAVY); c.setAttribute("opacity", "0.1");
      gCloud.appendChild(c); return c;
    });
    const assetEls = assets.map(a => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", String(a.x)); c.setAttribute("cy", String(a.y));
      c.setAttribute("r", "0"); c.setAttribute("fill", NAVY);
      gAssets.appendChild(c); return c;
    });
    const covarEls: {el:SVGLineElement; d:number}[] = [];
    for (let i = 0; i < 35; i++) for (let j = i+1; j < 35; j++) {
      const d = Math.hypot(assets[i].x - assets[j].x, assets[i].y - assets[j].y);
      if (d < 250) {
        const l = document.createElementNS(NS, "line");
        l.setAttribute("x1", String(assets[i].x)); l.setAttribute("y1", String(assets[i].y));
        l.setAttribute("x2", String(assets[j].x)); l.setAttribute("y2", String(assets[j].y));
        l.setAttribute("stroke", NAVY); l.setAttribute("stroke-width", "1");
        l.setAttribute("stroke-opacity", "0");
        gCovar.appendChild(l); covarEls.push({ el: l, d });
      }
    }

    function shuffle<T>(a: T[]): T[] {
      const arr = [...a];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    function tr(el: Element, t: string) { (el as HTMLElement).style.transition = t; }

    let T = 400;

    // P1 actifs
    shuffle([...Array(35).keys()]).forEach((ai, i) => {
      setTimeout(() => { tr(assetEls[ai], `r ${S}s cubic-bezier(.34,1.56,.64,1)`); assetEls[ai].setAttribute("r", "6"); }, T + i*28);
    });

    // P2 lignes cov
    const T2 = T + 35*28 + 500;
    shuffle([...Array(covarEls.length).keys()]).forEach((ci, i) => {
      const cv = covarEls[ci];
      setTimeout(() => { tr(cv.el, `stroke-opacity ${S}s`); cv.el.setAttribute("stroke-opacity", cv.d < 150 ? "0.16" : "0.07"); }, T2 + i*8);
    });

    // P3 cloud
    const T3 = T2 + covarEls.length*8 + 350;
    cloudEls.forEach((c, i) => { setTimeout(() => { tr(c, `r ${S}s`); c.setAttribute("r", "3"); }, T3 + i*1.2); });

    // P4 cloud vert
    const T4 = T3 + cloudEls.length*1.2 + 300;
    cloudEls.forEach((c, i) => {
      setTimeout(() => { tr(c, `fill ${S}s,opacity ${S}s`); c.setAttribute("fill", GREEN); c.setAttribute("opacity", "0.13"); }, T4 + i*1.2);
    });

    // P5 frontière
    const T5 = T4 + cloudEls.length*1.2 + 300;
    const d  = "M " + frontier.map(p => `${p.x} ${p.y}`).join(" L ");
    pathEl.setAttribute("d", d);
    pathEl.setAttribute("stroke-width", "3");
    pathEl.setAttribute("stroke-opacity", "0.9");
    setTimeout(() => {
      const len = typeof pathEl.getTotalLength === "function" ? pathEl.getTotalLength() : 2200;
      pathEl.setAttribute("stroke-dasharray", String(len));
      pathEl.setAttribute("stroke-dashoffset", String(len));
      tr(pathEl, "stroke-dashoffset 2s cubic-bezier(.16,1,.3,1)");
      pathEl.setAttribute("stroke-dashoffset", "0");
    }, T5);

    // P6 lignes vertes
    const T6 = T5 + 2100;
    covarEls.forEach((cv, i) => {
      setTimeout(() => {
        tr(cv.el, `stroke ${S}s,stroke-opacity ${S}s`);
        cv.el.setAttribute("stroke", GREEN);
        cv.el.setAttribute("stroke-opacity", cv.d < 150 ? "0.22" : "0.09");
      }, T6 + i*8);
    });

    // P7 actifs verts
    const T7 = T6 + covarEls.length*8 + 350;
    assetEls.forEach((c, i) => {
      setTimeout(() => {
        tr(c, `fill ${S}s,r ${S}s cubic-bezier(.34,1.56,.64,1)`);
        c.setAttribute("fill", GREEN); c.setAttribute("r", "8");
        setTimeout(() => { tr(c, "r 0.3s ease"); c.setAttribute("r", "6"); }, 150);
      }, T7 + i*22);
    });

    // P8 point optimal
    const T8 = T7 + 35*22 + 500;
    setTimeout(() => {
      const oc = document.createElementNS(NS, "circle");
      oc.setAttribute("cx", String(optPt.x)); oc.setAttribute("cy", String(optPt.y));
      oc.setAttribute("r", "0"); oc.setAttribute("fill", GREEN);
      gOpt.appendChild(oc);
      const ring = document.createElementNS(NS, "circle");
      ring.setAttribute("cx", String(optPt.x)); ring.setAttribute("cy", String(optPt.y));
      ring.setAttribute("r", "0"); ring.setAttribute("fill", "none");
      ring.setAttribute("stroke", GREEN); ring.setAttribute("stroke-width", "1");
      ring.setAttribute("stroke-opacity", "0.3");
      gOpt.appendChild(ring);
      const label = document.createElementNS(NS, "text");
      label.setAttribute("x", String(optPt.x + 22)); label.setAttribute("y", String(optPt.y - 10));
      label.setAttribute("font-family", "Inter,sans-serif"); label.setAttribute("font-size", "10");
      label.setAttribute("fill", NAVY); label.setAttribute("fill-opacity", "0"); label.setAttribute("letter-spacing", "2");
      label.textContent = "PORTEFEUILLE OPTIMAL";
      gOpt.appendChild(label);
      requestAnimationFrame(() => {
        tr(oc,   "r 0.2s cubic-bezier(.34,1.56,.64,1)"); oc.setAttribute("r", "10");
        tr(ring, "r 2s cubic-bezier(.16,1,.3,1)");       ring.setAttribute("r", "25");
        tr(label,"fill-opacity 1.5s");                   label.setAttribute("fill-opacity", "0.3");
      });
    }, T8);

  }, []);

  return (
    <div style={{ width:"min(88vw,900px)", textAlign:"center" }}>
      <style>{CSS}</style>
      <svg ref={svgRef}
        viewBox="0 0 1000 600"
        style={{ width:"100%", height:"auto", maxHeight:"52vh", display:"block" }}
        preserveAspectRatio="xMidYMid meet"
      />
      <div style={{ marginTop:"1.2rem" }}>
        <div className="ca-tag">Calcul en cours</div>
        <h1 className="ca-h1">
          Optimisation <em style={{ fontStyle:"normal", fontWeight:500 }}>du portefeuille…</em>
        </h1>
        <div className="ca-wrap">
          <div className="ca-bar"><div className="ca-fill" style={{ width:`${calcPct}%` }}/></div>
          <div className="ca-pct">{calcPct}%</div>
        </div>
        <div className="ca-step"><span>{currentStep}</span></div>
      </div>
    </div>
  );
}
