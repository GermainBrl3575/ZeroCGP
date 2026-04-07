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
  label:string; gestion:number; versement:number; courtage:number; retro:number;
}> = {
  bnp:        { label:"BNP Paribas",      gestion:1.8, versement:2.5, courtage:0.5, retro:0.9 },
  sg:         { label:"Société Générale",  gestion:1.7, versement:2.0, courtage:0.4, retro:0.8 },
  lcl:        { label:"LCL",              gestion:1.9, versement:2.5, courtage:0.5, retro:1.0 },
  rothschild: { label:"Rothschild & Co",   gestion:1.5, versement:1.0, courtage:0.3, retro:1.2 },
  fortuneo:   { label:"Fortuneo",         gestion:0.6, versement:0.0, courtage:0.1, retro:0.0 },
  bourso:     { label:"Boursorama",       gestion:0.5, versement:0.0, courtage:0.1, retro:0.0 },
  cacib:      { label:"Crédit Agricole",  gestion:1.7, versement:2.0, courtage:0.4, retro:0.8 },
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
  const [years,    setYears   ] = useState(15);
  const [capital,  setCap     ] = useState(150000);
  const [revealed, setRevealed] = useState([false,false,false,false,false]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    [0,1,2,3,4].forEach(i =>
      setTimeout(() => setRevealed(p => { const n=[...p]; n[i]=true; return n; }), 150 + i*120)
    );
  }, [inView]);

  const bank    = BANKS[bankKey];
  const MSCI    = 0.08;
  // Frais annuels cumulés sur durée
  const annualFees    = bank.gestion + bank.retro;
  // Frais ponctuels (versement sur capital initial, courtage estimé 2 transactions/an)
  const upfrontFees   = capital * (bank.versement / 100);
  const tradingFees   = capital * (bank.courtage / 100) * 2;
  // Impact total sur la durée
  const grossFinal    = capital * Math.pow(1 + MSCI, years);
  const netFinal      = capital * Math.pow(1 + MSCI - annualFees/100, years) - upfrontFees - tradingFees;
  const zeroFinal     = capital * Math.pow(1 + MSCI - 0.002, years);
  const totalLoss     = zeroFinal - netFinal;
  const capturePct    = ((annualFees/100) / MSCI * 100).toFixed(1);
  const feurL = (n: number) =>
    new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n));

  const totalAnnual = useAnimatedNumber(annualFees + bank.courtage + bank.versement);
  const lossAni     = useAnimatedNumber(totalLoss, 0, 900);
  const captureAni  = useAnimatedNumber(parseFloat(capturePct), 1, 700);
  const gestionAni  = useAnimatedNumber(bank.gestion);
  const retroAni    = useAnimatedNumber(bank.retro);
  const versAni     = useAnimatedNumber(bank.versement);
  const courtAni    = useAnimatedNumber(bank.courtage);

  const fadeV = (delay = 0) => ({
    hidden:  { opacity:0, y:12, filter:"blur(3px)" },
    visible: { opacity:1, y:0,  filter:"blur(0px)",
      transition:{ duration:0.7, delay, ease:[0.22,1,0.36,1] } },
  });

  const SEP = "0.5px solid rgba(10,22,40,0.09)";
  const LABEL_ST: { [key: string]: string | number } = {
    fontFamily:"'Inter',sans-serif", fontSize:8.5, fontWeight:500,
    letterSpacing:".15em", textTransform:"uppercase" as const,
    color:"rgba(10,22,40,0.36)", padding:"6px 10px",
  };
  const VAL_BANK: { [key: string]: string | number } = {
    fontFamily:"'Roboto Mono','JetBrains Mono',monospace",
    fontSize:13, fontWeight:300, textAlign:"right" as const,
    color:"rgba(10,22,40,0.50)", padding:"6px 10px",
  };
  const VAL_ZERO: { [key: string]: string | number } = {
    fontFamily:"'Roboto Mono','JetBrains Mono',monospace",
    fontSize:13, fontWeight:400, textAlign:"right" as const,
    color:"#0A6634", padding:"6px 10px",
  };
  const NOTE_ST: { [key: string]: string | number } = {
    fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:300,
    fontStyle:"italic", color:"rgba(10,22,40,0.32)",
    padding:"6px 10px", lineHeight:1.5,
  };

  return (
    <section ref={ref} style={{
      minHeight:"100vh", scrollSnapAlign:"start",
      background:"#F9F8F6",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"52px 52px 48px", overflow:"hidden", position:"relative",
    }}>
      <div style={{ width:"100%", maxWidth:820, position:"relative", zIndex:1 }}>

        {/* ── Header ────────────────────────────────────────── */}
        <motion.div variants={fadeV(0)} initial="hidden" animate={inView?"visible":"hidden"}
          style={{ marginBottom:32, display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
          <div>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:500,
              letterSpacing:".22em", color:"rgba(10,22,40,0.30)",
              textTransform:"uppercase", marginBottom:8,
            }}>La stratégie</div>
            <h2 style={{
              fontFamily:"'Cormorant Garant',serif",
              fontSize:"clamp(28px,3.6vw,46px)", fontWeight:300,
              letterSpacing:"-.02em", color:NAVY, margin:0,
            }}>Preuve par l'algorithme.</h2>
          </div>
          <p style={{
            fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:300,
            color:"rgba(10,22,40,0.40)", lineHeight:1.6,
            maxWidth:260, textAlign:"right",
          }}>Deux moteurs. Une frontière efficiente. Zéro compromis.</p>
        </motion.div>

        {/* ── Deux moteurs — surface sombre translucide ──────── */}
        <motion.div variants={fadeV(0.06)} initial="hidden" animate={inView?"visible":"hidden"}
          style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:28 }}>
          {[
            {
              tag:"Moteur Alpha", icon:<ConstellationSVG/>,
              title:"Actions — Croissance pure",
              desc:"LVMH, Apple, ASML, Novo Nordisk. Titres vifs pour capturer la croissance directe. Approche concentrée, conviction maximale.",
            },
            {
              tag:"Moteur Bêta", icon:<SphereSVG/>,
              title:"ETF — Diversification institutionnelle",
              desc:"MSCI World, S&P 500, marchés émergents. Diversification totale à frais quasi-nuls. L'approche des fonds souverains.",
            },
          ].map(({ tag, icon, title, desc }, i) => (
            <motion.div
              key={tag}
              whileHover={{ y:-2, boxShadow:"0 4px 28px rgba(10,22,40,0.08)" }}
              transition={{ duration:0.25 }}
              style={{
                background:"rgba(10,22,40,0.03)",
                border:SEP,
                borderRadius:10,
                padding:"20px 22px",
              }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <div style={{ opacity:0.7, flexShrink:0 }}>{icon}</div>
                <div>
                  <div style={{
                    fontFamily:"'Inter',sans-serif", fontSize:8, fontWeight:500,
                    letterSpacing:".18em", color:"rgba(10,22,40,0.32)",
                    textTransform:"uppercase", marginBottom:4,
                  }}>{tag}</div>
                  <h3 style={{
                    fontFamily:"'Cormorant Garant',serif",
                    fontSize:"clamp(16px,1.8vw,22px)", fontWeight:300, fontStyle:"italic",
                    color:NAVY, letterSpacing:"-.01em", margin:0,
                  }}>{title}</h3>
                </div>
              </div>
              <p style={{
                fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:300,
                letterSpacing:".03em", color:"rgba(10,22,40,0.50)", lineHeight:1.7,
                margin:0,
              }}>{desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Titre tableau + sélecteurs ────────────────────── */}
        <motion.div variants={fadeV(0.10)} initial="hidden" animate={inView?"visible":"hidden"}
          style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                   gap:16, marginBottom:12, flexWrap:"wrap" }}>
          <div style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(16px,1.8vw,22px)", fontWeight:300, fontStyle:"italic",
            color:NAVY,
          }}>L'érosion silencieuse de votre capital</div>

          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {/* Sélecteur durée */}
            <div style={{ display:"flex", gap:3 }}>
              {[10,15,20].map(y=>(
                <button key={y} onClick={()=>setYears(y)} style={{
                  fontFamily:"'Inter',sans-serif",
                  fontSize:8.5, fontWeight:500, letterSpacing:".10em",
                  color: y===years?"#F9F8F6":"rgba(10,22,40,0.40)",
                  background: y===years?"#0A1628":"none",
                  border: y===years?"0.5px solid #0A1628":"0.5px solid rgba(10,22,40,0.18)",
                  borderRadius:100, padding:"5px 11px", cursor:"pointer",
                  textTransform:"uppercase", transition:"all .15s",
                }}>{y}&nbsp;ans</button>
              ))}
            </div>

            {/* Dropdown banque — style Apple */}
            <div style={{ position:"relative" }}>
              <select
                value={bankKey} onChange={e=>setBankKey(e.target.value)}
                style={{
                  appearance:"none", WebkitAppearance:"none",
                  background:"white",
                  border:"0.5px solid rgba(10,22,40,0.18)",
                  borderRadius:8,
                  fontFamily:"'Inter',sans-serif",
                  fontSize:10, fontWeight:500, letterSpacing:".08em",
                  color:NAVY, textTransform:"uppercase",
                  padding:"8px 30px 8px 14px",
                  cursor:"pointer", outline:"none",
                  boxShadow:"0 1px 4px rgba(10,22,40,0.06)",
                }}
              >
                {Object.entries(BANKS).map(([k,v])=>(
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <svg style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}
                width="9" height="5" viewBox="0 0 9 5">
                <path d="M1 1l3.5 3L8 1" stroke="rgba(10,22,40,0.4)" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </motion.div>

        {/* ── Tableau ──────────────────────────────────────── */}
        <motion.div variants={fadeV(0.13)} initial="hidden" animate={inView?"visible":"hidden"}>
          {/* En-têtes */}
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 90px 90px 1fr",
            borderBottom:"0.5px solid rgba(10,22,40,0.18)", paddingBottom:6, marginBottom:2,
          }}>
            {["Type de frais","Banque","Zero CGP","Note"].map((h,i)=>(
              <div key={h} style={{...LABEL_ST, textAlign: i===1||i===2?"right":"left"}}>{h}</div>
            ))}
          </div>

          {/* Groupe : Frais annuels */}
          <div style={{ borderBottom:"0.5px solid rgba(10,22,40,0.06)", paddingBottom:2, marginBottom:4 }}>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:7.5, fontWeight:500,
              letterSpacing:".18em", textTransform:"uppercase",
              color:"rgba(10,22,40,0.25)", padding:"8px 10px 4px",
            }}>Frais annuels</div>
            {[
              { label:"Frais de gestion",  bank:gestionAni, note:"Supprimés — gestion passive" },
              { label:"Rétrocessions",     bank:retroAni,   note:"Supprimés — frais cachés éliminés" },
            ].map(({ label, bank: v, note }, i) => (
              <div key={label} style={{
                display:"grid", gridTemplateColumns:"1fr 90px 90px 1fr",
                position:"relative", overflow:"hidden",
              }}>
                <div style={{...LABEL_ST, fontWeight:300, color:"rgba(10,22,40,0.65)"}}>{label}</div>
                <div style={VAL_BANK}><AnimNum value={v}/></div>
                <div style={VAL_ZERO}>0&nbsp;%</div>
                <div style={NOTE_ST}>{note}</div>
                <div style={{
                  position:"absolute", bottom:0, left:0,
                  height:"0.5px", background:"rgba(10,22,40,0.07)",
                  width: revealed[i]?"100%":"0%",
                  transition:"width 0.55s cubic-bezier(0.22,1,0.36,1)",
                  transitionDelay:`${i*0.08}s`,
                }}/>
              </div>
            ))}
          </div>

          {/* Groupe : Frais ponctuels */}
          <div style={{ borderBottom:"0.5px solid rgba(10,22,40,0.06)", paddingBottom:2, marginBottom:4 }}>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:7.5, fontWeight:500,
              letterSpacing:".18em", textTransform:"uppercase",
              color:"rgba(10,22,40,0.25)", padding:"8px 10px 4px",
            }}>Frais ponctuels</div>
            {[
              { label:"Frais sur versement", bank:versAni,  note:"Supprimés — courtage direct" },
              { label:"Frais de courtage",   bank:courtAni, note:"Inhérents à votre courtier (~0.10%)" },
            ].map(({ label, bank: v, note }, i) => (
              <div key={label} style={{
                display:"grid", gridTemplateColumns:"1fr 90px 90px 1fr",
                position:"relative", overflow:"hidden",
              }}>
                <div style={{...LABEL_ST, fontWeight:300, color:"rgba(10,22,40,0.65)"}}>{label}</div>
                <div style={VAL_BANK}><AnimNum value={v}/></div>
                <div style={VAL_ZERO}>0&nbsp;%</div>
                <div style={NOTE_ST}>{note}</div>
                <div style={{
                  position:"absolute", bottom:0, left:0,
                  height:"0.5px", background:"rgba(10,22,40,0.07)",
                  width: revealed[i+2]?"100%":"0%",
                  transition:"width 0.55s cubic-bezier(0.22,1,0.36,1)",
                  transitionDelay:`${(i+2)*0.08}s`,
                }}/>
              </div>
            ))}
          </div>

          {/* Groupe : Frais de structure */}
          <div style={{ marginBottom:6 }}>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:7.5, fontWeight:500,
              letterSpacing:".18em", textTransform:"uppercase",
              color:"rgba(10,22,40,0.25)", padding:"8px 10px 4px",
            }}>Frais de structure</div>
            <div style={{
              display:"grid", gridTemplateColumns:"1fr 90px 90px 1fr",
              background:"rgba(45,90,67,0.04)", borderRadius:4,
              position:"relative", overflow:"hidden",
            }}>
              <div style={{...LABEL_ST, fontWeight:300, color:"#2D5A43", fontStyle:"italic"}}>ETF (frais résiduels)</div>
              <div style={{...VAL_BANK, color:"rgba(10,22,40,0.25)"}}>—</div>
              <div style={{...VAL_ZERO, color:"#2D5A43"}}>~0.20&nbsp;%</div>
              <div style={{...NOTE_ST, color:"#2D5A43", opacity:0.7}}>Seul coût résiduel</div>
              <div style={{
                position:"absolute", bottom:0, left:0,
                height:"0.5px", background:"rgba(45,90,67,0.15)",
                width: revealed[4]?"100%":"0%",
                transition:"width 0.55s cubic-bezier(0.22,1,0.36,1)",
                transitionDelay:"0.40s",
              }}/>
            </div>
          </div>

          {/* Total */}
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 90px 90px 1fr",
            borderTop:"0.5px solid rgba(10,22,40,0.18)", paddingTop:8, marginTop:4,
          }}>
            <div style={{...LABEL_ST}}>Total annuel</div>
            <div style={{
              fontFamily:"'Roboto Mono',monospace",
              fontSize:14, fontWeight:500, textAlign:"right",
              color:NAVY, padding:"6px 10px",
            }}>{totalAnnual.toFixed(1)}&nbsp;%</div>
            <div style={{
              fontFamily:"'Roboto Mono',monospace",
              fontSize:14, fontWeight:400, textAlign:"right",
              color:"#0A6634", padding:"6px 10px",
            }}>~0.20&nbsp;%</div>
            <div/>
          </div>
        </motion.div>

        {/* ── Bandeau synthèse ─────────────────────────────── */}
        <motion.div variants={fadeV(0.16)} initial="hidden" animate={inView?"visible":"hidden"}
          style={{ marginTop:12 }}>
          <div style={{
            background:NAVY, borderRadius:10,
            padding:"16px 22px",
            display:"grid", gridTemplateColumns:"1fr auto auto",
            alignItems:"center", gap:20,
          }}>
            {/* Texte gauche */}
            <div>
              <div style={{
                fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:300,
                letterSpacing:".03em", color:"rgba(255,255,255,0.40)", lineHeight:1.6,
              }}>
                En restant chez{" "}
                <span style={{
                  fontFamily:"'Cormorant Garant',serif",
                  fontSize:15, fontWeight:300, fontStyle:"italic",
                  color:"rgba(255,255,255,0.70)",
                }}>{bank.label}</span>,
                {" "}votre banque capte{" "}
                <span style={{
                  fontFamily:"'Roboto Mono',monospace",
                  fontSize:13, color:"#F87171",
                }}>{captureAni.toFixed(1)}&nbsp;%</span>
                {" "}de votre performance brute chaque année.
              </div>
            </div>

            {/* Montant */}
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{
                fontFamily:"'Inter',sans-serif", fontSize:8, fontWeight:500,
                letterSpacing:".14em", color:"rgba(255,255,255,0.28)",
                textTransform:"uppercase", marginBottom:3,
              }}>Perte sur {years} ans</div>
              <div style={{
                fontFamily:"'Cormorant Garant',serif",
                fontSize:26, fontWeight:300, color:"#F87171",
                lineHeight:1, letterSpacing:"-.02em",
              }}>{feurL(lossAni)}</div>
            </div>

            {/* CTA */}
            <motion.button
              className="btn-cta"
              whileHover={{ scale:1.04, boxShadow:"0 6px 24px rgba(10,22,40,0.30)" }}
              whileTap={{ scale:0.97 }}
              onClick={onCTA}
              style={{
                flexShrink:0, background:"white", color:NAVY, border:"none",
                fontFamily:"'Inter',sans-serif",
                fontSize:9, fontWeight:500, letterSpacing:".14em",
                padding:"11px 20px", borderRadius:8, cursor:"pointer",
                textTransform:"uppercase",
              }}
            >Accéder à l'optimiseur →</motion.button>
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
