"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthLayout, { useTyping, useStagger, AuthC as C } from "../AuthLayout";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [focusField, setFocusField] = useState<string|null>(null);
  const [btnHover, setBtnHover] = useState(false);
  const [btnOutHover, setBtnOutHover] = useState(false);

  useEffect(() => { setTimeout(() => setStarted(true), 180); }, []);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);
  const t1 = useTyping("Commencez", started, 58);
  const t2 = useTyping("maintenant.", started && t1.length >= 9, 50);
  const stg = useStagger(loaded);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    if (password.length < 8) { setError("Minimum 8 caractères requis."); setLoading(false); return; }
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { error: err } = await sb.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (err) { setError(err.message); setLoading(false); return; }
      router.push("/dashboard");
    } catch { setError("Une erreur est survenue."); setLoading(false); }
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width:"100%",padding:"17px 22px",fontSize:14,fontWeight:400,
    color:C.navyText,fontFamily:"Inter,sans-serif",
    background:"rgba(255,255,255,0.72)",
    border:focusField===field?"0.5px solid rgba(26,58,106,0.3)":"0.5px solid rgba(5,11,20,0.09)",
    borderRadius:6,outline:"none",boxSizing:"border-box",
    boxShadow:focusField===field?"0 0 0 3px rgba(26,58,106,0.05)":"0 1px 2px rgba(0,0,0,0.015)",
    transition:"border 0.7s cubic-bezier(.16,1,.3,1), box-shadow 0.7s cubic-bezier(.16,1,.3,1)",
  });

  const labelStyle: React.CSSProperties = {
    display:"block",fontSize:10,fontWeight:500,letterSpacing:".1em",
    textTransform:"uppercase",color:"rgba(5,11,20,0.36)",marginBottom:8,
  };

  const fields = [
    { id:"name",label:"Prénom & Nom",type:"text",val:name,set:setName,ph:"Jean Dupont" },
    { id:"email",label:"Adresse email",type:"email",val:email,set:setEmail,ph:"vous@exemple.fr" },
    { id:"pwd",label:"Mot de passe",type:"password",val:password,set:setPassword,ph:"Minimum 8 caractères" },
  ];

  return (
    <AuthLayout title1={t1} title2={t2}
      leftSub={<>Créez votre compte en 30 secondes.<br/>Aucune carte bancaire requise.<br/>Vos données restent privées et sécurisées.</>}>

      <div style={{...stg(4),fontSize:10,fontWeight:500,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(5,11,20,0.36)",marginBottom:28,cursor:"pointer"}} onClick={()=>router.push("/")}>← Retour</div>

      <h2 style={{...stg(5),fontSize:28,fontWeight:500,color:C.navyText,letterSpacing:"-.02em",marginBottom:8}}>Créez votre compte</h2>
      <p style={{...stg(5),fontSize:13,fontWeight:400,color:"rgba(5,11,20,0.4)",marginBottom:32}}>
        Déjà un compte ? <span onClick={()=>router.push("/auth/login")} style={{color:C.sapphire,cursor:"pointer",fontWeight:500}}>Se connecter</span>
      </p>

      <form onSubmit={handleSubmit}>
        {fields.map((f,fi)=>(
          <div key={f.id} style={stg(6+fi)}>
            <label style={labelStyle}>{f.label}</label>
            <input type={f.type} required value={f.val} onChange={e=>f.set(e.target.value)}
              onFocus={()=>setFocusField(f.id)} onBlur={()=>setFocusField(null)}
              placeholder={f.ph} style={{...inputStyle(f.id),marginBottom:fi<fields.length-1?20:28}}/>
          </div>
        ))}

        {error&&<div style={{fontSize:12,color:"rgba(175,60,60,0.8)",marginBottom:16}}>{error}</div>}

        <div style={stg(9)}>
          <button type="submit" disabled={loading}
            onMouseEnter={()=>setBtnHover(true)} onMouseLeave={()=>setBtnHover(false)}
            style={{
              width:"100%",padding:"16px 40px",border:"none",borderRadius:6,
              position:"relative",overflow:"hidden",cursor:loading?"wait":"pointer",
              background:`linear-gradient(145deg,${C.navy},${C.navyMid})`,
              color:"rgba(255,255,255,.92)",fontFamily:"Inter,sans-serif",
              fontSize:11.5,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",
              boxShadow:btnHover?`0 6px 28px rgba(5,11,20,.18), 0 0 20px ${C.sapphireGlow}`:"0 3px 14px rgba(5,11,20,.1)",
              transition:"box-shadow 0.8s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1)",
              transform:btnHover?"translateY(-.5px)":"none",opacity:loading?0.7:1,
            }}>
            <div style={{
              position:"absolute",inset:0,pointerEvents:"none",borderRadius:6,
              background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,.08) 40%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.08) 60%,transparent 100%)",
              backgroundSize:"200% 100%",
              backgroundPosition:btnHover?"100% 0":"-100% 0",
              transition:"background-position 2s cubic-bezier(.16,1,.3,1)",
            }}/>
            <span style={{position:"relative",zIndex:1}}>{loading?"Création en cours...":"Créer mon compte"}</span>
          </button>
        </div>

        <div style={{...stg(10),display:"flex",alignItems:"center",gap:16,margin:"24px 0"}}>
          <div style={{flex:1,height:".5px",background:"rgba(5,11,20,0.06)"}}/>
          <span style={{fontSize:11,fontWeight:400,color:"rgba(5,11,20,0.2)"}}>ou</span>
          <div style={{flex:1,height:".5px",background:"rgba(5,11,20,0.06)"}}/>
        </div>

        <div style={stg(11)}>
          <button type="button" onClick={()=>router.push("/auth/login")}
            onMouseEnter={()=>setBtnOutHover(true)} onMouseLeave={()=>setBtnOutHover(false)}
            style={{
              width:"100%",padding:"14px 28px",borderRadius:6,cursor:"pointer",fontFamily:"Inter,sans-serif",
              fontSize:11,fontWeight:500,letterSpacing:".1em",textTransform:"uppercase",
              background:btnOutHover?C.navy:"transparent",
              color:btnOutHover?"white":C.navyText,
              border:btnOutHover?`0.5px solid ${C.navy}`:"0.5px solid rgba(5,11,20,0.09)",
              transition:"all 0.7s cubic-bezier(.16,1,.3,1)",
            }}>Se connecter</button>
        </div>
      </form>
    </AuthLayout>
  );
}
