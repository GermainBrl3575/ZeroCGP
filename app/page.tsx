// app/page.tsx  — Page d'accueil (landing)
"use client";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black flex flex-col overflow-hidden relative">
      {/* Grille de fond */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-10 py-6">
        <span className="text-white text-sm font-bold tracking-[0.18em]">
          ZERO CGT
        </span>
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/auth/login")}
            className="text-white/40 text-sm hover:text-white transition-colors"
          >
            Connexion
          </button>
          <button
            onClick={() => router.push("/auth/register")}
            className="bg-white text-black text-xs font-bold tracking-[0.14em] px-6 py-2.5 hover:bg-white/90 transition-colors"
          >
            S'INSCRIRE
          </button>
        </div>
      </header>

      {/* Héros */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="fade-up">
          <p className="text-accent text-[10px] font-bold tracking-[0.3em] mb-8">
            GESTION DE PATRIMOINE OPTIMISÉE
          </p>
        </div>

        <h1
          className="fade-up-1 text-white font-black leading-[0.9] mb-8 select-none"
          style={{ fontSize: "clamp(64px, 10vw, 120px)", letterSpacing: "-0.04em" }}
        >
          Zero
          <br />
          CGT.
        </h1>

        <p className="fade-up-2 text-white/35 text-lg font-light leading-relaxed mb-12 max-w-md">
          Optimisez votre portefeuille avec précision.
          <br />
          Zéro compromis sur vos rendements.
        </p>

        <div className="fade-up-3">
          <button
            onClick={() => router.push("/auth/register")}
            style={{ background: "#D5001C" }}
            className="text-white text-xs font-bold tracking-[0.18em] px-14 py-5 hover:opacity-85 transition-opacity"
          >
            COMMENCER →
          </button>
        </div>
      </section>

      {/* Métriques bas de page */}
      <footer className="relative z-10 flex justify-center gap-16 pb-12">
        {[
          ["33", "Actifs candidats"],
          ["3", "Méthodes Markowitz"],
          ["1 000", "Simulations Monte Carlo"],
        ].map(([n, l]) => (
          <div key={l} className="text-center">
            <div
              className="text-white font-black"
              style={{ fontSize: 28, letterSpacing: "-0.02em" }}
            >
              {n}
            </div>
            <div className="text-white/25 text-[10px] mt-1.5 tracking-[0.06em]">
              {l.toUpperCase()}
            </div>
          </div>
        ))}
      </footer>
    </main>
  );
}
