// app/auth/register/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard/entry");
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-sm px-8 py-12">
        <Link href="/" className="block text-white text-xs font-bold tracking-[0.18em] mb-12">
          ← ZERO CGT
        </Link>
        <h1 className="text-white text-3xl font-black mb-2" style={{ letterSpacing: "-0.03em" }}>
          Créer un compte
        </h1>
        <p className="text-white/30 text-sm mb-10">
          Déjà inscrit ?{" "}
          <Link href="/auth/login" className="text-white/60 hover:text-white underline">
            Se connecter
          </Link>
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-white/30 text-[10px] font-bold tracking-[0.12em] block mb-2">
              PRÉNOM / NOM
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 outline-none focus:border-white/30 transition-colors"
              placeholder="Jean Dupont"
            />
          </div>
          <div>
            <label className="text-white/30 text-[10px] font-bold tracking-[0.12em] block mb-2">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 outline-none focus:border-white/30 transition-colors"
              placeholder="vous@exemple.fr"
            />
          </div>
          <div>
            <label className="text-white/30 text-[10px] font-bold tracking-[0.12em] block mb-2">
              MOT DE PASSE
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 outline-none focus:border-white/30 transition-colors"
              placeholder="Minimum 8 caractères"
            />
          </div>

          {error && <p className="text-red-400 text-xs py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ background: "#D5001C" }}
            className="w-full text-white text-xs font-bold tracking-[0.16em] py-4 hover:opacity-85 transition-opacity disabled:opacity-50 mt-2"
          >
            {loading ? "CRÉATION..." : "CRÉER MON COMPTE →"}
          </button>
        </form>
      </div>
    </main>
  );
}
