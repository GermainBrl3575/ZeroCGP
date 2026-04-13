"use client";
import { useState } from "react";

const SAP = "#1a3a6a";
const EASE = "all 0.5s cubic-bezier(.16,1,.3,1)";

// ─── InfoModal: overlay with explanation ──────────────────────
export function InfoModal({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(5,11,20,0.45)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:12,padding:"32px 36px",maxWidth:420,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,.15)",animation:"fadeUp .35s cubic-bezier(.23,1,.32,1)"}}>
        <div style={{fontSize:13,fontWeight:400,color:"rgba(5,11,20,0.72)",lineHeight:1.8,fontFamily:"Inter,sans-serif",whiteSpace:"pre-line"}}>{text}</div>
        <button onClick={onClose} style={{marginTop:20,fontSize:10,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(5,11,20,0.4)",background:"none",border:"none",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Fermer</button>
      </div>
    </div>
  );
}

// ─── Small info button ────────────────────────────────────────
export function InfoBtn({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span onClick={e=>{e.stopPropagation();setOpen(true);}} style={{width:18,height:18,borderRadius:"50%",border:"1px solid rgba(5,11,20,.1)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"rgba(5,11,20,.3)",cursor:"pointer",fontWeight:600,fontFamily:"Georgia,serif",fontStyle:"italic",flexShrink:0}}>i</span>
      {open && <InfoModal text={text} onClose={()=>setOpen(false)} />}
    </>
  );
}

// ─── Q1: Horizon with timeline ────────────────────────────────
export function Q1Timeline({ value, onSelect }: { value?: string; onSelect: (v: string) => void }) {
  const opts = [
    { val:"Moins de 2 ans", label:"< 2 ans", icon:"🚗", sub:"Projet court terme" },
    { val:"2 à 5 ans", label:"2-5 ans", icon:"🏠", sub:"Achat immobilier" },
    { val:"5 à 10 ans", label:"5-10 ans", icon:"🎓", sub:"Patrimoine long terme" },
    { val:"10 ans et plus", label:"10+ ans", icon:"👶", sub:"Retraite / transmission" },
  ];
  return (
    <div style={{maxWidth:540,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,justifyContent:"flex-end"}}>
        <InfoBtn text={"Plus votre horizon est long, plus vous pouvez prendre de risque car vous avez le temps de traverser les crises.\n\nHistoriquement, le S&P 500 n'a jamais perdu d'argent sur une période de 15 ans."} />
      </div>
      {/* Timeline bar */}
      <div style={{position:"relative",margin:"0 20px 32px",height:2,background:"rgba(5,11,20,.06)",borderRadius:1}}>
        {opts.map((_,i)=><div key={i} style={{position:"absolute",left:`${i/(opts.length-1)*100}%`,top:-3,width:8,height:8,borderRadius:"50%",background:value===opts[i].val?SAP:"rgba(5,11,20,.12)",transform:"translateX(-50%)",transition:EASE}}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {opts.map((o,i)=>{
          const sel = value === o.val;
          return (
            <div key={o.val} onClick={()=>onSelect(o.val)} style={{
              borderRadius:8,padding:"20px 18px",cursor:"pointer",textAlign:"center",
              border:sel?`.5px solid rgba(26,58,106,.4)`:"0.5px solid rgba(5,11,20,.09)",
              background:sel?"rgba(26,58,106,.04)":"rgba(255,255,255,.72)",
              boxShadow:sel?"0 4px 16px rgba(26,58,106,.1)":"0 1px 2px rgba(0,0,0,.015)",
              transition:EASE,animation:`cardIn .4s cubic-bezier(.23,1,.32,1) both`,animationDelay:`${i*0.06}s`,
            }}>
              <div style={{fontSize:28,marginBottom:8}}>{o.icon}</div>
              <div style={{fontSize:15,fontWeight:500,color:"rgba(5,11,20,.88)",marginBottom:4,fontFamily:"Inter,sans-serif"}}>{o.label}</div>
              <div style={{fontSize:11,fontWeight:400,color:"rgba(5,11,20,.4)",fontFamily:"Inter,sans-serif"}}>{o.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Q2: Risk profile cards ───────────────────────────────────
const RISK_DETAILS: Record<string,string> = {
  "Conservateur": "Vous privilégiez la sécurité. Votre argent croît lentement mais sûrement.\n\nExemple : 10 000€ investis → 11 500€ en 5 ans (+15%)\nRisque : vous pouvez perdre max -10% temporairement\n\nIdéal si : vous avez besoin de cet argent dans moins de 5 ans",
  "Modéré": "Vous cherchez un équilibre entre sécurité et performance.\n\nExemple : 10 000€ investis → 14 000€ en 5 ans (+40%)\nRisque : vous pouvez perdre max -20% temporairement\n\nIdéal si : vous investissez sur 5-10 ans",
  "Dynamique": "Vous acceptez des variations importantes pour viser une meilleure performance.\n\nExemple : 10 000€ investis → 18 000€ en 8 ans (+80%)\nRisque : vous pouvez perdre max -35% temporairement (comme en 2020)\n\nIdéal si : vous n'avez pas besoin de cet argent avant 8 ans",
  "Agressif": "Vous visez la performance maximale et acceptez une forte volatilité.\n\nExemple : 10 000€ investis → 25 000€ en 10 ans (+150%)\nRisque : vous pouvez perdre -50% temporairement (comme en 2008)\n\nIdéal si : vous investissez sur 10+ ans et dormez bien même si votre portefeuille baisse de moitié",
};

export function Q2RiskCards({ value, onSelect }: { value?: string; onSelect: (v: string) => void }) {
  const opts = [
    { val:"Conservateur", icon:"🛡️", color:"rgba(22,90,52,.6)", ret:"+3%/an", risk:"-10% max" },
    { val:"Modéré", icon:"⚖️", color:SAP, ret:"+6%/an", risk:"-20% max" },
    { val:"Dynamique", icon:"📈", color:"#D97706", ret:"+8%/an", risk:"-35% max" },
    { val:"Agressif", icon:"🚀", color:"rgba(175,60,60,.7)", ret:"+10%/an", risk:"-50% max" },
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:540,margin:"0 auto"}}>
      {opts.map((o,i)=>{
        const sel = value === o.val;
        return (
          <div key={o.val} onClick={()=>onSelect(o.val)} style={{
            borderRadius:8,padding:"22px 18px",cursor:"pointer",position:"relative",
            border:sel?`.5px solid ${o.color}`:"0.5px solid rgba(5,11,20,.09)",
            background:sel?"rgba(26,58,106,.03)":"rgba(255,255,255,.72)",
            boxShadow:sel?`0 4px 16px rgba(26,58,106,.08)`:"0 1px 2px rgba(0,0,0,.015)",
            transition:EASE,animation:`cardIn .4s cubic-bezier(.23,1,.32,1) both`,animationDelay:`${i*0.06}s`,
          }}>
            <div style={{position:"absolute",top:12,right:12}}><InfoBtn text={RISK_DETAILS[o.val]} /></div>
            <div style={{fontSize:32,marginBottom:10}}>{o.icon}</div>
            <div style={{fontSize:14,fontWeight:500,color:"rgba(5,11,20,.88)",marginBottom:6,fontFamily:"Inter,sans-serif"}}>{o.val}</div>
            <div style={{display:"flex",gap:12,fontSize:11,fontFamily:"Inter,sans-serif"}}>
              <span style={{color:"rgba(22,90,52,.7)",fontWeight:500}}>{o.ret}</span>
              <span style={{color:"rgba(155,50,48,.6)",fontWeight:400}}>{o.risk}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Q3: Loss tolerance bar ───────────────────────────────────
export function Q3LossBar({ value, onSelect }: { value?: string; onSelect: (v: string) => void }) {
  const opts = [
    { val:"−10% maximum", pct:10, amount:"1 000€", desc:"Perte temporaire modérée" },
    { val:"−20% maximum", pct:20, amount:"2 000€", desc:"Perte temporaire significative" },
    { val:"−35% maximum", pct:35, amount:"3 500€", desc:"Perte temporaire importante" },
    { val:"Pas de limite", pct:50, amount:"—", desc:"Vous acceptez toutes les fluctuations" },
  ];
  return (
    <div style={{maxWidth:540,margin:"0 auto"}}>
      <p style={{fontSize:13,color:"rgba(5,11,20,.52)",marginBottom:20,fontFamily:"Inter,sans-serif",textAlign:"center"}}>
        Si votre portefeuille de 10 000€ baisse, jusqu'où acceptez-vous ?
      </p>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {opts.map((o,i)=>{
          const sel = value === o.val;
          return (
            <div key={o.val} onClick={()=>onSelect(o.val)} style={{
              borderRadius:6,padding:"16px 20px",cursor:"pointer",
              border:sel?"0.5px solid rgba(155,50,48,.25)":"0.5px solid rgba(5,11,20,.09)",
              background:sel?"rgba(155,50,48,.03)":"rgba(255,255,255,.72)",
              transition:EASE,animation:`cardIn .4s cubic-bezier(.23,1,.32,1) both`,animationDelay:`${i*0.05}s`,
            }}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:14,fontWeight:500,color:"rgba(5,11,20,.88)",fontFamily:"Inter,sans-serif"}}>{o.val}</span>
                {o.amount !== "—" && <span style={{fontSize:13,fontWeight:500,color:"rgba(155,50,48,.65)",fontVariantNumeric:"tabular-nums",fontFamily:"Inter,sans-serif"}}>{o.amount} de perte possible</span>}
              </div>
              {o.pct < 50 && <div style={{height:3,borderRadius:2,background:"rgba(5,11,20,.04)",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${o.pct}%`,background:"rgba(155,50,48,.35)",borderRadius:2,transition:EASE}} />
              </div>}
              <div style={{fontSize:11,color:"rgba(5,11,20,.4)",marginTop:6,fontFamily:"Inter,sans-serif"}}>{o.desc}</div>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}><InfoBtn text={"Cette perte est TEMPORAIRE. Les marchés remontent toujours sur le long terme.\n\nLe S&P 500 a toujours récupéré ses pertes en moins de 5 ans historiquement.\nInvestir, c'est accepter des hauts et des bas pour une tendance positive à long terme."} /></div>
    </div>
  );
}

// ─── Q4: ESG cards ────────────────────────────────────────────
export function Q4EsgCards({ value, onSelect }: { value?: string; onSelect: (v: string) => void }) {
  const opts = [
    { val:"Aucun filtre", icon:"🌍", title:"Aucun filtre", desc:"Performance maximale sans contrainte éthique", info:null },
    { val:"Exclure armement & tabac", icon:"♻️", title:"Investissement responsable", desc:"Exclut les entreprises les plus néfastes (armes, tabac, charbon). Performances similaires aux ETF classiques.", info:"Exemple : un ETF MSCI World ESG exclut ExxonMobil, Lockheed Martin, Philip Morris mais garde Apple, Microsoft, LVMH.\n\nLes performances historiques sont quasi-identiques aux indices classiques." },
    { val:"ESG strict uniquement", icon:"🌱", title:"ESG Strict (SRI)", desc:"Top 25% des entreprises de chaque secteur sur critères ESG. Légèrement moins diversifié.", info:"Plus contraignant mais permet d'aligner votre argent avec vos valeurs.\n\nSélection des 25% meilleures entreprises de chaque secteur sur les critères Environnement, Social et Gouvernance." },
  ];
  return (
    <div style={{maxWidth:540,margin:"0 auto"}}>
      <p style={{fontSize:12,color:"rgba(5,11,20,.4)",marginBottom:20,fontFamily:"Inter,sans-serif",textAlign:"center"}}>ESG = Environnement, Social, Gouvernance — des critères pour évaluer l'impact des entreprises</p>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {opts.map((o,i)=>{
          const sel = value === o.val;
          return (
            <div key={o.val} onClick={()=>onSelect(o.val)} style={{
              borderRadius:8,padding:"20px 22px",cursor:"pointer",position:"relative",
              border:sel?".5px solid rgba(26,58,106,.35)":"0.5px solid rgba(5,11,20,.09)",
              background:sel?"rgba(26,58,106,.03)":"rgba(255,255,255,.72)",
              transition:EASE,animation:`cardIn .4s cubic-bezier(.23,1,.32,1) both`,animationDelay:`${i*0.06}s`,
            }}>
              {o.info && <div style={{position:"absolute",top:14,right:14}}><InfoBtn text={o.info} /></div>}
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:28}}>{o.icon}</span>
                <div>
                  <div style={{fontSize:14,fontWeight:500,color:"rgba(5,11,20,.88)",fontFamily:"Inter,sans-serif"}}>{o.title}</div>
                  <div style={{fontSize:11.5,fontWeight:400,color:"rgba(5,11,20,.45)",fontFamily:"Inter,sans-serif",marginTop:3,lineHeight:1.5}}>{o.desc}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Q5: Asset class grid ─────────────────────────────────────
const CLASS_INFO: Record<string,{ icon:string; desc:string; risk:string; info:string }> = {
  "ETF": { icon:"📊", desc:"Paniers d'actifs diversifiés", risk:"⭐⭐", info:"Un ETF réplique un indice (ex: S&P 500). Vous achetez 500 entreprises en un seul ordre.\nFrais très bas (~0.2%/an). C'est la base d'un portefeuille efficace." },
  "Actions": { icon:"🏢", desc:"Parts d'entreprises cotées", risk:"⭐⭐⭐", info:"Acheter une action = devenir copropriétaire d'une entreprise (Apple, LVMH...).\nPlus risqué qu'un ETF car moins diversifié, mais potentiel de gain plus élevé." },
  "Obligations": { icon:"🏦", desc:"Prêts à des États/entreprises", risk:"⭐", info:"Vous prêtez de l'argent à un État ou une entreprise qui vous rembourse avec intérêts.\nFaible risque, rendement modéré (~3-4%/an). Stabilise le portefeuille." },
  "Or & Matières": { icon:"🥇", desc:"Actifs tangibles, valeur refuge", risk:"⭐⭐", info:"L'or protège contre l'inflation et les crises. Son prix monte quand les marchés baissent.\nDiversification idéale, pas de revenus (dividendes) mais réserve de valeur." },
  "Immobilier": { icon:"🏠", desc:"REITs — immobilier coté", risk:"⭐⭐", info:"Les REITs (fonds immobiliers cotés) vous exposent à l'immobilier sans acheter un bien.\nLoyers distribués en dividendes. Corrélation faible avec les actions." },
  "Crypto": { icon:"₿", desc:"Bitcoin, Ethereum — très volatil", risk:"⭐⭐⭐⭐⭐", info:"Les cryptomonnaies sont très volatiles : +100% ou -60% en quelques mois.\nÀ réserver en petite proportion (2-5%) pour les profils agressifs." },
};

export function Q5AssetGrid({ selected, onToggle }: { selected: string[]; onToggle: (c: string) => void }) {
  const classes = ["ETF","Actions","Obligations","Or & Matières","Immobilier","Crypto"];
  return (
    <div style={{maxWidth:540,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        {classes.map((c,i)=>{
          const sel = selected.includes(c);
          const info = CLASS_INFO[c];
          return (
            <div key={c} onClick={()=>onToggle(c)} style={{
              borderRadius:8,padding:"18px 14px",cursor:"pointer",textAlign:"center",position:"relative",
              border:sel?".5px solid rgba(26,58,106,.35)":"0.5px solid rgba(5,11,20,.09)",
              background:sel?"rgba(26,58,106,.04)":"rgba(255,255,255,.72)",
              transition:EASE,animation:`cardIn .4s cubic-bezier(.23,1,.32,1) both`,animationDelay:`${i*0.05}s`,
            }}>
              <div style={{position:"absolute",top:8,right:8}}><InfoBtn text={info.info} /></div>
              <div style={{fontSize:28,marginBottom:8}}>{info.icon}</div>
              <div style={{fontSize:12,fontWeight:500,color:"rgba(5,11,20,.88)",fontFamily:"Inter,sans-serif",marginBottom:4}}>{c}</div>
              <div style={{fontSize:10,color:"rgba(5,11,20,.4)",fontFamily:"Inter,sans-serif",lineHeight:1.4}}>{info.desc}</div>
              <div style={{fontSize:9,color:"rgba(5,11,20,.25)",fontFamily:"Inter,sans-serif",marginTop:6}}>Risque : {info.risk}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Q7: Diversification cards with visual ────────────────────
export function Q7DivCards({ value, onSelect }: { value?: string; onSelect: (v: string) => void }) {
  const opts = [
    { val:"Concentre", label:"Simple à suivre", sub:"3-5 actifs", icon:"🎯", blocks:3, desc:"Comprendre chaque ligne. Facile à suivre." },
    { val:"Equilibre", label:"Équilibré", sub:"6-10 actifs", icon:"⚖️", blocks:8, desc:"Meilleur compromis. Recommandé pour la plupart." },
    { val:"Large", label:"Maximum", sub:"10-15 actifs", icon:"🌐", blocks:14, desc:"Diversification maximale. Grands patrimoines." },
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,maxWidth:560,margin:"0 auto"}}>
      {opts.map((o,i)=>{
        const sel = value === o.val;
        return (
          <div key={o.val} onClick={()=>onSelect(o.val)} style={{
            borderRadius:8,padding:"22px 16px",cursor:"pointer",textAlign:"center",
            border:sel?".5px solid rgba(26,58,106,.4)":"0.5px solid rgba(5,11,20,.09)",
            background:sel?"rgba(26,58,106,.04)":"rgba(255,255,255,.72)",
            boxShadow:sel?"0 4px 16px rgba(26,58,106,.08)":"0 1px 2px rgba(0,0,0,.015)",
            transition:EASE,animation:`cardIn .4s cubic-bezier(.23,1,.32,1) both`,animationDelay:`${i*0.08}s`,
          }}>
            <div style={{fontSize:28,marginBottom:10}}>{o.icon}</div>
            <div style={{fontSize:14,fontWeight:500,color:"rgba(5,11,20,.88)",fontFamily:"Inter,sans-serif"}}>{o.label}</div>
            <div style={{fontSize:11,fontWeight:500,color:SAP,opacity:.65,fontFamily:"Inter,sans-serif",marginTop:2}}>{o.sub}</div>
            {/* Mini block visualization */}
            <div style={{display:"flex",flexWrap:"wrap",gap:2,justifyContent:"center",margin:"12px 0 8px"}}>
              {Array.from({length:o.blocks}).map((_,j)=>(
                <div key={j} style={{width:o.blocks>10?8:o.blocks>5?10:16,height:o.blocks>10?8:o.blocks>5?10:16,borderRadius:2,background:sel?SAP:"rgba(5,11,20,.1)",opacity:sel?0.3+j*0.05:0.2,transition:EASE}}/>
              ))}
            </div>
            <div style={{fontSize:10,color:"rgba(5,11,20,.4)",fontFamily:"Inter,sans-serif",lineHeight:1.4}}>{o.desc}</div>
          </div>
        );
      })}
    </div>
  );
}
