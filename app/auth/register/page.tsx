"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthLayout, { useTyping } from "../AuthLayout";

export default function RegisterPage() {
  const router = useRouter();
  const [name,     setName    ] = useState("");
  const [email,    setEmail   ] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading ] = useState(false);
  const [error,    setError   ] = useState("");
  const [started,  setStarted ] = useState(false);

  useEffect(() => { setTimeout(() => setStarted(true), 180); }, []);
  const t1 = useTyping("Commencez", started, 58);
  const t2 = useTyping("gratuitement.", started && t1.length >= 9, 50);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    if (password.length < 8) {
      setError("Minimum 8 caractères requis.");
      setLoading(false); return;
    }
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error: err } = await sb.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      });
      if (err) { setError(err.message); setLoading(false); return; }
      router.push("/dashboard");
    } catch { setError("Une erreur est survenue."); setLoading(false); }
  }

  return (
    <AuthLayout
      leftTitle1={t1}
      leftTitle2={t2}
      typing1Done={t1.length >= 9}
      leftSub={<>Créez votre compte en 30 secondes.<br/>Aucune carte bancaire requise.<br/>Vos données restent privées et sécurisées.</>}
    >
      <button onClick={()=>router.push("/")} className="auth-back">
        ← Retour
      </button>

      <h2 className="auth-title">Inscription</h2>
      <p className="auth-sub">
        Déjà inscrit ?{" "}
        <a href="/auth/login" className="auth-link">Se connecter</a>
      </p>

      <form onSubmit={handleSubmit}>
        {[
          { id:"name", label:"Prénom & Nom", type:"text",     val:name,     set:setName,     ph:"Jean Dupont",         hint:null },
          { id:"email",label:"Adresse email",type:"email",    val:email,    set:setEmail,    ph:"vous@exemple.fr",     hint:null },
          { id:"pwd",  label:"Mot de passe", type:"password", val:password, set:setPassword, ph:"Minimum 8 caractères",hint:"min. 8 caractères" },
        ].map(f => (
          <div key={f.id} className="auth-field">
            <label className="auth-label">{f.label}</label>
            <input type={f.type} required value={f.val}
              onChange={e=>f.set(e.target.value)}
              placeholder={f.ph} className="auth-input"/>
            {f.hint && <div className="auth-hint">{f.hint}</div>}
          </div>
        ))}

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading ? "Création en cours..." : "Créer mon compte →"}
        </button>

        <div className="auth-divider"><span>ou</span></div>

        <button type="button" className="auth-btn-secondary"
          onClick={()=>router.push("/auth/login")}>
          Se connecter →
        </button>
      </form>
    </AuthLayout>
  );
}
