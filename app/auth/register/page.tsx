"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const BG = "#050B14";
const TW = "rgba(229,231,235,0.88)";
const TM = "rgba(229,231,235,0.38)";
const TS = "rgba(229,231,235,0.18)";
const VERT = "rgba(74,222,128,0.80)";

function useTyping(text: string, started: boolean, speed = 52) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!started) return;
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, started]);
  return displayed;
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused]   = useState<string|null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [started, setStarted]   = useState(false);
  const [wave, setWave]         = useState(false);

  useEffect(() => { setTimeout(() => setStarted(true), 200); }, []);

  const t1 = useTyping("Commencez", started, 58);
  const t2 = useTyping("gratuitement.", started && t1.length >= 9, 52);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
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
    } catch {
      setError("Une erreur est survenue."); setLoading(false);
    }
  }

  function onFocus(name: string) {
    setFocused(name);
    setWave(false);
    setTimeout(() => setWave(true), 10);
    setTimeout(() => setWave(false), 900);
  }

  return (
    <div style={{
      minHeight:"100vh", background:BG,
      display:"flex", position:"relative", overflow:"hidden",
      fontFamily:"'Inter',sans-serif",
    }}>
      <div style={{
        position:"absolute", top:0, left:0, width:"50%", height:"100%",
        background:"radial-gradient(ellipse 80% 60% at 20% 50%, rgba(10,22,40,0.60) 0%, transparent 70%)",
        pointerEvents:"none", zIndex:0,
      }}/>

      {wave && (
        <div style={{
          position:"absolute", top:0, left:0, right:0, bottom:0,
          background:"linear-gradient(90deg, transparent 0%, rgba(74,222,128,0.03) 50%, transparent 100%)",
          animation:"wave-glow 0.85s ease-out forwards",
          pointerEvents:"none", zIndex:1,
        }}/>
      )}

      {/* ── Gauche ──────────────────────────────── */}
      <div style={{
        width:"42%", padding:"0 52px",
        display:"flex", flexDirection:"column",
        justifyContent:"center", position:"relative", zIndex:2,
      }}>
        <div style={{
          position:"absolute", top:36, left:52,
          fontFamily:"'Cormorant Garant',serif",
          fontSize:12, fontWeight:400, letterSpacing:".38em",
          color:"rgba(229,231,235,0.55)", textTransform:"uppercase",
        }}>Zero CGP</div>

        <div style={{ width:32, height:"0.5px", background:"rgba(74,222,128,0.40)", marginBottom:28 }}/>

        <div style={{ marginBottom:20 }}>
          <h1 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(42px,5.2vw,68px)",
            fontWeight:300, color:TW, lineHeight:1.08, margin:"0 0 4px",
          }}>{t1}
            {t1.length < 9 && (
              <span style={{ animation:"typing-cursor 1s infinite", color:VERT }}>|</span>
            )}
          </h1>
          <h1 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:"clamp(42px,5.2vw,68px)",
            fontWeight:300, fontStyle:"italic",
            color:"rgba(229,231,235,0.38)",
            lineHeight:1.08, margin:0,
          }}>{t2}
            {t1.length >= 9 && t2.length < 13 && (
              <span style={{ animation:"typing-cursor 1s infinite", color:VERT }}>|</span>
            )}
          </h1>
        </div>

        <p style={{
          fontFamily:"'Inter',sans-serif",
          fontSize:12, fontWeight:300, color:TM, lineHeight:1.75, maxWidth:280,
        }}>
          Créez votre compte en 30 secondes.<br/>
          Aucune carte bancaire requise.<br/>
          Vos données restent privées et sécurisées.
        </p>
      </div>

      {/* Ligne séparatrice */}
      <div style={{
        width:"0.5px", alignSelf:"stretch", flexShrink:0,
        background:"rgba(229,231,235,0.08)",
        animation:"pulse-line 4s ease-in-out infinite",
        position:"relative", zIndex:2,
      }}/>

      {/* ── Droite — formulaire ─────────────────── */}
      <div style={{
        flex:1, display:"flex", alignItems:"center",
        justifyContent:"center", padding:"60px 52px",
        position:"relative", zIndex:2,
      }}>
        <div style={{
          width:"100%", maxWidth:380,
          background:"rgba(255,255,255,0.03)",
          backdropFilter:"blur(20px)",
          WebkitBackdropFilter:"blur(20px)",
          border:"0.5px solid rgba(255,255,255,0.07)",
          borderRadius:16, padding:"44px 40px 40px",
        }}>
          <button onClick={()=>router.push("/")} style={{
            background:"none", border:"none", cursor:"pointer",
            fontFamily:"'Inter',sans-serif",
            fontSize:10, fontWeight:400, letterSpacing:".12em",
            color:TS, textTransform:"uppercase", marginBottom:36,
            padding:0, display:"flex", alignItems:"center", gap:6,
          }}>
            <span style={{ fontSize:14, lineHeight:1 }}>←</span> Retour
          </button>

          <h2 style={{
            fontFamily:"'Cormorant Garant',serif",
            fontSize:38, fontWeight:300, color:TW,
            letterSpacing:"-.01em", margin:"0 0 8px",
          }}>Inscription</h2>
          <p style={{
            fontFamily:"'Inter',sans-serif",
            fontSize:12, fontWeight:300, color:TM, margin:"0 0 36px",
          }}>
            Déjà inscrit ?{" "}
            <a href="/auth/login" style={{ color:VERT, textDecoration:"none" }}>
              Se connecter
            </a>
          </p>

          <form onSubmit={handleSubmit}>
            {[
              { id:"name", label:"Prénom & Nom", type:"text", val:name, set:setName, ph:"Jean Dupont", hint:null },
              { id:"email", label:"Adresse email", type:"email", val:email, set:setEmail, ph:"vous@exemple.fr", hint:null },
              { id:"pwd", label:"Mot de passe", type:"password", val:password, set:setPassword, ph:"Minimum 8 caractères", hint:"min-8-chars" },
            ].map(field => (
              <div key={field.id} style={{ marginBottom:24 }}>
                <div style={{
                  fontFamily:"'Inter',sans-serif",
                  fontSize:8.5, fontWeight:500, letterSpacing:".16em",
                  textTransform:"uppercase", color:TS, marginBottom:8,
                }}>{field.label}</div>
                <input
                  type={field.type} required
                  value={field.val}
                  onChange={e => field.set(e.target.value)}
                  placeholder={field.ph}
                  onFocus={()=>onFocus(field.id)}
                  onBlur={()=>setFocused(null)}
                  className="auth-input"
                />
                {field.hint === "min-8-chars" && (
                  <div style={{
                    fontFamily:"'Roboto Mono','JetBrains Mono',monospace",
                    fontSize:9.5, color:TS, marginTop:5, letterSpacing:".04em",
                  }}>min. 8 caractères</div>
                )}
              </div>
            ))}

            {error && (
              <div style={{
                fontFamily:"'Roboto Mono',monospace",
                fontSize:10, color:"rgba(248,113,113,0.80)",
                marginBottom:16, letterSpacing:".02em",
              }}>{error}</div>
            )}

            <div style={{ marginTop:12, marginBottom:20 }}>
              <button type="submit" disabled={loading} className="auth-btn-primary">
                {loading ? "Création..." : "Créer mon compte →"}
              </button>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{ flex:1, height:"0.5px", background:"rgba(229,231,235,0.08)" }}/>
              <span style={{
                fontFamily:"'Inter',sans-serif",
                fontSize:9, color:TS, letterSpacing:".12em", textTransform:"uppercase",
              }}>ou</span>
              <div style={{ flex:1, height:"0.5px", background:"rgba(229,231,235,0.08)" }}/>
            </div>

            <button type="button" className="auth-btn-secondary"
              onClick={()=>router.push("/auth/login")}>
              Se connecter →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
