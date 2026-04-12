"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthLayout, { useTyping } from "../AuthLayout";

const EASE = "0.7s cubic-bezier(.16,1,.3,1)";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => { setTimeout(() => setStarted(true), 180); }, []);
  const t1 = useTyping("Bienvenue", started, 62);
  const t2 = useTyping("de retour.", started && t1.length >= 9, 56);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { error: err } = await sb.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      router.push("/dashboard");
    } catch { setError("Une erreur est survenue."); setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "17px 22px", fontSize: 14, fontWeight: 400,
    color: "rgba(5,11,20,0.88)", background: "rgba(255,255,255,0.72)",
    border: "0.5px solid rgba(5,11,20,0.09)", borderRadius: 6,
    outline: "none", fontFamily: "Inter,sans-serif", boxSizing: "border-box",
    transition: `border ${EASE}, box-shadow ${EASE}`,
  };

  return (
    <AuthLayout leftTitle1={t1} leftTitle2={t2} typing1Done={t1.length >= 9}
      leftSub={<>Votre portefeuille vous attend.<br />Connectez-vous pour accéder<br />à vos analyses et optimisations.</>}>

      <button onClick={() => router.push("/")} style={{
        background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 28,
        fontSize: 10, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase",
        color: "rgba(5,11,20,0.36)", fontFamily: "Inter,sans-serif",
      }}>← RETOUR</button>

      <h2 style={{ fontSize: 28, fontWeight: 500, color: "rgba(5,11,20,0.88)", letterSpacing: "-.02em", margin: "0 0 8px", fontFamily: "Inter,sans-serif" }}>Connexion</h2>
      <p style={{ fontSize: 13, fontWeight: 400, color: "rgba(5,11,20,0.4)", margin: "0 0 28px", fontFamily: "Inter,sans-serif" }}>
        Pas encore de compte ?{" "}
        <a href="/auth/register" style={{ color: "#1a3a6a", textDecoration: "none", fontWeight: 500 }}>S'inscrire gratuitement</a>
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 10, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(5,11,20,0.36)", fontFamily: "Inter,sans-serif" }}>Adresse email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.fr" style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = "rgba(26,58,106,0.3)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,58,106,0.05)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "rgba(5,11,20,0.09)"; e.currentTarget.style.boxShadow = "none"; }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 10, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(5,11,20,0.36)", fontFamily: "Inter,sans-serif" }}>Mot de passe</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = "rgba(26,58,106,0.3)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,58,106,0.05)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "rgba(5,11,20,0.09)"; e.currentTarget.style.boxShadow = "none"; }} />
        </div>

        {error && <div style={{ fontSize: 12, color: "rgba(175,60,60,0.8)", marginBottom: 16, fontFamily: "Inter,sans-serif" }}>{error}</div>}

        <button type="submit" disabled={loading} style={{
          width: "100%", padding: "16px 40px", border: "none", borderRadius: 6, cursor: loading ? "wait" : "pointer",
          background: "linear-gradient(145deg, #050B14, #0c1a2e)", color: "rgba(255,255,255,0.92)",
          fontSize: 11, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase",
          fontFamily: "Inter,sans-serif", position: "relative", overflow: "hidden",
          boxShadow: "0 3px 14px rgba(5,11,20,0.1)", transition: `box-shadow ${EASE}, transform ${EASE}`,
          opacity: loading ? 0.7 : 1,
        }}>{loading ? "CONNEXION EN COURS..." : "SE CONNECTER"}</button>

        <div style={{ textAlign: "center", margin: "20px 0", fontSize: 11, color: "rgba(5,11,20,0.25)", fontFamily: "Inter,sans-serif" }}>ou</div>

        <button type="button" onClick={() => router.push("/auth/register")} style={{
          width: "100%", padding: "14px 40px", borderRadius: 6, cursor: "pointer",
          background: "transparent", border: "0.5px solid rgba(5,11,20,0.09)",
          fontSize: 11, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase",
          color: "rgba(5,11,20,0.6)", fontFamily: "Inter,sans-serif",
          transition: `all ${EASE}`,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "#050B14"; e.currentTarget.style.color = "white"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(5,11,20,0.6)"; }}
        >CRÉER UN COMPTE</button>
      </form>
    </AuthLayout>
  );
}
