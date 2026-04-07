"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const NAVY     = "#0A1628";
const NAVY_MID = "#1E3A6E";
const MSCI_GROSS = 0.08;
const ETF_FEES   = 0.002;

// ── Données bancaires (niveau module pour SSR Next.js) ───────
const BANKS: Record<string, {
  label: string;
  type: "banque_trad" | "banque_ligne" | "courtier";
  garde: number;         // Droits de garde / tenue de compte (%/an encours)
  retrocessions: number; // Rétrocessions versées au distributeur par la SGP (%/an)
  ter_actif: number;     // TER moyen fonds actifs disponibles (%/an) — source: DICI + AMF 2024
  courtage: number;      // Frais de courtage par ordre (% montant)
  versement: number;     // Frais sur versement (AV/gestion pilotée)
  note: string;
}> = {
  bnp: {
    label: "BNP Paribas",
    type: "banque_trad",
    garde: 0.25,
    // BNP Paribas AM fonds actions retail : 1.65-1.85%/an (DICI 2024)
    // Rétrocessions moyennes : ~0.80%/an reversées au réseau BNP
    retrocessions: 0.80,
    ter_actif: 1.75,   // moy. fonds actions BNP Paribas AM (ex: BNP Paribas Actions Monde 1.75%)
    courtage: 0.50,
    versement: 0,
    note: "TER moy. BNP AM fonds actions retail : 1.75%/an — source DICI 2024",
  },
  sg: {
    label: "Société Générale",
    type: "banque_trad",
    garde: 0.20,
    // SG AM / Lyxor actifs : 1.40-1.70%/an ; rétrocessions ~0.70-0.80%
    retrocessions: 0.75,
    ter_actif: 1.55,   // moy. fonds SG AM actifs (hors Lyxor ETF)
    courtage: 0.50,
    versement: 0,
    note: "TER moy. SG AM fonds actions actifs : 1.55%/an — AMF/Morningstar 2024",
  },
  lcl: {
    label: "LCL",
    type: "banque_trad",
    garde: 0.30,
    // LCL distribue Amundi (filiale CA) : frais actifs ~1.60-1.80%/an
    // Ex: LCL Actions France (Amundi AM) : 1.70% ; LCL Actions Euro : 1.65%
    retrocessions: 0.70,
    ter_actif: 1.65,   // moy. fonds Amundi distribués par LCL
    courtage: 0.50,
    versement: 0,
    note: "TER moy. Amundi actifs distribués par LCL : 1.65%/an — DICI Amundi 2024",
  },
  cacib: {
    label: "Crédit Agricole",
    type: "banque_trad",
    garde: 0.20,
    // Amundi (filiale CA) fonds actifs actions : 1.50-1.80%/an
    // Ex: Amundi Actions France ISR : 1.65% ; Amundi Patrimoine : 1.60%
    retrocessions: 0.80,
    ter_actif: 1.65,   // moy. fonds Amundi actions actifs (filiale du CA)
    courtage: 0.50,
    versement: 0,
    note: "TER moy. fonds Amundi (filiale CA) : 1.65%/an — Amundi DICI 2024",
  },
  bourso: {
    label: "BoursoBank",
    type: "banque_ligne",
    garde: 0.00,
    retrocessions: 0.00, // Pas de rétrocessions (modèle banque en ligne)
    // OPCVM tiers disponibles : 1.20-1.60%/an selon le fonds choisi
    // Moy. fonds actifs actions sur plateforme Boursorama : ~1.40%
    ter_actif: 1.40,
    courtage: 0.55,    // 0.50-0.60% selon offre BoursoMarkets 2024
    versement: 0,
    note: "0 rétrocessions, mais TER fonds actifs distribués ~1.40%/an — AMF 2024",
  },
  fortuneo: {
    label: "Fortuneo",
    type: "banque_ligne",
    garde: 0.00,
    retrocessions: 0.00, // Pas de rétrocessions (courtier en ligne)
    // OPCVM actifs disponibles sur Fortuneo : 1.20-1.55%/an
    // Ex: Carmignac Patrimoine (part A) : 1.51% ; Comgest Growth Europe : 1.65%
    // Moy. fonds actifs sur plateforme : ~1.35%
    ter_actif: 1.35,
    courtage: 0.35,    // Formule Starter Fortuneo (mars 2024 : 0.35%, 1 ordre/mois gratuit ≤500€)
    versement: 0,
    note: "0 rétrocessions, TER fonds actifs disponibles ~1.35%/an — Fortuneo/AMF 2024",
  },
  rothschild: {
    label: "Rothschild & Co",
    type: "banque_trad",
    garde: 0.00,       // Inclus dans les frais de mandat
    retrocessions: 0.50,
    // Mandat privé Rothschild : ~0.80-1.20%/an all-in selon taille patrimoine
    // TER moyen des fonds sélectionnés dans les mandats : ~1.00%
    ter_actif: 1.00,
    courtage: 0.30,    // Tarifs négociés private banking
    versement: 0,
    note: "Gestion sous mandat ~0.80-1.20%/an all-in ; TER sélection fonds : ~1.00%",
  },
};
// ── Enveloppes fiscales (module level pour SSR) ──────────────
type EnvelopeKey = "pea" | "cto" | "av";
const ENVELOPES: Record<EnvelopeKey, {
  label: string; fiscalite: string; plafond: number | null;
  fraisContrat: number; fraisVersement: number; fraisArbitrage: number;
}> = {
  pea: {
    label: "PEA", plafond: 150000,
    fiscalite: "Exonéré IR après 5 ans (hors PS 17.2%)",
    fraisContrat: 0, fraisVersement: 0, fraisArbitrage: 0,
  },
  cto: {
    label: "CTO", plafond: null,
    fiscalite: "Flat tax 30% sur plus-values et dividendes",
    fraisContrat: 0, fraisVersement: 0, fraisArbitrage: 0,
  },
  av: {
    label: "Assurance-Vie", plafond: null,
    fiscalite: "Abattement 4 600€/an après 8 ans, PFU 7.5% jusqu'à 150k€",
    fraisContrat: 0.75, fraisVersement: 2.0, fraisArbitrage: 0.5,
  },
};



// ── Hook compteur animé ───────────────────────────────────────
function useAnimatedNumber(target: number, decimals = 1, duration = 600) {
  const [val, setVal] = useState(target);
  const prevRef = useRef(target);
  useEffect(() => {
    const from  = prevRef.current;
    prevRef.current = target;
    const start = performance.now();
    let raf: number;
    function step(now: number) {
      const t    = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(parseFloat((from + (target - from) * ease).toFixed(decimals)));
      if (t < 1) raf = requestAnimationFrame(step);
      else setVal(target);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, decimals, duration]);
  return val;
}

function AnimNum({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const v = useAnimatedNumber(value, decimals);
  return <>{v.toFixed(decimals)}&nbsp;%</>;
}


function buildTrajectory(capital: number, years: number, annualFees: number) {
  const netRate = MSCI_GROSS - annualFees;
  return Array.from({ length: years + 1 }, (_, y) => ({
    an: y, value: Math.round(capital * Math.pow(1 + netRate, y)),
  }));
}
function feur(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(Math.round(n));
}

interface TTP { value: number; name: string; color: string }
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TTP[]; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"rgba(10,22,40,0.94)", backdropFilter:"blur(16px)", borderRadius:10, padding:"10px 14px", border:"1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ color:"rgba(255,255,255,0.35)", fontSize:10, marginBottom:6, letterSpacing:".1em" }}>AN {label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color:"white", fontSize:13, fontWeight:600, marginBottom:3 }}>
          <span style={{ color:p.color, marginRight:6 }}>●</span>{p.name}&nbsp;:&nbsp;<span style={{ color:p.color }}>{feur(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div style={{ color:"rgba(255,255,255,0.25)", fontSize:10, marginTop:6, borderTop:"1px solid rgba(255,255,255,0.08)", paddingTop:6 }}>
          Écart&nbsp;: <span style={{ color:"#F87171" }}>{feur(payload[0].value - payload[1].value)}</span>
        </div>
      )}
    </div>
  );
}

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300;400&family=Cormorant+Garant:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500&display=swap');
@keyframes grain {
  0%,100%{transform:translate(0,0)} 10%{transform:translate(-3%,-5%)} 20%{transform:translate(-5%,3%)}
  30%{transform:translate(4%,-5%)} 40%{transform:translate(-2%,6%)} 50%{transform:translate(-4%,2%)}
  60%{transform:translate(5%,-2%)} 70%{transform:translate(2%,5%)} 80%{transform:translate(-5%,-3%)} 90%{transform:translate(3%,4%)}
}
.hero-grain::after {
  content:""; position:absolute; inset:-100%; width:300%; height:300%;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity:0.018; pointer-events:none; animation:grain 0.9s steps(2) infinite; z-index:1;
}
@keyframes rotateSlow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes shine {
  0%{ transform:translateX(-100%) skewX(-16deg); }
  40%,100%{ transform:translateX(220%) skewX(-16deg); }
}
.nav-sticky {
  position:sticky; top:0; left:0; right:0; z-index:100;
  background:rgba(249,248,246,0.92);
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  transition:border-color .2s;
  border-bottom:0.5px solid transparent;
}
.nav-sticky.scrolled {
  border-bottom-color:rgba(10,22,40,0.08);
}
@keyframes shimmer-gain {
  0%,100%{ transform:translateX(-100%) skewX(-15deg); opacity:0; }
  8%{ opacity:1; }
  40%{ transform:translateX(220%) skewX(-15deg); opacity:0; }
}
.gain-shimmer { position:relative; overflow:hidden; display:inline-block; }
.gain-shimmer::after {
  content:"";
  position:absolute; top:0; left:0;
  width:40%; height:100%;
  background:linear-gradient(90deg,transparent,rgba(74,222,128,0.18),transparent);
  transform:translateX(-100%) skewX(-15deg);
  animation:shimmer-gain 5s ease-in-out infinite;
}
.table-row-hover { transition:background .22s ease; }
.table-row-hover:hover { background:rgba(30,41,59,0.55) !important; }
@keyframes pulse-glow {
  0%,100%{ opacity:0.35; }
  50%{ opacity:0.65; }
}
@keyframes bar-fill {
  from{ width:0%; }
}
.btn-cta { position:relative; overflow:hidden; cursor:pointer; transition:opacity .25s, box-shadow .25s; }
.btn-cta:hover { opacity:0.88; box-shadow:0 0 0 1px rgba(255,255,255,0.22) inset; }
.btn-cta::after {
  content:""; position:absolute; top:0; left:0; width:35%; height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent);
  transform:translateX(-100%) skewX(-16deg);
  animation:shine 4s ease-in-out infinite;
}
input[type=range] {
  -webkit-appearance:none; height:1px; background:rgba(26,26,26,0.18); outline:none; cursor:pointer;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance:none; width:12px; height:12px; border-radius:50%;
  background:#1A1A1A; border:2px solid #F9F8F6; box-shadow:0 0 0 1px rgba(26,26,26,0.2);
}
`;

// ══════════════════════════════════════════════════════════════
// HERO — Canvas plein écran, construction animée
// ══════════════════════════════════════════════════════════════
function HeroSection({
  capital, years,
  onCapitalChange, onYearsChange,
  onCTA, onScroll, activeTab, onNav, onGainUpdate,
}: {
  capital:number; years:number;
  onCapitalChange:(n:number)=>void; onYearsChange:(n:number)=>void;
  onCTA:()=>void; onScroll:()=>void;
  activeTab:number; onNav:(i:number)=>void;
  onGainUpdate?:(g:number)=>void;
}) {
  const cvsRef    = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number|null>(null);
  const prevZRef  = useRef<number[]|null>(null);
  const prevBRef  = useRef<number[]|null>(null);
  const buildRef  = useRef<{running:boolean;progress:number}>({running:false,progress:0});

  // Chiffres animés
  const [displayZ,  setDisplayZ]  = useState(0);
  const [displayB,  setDisplayB]  = useState(0);
  const [displayG,  setDisplayG]  = useState(0);
  const [displayM,  setDisplayM]  = useState(0);  // mensuel = gain/years/12
  const [areaAlpha, setAreaAlpha] = useState(0);
  const [labelsVis, setLabelsVis] = useState(false);

  const FEES_B = 0.025, FEES_Z = 0.002;
  const YEARS_OPTS = [10,15,20,25];

  function buildCurve(cap:number,yr:number,fees:number):number[]{
    return Array.from({length:yr+1},(_,t)=>cap*Math.pow(1+MSCI_GROSS-fees,t));
  }

  // Calcule la longueur approximative du chemin SVG canvas
  function approxPathLen(pts:number[], W:number, H:number, padL:number, padT:number, padB:number):number {
    const n=pts.length, drawW=W-padL, drawH=H-padT-padB;
    const maxV=pts[n-1]*1.04, minV=pts[0]*0.88, rng=maxV-minV;
    const sx=(i:number)=>padL+(i/(n-1))*drawW;
    const sy=(v:number)=>padT+drawH-((v-minV)/rng)*drawH;
    let len=0;
    for(let i=1;i<n;i++){
      const dx=sx(i)-sx(i-1), dy=sy(pts[i])-sy(pts[i-1]);
      len+=Math.sqrt(dx*dx+dy*dy);
    }
    return len;
  }

  const drawCanvas = useCallback((
    zPts:number[], bPts:number[],
    canvas:HTMLCanvasElement,
    progress:number,       // 0→1 : avancement du tracé
    aArea:number,          // opacité zone gain
    onProgress?:(p:number)=>void
  )=>{
    const dpr=window.devicePixelRatio||1;
    const W=canvas.offsetWidth, H=canvas.offsetHeight;
    if(!W||!H) return;
    canvas.width=W*dpr; canvas.height=H*dpr;
    const ct=canvas.getContext("2d")!;
    ct.scale(dpr,dpr);
    ct.clearRect(0,0,W,H);

    const n=zPts.length;
    const padL=0, padR=0, padT=H*0.08, padB=H*0.12;
    const drawW=W-padL-padR, drawH=H-padT-padB;
    const maxV=zPts[n-1]*1.04, minV=zPts[0]*0.88, rng=maxV-minV;
    const sx=(i:number)=>padL+(i/(n-1))*drawW;
    const sy=(v:number)=>padT+drawH-((v-minV)/rng)*drawH;

    // Calculer jusqu'où tracer selon progress
    const totalPts = n-1;
    const drawn    = progress * totalPts;
    const fullSegs = Math.floor(drawn);
    const frac     = drawn - fullSegs;

    // Points de la courbe Zero jusqu'à progress
    const zVisible:Array<[number,number]> = [];
    for(let i=0;i<=fullSegs&&i<n;i++) zVisible.push([sx(i),sy(zPts[i])]);
    if(fullSegs<n-1&&frac>0){
      const x0=sx(fullSegs),y0=sy(zPts[fullSegs]);
      const x1=sx(fullSegs+1),y1=sy(zPts[fullSegs+1]);
      zVisible.push([x0+(x1-x0)*frac, y0+(y1-y0)*frac]);
    }

    // Courbe banque (entière, très discrète)
    ct.beginPath();
    ct.setLineDash([3,8]);
    ct.moveTo(sx(0),sy(bPts[0]));
    for(let i=1;i<n;i++) ct.quadraticCurveTo(sx(i-.5),sy(bPts[i-1]),sx(i),sy(bPts[i]));
    ct.strokeStyle="rgba(26,26,26,0.16)";
    ct.lineWidth=1.0;
    ct.stroke();
    ct.setLineDash([]);

    // Zone gain (apparaît seulement après construction)
    if(aArea>0&&zVisible.length>=2){
      const endIdx=Math.min(zVisible.length-1,n-1);
      ct.beginPath();
      ct.moveTo(zVisible[0][0],zVisible[0][1]);
      for(let i=1;i<zVisible.length;i++){
        ct.quadraticCurveTo(
          (zVisible[i-1][0]+zVisible[i][0])/2,zVisible[i-1][1],
          zVisible[i][0],zVisible[i][1]
        );
      }
      const bEndX=zVisible[zVisible.length-1][0];
      const bEndI=Math.min(fullSegs+(frac>0?1:0),n-1);
      for(let i=bEndI;i>=0;i--){
        if(i===bEndI) ct.lineTo(sx(i),sy(bPts[i]));
        else ct.quadraticCurveTo(sx(i+.5),sy(bPts[i+1]),sx(i),sy(bPts[i]));
      }
      ct.closePath();
      const gZ=ct.createLinearGradient(sx(0),0,sx(n-1),0);
      gZ.addColorStop(0,   `rgba(10,22,40,0.00)`);
      gZ.addColorStop(0.3, `rgba(10,22,40,${0.025*aArea})`);
      gZ.addColorStop(0.75,`rgba(10,22,40,${0.05*aArea})`);
      gZ.addColorStop(1,   `rgba(10,22,40,${0.09*aArea})`);
      ct.fillStyle=gZ;
      ct.fill();
      void bEndX; void endIdx;
    }

    // Tracé Zero CGP progressif
    if(zVisible.length>=2){
      ct.beginPath();
      ct.moveTo(zVisible[0][0],zVisible[0][1]);
      for(let i=1;i<zVisible.length;i++){
        ct.quadraticCurveTo(
          (zVisible[i-1][0]+zVisible[i][0])/2, zVisible[i-1][1],
          zVisible[i][0], zVisible[i][1]
        );
      }
      const gLine=ct.createLinearGradient(sx(0),0,sx(n-1),0);
      gLine.addColorStop(0,  "rgba(10,22,40,0.12)");
      gLine.addColorStop(0.35,"rgba(10,22,40,0.45)");
      gLine.addColorStop(0.7, "rgba(10,22,40,0.78)");
      gLine.addColorStop(1,   "#0A1628");
      ct.strokeStyle=gLine;
      ct.lineWidth=1.8;
      ct.lineJoin="round";
      ct.lineCap="round";
      // Glow saphir — filtre drop-shadow via shadowBlur canvas
      ct.shadowColor="rgba(10,22,40,0.18)";
      ct.shadowBlur=18;
      ct.stroke();
      ct.shadowBlur=0;  // reset pour ne pas affecter les autres éléments

      // Dot de tête (glowing)
      const [hx,hy]=zVisible[zVisible.length-1];
      ct.beginPath(); ct.arc(hx,hy,16,0,Math.PI*2);
      ct.fillStyle="rgba(10,22,40,0.05)"; ct.fill();
      ct.beginPath(); ct.arc(hx,hy,8,0,Math.PI*2);
      ct.fillStyle="rgba(10,22,40,0.10)"; ct.fill();
      ct.beginPath(); ct.arc(hx,hy,4,0,Math.PI*2);
      ct.fillStyle="#0A1628"; ct.fill();
      ct.beginPath(); ct.arc(hx,hy,2,0,Math.PI*2);
      ct.fillStyle="#F9F8F6"; ct.fill();
    }

    // À la fin : dot final + ligne écart + label gain
    if(progress>=1){
      const ex=sx(n-1), ezy=sy(zPts[n-1]), eby=sy(bPts[n-1]);
      // Ligne écart verticale
      ct.setLineDash([2,4]);
      ct.beginPath(); ct.moveTo(ex,eby); ct.lineTo(ex,ezy);
      ct.strokeStyle="rgba(10,22,40,0.25)"; ct.lineWidth=1; ct.stroke();
      ct.setLineDash([]);
      // Dot banque final
      ct.beginPath(); ct.arc(ex,eby,3,0,Math.PI*2);
      ct.fillStyle="rgba(26,26,26,0.20)"; ct.fill();
    }

    if(onProgress) onProgress(progress);
  },[]);

  // Animation de construction au chargement
  const runBuildAnimation = useCallback(()=>{
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    const canvas=cvsRef.current;
    if(!canvas) return;

    const zPts=buildCurve(capital,years,FEES_Z);
    const bPts=buildCurve(capital,years,FEES_B);
    prevZRef.current=[...zPts];
    prevBRef.current=[...bPts];

    const zFinal=zPts[zPts.length-1];
    const bFinal=bPts[bPts.length-1];
    const gFinal=zFinal-bFinal;

    buildRef.current={running:true,progress:0};

    const DUR_BUILD  = 2800; // ms pour tracer la courbe
    const DUR_AREA   = 800;  // ms pour la zone gain
    const start = performance.now();

    function step(now:number){
      const elapsed = now-start;
      let progress  = 0;
      let aArea     = 0;

      if(elapsed<=DUR_BUILD){
        // Phase 1 : construction de la courbe
        const t    = elapsed/DUR_BUILD;
        const ease = t<0.5 ? 2*t*t : -1+(4-2*t)*t; // easeInOut quadratic
        progress   = ease;
        aArea      = 0;
      } else {
        // Phase 2 : apparition zone gain
        progress   = 1;
        const t2   = Math.min((elapsed-DUR_BUILD)/DUR_AREA,1);
        aArea      = 1-Math.pow(1-t2,2);
        setAreaAlpha(aArea);
        if(aArea>=1) setLabelsVis(true);
      }

      // Chiffres synchronisés avec la progression
      setDisplayZ(Math.round(zPts[0]+(zFinal-zPts[0])*progress));
      setDisplayB(Math.round(bPts[0]+(bFinal-bPts[0])*progress));
      setDisplayG(Math.round(gFinal*progress));
      setDisplayM(Math.round((gFinal*progress)/(years*12)));

      drawCanvas(zPts,bPts,canvas,progress,aArea);

      if(elapsed < DUR_BUILD+DUR_AREA){
        rafRef.current=requestAnimationFrame(step);
      } else {
        buildRef.current.running=false;
        setDisplayZ(Math.round(zFinal));
        setDisplayB(Math.round(bFinal));
        setDisplayG(Math.round(gFinal));
        setDisplayM(Math.round(gFinal/(years*12)));
        onGainUpdate?.(Math.round(gFinal));
        setLabelsVis(true);
      }
    }
    rafRef.current=requestAnimationFrame(step);
  },[capital,years,drawCanvas]);

  // Morph quand capital ou years change (après build initial)
  const morphCurves=useCallback(()=>{
    if(!prevZRef.current||!prevBRef.current) return;
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    const canvas=cvsRef.current;
    if(!canvas) return;
    const newZ=buildCurve(capital,years,FEES_Z);
    const newB=buildCurve(capital,years,FEES_B);
    const fromZ=[...prevZRef.current];
    const fromB=[...prevBRef.current];

    // Interpoler si longueurs différentes
    function resample(arr:number[],target:number):number[]{
      const out=[];
      for(let i=0;i<target;i++){
        const t=i/(target-1)*(arr.length-1);
        const lo=Math.floor(t),hi=Math.min(lo+1,arr.length-1);
        out.push(arr[lo]+(arr[hi]-arr[lo])*(t-lo));
      }
      return out;
    }
    const maxLen=Math.max(fromZ.length,newZ.length);
    const fZ=resample(fromZ,maxLen), fB=resample(fromB,maxLen);
    const tZ=resample(newZ,maxLen),  tB=resample(newB,maxLen);

    const zFinal=newZ[newZ.length-1];
    const bFinal=newB[newB.length-1];
    const gFinal=zFinal-bFinal;

    const start=performance.now(), dur=500;
    function step(now:number){
      const t=Math.min((now-start)/dur,1);
      const ease=1-Math.pow(1-t,3);
      const zi=tZ.map((v,i)=>fZ[i]+(v-fZ[i])*ease);
      const bi=tB.map((v,i)=>fB[i]+(v-fB[i])*ease);
      setDisplayZ(Math.round(fZ[fZ.length-1]+(zFinal-fZ[fZ.length-1])*ease));
      setDisplayB(Math.round(fB[fB.length-1]+(bFinal-fB[fB.length-1])*ease));
      setDisplayG(Math.round(gFinal*ease));
        setDisplayM(Math.round((gFinal*ease)/(years*12)));
      drawCanvas(zi,bi,canvas,1,1);
      if(t<1) rafRef.current=requestAnimationFrame(step);
      else{ prevZRef.current=[...newZ]; prevBRef.current=[...newB]; }
    }
    rafRef.current=requestAnimationFrame(step);
  },[capital,years,drawCanvas]);

  // Montage : animation de construction
  useEffect(()=>{ runBuildAnimation(); },[]);

  // Changements : morphing
  const isFirstRender=useRef(true);
  useEffect(()=>{
    if(isFirstRender.current){ isFirstRender.current=false; return; }
    morphCurves();
  },[capital,years]);

  useEffect(()=>{
    function onResize(){
      const canvas=cvsRef.current;
      if(canvas&&prevZRef.current&&prevBRef.current)
        drawCanvas(prevZRef.current,prevBRef.current,canvas,1,1);
    }
    window.addEventListener("resize",onResize);
    return ()=>window.removeEventListener("resize",onResize);
  },[drawCanvas]);

  // Nav sticky scroll detection
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const container = document.querySelector("[data-scroll-container]") as HTMLElement;
    if (!container) return;
    const handle = () => setScrolled(container.scrollTop > 10);
    container.addEventListener("scroll", handle, { passive: true });
    return () => container.removeEventListener("scroll", handle);
  }, []);

  const wrapV={hidden:{},visible:{transition:{staggerChildren:0.14,delayChildren:0.2}}};
  const itemV={hidden:{opacity:0,y:14},visible:{opacity:1,y:0,transition:{duration:0.85,ease:[0.22,1,0.36,1]}}};

  return (
    <section className="hero-grain" style={{
      height:"100vh", scrollSnapAlign:"start",
      background:"radial-gradient(ellipse 110% 90% at 12% 8%, #F9F8F6 0%, #F5F2EE 45%, #ECE7E1 100%)",
      display:"flex", flexDirection:"column",
      position:"relative", overflow:"hidden",
    }}>

      {/* Canvas plein écran z:2 */}
      <canvas ref={cvsRef} style={{
        position:"absolute", top:0, left:0,
        width:"100%", height:"100%",
        zIndex:2, pointerEvents:"none",
      }}/>
      {/* Titre immersif — z:4 */}
      <div style={{
        position:"absolute",
        top:"50%",left:"52px",
        transform:"translateY(-56%)",
        zIndex:4,maxWidth:"54vw",
      }}>
        <motion.div variants={wrapV} initial="hidden" animate="visible">
          <motion.h1 variants={itemV} style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(42px,5.6vw,78px)",
            fontWeight:300,fontStyle:"italic",
            letterSpacing:"-.028em",lineHeight:1.0,
            color:NAVY,opacity:0.95,margin:"0 0 4px",
          }}>Investissez comme</motion.h1>

          <motion.h1 variants={itemV} style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(42px,5.6vw,78px)",
            fontWeight:300,
            letterSpacing:"-.028em",lineHeight:1.0,
            color:NAVY_MID,opacity:0.95,margin:"0 0 20px",
          }}>une institution.</motion.h1>

          <motion.p variants={itemV} style={{
            fontFamily:"'Inter',sans-serif",
            fontSize:13,fontWeight:300,letterSpacing:".01em",
            color:"rgba(10,22,40,0.44)",lineHeight:1.75,marginBottom:28,
          }}>
            L'algorithme de Markowitz,<br/>
            réservé aux family offices, accessible gratuitement.
          </motion.p>

          <motion.button
            className="btn-cta"
            variants={itemV}
            onClick={onCTA}
            style={{
              background:"rgba(10,22,40,0.92)",
              backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",
              color:"white",border:"1px solid rgba(255,255,255,0.07)",
              fontFamily:"'Inter',sans-serif",
              fontSize:9,fontWeight:500,letterSpacing:".18em",
              padding:"14px 36px",borderRadius:8,textTransform:"uppercase",
            }}
          >Commencer gratuitement</motion.button>
        </motion.div>
      </div>

            {/* Montants finaux — droite z:5 — TOUT en Cormorant */}
      <motion.div
        initial={{opacity:0}}
        animate={{opacity:1}}
        transition={{delay:0.4,duration:0.6}}
        style={{
          position:"absolute",right:"52px",top:"50%",
          transform:"translateY(-50%)",
          zIndex:5,textAlign:"right",
        }}
      >
        {/* ZERO CGP */}
        <div style={{
          fontFamily:"'Inter',sans-serif",
          fontSize:9,fontWeight:500,letterSpacing:".16em",
          color:"rgba(10,22,40,0.36)",textTransform:"uppercase",marginBottom:4,
        }}>Zero CGP</div>
        <div style={{
          fontFamily:"'Cormorant Garant',serif",
          fontSize:"clamp(32px,4vw,54px)",
          fontWeight:300,color:NAVY,
          lineHeight:1,letterSpacing:"-.02em",marginBottom:18,
        }}>{feur(displayZ)}</div>

        {/* Banque privée */}
        <div style={{
          fontFamily:"'Inter',sans-serif",
          fontSize:9,fontWeight:500,letterSpacing:".16em",
          color:"rgba(10,22,40,0.22)",textTransform:"uppercase",marginBottom:4,
        }}>Banque privée</div>
        <div style={{
          fontFamily:"'Cormorant Garant',serif",
          fontSize:"clamp(22px,2.8vw,36px)",
          fontWeight:300,color:"rgba(10,22,40,0.36)",
          lineHeight:1,letterSpacing:"-.02em",marginBottom:22,
        }}>{feur(displayB)}</div>

        {/* Économies — Cormorant + lueur + mensuel dynamique */}
        <motion.div
          initial={{opacity:0,y:8}}
          animate={labelsVis?{opacity:1,y:0}:{}}
          transition={{duration:0.8,ease:[0.22,1,0.36,1]}}
        >
          <div style={{
            fontFamily:"'Inter',sans-serif",
            fontSize:8.5,fontWeight:500,letterSpacing:".18em",
            color:"rgba(45,90,67,0.51)",textTransform:"uppercase",marginBottom:5,
          }}>Économies réalisées</div>
          <div style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(22px,2.6vw,34px)",
            fontWeight:300,color:"#2D5A43",
            lineHeight:1,letterSpacing:"-.01em",
            textShadow:"0 0 28px rgba(45,90,67,0.3), 0 0 8px rgba(45,90,67,0.15)",
          }}>{feur(displayG)}</div>
          <div style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:13,fontWeight:300,fontStyle:"italic",
            color:"rgba(45,90,67,0.42)",marginTop:7,lineHeight:1.6,
          }}>
            Soit&nbsp;{feur(displayM)}&nbsp;économisés&nbsp;par&nbsp;mois.
          </div>
        </motion.div>
      </motion.div>



      {/* Barre contrôles minimale — bas */}
      <div style={{
        position:"absolute",bottom:0,left:0,right:0,zIndex:10,
        padding:"14px 52px",
        borderTop:"0.5px solid rgba(10,22,40,0.07)",
        background:"rgba(249,248,246,0.84)",
        backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",
        display:"flex",alignItems:"center",gap:20,
      }}>
        <span style={{
          fontFamily:"'Inter',sans-serif",
          fontSize:8.5,fontWeight:500,letterSpacing:".16em",
          color:"rgba(10,22,40,0.30)",textTransform:"uppercase",whiteSpace:"nowrap",
        }}>Capital</span>
        <input
          type="range" min={20000} max={500000} step={5000} value={capital}
          onChange={e=>onCapitalChange(Number(e.target.value))}
          style={{flex:1,maxWidth:220}}
        />
        <span style={{
          fontFamily:"'Cormorant Garant',serif",
          fontSize:16,fontWeight:400,color:NAVY,whiteSpace:"nowrap",minWidth:90,
        }}>{feur(capital)}</span>

        <div style={{width:"0.5px",height:14,background:"rgba(10,22,40,0.14)",flexShrink:0}}/>

        <span style={{
          fontFamily:"'Inter',sans-serif",
          fontSize:8.5,fontWeight:500,letterSpacing:".16em",
          color:"rgba(10,22,40,0.30)",textTransform:"uppercase",whiteSpace:"nowrap",
        }}>Durée</span>
        <div style={{display:"flex",gap:4}}>
          {YEARS_OPTS.map(y=>(
            <button key={y} onClick={()=>onYearsChange(y)} style={{
              fontFamily:"'Inter',sans-serif",
              fontSize:8.5,fontWeight:500,letterSpacing:".10em",
              color:y===years?"#F9F8F6":"rgba(10,22,40,0.32)",
              background:y===years?"#0A1628":"none",
              border:y===years?"0.5px solid #0A1628":"0.5px solid rgba(10,22,40,0.14)",
              borderRadius:100,padding:"4px 12px",cursor:"pointer",
              textTransform:"uppercase",transition:"all .16s",
            }}>{y} ans</button>
          ))}
        </div>

        <div style={{flex:1}}/>

        <button onClick={onScroll} style={{
          background:"none",border:"none",cursor:"pointer",
          fontFamily:"'Inter',sans-serif",
          fontSize:8.5,fontWeight:400,letterSpacing:".14em",
          color:"rgba(10,22,40,0.28)",textTransform:"uppercase",
          display:"flex",alignItems:"center",gap:6,
        }}>
          Comment ça fonctionne
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v8M5 9L2 6M5 9L8 6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Disclaimer légal */}
      <div style={{
        position:"absolute", bottom:58, left:"52px",
        zIndex:10, maxWidth:"55vw",
      }}>
        <p style={{
          fontFamily:"'Inter',sans-serif",
          fontSize:9, fontWeight:300, letterSpacing:".02em",
          color:"rgba(125,125,125,0.70)", lineHeight:1.6,
          margin:0,
        }}>
          Simulation basée sur un rendement historique moyen de 8&nbsp;% (MSCI World, 1990–2024).
          Les performances passées ne préjugent pas des performances futures.
          0&nbsp;€ de frais de conseil, hors frais structurels des supports (ETF&nbsp;: ~0,20&nbsp;%/an).
        </p>
      </div>

    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// SECTION 2 — Comment ça fonctionne — Prestige / Institutionnel
// ══════════════════════════════════════════════════════════════
function HowSection({ gain, onCTA }: { gain: number; onCTA: () => void }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView,  setInView ] = useState(false);
  const [focused, setFocused] = useState<number|null>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const feurLocal = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency", currency: "EUR", maximumFractionDigits: 0,
    }).format(Math.round(n));

  const STEPS = [
    {
      n:"01", num:"1", t:"Votre profil",
      d:"Horizon, tolérance au risque, filtres ESG et zones géographiques. Votre ADN d'investisseur.",
      detail:"Ce diagnostic précis nous permet d'adapter la prise de risque à votre situation patrimoniale réelle, pour un portefeuille qui vous ressemble vraiment.",
    },
    {
      n:"02", num:"2", t:"Filtrage",
      d:"490+ actifs analysés. L'algorithme sélectionne les 12 à 40 plus pertinents selon votre univers.",
      detail:"Nous scannons l'univers mondial pour ne retenir que les actifs les plus liquides et performants, éliminant les produits bancaires chargés de frais inutiles.",
    },
    {
      n:"03", num:"3", t:"Markowitz",
      d:"10 000 simulations Monte Carlo. Calcul de la frontière efficiente.",
      detail:"L'algorithme de Markowitz ne fait pas de suppositions. Il utilise 10 000 scénarios pour trouver l'allocation exacte qui maximise votre rendement pour le risque choisi.",
    },
    {
      n:"04", num:"4", t:"Résultats",
      d:"3 portefeuilles optimaux : Variance Minimale, Sharpe Maximum, Utilité Maximale.",
      detail:"Vous obtenez 3 stratégies claires (Prudent, Équilibré, Dynamique), chacune conçue pour capturer la performance du marché tout en préservant votre capital.",
    },
    {
      n:"05", num:"5", t:"Exécution libre",
      d:"Vous recevez les quantités exactes d'actifs à acheter. PEA, CTO ou Assurance-vie.",
      detail:"Un clic suffit pour répliquer le portefeuille chez votre courtier (Fortuneo, Boursorama, etc.). Zero CGP est votre GPS — c'est vous qui appuyez sur le bouton. Zéro frais de gestion, zéro intermédiaire.",
    },
  ];

  const isFocused = focused !== null;
  const TR = "all 0.38s cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <section
      ref={sectionRef}
      style={{
        height:"100vh", scrollSnapAlign:"start",
        background:NAVY,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"0 52px", position:"relative", overflow:"hidden",
      }}
    >
      <div style={{
        position:"absolute", top:"40%", left:"50%",
        transform:"translate(-50%,-50%)",
        width:"60vw", height:"40vh",
        background:"radial-gradient(ellipse, rgba(30,58,110,0.50) 0%, transparent 70%)",
        pointerEvents:"none", zIndex:0,
      }}/>

      <div style={{
        width:"100%", maxWidth:1000,
        display:"flex", flexDirection:"column",
        alignItems:"center", position:"relative", zIndex:1,
      }}>
        {/* Eyebrow + titres */}
        <div style={{
          textAlign:"center", marginBottom:44,
          transition:TR,
          opacity: isFocused ? 0.12 : 1,
          filter:  isFocused ? "blur(2px)" : "none",
        }}>
          <div style={{
            fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500,
            letterSpacing:".22em", textTransform:"uppercase",
            color:"rgba(255,255,255,0.28)", marginBottom:16,
          }}>Comment ça fonctionne</div>
          <h2 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(32px,4.2vw,54px)", fontWeight:300, fontStyle:"italic",
            letterSpacing:"-.02em", lineHeight:1.06,
            color:"rgba(255,255,255,0.95)", margin:"0 0 6px",
          }}>7 questions.</h2>
          <h2 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(32px,4.2vw,54px)", fontWeight:300,
            letterSpacing:"-.02em", lineHeight:1.06,
            color:"rgba(255,255,255,0.38)", margin:0,
          }}>Un portefeuille sur mesure.</h2>
        </div>

        {/* Séparateur haut */}
        <div style={{
          width:"100%",
          borderTop:"0.5px solid rgba(255,255,255,0.10)",
          transition:TR, opacity: isFocused ? 0.15 : 1,
        }}/>

        {/* Blocs */}
        <div style={{ display:"flex", width:"100%" }}>
          {STEPS.map(function({ n, num, t, d, detail }, i) {
            const isThis   = focused === i;
            const isDimmed = isFocused && !isThis;
            return (
              <div
                key={n}
                onMouseEnter={function() { setFocused(i); }}
                onMouseLeave={function() { setFocused(null); }}
                style={{
                  flex:1, padding:"26px 20px 30px",
                  borderRight: i < 3 ? "0.5px solid rgba(255,255,255,0.08)" : "none",
                  position:"relative", overflow:"hidden", cursor:"default",
                  transition:TR,
                  transform:  isThis  ? "scale(1.04)" : "scale(1)",
                  opacity:    isDimmed ? 0.12          : 1,
                  filter:     isDimmed ? "blur(2.5px)" : "none",
                  background: isThis  ? "rgba(255,255,255,0.04)" : "transparent",
                  zIndex: isThis ? 2 : 1,
                }}
              >
                {/* Grand chiffre fond */}
                <div style={{
                  position:"absolute", right:-12, bottom:-18,
                  fontFamily:"'Cormorant Garant',serif",
                  fontSize:140, fontWeight:300, color:"white",
                  lineHeight:1, userSelect:"none", pointerEvents:"none",
                  transition:TR,
                  opacity:   isThis ? 0.05 : 0,
                  transform: isThis ? "translateY(0)" : "translateY(10px)",
                }}>{num}</div>

                {/* Numéro */}
                <div style={{
                  fontFamily:"'Cormorant Garant',serif",
                  fontSize:40, fontWeight:300, lineHeight:1,
                  marginBottom:16, letterSpacing:"-.01em",
                  transition:TR,
                  color: isThis ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)",
                }}>{n}</div>

                {/* Titre */}
                <div style={{
                  fontFamily:"'Inter',sans-serif",
                  fontSize:10, fontWeight:500, letterSpacing:".12em",
                  textTransform:"uppercase",
                  color: isThis ? "rgba(255,255,255,1.0)" : "rgba(255,255,255,0.88)",
                  marginBottom:10, transition:TR,
                }}>{t}</div>

                {/* Description */}
                <div style={{
                  fontFamily:"'Inter',sans-serif",
                  fontSize:12, fontWeight:300, letterSpacing:".04em",
                  color:"#F1F5F9", lineHeight:1.72, opacity:0.72,
                }}>{d}</div>

                {/* Texte détaillé */}
                <div style={{
                  fontFamily:"'Inter',sans-serif",
                  fontSize:11.5, fontWeight:300, letterSpacing:".03em",
                  color:"rgba(241,245,249,0.72)", lineHeight:1.72,
                  marginTop:12, transition:TR,
                  opacity:   isThis ? 1 : 0,
                  transform: isThis ? "translateY(0)" : "translateY(6px)",
                  maxHeight: isThis ? "120px" : "0",
                  overflow:"hidden",
                }}>{detail}</div>

                {/* Gain bloc 04 */}
                {i === 3 && gain > 0 && (
                  <div style={{
                    marginTop:10,
                    fontFamily:"'Cormorant Garant',serif",
                    fontSize:13, fontWeight:300, fontStyle:"italic",
                    color:"#5CB88A", lineHeight:1.55,
                    transition:TR, opacity: isThis ? 1 : 0.6,
                  }}>
                    Optimisé pour capturer vos {feurLocal(gain)} de gain.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Séparateur bas */}
        <div style={{
          width:"100%",
          borderTop:"0.5px solid rgba(255,255,255,0.10)",
          marginBottom:34, transition:TR,
          opacity: isFocused ? 0.15 : 1,
        }}/>

        {/* Bouton */}
        <div style={{
          transition:TR,
          opacity: isFocused ? 0.12 : 1,
          filter:  isFocused ? "blur(2px)" : "none",
        }}>
          <motion.button
            className="btn-cta"
            whileHover={{ scale:1.04, boxShadow:"0 0 0 1px rgba(255,255,255,0.20), 0 8px 30px rgba(0,0,0,0.30)" }}
            whileTap={{ scale:0.97 }}
            onClick={onCTA}
            style={{
              background:"white", color:NAVY,
              border:"1px solid rgba(255,255,255,0.10)",
              fontFamily:"'Inter',sans-serif",
              fontSize:9, fontWeight:500, letterSpacing:".18em",
              padding:"14px 38px", borderRadius:8,
              cursor:"pointer", textTransform:"uppercase",
            }}
          >Optimiser mon portefeuille →</motion.button>
        </div>
      </div>
    </section>
  );
}



function StrategySection({ onCTA }: { onCTA: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView,      setInView     ] = useState(false);
  const [bankKey,     setBankKey    ] = useState("bnp");
  const [envelopes,   setEnvelopes  ] = useState<Set<EnvelopeKey>>(new Set(["pea"]));
  const [years,       setYears      ] = useState(15);
  const [barsStarted, setBarsStarted] = useState(false);
  const [revealed,    setRevealed   ] = useState<boolean[]>([]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          setTimeout(() => setBarsStarted(true), 500);
          obs.disconnect();
        }
      },
      { threshold: 0.06 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  function toggleEnv(key: EnvelopeKey) {
    setEnvelopes(prev => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
    setBarsStarted(false);
    setTimeout(() => setBarsStarted(true), 100);
  }

  useEffect(() => {
    if (!inView) return;
    setRevealed([]);
    const t = setTimeout(() => {
      Array.from({length: 8}).forEach((_,i) =>
        setTimeout(() => setRevealed(p => { const n=[...p]; n[i]=true; return n; }), 40 + i*70)
      );
    }, 20);
    return () => clearTimeout(t);
  }, [inView, bankKey, envelopes, years]);

  const bank    = BANKS[bankKey];
  const MSCI    = 0.08;
  const envList = Array.from(envelopes);
  const envData = envList.map(k => ENVELOPES[k]);
  const avgContrat = envData.reduce((s,e) => s + e.fraisContrat, 0) / envList.length;
  const avgVers    = envData.reduce((s,e) => s + e.fraisVersement, 0) / envList.length;
  const hasAV      = envelopes.has("av");

  // ── Frais gestion ACTIVE ──────────────────────────────────
  const actif_garde        = bank.garde;
  // TER du fonds + rétrocessions = coût total de la gestion active
  const actif_opcvm        = bank.ter_actif + bank.retrocessions;
  const actif_contrat = avgContrat;
  const actif_vers    = avgVers;
  const actif_court   = bank.courtage;
  const actif_total   = actif_garde + actif_opcvm + actif_contrat;

  // ── Frais gestion PASSIVE (dépendent du courtier) ─────────
  // En gestion passive, on ne paie que : ETF + courtage + garde si banque trad
  const passif_garde   = bank.type === "banque_trad" ? bank.garde : 0; // garde même sur ETF chez banque trad
  const passif_etf     = 0.20;          // TER moyen ETF MSCI World
  const passif_contrat = hasAV ? 0.30 : 0;
  const passif_court   = bank.courtage; // même courtier, même tarif
  const passif_total   = passif_garde + passif_etf + passif_contrat;

  const CAPITAL    = 150000;
  const actifFinal  = CAPITAL * (1 - actif_vers/100) * Math.pow(1 + MSCI - actif_total/100, years);
  const passifFinal = CAPITAL * Math.pow(1 + MSCI - passif_total/100, years);
  const gain        = passifFinal - actifFinal;
  const capturePct  = (actif_total / (MSCI * 100)) * 100;
  const barActif    = Math.min((actifFinal / passifFinal) * 100, 100);

  const feurL = (n: number) =>
    new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})
    .format(Math.round(Math.max(0,n)));

  // Hooks animés
  const a_garde_a  = useAnimatedNumber(actif_garde);
  const a_opcvm_a  = useAnimatedNumber(actif_opcvm);
  const a_cont_a   = useAnimatedNumber(actif_contrat);
  const a_vers_a   = useAnimatedNumber(actif_vers);
  const a_court_a  = useAnimatedNumber(actif_court);
  const a_total_a  = useAnimatedNumber(actif_total);
  const p_garde_a  = useAnimatedNumber(passif_garde);
  const p_etf_a    = useAnimatedNumber(passif_etf);
  const p_cont_a   = useAnimatedNumber(passif_contrat);
  const p_court_a  = useAnimatedNumber(passif_court);
  const p_total_a  = useAnimatedNumber(passif_total);
  const gainAni        = useAnimatedNumber(gain, 0, 1200);
  const captureAni     = useAnimatedNumber(capturePct, 1, 800);
  const actifFinalAni  = useAnimatedNumber(actifFinal, 0, 3000);
  const passifFinalAni = useAnimatedNumber(passifFinal, 0, 3000);

  const fadeV = (d = 0) => ({
    hidden:  { opacity:0, y:14, filter:"blur(5px)" },
    visible: { opacity:1, y:0,  filter:"blur(0px)",
      transition:{ duration:0.75, delay:d, ease:[0.22,1,0.36,1] } },
  });

  // ── Palette haute horlogerie ──────────────────────────────
  const BG      = "#050B14";
  const TEXT_W  = "rgba(229,231,235,0.90)";
  const TEXT_M  = "rgba(229,231,235,0.40)";
  const TEXT_S  = "rgba(229,231,235,0.22)";
  const DIV     = "0.5px solid rgba(255,255,255,0.07)";
  const DIV_MED = "0.5px solid rgba(255,255,255,0.12)";

  // Couleurs adoucies — haute horlogerie
  const ROUGE   = "rgba(248,113,113,0.80)";   // rouge corail doux
  const ROUGE_B = "rgba(127,29,29,0.55)";      // rouge foncé barre
  const VERT    = "rgba(74,222,128,0.80)";     // vert émeraude sourd
  const VERT_B  = "rgba(20,83,45,0.60)";       // vert foncé barre
  const VERT_G  = "rgba(74,222,128,0.16)";     // lueur gain

  const ROWS = [
    {
      group: "Frais annuels",
      rows: [
        {
          label:"Droits de garde",
          sub: bank.type === "banque_trad"
            ? "Conservation des titres — prélevé annuellement sur l'encours"
            : "Aucun droit de garde sur PEA/CTO chez les courtiers en ligne",
          actif: a_garde_a, passifVal: p_garde_a,
          passifNote: bank.type==="banque_trad" ? "Maintenu même sur ETF" : "0 %",
          isZeroPassif: passif_garde === 0, idx:0,
        },
        ...(hasAV ? [{
          label:"Frais de gestion du contrat",
          sub:"Assurance-vie : ~0.75%/an banque trad. · ~0.30%/an en ligne (Linxea, Lucya)",
          actif: a_cont_a, passifVal: p_cont_a,
          passifNote: "~0.30 % (AV en ligne)", isZeroPassif: false, idx:1,
        }] : []),
        {
          label:"Frais des supports investis",
          sub:"TER fonds actifs (~1.4%/an) + rétrocessions banque · ETF : 0.10–0.20%/an via Zero CGP",
          actif: a_opcvm_a, passifVal: p_etf_a,
          passifNote: "~0.20 %", isKey:true, isZeroPassif:false, idx:2,
        },
      ],
    },
    {
      group: "Frais ponctuels",
      rows: [
        {
          label:"Frais sur versement",
          sub: envList.includes("av") && bank.type==="banque_trad"
            ? "Assurance-vie bancaire : jusqu'à 3–4% sur chaque versement"
            : "0% sur PEA/CTO (loi Pacte) · 0% sur AV en ligne",
          actif: a_vers_a, passifVal: { toFixed: () => "0", valueOf: () => 0 } as unknown as { toFixed:(n:number)=>string },
          passifNote:"0 %", isZeroPassif:true, idx:3,
        },
        {
          label:"Frais de courtage",
          sub:"Même courtier, même tarif — inhérent à tout achat de titre ou ETF",
          actif: a_court_a, passifVal: p_court_a,
          passifNote:`${passif_court.toFixed(2)} %`,
          isResidual:true, isZeroPassif:false, idx:4,
        },
      ],
    },
  ];

  return (
    <section ref={ref} style={{
      minHeight:"100vh", scrollSnapAlign:"start",
      background:BG,
      display:"flex", flexDirection:"column",
      alignItems:"center",
      padding:"0 52px 80px", overflow:"hidden", position:"relative",
    }}>
      {/* Glow ambiant — très subtil */}
      <div style={{
        position:"absolute", top:0, left:"50%",
        transform:"translateX(-50%)",
        width:"70vw", height:"45vh",
        background:"radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.035) 0%, transparent 65%)",
        pointerEvents:"none", zIndex:0,
      }}/>

      <div style={{ width:"100%", maxWidth:780, position:"relative", zIndex:1 }}>

        {/* ── BLOC 1 : Stratégie d'investissement ─────────────── */}
        <motion.div variants={fadeV(0)} initial="hidden" animate={inView?"visible":"hidden"}
          style={{ paddingTop:64, paddingBottom:52 }}>

          <div style={{
            fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500,
            letterSpacing:".22em", textTransform:"uppercase",
            color:TEXT_S, marginBottom:14,
          }}>Stratégie d'investissement</div>

          <h2 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(28px,3.6vw,44px)", fontWeight:300,
            letterSpacing:"-.02em", color:TEXT_W, margin:"0 0 14px",
          }}>Deux moteurs. Une frontière efficiente.</h2>

          <p style={{
            fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:300,
            color:TEXT_M, lineHeight:1.78, maxWidth:560, margin:"0 0 36px",
          }}>
            Zero CGP optimise votre allocation entre{" "}
            <em style={{color:"rgba(229,231,235,0.62)"}}>titres vifs</em>{" "}
            (Moteur Alpha) et <em style={{color:"rgba(229,231,235,0.62)"}}>ETF</em>{" "}
            (Moteur Bêta) via l'algorithme de Markowitz. Vous recevez les quantités
            exactes à acheter et les exécutez chez le courtier de votre choix.
            Seul le courtage reste — les frais de gestion active disparaissent.
          </p>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[
              {
                tag:"Moteur Alpha · Titres vifs", icon:<ConstellationSVG dark/>,
                title:"Croissance directe",
                desc:"LVMH, Apple, ASML, Novo Nordisk. L'algorithme sélectionne les titres les plus pertinents pour votre profil. Conviction maximale, exposition ciblée.",
              },
              {
                tag:"Moteur Bêta · ETF", icon:<SphereSVG dark/>,
                title:"Diversification institutionnelle",
                desc:"MSCI World, S&P 500, marchés émergents. Couverture mondiale à frais quasi-nuls (~0.20%/an). L'approche des fonds souverains.",
              },
            ].map(({ tag, icon, title, desc }) => (
              <div key={tag} style={{
                background:"rgba(255,255,255,0.04)",
                backdropFilter:"blur(20px)",
                WebkitBackdropFilter:"blur(20px)",
                border:DIV, borderRadius:12, padding:"22px",
                position:"relative", overflow:"hidden",
                transition:"border-color .3s",
              }}>
                <div style={{
                  position:"absolute", top:-20, right:-20,
                  width:80, height:80,
                  background:`radial-gradient(circle, ${VERT_G} 0%, transparent 70%)`,
                  animation:"pulse-glow 4s ease-in-out infinite",
                  pointerEvents:"none",
                }}/>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                  <div style={{ flexShrink:0 }}>{icon}</div>
                  <div>
                    <div style={{
                      fontFamily:"'Inter',sans-serif", fontSize:8, fontWeight:500,
                      letterSpacing:".16em", textTransform:"uppercase",
                      color:TEXT_S, marginBottom:3,
                    }}>{tag}</div>
                    <h3 style={{
                      fontFamily:"'Cormorant Garant',serif",
                      fontSize:"clamp(15px,1.6vw,20px)", fontWeight:300,
                      color:TEXT_W, margin:0,
                    }}>{title}</h3>
                  </div>
                </div>
                <p style={{
                  fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:300,
                  color:TEXT_M, lineHeight:1.70, margin:0,
                }}>{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── BLOC 2 : Comparateur ─────────────────────────────── */}
        <motion.div variants={fadeV(0.08)} initial="hidden" animate={inView?"visible":"hidden"}
          style={{ borderTop:DIV }}>

          <div style={{
            fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500,
            letterSpacing:".22em", textTransform:"uppercase",
            color:TEXT_S, margin:"40px 0 14px",
          }}>Comparateur de frais</div>

          <h2 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(24px,3vw,38px)", fontWeight:300,
            letterSpacing:"-.02em", color:TEXT_W, margin:"0 0 28px",
          }}>Gestion active vs gestion passive.</h2>

          {/* Sélecteurs */}
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:32 }}>
            {/* Enveloppes */}
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {(["pea","cto","av"] as EnvelopeKey[]).map(k => {
                const active = envelopes.has(k);
                return (
                  <button key={k} onClick={()=>toggleEnv(k)} style={{
                    fontFamily:"'Inter',sans-serif",
                    fontSize:9, fontWeight:500, letterSpacing:".10em",
                    textTransform:"uppercase",
                    color: active ? TEXT_W : TEXT_M,
                    background: active ? "rgba(74,222,128,0.12)" : "transparent",
                    border: active ? `0.5px solid rgba(74,222,128,0.35)` : DIV,
                    borderRadius:100, padding:"7px 16px",
                    cursor:"pointer", transition:"all .20s",
                    display:"flex", alignItems:"center", gap:5,
                  }}>
                    {active && (
                      <span style={{
                        width:5, height:5, borderRadius:"50%",
                        background:VERT, flexShrink:0,
                        boxShadow:`0 0 6px ${VERT}`,
                      }}/>
                    )}
                    {ENVELOPES[k].label}
                  </button>
                );
              })}
              {envelopes.size > 1 && (
                <span style={{
                  fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:300,
                  color:TEXT_S, fontStyle:"italic",
                  display:"flex", alignItems:"center",
                }}>frais moyennés</span>
              )}
            </div>

            <div style={{flex:1}}/>

            {/* Durée */}
            <div style={{ display:"flex", gap:3 }}>
              {[10,15,20].map(y=>(
                <button key={y} onClick={()=>setYears(y)} style={{
                  fontFamily:"'Inter',sans-serif",
                  fontSize:8.5, fontWeight:500, letterSpacing:".10em",
                  color: y===years ? TEXT_W : TEXT_M,
                  background: "transparent",
                  border: y===years ? "0.5px solid rgba(229,231,235,0.28)" : DIV,
                  borderRadius:100, padding:"6px 12px", cursor:"pointer",
                  textTransform:"uppercase", transition:"all .18s",
                  boxShadow: y===years ? "inset 0 0 12px rgba(229,231,235,0.04)" : "none",
                }}>{y} ans</button>
              ))}
            </div>

            {/* Banque */}
            <div style={{ position:"relative" }}>
              <select value={bankKey} onChange={e=>setBankKey(e.target.value)} style={{
                appearance:"none", WebkitAppearance:"none",
                background:"rgba(255,255,255,0.04)",
                backdropFilter:"blur(12px)",
                border:DIV_MED, borderRadius:8,
                fontFamily:"'Inter',sans-serif",
                fontSize:10, fontWeight:500, letterSpacing:".06em",
                color:TEXT_W, textTransform:"uppercase",
                padding:"8px 28px 8px 14px", cursor:"pointer", outline:"none",
                transition:"border-color .2s",
              }}>
                {Object.entries(BANKS).map(([k,v])=>(
                  <option key={k} value={k} style={{background:"#050B14"}}>{v.label}</option>
                ))}
              </select>
              <svg style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}
                width="8" height="5" viewBox="0 0 8 5">
                <path d="M1 1l3 3 3-3" stroke="rgba(229,231,235,0.35)" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          {/* ── Barres de performance ────────────────────────── */}
          <div style={{
            background:"rgba(255,255,255,0.025)",
            border:DIV, borderRadius:12, padding:"24px 24px 20px",
            marginBottom:32,
          }}>
            {/* Gestion active */}
            <div style={{ marginBottom:22 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:9 }}>
                <div style={{
                  fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500,
                  letterSpacing:".14em", textTransform:"uppercase",
                  color:ROUGE,
                }}>Gestion active — {bank.label}</div>
                <div style={{
                  fontFamily:"'Cormorant Garant',serif",
                  fontSize:21, fontWeight:300, color:ROUGE, letterSpacing:"-.01em",
                }}>{feurL(actifFinalAni)}</div>
              </div>
              <div style={{
                height:6, background:"rgba(255,255,255,0.05)",
                borderRadius:3, overflow:"hidden",
              }}>
                <div style={{
                  height:"100%",
                  background:`linear-gradient(90deg, ${ROUGE_B} 0%, rgba(248,113,113,0.55) 100%)`,
                  borderRadius:3,
                  width: barsStarted ? `${barActif.toFixed(1)}%` : "0%",
                  transition:"width 3s cubic-bezier(0.25, 1, 0.5, 1)",
                }}/>
              </div>
              <div style={{
                fontFamily:"'Inter',sans-serif", fontSize:9.5, fontWeight:300,
                color:TEXT_S, marginTop:6, letterSpacing:".02em",
              }}>
                <span style={{
                  fontFamily:"'Roboto Mono',monospace", fontSize:10, color:ROUGE,
                }}>{a_total_a.toFixed(2)}&nbsp;%/an</span>
                {" "}prélevés · votre gestionnaire capte{" "}
                <span style={{
                  fontFamily:"'Roboto Mono',monospace", fontSize:10, color:ROUGE,
                }}>{captureAni.toFixed(1)}&nbsp;%</span>
                {" "}de votre rendement brut
              </div>
            </div>

            {/* Gestion passive */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:9 }}>
                <div style={{
                  fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500,
                  letterSpacing:".14em", textTransform:"uppercase",
                  color:VERT,
                }}>Gestion passive — titres vifs + ETF</div>
                <div style={{
                  fontFamily:"'Cormorant Garant',serif",
                  fontSize:21, fontWeight:300, color:VERT, letterSpacing:"-.01em",
                }}>{feurL(passifFinalAni)}</div>
              </div>
              <div style={{
                height:6, background:"rgba(255,255,255,0.05)",
                borderRadius:3, overflow:"hidden",
              }}>
                <div style={{
                  height:"100%",
                  background:`linear-gradient(90deg, ${VERT_B} 0%, rgba(74,222,128,0.50) 100%)`,
                  borderRadius:3,
                  width: barsStarted ? "100%" : "0%",
                  transition:"width 3s cubic-bezier(0.25, 1, 0.5, 1)",
                }}/>
              </div>
              <div style={{
                fontFamily:"'Inter',sans-serif", fontSize:9.5, fontWeight:300,
                color:TEXT_S, marginTop:6, letterSpacing:".02em",
              }}>
                <span style={{
                  fontFamily:"'Roboto Mono',monospace", fontSize:10, color:VERT,
                }}>{p_total_a.toFixed(2)}&nbsp;%/an</span>
                {" "}de frais résiduels · dont{" "}
                <span style={{
                  fontFamily:"'Roboto Mono',monospace", fontSize:10, color:VERT,
                }}>{p_court_a.toFixed(2)}&nbsp;%</span>
                {" "}de courtage incompressible
              </div>
            </div>
          </div>

          {/* ── Tableau 3 colonnes ──────────────────────────── */}
          {/* En-têtes — alignement correct */}
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 90px 106px",
            borderBottom:DIV_MED, paddingBottom:8,
          }}>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:8.5, fontWeight:500,
              letterSpacing:".14em", textTransform:"uppercase", color:TEXT_S,
            }}>Type de frais</div>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:8.5, fontWeight:500,
              letterSpacing:".12em", textTransform:"uppercase",
              color:ROUGE, textAlign:"right",
            }}>Actif</div>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:8.5, fontWeight:500,
              letterSpacing:".12em", textTransform:"uppercase",
              color:VERT, textAlign:"right", paddingRight:2,
            }}>Passif</div>
          </div>

          {ROWS.map((group, gi) => {
            let offset = ROWS.slice(0,gi).reduce((s,g)=>s+g.rows.length,0);
            return (
              <div key={group.group}>
                <div style={{
                  fontFamily:"'Inter',sans-serif", fontSize:7.5, fontWeight:500,
                  letterSpacing:".18em", textTransform:"uppercase",
                  color:TEXT_S, padding:"10px 0 2px",
                }}>{group.group}</div>
                {group.rows.map((row,ri) => {
                  const idx = offset+ri;
                  const isKey = (row as {isKey?:boolean}).isKey;
                  const isRes = (row as {isResidual?:boolean}).isResidual;
                  const isZP  = (row as {isZeroPassif?:boolean}).isZeroPassif;
                  const passifNote = (row as {passifNote?:string}).passifNote ?? "0 %";
                  const passifV    = (row as {passifVal?:{toFixed:(n:number)=>string}}).passifVal;
                  const passifStr  = passifV && typeof passifV.toFixed === "function"
                    ? `${passifV.toFixed(2)} %`
                    : passifNote;
                  return (
                    <div key={row.label}
                      className="table-row-hover"
                      style={{
                        display:"grid", gridTemplateColumns:"1fr 90px 106px",
                        position:"relative", overflow:"hidden",
                        borderRadius:4, cursor:"default",
                        background: isKey ? "rgba(248,113,113,0.03)" : "transparent",
                      }}>
                      {/* Label + sous-texte */}
                      <div style={{ padding:"9px 8px 7px 0" }}>
                        <div style={{
                          fontFamily:"'Inter',sans-serif",
                          fontSize:12, fontWeight: isKey ? 500 : 300,
                          color: isKey ? TEXT_W : isRes ? "rgba(74,222,128,0.65)" : TEXT_M,
                          fontStyle: isRes ? "italic" as const : "normal" as const,
                          marginBottom:2,
                        }}>{row.label}</div>
                        <div style={{
                          fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:300,
                          color:TEXT_S, lineHeight:1.45,
                        }}>{row.sub}</div>
                      </div>
                      {/* Actif */}
                      <div style={{
                        fontFamily:"'Roboto Mono','JetBrains Mono',monospace",
                        fontSize:12.5, fontWeight: isKey ? 500 : 300,
                        textAlign:"right", padding:"13px 0 7px",
                        color: row.actif > 0
                          ? (isKey ? ROUGE : "rgba(248,113,113,0.65)")
                          : TEXT_S,
                        alignSelf:"start",
                      }}>
                        <AnimNum value={row.actif}/>
                      </div>
                      {/* Passif */}
                      <div style={{
                        fontFamily:"'Roboto Mono','JetBrains Mono',monospace",
                        fontSize:12.5, fontWeight: isKey ? 500 : 300,
                        textAlign:"right", padding:"13px 2px 7px 0",
                        color: isZP ? TEXT_S
                          : isRes ? "rgba(74,222,128,0.60)"
                          : "rgba(74,222,128,0.80)",
                        alignSelf:"start",
                      }}>
                        {passifStr}
                      </div>
                      {/* Séparateur animé */}
                      <div style={{
                        position:"absolute", bottom:0, left:0, height:"0.5px",
                        background:"rgba(255,255,255,0.06)",
                        width: revealed[idx] ? "100%" : "0%",
                        transition:"width 0.45s cubic-bezier(0.22,1,0.36,1)",
                        transitionDelay:`${idx*0.06}s`,
                      }}/>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Total */}
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 90px 106px",
            borderTop:"1.5px solid rgba(229,231,235,0.18)",
            paddingTop:10, marginTop:4,
          }}>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:500,
              letterSpacing:".10em", textTransform:"uppercase",
              color:TEXT_M, padding:"6px 0",
            }}>Impact annualisé</div>
            <div style={{
              fontFamily:"'Roboto Mono',monospace",
              fontSize:14, fontWeight:700, textAlign:"right",
              color:ROUGE, padding:"4px 0",
            }}>{a_total_a.toFixed(2)}&nbsp;%</div>
            <div style={{
              fontFamily:"'Roboto Mono',monospace",
              fontSize:14, fontWeight:600, textAlign:"right",
              color:VERT, padding:"4px 2px 4px 0",
            }}>{p_total_a.toFixed(2)}&nbsp;%</div>
          </div>
        </motion.div>

        {/* ── BLOC 3 : Grand chiffre ────────────────────────────── */}
        <motion.div variants={fadeV(0.14)} initial="hidden" animate={inView?"visible":"hidden"}
          style={{
            paddingTop:56, paddingBottom:64,
            display:"flex", flexDirection:"column",
            alignItems:"center", textAlign:"center",
            borderTop:DIV, marginTop:12,
          }}>

          <div style={{
            fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500,
            letterSpacing:".22em", textTransform:"uppercase",
            color:TEXT_S, marginBottom:14,
          }}>
            {bank.label} · {years} ans · {envList.map(k=>ENVELOPES[k].label).join(" + ")}
          </div>

          <p style={{
            fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:300,
            color:TEXT_M, lineHeight:1.78, maxWidth:480, margin:"0 0 28px",
          }}>
            En abandonnant la gestion active, vous cessez d'offrir{" "}
            <span style={{
              fontFamily:"'Roboto Mono',monospace",
              fontSize:11, color:"rgba(248,113,113,0.70)",
            }}>{captureAni.toFixed(1)}&nbsp;%</span>
            {" "}de votre rendement annuel à votre gestionnaire.
            Sur {years} ans, à partir de 150&nbsp;000&nbsp;€, l'écart devient :
          </p>

          {/* Grand chiffre avec shimmer */}
          <div className="gain-shimmer" style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(60px,9vw,112px)",
            fontWeight:300, lineHeight:1, letterSpacing:"-.03em",
            color:"rgba(74,222,128,0.88)",
            textShadow:`0 0 40px rgba(74,222,128,0.14), 0 0 12px rgba(74,222,128,0.08)`,
            marginBottom:10,
          }}>{feurL(gainAni)}</div>

          <div style={{
            fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:300,
            color:TEXT_S, marginBottom:38, letterSpacing:".04em",
          }}>de gain supplémentaire sur {years} ans</div>

          <motion.button
            className="btn-cta"
            whileHover={{
              scale:1.04,
              boxShadow:`0 0 24px rgba(74,222,128,0.12), 0 8px 28px rgba(5,11,20,0.5)`,
            }}
            whileTap={{ scale:0.97 }}
            onClick={onCTA}
            style={{
              background:"rgba(255,255,255,0.07)",
              backdropFilter:"blur(12px)",
              WebkitBackdropFilter:"blur(12px)",
              color:"rgba(229,231,235,0.90)",
              border:"0.5px solid rgba(229,231,235,0.18)",
              fontFamily:"'Inter',sans-serif",
              fontSize:9, fontWeight:500, letterSpacing:".18em",
              padding:"14px 38px", borderRadius:8,
              cursor:"pointer", textTransform:"uppercase",
            }}
          >Créer mon portefeuille →</motion.button>
        </motion.div>

      </div>
    </section>
  );
}


function ConstellationSVG({ dark = false }: { dark?: boolean }) {
  const nodes: [number, number][] = [
    [18,16],[52,6],[88,20],[36,38],[70,33],[108,12],[50,54],[86,48],[116,36]
  ];
  const edges: [number,number][] = [
    [0,1],[1,2],[0,3],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[4,7],[5,7],[5,8],[7,8]
  ];
  return (
    <svg viewBox="0 0 136 64" width={136} height={64} style={{ overflow:"visible" }}>
      {edges.map(([a,b],i)=>(
        <line key={i}
          x1={nodes[a][0]} y1={nodes[a][1]}
          x2={nodes[b][0]} y2={nodes[b][1]}
          stroke={dark ? "rgba(229,231,235,0.20)" : "rgba(10,22,40,0.16)"} strokeWidth="0.5"
        />
      ))}
      {nodes.map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y}
          r={i===4 ? 3.5 : i===1||i===7 ? 2.5 : 1.8}
          fill={i===4 ? (dark ? "rgba(110,231,183,0.85)" : NAVY) : (dark ? "rgba(229,231,235,0.45)" : "rgba(10,22,40,0.38)")}
        />
      ))}
    </svg>
  );
}

// ── SVG Sphère ────────────────────────────────────────────────
function SphereSVG({ dark = false }: { dark?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" width={64} height={64}>
      <defs>
        <clipPath id="sc2"><circle cx="32" cy="32" r="24"/></clipPath>
      </defs>
      <circle cx="32" cy="32" r="24" fill="none" stroke={dark ? "rgba(229,231,235,0.20)" : "rgba(10,22,40,0.16)"} strokeWidth="0.5"/>
      {[-14,-7,0,7,14].map((ox,i)=>(
        <ellipse key={i} cx="32" cy="32"
          rx={Math.max(1,Math.abs(ox)*0.7+2)} ry="24"
          fill="none" stroke="rgba(10,22,40,0.11)" strokeWidth="0.5"
          clipPath="url(#sc2)"
        />
      ))}
      {[-10,-3,4,11].map((oy,i)=>(
        <ellipse key={i} cx="32" cy={32+oy}
          rx={Math.sqrt(Math.max(0,24*24-oy*oy))}
          ry={Math.max(1,Math.abs(oy)*0.28+2)}
          fill="none" stroke="rgba(10,22,40,0.10)" strokeWidth="0.5"
        />
      ))}
      <circle cx="32" cy="32" r="3" fill={NAVY}/>
    </svg>
  );
}



export default function LandingPage() {
  const router       = useRouter();
  const [darkNav,    setDarkNav   ] = useState(false);
  const [scrolled,   setScrolled  ] = useState(false);

  // Détection section sombre pour adapter la nav
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const DARK_TABS = [2]; // index des sections sombres (StrategySection)
    const onScroll = () => {
      const h = el.clientHeight;
      const tab = Math.round(el.scrollTop / h);
      setDarkNav(DARK_TABS.includes(tab));
      setScrolled(el.scrollTop > 20);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab,  setActiveTab  ]=useState(0);
  const [capital,    setCapital    ]=useState(150000);
  const [years,      setYears      ]=useState(15);
  const [cgpFees,    setCgpFees    ]=useState(2.5);
  const [displayGain,setDisplayGain]=useState(0);

  useEffect(()=>{
    const c=containerRef.current;
    if(!c) return;
    const handle=()=>setActiveTab(Math.round(c.scrollTop/window.innerHeight));
    c.addEventListener("scroll",handle,{passive:true});
    return ()=>c.removeEventListener("scroll",handle);
  },[]);

  function scrollTo(idx:number){
    setActiveTab(idx);
    containerRef.current?.scrollTo({top:idx*window.innerHeight,behavior:"smooth"});
  }

  const cgpTraj =buildTrajectory(capital,years,cgpFees/100);
  const etfTraj =buildTrajectory(capital,years,ETF_FEES);
  const manque  =etfTraj[years].value-cgpTraj[years].value;
  const chartData=Array.from({length:years+1},(_,i)=>({
    an:i,
    "ETF MSCI World (Zero CGP)":etfTraj[i].value,
    "Banque / CGP":cgpTraj[i].value,
  }));

  return (
    
      {/* ══ NAV Apple Glass ══ */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:9999,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"16px 52px",
        background: darkNav ? "rgba(5,11,20,0.72)" : "rgba(255,255,255,0.70)",
        backdropFilter:"blur(15px)", WebkitBackdropFilter:"blur(15px)",
        borderBottom: scrolled
          ? (darkNav ? "0.5px solid rgba(255,255,255,0.08)" : "0.5px solid rgba(10,22,40,0.08)")
          : "0.5px solid transparent",
        transition:"background .35s ease, border-color .25s ease",
      }}>
        <span style={{
          fontFamily:"'Cormorant Garant',serif", fontSize:12, fontWeight:400,
          letterSpacing:".38em", textTransform:"uppercase", transition:"color .3s",
          color: darkNav ? "rgba(229,231,235,0.88)" : NAVY,
        }}>Zero CGP</span>
        <div style={{ display:"flex", gap:2 }}>
          {["Accueil","Comment ça fonctionne","La Stratégie"].map((label,i)=>(
            <button key={i} onClick={()=>scrollTo(i)} style={{
              background:"none", border:"none", cursor:"pointer",
              fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500,
              letterSpacing:".13em", textTransform:"uppercase", transition:"color .3s",
              padding:"8px 14px", borderRadius:6,
              color: activeTab===i
                ? (darkNav ? "rgba(229,231,235,0.92)" : NAVY)
                : (darkNav ? "rgba(229,231,235,0.28)" : "rgba(10,22,40,0.30)"),
            }}>{label}</button>
          ))}
        </div>
        <button onClick={()=>window.location.href="/auth/login"} style={{
          background:"none", cursor:"pointer", textTransform:"uppercase",
          fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500,
          letterSpacing:".13em", padding:"8px 20px", borderRadius:7,
          border: darkNav ? "0.5px solid rgba(229,231,235,0.22)" : "0.5px solid rgba(10,22,40,0.18)",
          color: darkNav ? "rgba(229,231,235,0.85)" : NAVY,
          transition:"color .3s, border-color .3s",
        }}>Connexion</button>
      </nav>

<>
      <style>{GLOBAL_CSS}</style>
      <div ref={containerRef} style={{height:"100vh",overflowY:"scroll",scrollSnapType:"y mandatory"}}>

        <HeroSection
          capital={capital} years={years}
          onCapitalChange={setCapital} onYearsChange={setYears}
          onCTA={()=>router.push("/auth/register")}
          onScroll={()=>scrollTo(1)}
          activeTab={activeTab} onNav={scrollTo}
          onGainUpdate={setDisplayGain}
        />

        <HowSection gain={displayGain} onCTA={() => router.push("/auth/register")} />

                {/* ═══════════════ SECTION 3 — LA STRATÉGIE ═══════════════ */}
        <StrategySection onCTA={() => router.push("/auth/register")} />

      </div>
    </>
  );
}
