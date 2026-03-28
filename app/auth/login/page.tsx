"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else router.push("/dashboard/portfolio");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;1,300&family=Inter:wght@300;400;500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#FAFAF8;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}
        .auth-root{min-height:100vh;display:grid;grid-template-columns:1fr 1fr}
        .auth-left{background:#0A1628;display:flex;flex-direction:column;justify-content:space-between;padding:48px 56px}
        .auth-logo{font-family:'Cormorant Garant',serif;font-size:13px;font-weight:400;letter-spacing:.28em;color:white;text-decoration:none}
        .auth-left-title{font-family:'Cormorant Garant',serif;font-size:clamp(36px,4vw,52px);font-weight:300;color:white;line-height:1.1;letter-spacing:-.02em}
        .auth-left-title em{font-style:italic;color:rgba(255,255,255,.4)}
        .auth-left-sub{font-size:12px;font-weight:300;color:rgba(255,255,255,.3);line-height:1.8;margin-top:14px}
        .auth-line{width:36px;height:1px;background:rgba(255,255,255,.2);margin-bottom:28px}
        .auth-right{display:flex;align-items:center;justify-content:center;padding:48px}
        .form-wrap{width:100%;max-width:340px}
        .back-link{font-size:10px;letter-spacing:.1em;color:#8A9BB0;text-decoration:none;display:block;margin-bottom:48px;transition:color 0.2s}
        .back-link:hover{color:#0A1628}
        .auth-heading{font-family:'Cormorant Garant',serif;font-size:40px;font-weight:300;color:#0A1628;letter-spacing:-.02em;margin-bottom:8px}
        .auth-hint{font-size:12px;font-weight:300;color:#8A9BB0;margin-bottom:36px}
        .auth-hint a{color:#1E3A6E;text-decoration:none;border-bottom:1px solid rgba(30,58,110,.2)}
        .auth-hint a:hover{border-color:#1E3A6E}
        .fl{margin-bottom:28px}
        .fl label{font-size:9px;font-weight:500;letter-spacing:.16em;color:#8A9BB0;display:block;margin-bottom:8px}
        .fl input{width:100%;background:transparent;border:none;border-bottom:1px solid rgba(10,22,40,.15);padding:10px 0;font-size:13px;color:#0A1628;outline:none;transition:border-color 0.3s;font-weight:300;font-family:'Inter',sans-serif}
        .fl input:focus{border-color:#0A1628}
        .fl input::placeholder{color:rgba(10,22,40,.2)}
        .auth-error{font-size:11px;color:#C0392B;margin-bottom:14px}
        .btn-primary{width:100%;font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.18em;background:#0A1628;color:white;border:none;padding:16px;cursor:pointer;transition:opacity 0.2s;margin-top:8px}
        .btn-primary:hover{opacity:.82}
        .btn-primary:disabled{opacity:.4;cursor:not-allowed}
        .divider{display:flex;align-items:center;gap:14px;margin:24px 0}
        .divider-line{flex:1;height:1px;background:rgba(10,22,40,.08)}
        .divider-text{font-size:9px;color:#8A9BB0;letter-spacing:.1em}
        .btn-secondary{width:100%;font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.18em;background:transparent;color:#0A1628;border:1px solid rgba(10,22,40,.2);padding:16px;cursor:pointer;transition:all 0.35s;position:relative;overflow:hidden}
        .btn-secondary::before{content:'';position:absolute;inset:0;background:#0A1628;transform:scaleX(0);transform-origin:left;transition:transform 0.4s cubic-bezier(0.4,0,0.2,1);z-index:-1}
        .btn-secondary:hover::before{transform:scaleX(1)}
        .btn-secondary:hover{color:white;border-color:#0A1628}
        @media(max-width:768px){.auth-root{grid-template-columns:1fr}.auth-left{display:none}}
      `}</style>
      <div className="auth-root">
        <div className="auth-left">
          <a href="/" className="auth-logo">ZERO CGP</a>
          <div>
            <div className="auth-line" />
            <h2 className="auth-left-title">Bienvenue<br /><em>de retour.</em></h2>
            <p className="auth-left-sub">Votre portefeuille vous attend.<br />Connectez-vous pour accéder<br />à vos analyses et optimisations.</p>
          </div>
          <div />
        </div>
        <div className="auth-right">
          <div className="form-wrap">
            <a href="/" className="back-link">← RETOUR</a>
            <h1 className="auth-heading">Connexion</h1>
            <p className="auth-hint">Pas encore de compte ? <Link href="/auth/register">S'inscrire gratuitement</Link></p>
            <form onSubmit={handleLogin}>
              <div className="fl"><label>ADRESSE EMAIL</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="vous@exemple.fr" /></div>
              <div className="fl"><label>MOT DE PASSE</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••" /></div>
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary">{loading ? "CONNEXION..." : "SE CONNECTER →"}</button>
            </form>
            <div className="divider"><div className="divider-line"/><span className="divider-text">OU</span><div className="divider-line"/></div>
            <button className="btn-secondary" onClick={()=>router.push("/auth/register")}>CRÉER UN COMPTE →</button>
          </div>
        </div>
      </div>
    </>
  );
}
