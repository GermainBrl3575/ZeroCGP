"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const C = {
  navy:"#050B14", navyText:"rgba(5,11,20,0.88)", sapphire:"#1a3a6a",
  textLight:"rgba(5,11,20,0.36)", textMid:"rgba(5,11,20,0.52)",
  border:"rgba(5,11,20,0.07)", borderCard:"rgba(5,11,20,0.09)",
  sheet:"rgba(255,255,255,0.42)",
  sheetShadow:"0 1px 0 rgba(255,255,255,0.8) inset, 0 20px 50px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.012)",
};
const EASE = "all 0.5s cubic-bezier(.16,1,.3,1)";

function eur(n: number) { return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n); }

function Icon({ children, hov }: { children: React.ReactNode; hov: boolean }) {
  return (
    <div style={{ width:36,height:36,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
      background:hov?"rgba(26,58,106,0.06)":"rgba(5,11,20,0.025)",transition:EASE }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={hov?C.sapphire:"rgba(5,11,20,0.4)"} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" style={{transition:EASE}}>
        {children}
      </svg>
    </div>
  );
}

const stg = (i: number, loaded: boolean): React.CSSProperties => ({
  opacity:loaded?1:0, transform:loaded?"translateY(0)":"translateY(14px)",
  transition:`opacity .6s cubic-bezier(.23,1,.32,1) ${i*0.07}s, transform .6s cubic-bezier(.23,1,.32,1) ${i*0.07}s`,
});

export default function DashboardHome() {
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [pfName, setPfName] = useState("");
  const [pfType, setPfType] = useState("");
  const [pfValue, setPfValue] = useState<number|null>(null);
  const [pfPerf, setPfPerf] = useState<number|null>(null);
  const [lastOpt, setLastOpt] = useState("");
  const [hov, setHov] = useState<string|null>(null);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 80);
    (async () => {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) return;
      const full = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
      setName(full.split(" ")[0] || full);

      // Latest portfolio
      const { data: pfs } = await supabase.from("portfolios").select("id,name,type,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1);
      if (pfs?.[0]) {
        setPfName(pfs[0].name); setPfType(pfs[0].type);
        try {
          const r = await fetch(`/api/portfolio/metrics?id=${pfs[0].id}`);
          const d = await r.json();
          if (d.portfolio) { setPfValue(d.portfolio.valeurActuelle); setPfPerf(d.portfolio.perfSinceCreation); }
        } catch {}
      }

      // Last optimization date
      const { data: opts } = await supabase.from("portfolios").select("created_at").eq("user_id",user.id).eq("type","optimized").order("created_at",{ascending:false}).limit(1);
      if (opts?.[0]) setLastOpt(new Date(opts[0].created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}));
    })();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const mainCards = [
    { id:"portfolio", href:"/dashboard/portfolio", title:"Portfolio", desc:"Suivez la valeur de votre portefeuille en temps réel, analysez la répartition de vos actifs et leur performance sur chaque période.",
      icon:<><circle cx="12" cy="12" r="10"/><path d="M12 2V12H22"/><path d="M12 12L19.07 5.93" opacity=".4"/></>,
      live: pfName ? <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontSize:11,fontWeight:500,color:C.navyText}}>{pfName}</div>{pfValue!==null&&<div style={{fontSize:12,fontWeight:400,color:C.textMid,marginTop:2}}>{eur(pfValue)} {pfPerf!==null&&<span style={{color:pfPerf>=0?"rgba(22,90,52,.7)":"rgba(155,50,48,.7)",fontWeight:500}}>{pfPerf>=0?"+":""}{pfPerf}%</span>}</div>}</div>
        <span style={{fontSize:8,fontWeight:600,padding:"2px 7px",borderRadius:3,letterSpacing:".06em",background:pfType==="optimized"?"rgba(201,168,76,0.12)":"rgba(22,90,52,0.1)",color:pfType==="optimized"?"#c9a84c":"rgba(22,90,52,0.8)"}}>{pfType==="optimized"?"0CGP":"ACTIF"}</span>
      </div> : null },
    { id:"optimizer", href:"/dashboard/optimizer", title:"Optimiseur", desc:"Répondez à 7 questions et l'algorithme de Markowitz calcule 3 portefeuilles optimaux adaptés à votre profil.",
      icon:<><path d="M4 18L8 10L14 14L20 4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="20" cy="4" r="2.5"/><path d="M20 1.5V4H22.5" strokeWidth=".6"/></>,
      live: <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontSize:11,fontWeight:500,color:C.navyText}}>{lastOpt?"Dernière optimisation":"Aucune optimisation"}</div>{lastOpt&&<div style={{fontSize:11,fontWeight:400,color:C.textMid,marginTop:2}}>{lastOpt}</div>}</div>
        <span style={{fontSize:8,fontWeight:600,padding:"2px 7px",borderRadius:3,letterSpacing:".06em",background:"rgba(26,58,106,0.06)",color:C.sapphire}}>8 QUESTIONS</span>
      </div> },
  ];

  const analysisCards = [
    { id:"correlation", href:"/dashboard/correlation", title:"Corrélation", desc:"Matrice de corrélation entre vos actifs. Identifiez les doublons cachés et les vraies sources de diversification.",
      icon:<><circle cx="6" cy="6" r="3.5"/><circle cx="18" cy="18" r="3.5"/><circle cx="18" cy="6" r="3.5"/><line x1="8.5" y1="7.5" x2="15.5" y2="16.5" opacity=".5"/><line x1="9" y1="5" x2="14.5" y2="5" opacity=".5"/><line x1="18" y1="9.5" x2="18" y2="14.5" opacity=".5"/></> },
    { id:"stress", href:"/dashboard/stress", title:"Stress Tests", desc:"Testez votre portefeuille face aux crises passées : crise de 2008, Covid 2020, hausse de taux 2022.",
      icon:<><path d="M2 8L8 6L12 9L16 4" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 4L18 12L22 20" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1.5 1.5" opacity=".6"/><line x1="2" y1="22" x2="22" y2="22" strokeWidth=".4" opacity=".3"/></> },
    { id:"montecarlo", href:"/dashboard/montecarlo", title:"Monte Carlo", desc:"10 000 simulations aléatoires pour estimer les scénarios possibles. Probabilités de gain, pire cas, meilleur cas.",
      icon:<><path d="M2 20Q6 4,12 12Q18 20,22 6" strokeLinecap="round" strokeWidth=".6" opacity=".3"/><path d="M2 18Q7 8,12 14Q17 18,22 8" strokeLinecap="round" strokeWidth=".6" opacity=".4"/><path d="M2 16Q8 6,12 10Q16 16,22 4" strokeLinecap="round" strokeWidth=".6" opacity=".5"/><path d="M2 14Q6 2,12 8Q18 14,22 2" strokeLinecap="round" strokeWidth="1" opacity=".8"/></> },
  ];

  const comingSoon = [
    { title:"Rééquilibrage", desc:"Détecte les dérives d'allocation et vous suggère les ajustements nécessaires pour garder votre portefeuille aligné.",
      icon:<><rect x="2" y="14" width="5" height="8" rx="1" opacity=".3"/><rect x="9" y="8" width="5" height="14" rx="1" opacity=".3"/><rect x="16" y="11" width="5" height="11" rx="1" opacity=".3"/><path d="M4.5 12L11.5 6L18.5 9" strokeLinecap="round" strokeWidth="1"/></> },
    { title:"Alertes", desc:"Notifications intelligentes sur vos actifs : seuils de prix, rééquilibrage nécessaire, opportunités de marché.",
      icon:<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><circle cx="12" cy="21" r="1.5"/></> },
    { title:"Backtesting", desc:"Simulez votre stratégie sur les données historiques. Voyez comment votre portefeuille aurait performé sur 5, 10 ou 20 ans.",
      icon:<><circle cx="12" cy="12" r="10"/><path d="M12 6V12L16 14" strokeLinecap="round"/></> },
  ];

  const cardStyle = (id: string): React.CSSProperties => ({
    padding:"26px 28px", borderRadius:10, cursor:"pointer",
    background:hov===id?"rgba(255,255,255,0.85)":C.sheet,
    border:hov===id?".5px solid rgba(26,58,106,0.12)":`.5px solid ${C.borderCard}`,
    boxShadow:hov===id?"0 4px 20px rgba(0,0,0,.04)":C.sheetShadow,
    transform:hov===id?"translateY(-2px)":"none",
    transition:EASE, textDecoration:"none", display:"block", color:"inherit",
    backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='.01'/%3E%3C/svg%3E")`,
  });

  return (
    <div style={{padding:"20px 48px",fontFamily:"Inter,sans-serif",maxWidth:900,minHeight:"calc(100vh - 60px)",display:"flex",flexDirection:"column"}}>
      {/* Hero */}
      <div style={stg(0,loaded)}>
        <div style={{fontSize:10,fontWeight:500,letterSpacing:".15em",textTransform:"uppercase",color:C.sapphire,opacity:.5,marginBottom:12}}>Accueil</div>
        <h1 style={{fontSize:34,fontWeight:500,color:C.navyText,letterSpacing:"-.03em",margin:"0 0 8px"}}>{greeting}{name?`, ${name}`:""}.</h1>
        <p style={{fontSize:14.5,fontWeight:400,color:"rgba(5,11,20,0.38)",lineHeight:1.7,marginBottom:24,maxWidth:520}}>Voici un aperçu de vos outils. Sélectionnez une fonctionnalité pour commencer.</p>
      </div>

      {/* Main cards: Portfolio + Optimizer */}
      <div style={{...stg(1,loaded),display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14,flex:1}}>
        {mainCards.map(c=>(
          <Link key={c.id} href={c.href} style={{...cardStyle(c.id),minHeight:180}} onMouseEnter={()=>setHov(c.id)} onMouseLeave={()=>setHov(null)}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
              <Icon hov={hov===c.id}>{c.icon}</Icon>
              <span style={{fontSize:16,fontWeight:500,color:C.navyText,flex:1}}>{c.title}</span>
              <span style={{fontSize:14,color:C.sapphire,opacity:hov===c.id?1:0,transform:hov===c.id?"translateX(0)":"translateX(-6px)",transition:EASE}}>→</span>
            </div>
            <div style={{fontSize:13,fontWeight:400,color:"rgba(5,11,20,0.42)",lineHeight:1.7,marginBottom:c.live?16:0}}>{c.desc}</div>
            {c.live&&<div style={{padding:"14px 18px",borderRadius:6,background:"rgba(5,11,20,0.015)",border:`.5px solid rgba(5,11,20,0.04)`}}>{c.live}</div>}
          </Link>
        ))}
      </div>

      {/* Analysis cards */}
      <div style={{...stg(2,loaded),display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14,flex:1}}>
        {analysisCards.map(c=>(
          <Link key={c.id} href={c.href} style={{...cardStyle(c.id),minHeight:140}} onMouseEnter={()=>setHov(c.id)} onMouseLeave={()=>setHov(null)}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
              <Icon hov={hov===c.id}>{c.icon}</Icon>
              <span style={{fontSize:16,fontWeight:500,color:C.navyText,flex:1}}>{c.title}</span>
              <span style={{fontSize:14,color:C.sapphire,opacity:hov===c.id?1:0,transform:hov===c.id?"translateX(0)":"translateX(-6px)",transition:EASE}}>→</span>
            </div>
            <div style={{fontSize:13,fontWeight:400,color:"rgba(5,11,20,0.42)",lineHeight:1.7}}>{c.desc}</div>
          </Link>
        ))}
      </div>

      {/* Coming soon */}
      <div style={stg(3,loaded)}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
          <span style={{fontSize:10,fontWeight:500,letterSpacing:".15em",textTransform:"uppercase",color:"rgba(5,11,20,0.28)"}}>Prochainement</span>
          <div style={{flex:1,height:".5px",background:"linear-gradient(90deg,rgba(5,11,20,0.06),transparent)"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {comingSoon.map(c=>(
            <div key={c.title} style={{padding:"26px 28px",borderRadius:10,background:C.sheet,border:`.5px solid ${C.borderCard}`,opacity:.55,position:"relative",minHeight:120}}>
              <span style={{position:"absolute",top:14,right:14,fontSize:8,fontWeight:500,letterSpacing:".08em",textTransform:"uppercase",padding:"2px 8px",borderRadius:3,background:"rgba(5,11,20,0.04)",color:"rgba(5,11,20,0.28)"}}>Bientôt</span>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
                <div style={{width:36,height:36,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(5,11,20,0.025)"}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(5,11,20,0.22)" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
                </div>
                <span style={{fontSize:16,fontWeight:500,color:C.navyText}}>{c.title}</span>
              </div>
              <div style={{fontSize:13,fontWeight:400,color:"rgba(5,11,20,0.42)",lineHeight:1.7}}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{marginTop:"auto",paddingTop:16,display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:10,fontWeight:400,color:"rgba(5,11,20,0.18)"}}>Zero CGP · Markowitz</span>
        <span style={{fontSize:10,fontWeight:400,color:"rgba(5,11,20,0.18)",fontVariantNumeric:"tabular-nums"}}>v1.0</span>
      </div>
    </div>
  );
}
