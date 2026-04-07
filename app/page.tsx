"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const NAVY     = "#0A1628";
const NAVY_MID = "#1E3A6E";
const MSCI_GROSS = 0.08;
const ETF_FEES   = 0.002;

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
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500&display=swap');
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
  onCTA, onScroll, activeTab, onNav,
}: {
  capital:number; years:number;
  onCapitalChange:(n:number)=>void; onYearsChange:(n:number)=>void;
  onCTA:()=>void; onScroll:()=>void;
  activeTab:number; onNav:(i:number)=>void;
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
      gZ.addColorStop(0,   `rgba(134,239,172,0.00)`);
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
      ct.strokeStyle="rgba(134,239,172,0.45)"; ct.lineWidth=1; ct.stroke();
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

      drawCanvas(zPts,bPts,canvas,progress,aArea);

      if(elapsed < DUR_BUILD+DUR_AREA){
        rafRef.current=requestAnimationFrame(step);
      } else {
        buildRef.current.running=false;
        setDisplayZ(Math.round(zFinal));
        setDisplayB(Math.round(bFinal));
        setDisplayG(Math.round(gFinal));
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
          {["Accueil","Comment ça fonctionne","Simulation"].map((label,i)=>(
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
          <motion.div variants={itemV} style={{
            fontFamily:"'Inter',sans-serif",
            fontSize:9,fontWeight:500,letterSpacing:".22em",
            color:"rgba(10,22,40,0.36)",textTransform:"uppercase",
            marginBottom:14,display:"flex",alignItems:"center",gap:8,
          }}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"#16A34A",flexShrink:0}}/>
            Optimisation institutionnelle
          </motion.div>

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
              fontSize:9,fontWeight:500,letterSpacing:".20em",
              padding:"14px 36px",borderRadius:8,textTransform:"uppercase",
            }}
          >Commencer gratuitement</motion.button>
        </motion.div>
      </div>

      {/* Montants finaux — droite z:5 */}
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
        {/* Zero CGP — chiffre principal animé */}
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
          transition:"color .3s",
        }}>{feur(displayZ)}</div>

        {/* Banque — chiffre secondaire animé */}
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

        {/* Gain — élégant, Serif, lueur douce, sans boîte */}
        <motion.div
          initial={{opacity:0,y:8}}
          animate={labelsVis?{opacity:1,y:0}:{}}
          transition={{duration:0.8,ease:[0.22,1,0.36,1]}}
        >
          <div style={{
            fontFamily:"'Inter',sans-serif",
            fontSize:8.5,fontWeight:500,letterSpacing:".18em",
            color:"rgba(74,222,128,0.65)",textTransform:"uppercase",marginBottom:5,
          }}>Économies réalisées</div>
          <div style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(22px,2.6vw,34px)",
            fontWeight:300,
            color:"#4ADE80",
            lineHeight:1,letterSpacing:"-.01em",
            textShadow:"0 0 28px rgba(74,222,128,0.35), 0 0 8px rgba(74,222,128,0.18)",
          }}>{feur(displayG)}</div>
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

    </section>
  );
}

// ══════════════════════════════════════════════════════════════
export default function LandingPage() {
  const router       = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab,setActiveTab]=useState(0);
  const [capital,  setCapital  ]=useState(150000);
  const [years,    setYears    ]=useState(15);
  const [cgpFees,  setCgpFees  ]=useState(2.5);

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
        />

        {/* Section 2 — Comment ça fonctionne */}
        <section style={{height:"100vh",scrollSnapAlign:"start",background:NAVY,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 52px"}}>
          <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.9,ease:[0.22,1,0.36,1]}} style={{textAlign:"center",maxWidth:680}}>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:8.5,fontWeight:500,letterSpacing:".24em",color:"rgba(255,255,255,0.2)",marginBottom:18,textTransform:"uppercase"}}>Comment ça fonctionne</div>
            <h2 style={{fontFamily:"'Cormorant Garant',serif",fontSize:"clamp(34px,4.5vw,58px)",fontWeight:300,fontStyle:"italic",color:"white",lineHeight:1.05,marginBottom:14}}>
              7 questions.<br/>
              <span style={{color:"rgba(255,255,255,0.35)",fontStyle:"normal"}}>Un portefeuille sur mesure.</span>
            </h2>
            <p style={{fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:300,color:"rgba(255,255,255,0.35)",lineHeight:1.82}}>
              Notre algorithme filtre 490+ actifs, charge 5 ans de données Yahoo Finance<br/>et calcule la frontière efficiente de Markowitz en 10 000 simulations.
            </p>
          </motion.div>
          <div style={{display:"flex",marginTop:48,width:"100%",maxWidth:820}}>
            {[{n:"01",t:"Votre profil",d:"Horizon, risque, ESG, géographie"},{n:"02",t:"Filtrage",d:"490+ actifs → 12–40 pertinents"},{n:"03",t:"Markowitz",d:"10 000 simulations Monte Carlo"},{n:"04",t:"Résultats",d:"3 portefeuilles optimaux"}].map(({n,t,d},i)=>(
              <motion.div key={n} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.09,duration:0.6}} style={{flex:1,padding:"22px 20px",borderLeft:"0.5px solid rgba(255,255,255,0.06)"}}>
                <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:34,fontWeight:300,color:"rgba(255,255,255,0.08)",marginBottom:14}}>{n}</div>
                <div style={{fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:500,letterSpacing:".10em",color:"rgba(255,255,255,0.70)",marginBottom:7,textTransform:"uppercase"}}>{t}</div>
                <div style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:300,color:"rgba(255,255,255,0.28)",lineHeight:1.65}}>{d}</div>
              </motion.div>
            ))}
          </div>
          <motion.button initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} transition={{delay:0.4}} whileHover={{scale:1.03}} onClick={()=>router.push("/auth/register")} style={{marginTop:40,background:"white",color:NAVY,border:"none",borderRadius:8,fontFamily:"'Inter',sans-serif",fontSize:9,fontWeight:500,letterSpacing:".16em",padding:"14px 38px",cursor:"pointer",textTransform:"uppercase"}}>
            Optimiser mon portefeuille →
          </motion.button>
        </section>

        {/* Section 3 — Simulation */}
        <section style={{height:"100vh",scrollSnapAlign:"start",background:"#F5F4F1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 52px"}}>
          <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.8}} style={{width:"100%",maxWidth:860}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontFamily:"'Inter',sans-serif",fontSize:8.5,fontWeight:500,letterSpacing:".22em",color:"#8A9BB0",marginBottom:10,textTransform:"uppercase"}}>Simulation</div>
              <h2 style={{fontFamily:"'Cormorant Garant',serif",fontSize:"clamp(28px,3.8vw,48px)",fontWeight:300,letterSpacing:"-.02em",color:NAVY,marginBottom:6}}>Combien perdez-vous chaque année ?</h2>
              <p style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:"#8A9BB0",fontWeight:300}}>Frais de gestion actuels vs stratégie ETF passive.</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:28,marginBottom:24}}>
              {[
                {label:"Capital",val:feur(capital),min:10000,max:1000000,step:10000,v:capital,set:(n:number)=>setCapital(n)},
                {label:"Durée",val:`${years} ans`,min:5,max:40,step:1,v:years,set:(n:number)=>setYears(n)},
                {label:"Frais (%/an)",val:`${cgpFees.toFixed(1)}%`,min:0.5,max:4,step:0.1,v:cgpFees,set:(n:number)=>setCgpFees(n)},
              ].map(({label,val,min,max,step,v,set})=>(
                <div key={label}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontFamily:"'Inter',sans-serif",fontSize:8.5,fontWeight:500,letterSpacing:".12em",color:"#8A9BB0",textTransform:"uppercase"}}>{label}</span>
                    <span style={{fontFamily:"'Cormorant Garant',serif",fontSize:19,fontWeight:400,color:NAVY}}>{val}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={v} onChange={e=>set(Number(e.target.value))} style={{width:"100%"}}/>
                </div>
              ))}
            </div>
            <div style={{background:"white",borderRadius:12,padding:"22px",boxShadow:"0 1px 16px rgba(10,22,40,0.04)"}}>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={chartData}>
                  <XAxis dataKey="an" tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false} tickFormatter={(v:number)=>`An ${v}`} interval={Math.floor(years/4)}/>
                  <YAxis tick={{fontSize:10,fill:"#aaa"}} tickLine={false} axisLine={false} tickFormatter={(v:number)=>v>=1e6?`${(v/1e6).toFixed(1)}M€`:`${Math.round(v/1000)}k€`} width={54}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Line type="monotone" dataKey="ETF MSCI World (Zero CGP)" stroke="#16A34A" strokeWidth={2.5} dot={false} activeDot={{r:4}}/>
                  <Line type="monotone" dataKey="Banque / CGP" stroke="#DC2626" strokeWidth={2} dot={false} strokeDasharray="5 3" activeDot={{r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{marginTop:14,display:"flex",alignItems:"center",justifyContent:"space-between",background:NAVY,borderRadius:10,padding:"15px 24px"}}>
              <div style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:300,color:"rgba(255,255,255,0.38)",letterSpacing:".04em"}}>Manque à gagner sur {years} ans</div>
              <div style={{fontFamily:"'Cormorant Garant',serif",fontSize:28,fontWeight:300,color:"#F87171"}}>{feur(manque)}</div>
              <motion.button whileHover={{scale:1.04}} onClick={()=>router.push("/auth/register")} style={{background:"white",color:NAVY,border:"none",fontFamily:"'Inter',sans-serif",fontSize:9,fontWeight:500,letterSpacing:".14em",padding:"10px 24px",borderRadius:8,cursor:"pointer",textTransform:"uppercase"}}>
                Récupérer {feur(manque)} →
              </motion.button>
            </div>
          </motion.div>
        </section>

      </div>
    </>
  );
}
