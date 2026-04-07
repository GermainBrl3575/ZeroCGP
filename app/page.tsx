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
  // Frais annuels (prélevés sur l'encours)
  garde: number;       // Droits de garde / tenue de compte (% encours/an)
  opcvm: number;       // Frais moy. OPCVM actifs si gestion déléguée (% encours/an)
  // Frais par transaction
  courtage: number;    // Commission de courtage (% du montant de l'ordre)
  versement: number;   // Frais sur versement (sur AV/gestion pilotée, généralement 0 sur PEA libre)
  // Meta
  type: "banque_trad" | "banque_ligne" | "courtier";
  note: string;
}> = {
  bnp: {
    label: "BNP Paribas", type: "banque_trad",
    garde: 0.25,   // Barème progressif BNP : 0.40% jusqu'à 50k€, 0.20% jusqu'à 150k€ — moy. ~0.25%
    opcvm: 1.8,    // Frais OPCVM BNP (fonds maison) : 1.5–2.5%/an, moy. 1.8%
    courtage: 0.5, // Plafond légal PEA (0.5%), BNP est souvent au plafond
    versement: 0,  // PEA : pas de frais de versement (réglementaire)
    note: "Droits de garde + OPCVM maison chargés en frais",
  },
  sg: {
    label: "Société Générale", type: "banque_trad",
    garde: 0.20,   // SG : droits de garde ~0.20-0.30% selon encours
    opcvm: 1.7,    // Fonds SG actifs : ~1.5-2%/an
    courtage: 0.5, // Au plafond légal PEA
    versement: 0,
    note: "Rétrocessions OPCVM importantes, courtage au plafond légal",
  },
  lcl: {
    label: "LCL", type: "banque_trad",
    garde: 0.30,   // LCL : droits de garde 0.20-0.40% selon profil
    opcvm: 1.6,    // Fonds LCL : ~1.5-1.8%/an
    courtage: 0.5, // Plafond légal PEA
    versement: 0,
    note: "Frais de garde + OPCVM maison, pas d'ETF mis en avant",
  },
  cacib: {
    label: "Crédit Agricole", type: "banque_trad",
    garde: 0.20,   // CA : 0.10-0.50% selon région et encours
    opcvm: 1.7,    // Fonds Amundi (filiale CA) : 1.5-2%/an
    courtage: 0.5, // Plafond légal
    versement: 0,
    note: "Amundi est filiale CA — rétrocessions sur fonds maison",
  },
  bourso: {
    label: "BoursoBank", type: "banque_ligne",
    garde: 0.0,    // Aucun droit de garde (argument marketing clé)
    opcvm: 0.5,    // Frais courtage OPCVM (pas de droits de garde mais frais de transaction)
    courtage: 0.5, // 0.50-0.60% selon offre (Boursomarkets, plafond légal PEA)
    versement: 0,
    note: "0 droits de garde, mais courtage au plafond légal depuis 2023",
  },
  fortuneo: {
    label: "Fortuneo", type: "banque_ligne",
    garde: 0.0,    // Aucun droit de garde
    opcvm: 0.0,    // Pas de fonds maison chargés
    courtage: 0.35, // Formule Starter : 0.35% (1 ordre/mois gratuit ≤500€)
    versement: 0,
    note: "Meilleur rapport qualité/prix : 1 ordre/mois gratuit ≤500€",
  },
  rothschild: {
    label: "Rothschild & Co", type: "banque_trad",
    garde: 0.0,    // Inclus dans les frais globaux de gestion privée
    opcvm: 0.0,    // Frais inclus dans la gestion sous mandat
    courtage: 0.3, // Courtage négocié (tarifs privés)
    versement: 0,
    // Frais de gestion sous mandat = 1.0-1.5%/an all-in
    note: "Gestion privée : frais globaux ~1.0-1.5%/an sous mandat",
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
  opacity:0.024; pointer-events:none; animation:grain 0.9s steps(2) infinite; z-index:1;
}
@keyframes rotateSlow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes shine {
  0%{ transform:translateX(-100%) skewX(-16deg); }
  40%,100%{ transform:translateX(220%) skewX(-16deg); }
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
      gZ.addColorStop(0,   `rgba(45,90,67,0.0)`);
      gZ.addColorStop(0.3, `rgba(134,239,172,${0.03*aArea})`);
      gZ.addColorStop(0.75,`rgba(134,239,172,${0.07*aArea})`);
      gZ.addColorStop(1,   `rgba(134,239,172,${0.13*aArea})`);
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
      gLine.addColorStop(0,  "rgba(10,22,40,0.18)");
      gLine.addColorStop(0.4,"rgba(10,22,40,0.55)");
      gLine.addColorStop(0.8,"rgba(10,22,40,0.85)");
      gLine.addColorStop(1,  "#0A1628");
      ct.strokeStyle=gLine;
      ct.lineWidth=1.8;
      ct.lineJoin="round";
      ct.lineCap="round";
      ct.stroke();

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
      ct.strokeStyle="rgba(45,90,67,0.34)"; ct.lineWidth=1; ct.stroke();
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

  const wrapV={hidden:{},visible:{transition:{staggerChildren:0.14,delayChildren:0.2}}};
  const itemV={hidden:{opacity:0,y:14},visible:{opacity:1,y:0,transition:{duration:0.85,ease:[0.22,1,0.36,1]}}};

  return (
    <section className="hero-grain" style={{
      height:"100vh", scrollSnapAlign:"start",
      background:"radial-gradient(ellipse 72% 58% at 50% 36%, #F2F5FA 0%, #FBFBFD 50%, #F7F6F3 100%)",
      display:"flex", flexDirection:"column",
      position:"relative", overflow:"hidden",
    }}>

      {/* Canvas plein écran z:2 */}
      <canvas ref={cvsRef} style={{
        position:"absolute", top:0, left:0,
        width:"100%", height:"100%",
        zIndex:2, pointerEvents:"none",
      }}/>

      {/* Nav */}
      <nav style={{
        position:"absolute",top:0,left:0,right:0,zIndex:10,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"28px 52px",
      }}>
        <span style={{
          fontFamily:"'Cormorant Garant',serif",
          fontSize:12,fontWeight:400,letterSpacing:".38em",
          color:NAVY,textTransform:"uppercase",
        }}>Zero CGP</span>

        <div style={{display:"flex",gap:2}}>
          {["Accueil","Comment ça fonctionne","La Stratégie"].map((label,i)=>(
            <button key={i} onClick={()=>onNav(i)} style={{
              background:"none",border:"none",cursor:"pointer",
              fontFamily:"'Inter',sans-serif",
              fontSize:9,fontWeight:500,letterSpacing:".13em",
              color:activeTab===i?NAVY:"rgba(10,22,40,0.30)",
              padding:"8px 16px",borderRadius:6,transition:"color .2s",
              textTransform:"uppercase",
            }}>{label}</button>
          ))}
        </div>

        <button onClick={()=>window.location.href="/auth/login"} style={{
          background:"none",border:"0.5px solid rgba(10,22,40,0.18)",
          fontFamily:"'Inter',sans-serif",
          fontSize:9,fontWeight:500,letterSpacing:".13em",
          color:NAVY,padding:"9px 22px",borderRadius:7,
          cursor:"pointer",textTransform:"uppercase",
        }}>Connexion</button>
      </nav>

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
          color:"rgba(10,22,40,0.35)", lineHeight:1.6,
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
  const [inView,   setInView  ] = useState(false);
  const [bankKey,  setBankKey ] = useState("bnp");
  const [envelope, setEnvelope] = useState<EnvelopeKey>("pea");
  const [years,    setYears   ] = useState(15);
  const [capital,  setCapital ] = useState(150000);
  const [revealed, setRevealed] = useState([false,false,false,false,false,false]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  // Réinitialiser l'animation à chaque changement
  useEffect(() => {
    if (!inView) return;
    setRevealed([false,false,false,false,false,false]);
    const t = setTimeout(() => {
      [0,1,2,3,4,5].forEach(i =>
        setTimeout(() => setRevealed(p => { const n=[...p]; n[i]=true; return n; }), 60 + i*90)
      );
    }, 30);
    return () => clearTimeout(t);
  }, [inView, bankKey, envelope]);

  const bank = BANKS[bankKey];
  const env  = ENVELOPES[envelope];
  const MSCI = 0.08;

  // ── Frais côté GESTION ACTIVE (banque traditionnelle) ──────
  // Ce que paie réellement un client en gestion active
  const actif_garde    = bank.garde;           // droits de garde annuels
  const actif_opcvm    = bank.opcvm;           // frais fonds actifs (le vrai scandale)
  const actif_contrat  = envelope === "av" ? env.fraisContrat : 0;
  const actif_vers     = envelope === "av" ? env.fraisVersement : 0;
  const actif_courtage = bank.courtage;        // courtage par ordre
  const actif_total_an = actif_garde + actif_opcvm + actif_contrat; // frais annuels

  // ── Frais côté GESTION PASSIVE (ETF chez courtier en ligne) ─
  // Ce que paiera l'utilisateur de Zero CGP en s'exécutant lui-même
  const passif_garde    = 0;      // 0% sur PEA/CTO courtier en ligne
  const passif_contrat  = envelope === "av" ? 0.3 : 0;  // AV en ligne type Linxea ~0.3%/an
  const passif_vers     = 0;      // 0% sur PEA (loi), 0% sur CTO, 0% AV en ligne
  const passif_etf      = 0.20;   // Frais ETF (ex. Amundi MSCI World PEA : 0.12-0.25%)
  const passif_courtage = envelope === "pea" ? 0.20 : 0.20; // ~0.20% chez courtier en ligne
  const passif_total_an = passif_garde + passif_contrat + passif_etf; // frais annuels

  // ── Calcul de la perte sur la durée ────────────────────────
  const grossReturn    = MSCI;
  const actifNetReturn = grossReturn - actif_total_an / 100;
  const passifNetRet   = grossReturn - passif_total_an / 100;

  const actifFinal   = capital * (1 - actif_vers/100) * Math.pow(1 + actifNetReturn, years)
                       - capital * actif_vers/100; // frais versement ponctuel
  const passifFinal  = capital * Math.pow(1 + passifNetRet, years);
  const gain         = passifFinal - actifFinal;
  const capturePct   = (actif_total_an / MSCI * 100);

  const feurL = (n: number) =>
    new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})
    .format(Math.round(Math.max(0,n)));

  // Hooks animés
  const a_garde_ani   = useAnimatedNumber(actif_garde);
  const a_opcvm_ani   = useAnimatedNumber(actif_opcvm);
  const a_contrat_ani = useAnimatedNumber(actif_contrat);
  const a_vers_ani    = useAnimatedNumber(actif_vers);
  const a_court_ani   = useAnimatedNumber(actif_courtage);
  const a_total_ani   = useAnimatedNumber(actif_total_an);
  const p_contrat_ani = useAnimatedNumber(passif_contrat);
  const p_etf_ani     = useAnimatedNumber(passif_etf);
  const p_court_ani   = useAnimatedNumber(passif_courtage);
  const p_total_ani   = useAnimatedNumber(passif_total_an);
  const gainAni       = useAnimatedNumber(gain, 0, 900);
  const captureAni    = useAnimatedNumber(capturePct, 1, 700);

  const fadeV = (d = 0) => ({
    hidden:  { opacity:0, y:10, filter:"blur(3px)" },
    visible: { opacity:1, y:0,  filter:"blur(0px)",
      transition:{ duration:0.65, delay:d, ease:[0.22,1,0.36,1] } },
  });

  const SEP     = "0.5px solid rgba(10,22,40,0.08)";
  const SEP_MED = "0.5px solid rgba(10,22,40,0.15)";
  const TH = (align: "left"|"right" = "left") => ({
    fontFamily:"'Inter',sans-serif", fontSize:8.5, fontWeight:500,
    letterSpacing:".14em", textTransform:"uppercase" as const,
    color:"rgba(10,22,40,0.32)", textAlign:align, padding:"5px 10px",
  });
  const TD = (color = "rgba(10,22,40,0.65)") => ({
    fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:300,
    letterSpacing:".03em", color, padding:"8px 10px", lineHeight:1.4,
  });
  const MONO = (color = "rgba(10,22,40,0.48)") => ({
    fontFamily:"'Roboto Mono','JetBrains Mono',monospace",
    fontSize:12.5, fontWeight:300, textAlign:"right" as const,
    color, padding:"8px 10px",
  });
  const GL = {  // Group label
    fontFamily:"'Inter',sans-serif", fontSize:7.5, fontWeight:500,
    letterSpacing:".18em", textTransform:"uppercase" as const,
    color:"rgba(10,22,40,0.22)", padding:"10px 10px 3px",
  };

  // Lignes du tableau
  const ROWS = [
    // Frais annuels récurrents
    {
      group: "Frais annuels récurrents",
      rows: [
        {
          label:"Droits de garde (conservation)",
          actif: a_garde_ani,
          passif: passif_garde,
          passifStr: "0 %",
          note: bank.type === "banque_trad"
            ? "Supprimés — courtier en ligne (Fortuneo, BoursoBank)"
            : "Déjà 0% — vous êtes bien placé",
          highlight: actif_garde > 0,
        },
        ...(envelope === "av" ? [{
          label:"Frais de gestion du contrat",
          actif: a_contrat_ani,
          passif: passif_contrat,
          passifStr: "~0.30 %",
          note:"AV en ligne (Linxea, Lucya) : ~0.30% vs ~0.75% banque trad.",
          highlight: actif_contrat > passif_contrat,
        }] : []),
        {
          label:"Frais des supports (OPCVM vs ETF)",
          actif: a_opcvm_ani,
          passif: passif_etf,
          passifStr: "~0.20 %",
          note:"C'est ici que se creuse l'écart : fonds actifs 1.5-2.5% vs ETF 0.10-0.25%",
          highlight: true,
          key_row: true,
        },
      ],
    },
    // Frais ponctuels
    {
      group: "Frais ponctuels",
      rows: [
        {
          label:"Frais sur versement",
          actif: a_vers_ani,
          passif: passif_vers,
          passifStr: "0 %",
          note: envelope === "pea"
            ? "0% légal sur PEA (loi Pacte 2019)"
            : envelope === "cto"
              ? "0% sur CTO"
              : "0% sur AV en ligne — jusqu'à 4% chez banques trad.",
          highlight: actif_vers > 0,
        },
        {
          label:"Frais de courtage (par ordre)",
          actif: a_court_ani,
          passif: passif_courtage,
          passifStr: "~0.20 %",
          note:"Incompressible — choisissez un courtier en ligne compétitif",
          highlight: false,
          residual: true,
        },
      ],
    },
  ];

  return (
    <section ref={ref} style={{
      minHeight:"100vh", scrollSnapAlign:"start",
      background:"#F9F8F6",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"52px 52px 48px", overflow:"hidden", position:"relative",
    }}>
      <div style={{ width:"100%", maxWidth:840, position:"relative", zIndex:1 }}>

        {/* Header */}
        <motion.div variants={fadeV(0)} initial="hidden" animate={inView?"visible":"hidden"}
          style={{ marginBottom:28, display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:16 }}>
          <div>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500,
              letterSpacing:".22em", color:"rgba(10,22,40,0.28)",
              textTransform:"uppercase", marginBottom:8,
            }}>La stratégie</div>
            <h2 style={{
              fontFamily:"'Cormorant Garant',serif",
              fontSize:"clamp(26px,3.4vw,44px)", fontWeight:300,
              letterSpacing:"-.02em", color:NAVY, margin:"0 0 6px",
            }}>Preuve par l'algorithme.</h2>
            <p style={{
              fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:300,
              color:"rgba(10,22,40,0.42)", margin:0, maxWidth:520, lineHeight:1.65,
            }}>
              Zero CGP calcule votre portefeuille optimal en ETF passifs.
              Vous l'exécutez vous-même chez le courtier de votre choix.
              Seuls les frais incompressibles restent.
            </p>
          </div>
        </motion.div>

        {/* Deux moteurs */}
        <motion.div variants={fadeV(0.05)} initial="hidden" animate={inView?"visible":"hidden"}
          style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:26 }}>
          {[
            { tag:"Moteur Alpha", icon:<ConstellationSVG/>, title:"Actions — Croissance pure",
              desc:"LVMH, Apple, ASML, Novo Nordisk. Titres vifs pour capturer la croissance directe." },
            { tag:"Moteur Bêta", icon:<SphereSVG/>, title:"ETF — Diversification institutionnelle",
              desc:"MSCI World, S&P 500, marchés émergents. Frais quasi-nuls. L'approche des fonds souverains." },
          ].map(({ tag, icon, title, desc }) => (
            <motion.div key={tag}
              whileHover={{ y:-2, boxShadow:"0 4px 24px rgba(10,22,40,0.06)" }}
              transition={{ duration:0.2 }}
              style={{ background:"rgba(10,22,40,0.03)", border:SEP, borderRadius:10, padding:"16px 18px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ opacity:0.6, flexShrink:0 }}>{icon}</div>
                <div>
                  <div style={{
                    fontFamily:"'Inter',sans-serif", fontSize:8, fontWeight:500,
                    letterSpacing:".18em", color:"rgba(10,22,40,0.28)",
                    textTransform:"uppercase", marginBottom:3,
                  }}>{tag}</div>
                  <h3 style={{
                    fontFamily:"'Cormorant Garant',serif",
                    fontSize:"clamp(14px,1.6vw,19px)", fontWeight:300, fontStyle:"italic",
                    color:NAVY, margin:0,
                  }}>{title}</h3>
                </div>
              </div>
              <p style={{
                fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:300,
                color:"rgba(10,22,40,0.46)", lineHeight:1.65, margin:0,
              }}>{desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Sélecteurs + titre tableau */}
        <motion.div variants={fadeV(0.09)} initial="hidden" animate={inView?"visible":"hidden"}
          style={{ marginBottom:12 }}>

          {/* Ligne 1 : titre + pills enveloppe */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            gap:12, marginBottom:10, flexWrap:"wrap",
          }}>
            <div style={{
              fontFamily:"'Cormorant Garant',serif",
              fontSize:"clamp(15px,1.7vw,21px)", fontWeight:300, fontStyle:"italic", color:NAVY,
            }}>Gestion active vs gestion passive</div>

            {/* Pills enveloppe */}
            <div style={{
              display:"flex", gap:0,
              border:SEP_MED, borderRadius:9, overflow:"hidden", background:"white",
            }}>
              {(["pea","cto","av"] as EnvelopeKey[]).map((k,idx) => {
                const e = ENVELOPES[k];
                const active = envelope === k;
                return (
                  <button key={k} onClick={()=>setEnvelope(k)} style={{
                    fontFamily:"'Inter',sans-serif",
                    fontSize:9, fontWeight:500, letterSpacing:".10em",
                    textTransform:"uppercase",
                    color: active ? "white" : "rgba(10,22,40,0.44)",
                    background: active ? NAVY : "transparent",
                    border:"none",
                    padding:"8px 16px", cursor:"pointer", transition:"all .18s",
                    borderRight: idx < 2 ? SEP_MED : "none",
                  }}>{e.label}</button>
                );
              })}
            </div>
          </div>

          {/* Ligne 2 : info enveloppe + durée + banque */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            {/* Badge enveloppe */}
            <div style={{
              flex:1, minWidth:160,
              background:"rgba(10,22,40,0.03)", border:SEP,
              borderRadius:7, padding:"7px 12px",
            }}>
              <div style={{
                fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500,
                letterSpacing:".12em", textTransform:"uppercase",
                color:"rgba(10,22,40,0.32)", marginBottom:2,
              }}>Fiscalité {env.label}</div>
              <div style={{
                fontFamily:"'Inter',sans-serif", fontSize:10.5, fontWeight:300,
                color:"rgba(10,22,40,0.52)", lineHeight:1.45,
              }}>{env.fiscalite}</div>
            </div>

            {/* Durée */}
            <div style={{ display:"flex", gap:3 }}>
              {[10,15,20].map(y=>(
                <button key={y} onClick={()=>setYears(y)} style={{
                  fontFamily:"'Inter',sans-serif",
                  fontSize:8.5, fontWeight:500, letterSpacing:".10em",
                  color: y===years ? "#F9F8F6" : "rgba(10,22,40,0.40)",
                  background: y===years ? "#0A1628" : "none",
                  border: y===years ? "0.5px solid #0A1628" : SEP_MED,
                  borderRadius:100, padding:"6px 12px", cursor:"pointer",
                  textTransform:"uppercase", transition:"all .15s",
                }}>{y} ans</button>
              ))}
            </div>

            {/* Dropdown banque */}
            <div style={{ position:"relative" }}>
              <select value={bankKey} onChange={e=>setBankKey(e.target.value)} style={{
                appearance:"none", WebkitAppearance:"none",
                background:"white", border:SEP_MED, borderRadius:8,
                fontFamily:"'Inter',sans-serif",
                fontSize:10, fontWeight:500, letterSpacing:".08em",
                color:NAVY, textTransform:"uppercase",
                padding:"8px 30px 8px 14px", cursor:"pointer", outline:"none",
                boxShadow:"0 1px 6px rgba(10,22,40,0.04)",
              }}>
                {Object.entries(BANKS).map(([k,v])=>(
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <svg style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}
                width="9" height="5" viewBox="0 0 9 5">
                <path d="M1 1l3.5 3L8 1" stroke="rgba(10,22,40,0.36)" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Tableau */}
        <motion.div variants={fadeV(0.12)} initial="hidden" animate={inView?"visible":"hidden"}>

          {/* En-têtes — 3 colonnes : Frais | Gestion active | Gestion passive */}
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 96px 112px 1fr",
            borderBottom:SEP_MED, paddingBottom:5, marginBottom:0,
          }}>
            <div style={TH()}>Type de frais</div>
            <div style={TH("right")}>
              <span style={{ color:"#DC2626" }}>Gestion active</span>
            </div>
            <div style={TH("right")}>
              <span style={{ color:"#0A6634" }}>Gestion passive</span>
            </div>
            <div style={TH()}>Ce que ça change</div>
          </div>

          {/* Groupes de lignes */}
          {ROWS.map((group, gi) => {
            let rowIdx = ROWS.slice(0,gi).reduce((s,g) => s + g.rows.length, 0);
            return (
              <div key={group.group} style={{ marginBottom:2 }}>
                <div style={GL}>{group.group}</div>
                {group.rows.map((row, ri) => {
                  const idx = rowIdx + ri;
                  const isKeyRow = (row as {key_row?: boolean}).key_row;
                  const isResidual = (row as {residual?: boolean}).residual;
                  return (
                    <div key={row.label} style={{
                      display:"grid", gridTemplateColumns:"1fr 96px 112px 1fr",
                      position:"relative", overflow:"hidden",
                      background: isKeyRow
                        ? "linear-gradient(90deg, rgba(220,38,38,0.04) 0%, rgba(10,22,40,0.02) 50%, rgba(10,102,52,0.04) 100%)"
                        : isResidual
                          ? "rgba(45,90,67,0.04)"
                          : row.highlight
                            ? "rgba(220,38,38,0.025)"
                            : "transparent",
                      borderRadius: isKeyRow ? 4 : 0,
                    }}>
                      <div style={{
                        ...TD(isResidual ? "#2D5A43" : isKeyRow ? NAVY : "rgba(10,22,40,0.68)"),
                        fontWeight: isKeyRow ? 400 : 300,
                        fontStyle: isResidual ? "italic" as const : "normal" as const,
                      }}>{row.label}</div>

                      {/* Gestion active — rouge */}
                      <div style={{
                        fontFamily:"'Roboto Mono','JetBrains Mono',monospace",
                        fontSize:12.5, fontWeight: isKeyRow ? 500 : 300,
                        textAlign:"right", padding:"8px 10px",
                        color: row.actif > 0 ? (isKeyRow ? "#B91C1C" : "#DC2626") : "rgba(10,22,40,0.28)",
                      }}>
                        <AnimNum value={row.actif}/>
                      </div>

                      {/* Gestion passive — vert */}
                      <div style={{
                        fontFamily:"'Roboto Mono','JetBrains Mono',monospace",
                        fontSize:12.5, fontWeight: isKeyRow ? 500 : 300,
                        textAlign:"right", padding:"8px 10px",
                        color: isResidual ? "#2D5A43" : "#0A6634",
                      }}>
                        {row.passifStr}
                      </div>

                      <div style={{
                        fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:300,
                        fontStyle:"italic", color: isKeyRow ? "rgba(10,22,40,0.45)" : "rgba(10,22,40,0.30)",
                        padding:"8px 10px", lineHeight:1.5,
                      }}>{row.note}</div>

                      {/* Ligne d'animation */}
                      <div style={{
                        position:"absolute", bottom:0, left:0, height:"0.5px",
                        background: isKeyRow ? "rgba(10,22,40,0.10)" : "rgba(10,22,40,0.06)",
                        width: revealed[idx] ? "100%" : "0%",
                        transition:"width 0.5s cubic-bezier(0.22,1,0.36,1)",
                        transitionDelay:`${idx*0.06}s`,
                      }}/>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Totaux */}
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 96px 112px 1fr",
            borderTop:SEP_MED, paddingTop:8, marginTop:4,
            background:"rgba(10,22,40,0.02)", borderRadius:4,
          }}>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:500,
              letterSpacing:".10em", textTransform:"uppercase",
              color:"rgba(10,22,40,0.55)", padding:"8px 10px",
            }}>Impact annualisé</div>
            <div style={{
              fontFamily:"'Roboto Mono',monospace",
              fontSize:14, fontWeight:600, textAlign:"right",
              color:"#B91C1C", padding:"8px 10px",
            }}>{a_total_ani.toFixed(2)}&nbsp;%</div>
            <div style={{
              fontFamily:"'Roboto Mono',monospace",
              fontSize:14, fontWeight:500, textAlign:"right",
              color:"#0A6634", padding:"8px 10px",
            }}>{p_total_ani.toFixed(2)}&nbsp;%</div>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:9.5, fontWeight:300,
              fontStyle:"italic", color:"rgba(10,22,40,0.32)", padding:"8px 10px",
            }}>dont courtage ~{p_court_ani.toFixed(2)}&nbsp;% (incompressible)</div>
          </div>

          {/* Note pédagogique */}
          <div style={{
            marginTop:10, padding:"10px 14px",
            border:SEP, borderRadius:8,
            background:"rgba(10,22,40,0.015)",
          }}>
            <p style={{
              fontFamily:"'Inter',sans-serif", fontSize:10.5, fontWeight:300,
              color:"rgba(10,22,40,0.48)", lineHeight:1.7, margin:0,
            }}>
              <span style={{ fontWeight:500, color:"rgba(10,22,40,0.65)" }}>Comment ça marche : </span>
              Zero CGP optimise votre allocation en ETF passifs avec l'algorithme de Markowitz.
              Vous recevez les quantités exactes à acheter et les exécutez vous-même
              sur votre <span style={{ fontStyle:"italic" }}>{env.label}</span> chez le courtier de votre choix.
              Seul le courtage reste — les frais de gestion active disparaissent.
            </p>
          </div>
        </motion.div>

        {/* Bandeau synthèse */}
        <motion.div variants={fadeV(0.15)} initial="hidden" animate={inView?"visible":"hidden"}
          style={{ marginTop:10 }}>
          <div style={{
            background:NAVY, borderRadius:10, padding:"16px 20px",
            display:"grid", gridTemplateColumns:"1fr auto auto",
            alignItems:"center", gap:16,
          }}>
            <div>
              <div style={{
                fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:300,
                color:"rgba(255,255,255,0.38)", lineHeight:1.7,
              }}>
                En restant en gestion active chez{" "}
                <span style={{
                  fontFamily:"'Cormorant Garant',serif",
                  fontSize:15, fontWeight:300, fontStyle:"italic",
                  color:"rgba(255,255,255,0.68)",
                }}>{bank.label}</span>,
                votre gestionnaire capture{" "}
                <span style={{
                  fontFamily:"'Roboto Mono',monospace",
                  fontSize:12, color:"#FCA5A5",
                }}>{captureAni.toFixed(1)}&nbsp;%</span>
                {" "}de votre rendement brut chaque année.
                En gestion passive, vous gardez tout sauf{" "}
                <span style={{
                  fontFamily:"'Roboto Mono',monospace",
                  fontSize:12, color:"rgba(255,255,255,0.55)",
                }}>{p_total_ani.toFixed(2)}&nbsp;%</span>.
              </div>
            </div>

            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{
                fontFamily:"'Inter',sans-serif", fontSize:8, fontWeight:500,
                letterSpacing:".14em", color:"rgba(255,255,255,0.26)",
                textTransform:"uppercase", marginBottom:3,
              }}>Gain sur {years} ans</div>
              <div style={{
                fontFamily:"'Cormorant Garant',serif",
                fontSize:26, fontWeight:300, color:"#86EFAC",
                lineHeight:1, letterSpacing:"-.02em",
              }}>{feurL(gainAni)}</div>
            </div>

            <motion.button
              className="btn-cta"
              whileHover={{ scale:1.04, boxShadow:"0 6px 24px rgba(10,22,40,0.30)" }}
              whileTap={{ scale:0.97 }}
              onClick={onCTA}
              style={{
                flexShrink:0, background:"white", color:NAVY, border:"none",
                fontFamily:"'Inter',sans-serif",
                fontSize:9, fontWeight:500, letterSpacing:".14em",
                padding:"11px 18px", borderRadius:8, cursor:"pointer",
                textTransform:"uppercase",
              }}
            >Créer mon portefeuille →</motion.button>
          </div>
        </motion.div>

      </div>
    </section>
  );
}


function ConstellationSVG() {
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
          stroke="rgba(10,22,40,0.16)" strokeWidth="0.5"
        />
      ))}
      {nodes.map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y}
          r={i===4 ? 3.5 : i===1||i===7 ? 2.5 : 1.8}
          fill={i===4 ? NAVY : "rgba(10,22,40,0.38)"}
        />
      ))}
    </svg>
  );
}

// ── SVG Sphère ────────────────────────────────────────────────
function SphereSVG() {
  return (
    <svg viewBox="0 0 64 64" width={64} height={64}>
      <defs>
        <clipPath id="sc2"><circle cx="32" cy="32" r="24"/></clipPath>
      </defs>
      <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(10,22,40,0.16)" strokeWidth="0.5"/>
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
