"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthLayout, { useTyping } from "../AuthLayout";

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail   ] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading ] = useState(false);
  const [error,    setError   ] = useState("");
  const [started,  setStarted ] = useState(false);

  useEffect(() => { setTimeout(() => setStarted(true), 180); }, []);
  const t1 = useTyping("Bienvenue", started, 62);
  const t2 = useTyping("de retour.", started && t1.length >= 9, 56);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error: err } = await sb.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      router.push("/dashboard");
    } catch { setError("Une erreur est survenue."); setLoading(false); }
  }

  return (
    <AuthLayout
      leftTitle1={t1}
      leftTitle2={t2}
      typing1Done={t1.length >= 9}
      leftSub={<>Votre portefeuille vous attend.<br/>Connectez-vous pour accéder<br/>à vos analyses et optimisations.</>}
    >
      {/* Retour */}
      <button onClick={()=>router.push("/")} className="auth-back">
        ← Retour
      </button>

      <h2 className="auth-title">Connexion</h2>
      <p className="auth-sub">
        Pas encore de compte ?{" "}
        <a href="/auth/register" className="auth-link">S'inscrire gratuitement</a>
      </p>

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label">Adresse email</label>
          <input type="email" required value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="vous@exemple.fr" className="auth-input"/>
        </div>
        <div className="auth-field">
          <label className="auth-label">Mot de passe</label>
          <input type="password" required value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="••••••••" className="auth-input"/>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading ? "Connexion en cours..." : "Se connecter →"}
        </button>

        <div className="auth-divider"><span>ou</span></div>

        <button type="button" className="auth-btn-secondary"
          onClick={()=>router.push("/auth/register")}>
          Créer un compte →
        </button>
      </form>
    </AuthLayout>
  );
}
