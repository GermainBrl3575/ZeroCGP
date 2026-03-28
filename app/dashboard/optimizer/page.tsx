// app/dashboard/optimizer/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, createPortfolio, upsertAssets } from "@/lib/supabase";
import { eur, TYPE_COLOR } from "@/lib/utils";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, ReferenceLine,
} from "recharts";

// ─── Questions ───────────────────────────────────────────────────────────────
const QUESTIONS = [
  { id: "Q1", q: "Horizon d'investissement ?", opts: ["Moins de 2 ans","2 à 5 ans","5 à 10 ans","10 ans et plus"] },
  { id: "Q2", q: "Profil de risque ?", opts: ["Conservateur","Modéré","Dynamique","Agressif"] },
  { id: "Q3", q: "Perte maximale acceptable ?", opts: ["−10% maximum","−20% maximum","−35% maximum","Aucune limite"] },
  { id: "Q4", q: "Filtres ESG ?", opts: ["Aucun filtre","Exclure armement & tabac","ESG strict uniquement"] },
  { id: "Q5", q: "Classes d'actifs souhaitées ?", opts: ["ETF uniquement","ETF + Actions","ETF + Actions + Crypto","Toutes les classes"] },
  { id: "Q6", q: "Zones géographiques prioritaires ?", opts: ["Monde entier","USA dominante","Europe","Marchés émergents"] },
  { id: "Q7", q: "Niveau de diversification ?", opts: ["Concentré (5 actifs)","Équilibré (8–10)","Large (15+ actifs)"] },
];

const CALC_STEPS = [
  "Récupération des données historiques (5 ans)",
  "Construction de la matrice de covariance",
  "Ledoit-Wolf shrinkage",
  "Calcul de la frontière efficiente",
  "Maximisation du ratio de Sharpe",
  "Calcul VaR 95% et CVaR",
  "Génération du rapport final",
];

type OptResult = {
  method: string; label: string; ret: number; vol: number; sharpe: number; var95: number; cvar95: number; mdd: number; rec?: boolean;
  weights: Array<{ symbol: string; name: string; type: string; weight: number; amount: number }>;
  frontier: Array<{ expectedReturn: number; volatility: number }>;
};

// ─── Composant principal ─────────────────────────────────────────────────────
export default function OptimizerPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [capital, setCapital] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [calcPct, setCalcPct] = useState(0);
  const [calcStep, setCalcStep] = useState(0);
  const [results, setResults] = useState<OptResult[]>([]);
  const [selectedMethod, setSelectedMethod] = useState("maxsharpe");
  const [saving, setSaving] = useState(false);

  function answer(opt: string) {
    setFlash(opt);
    setTimeout(() => {
      setAnswers((p) => ({ ...p, [step]: opt }));
      setFlash(null);
      if (step < QUESTIONS.length) setStep((s) => s + 1);
      else startCalc();
    }, 250);
  }

  async function startCalc() {
    setStep(100); // écran calcul
    let pct = 0;
    let si = 0;
    const interval = setInterval(() => {
      pct += 14;
      si = Math.min(Math.floor(pct / 14), CALC_STEPS.length - 1);
      setCalcPct(Math.min(pct, 100));
      setCalcStep(si);
      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(async () => {
          const cap = parseFloat(capital) || 46000;
          const res = await fetch("/api/optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ capital: cap, answers }),
          });
          const data = await res.json();
          setResults(data.results ?? mockResults(cap));
          setStep(200);
        }, 400);
      }
    }, 320);
  }

  async function handleSave() {
    setSaving(true);
    const sel = results.find((r) => r.method === selectedMethod)!;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    const count = await supabase.from("portfolios").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("type", "optimized");
    const n = (count.count ?? 0) + 1;
    const pf = await createPortfolio(user.id, `Portefeuille Zero CGT ${n}`, "optimized");
    await upsertAssets(pf.id, sel.weights.map((w) => ({
      symbol: w.symbol, name: w.name, type: w.type,
      quantity: parseFloat((w.amount / 100).toFixed(4)), // proxy qty
    })));
    router.push("/dashboard/portfolio");
  }

  // ─── Écran 0 : intro ───────────────────────────────────────────────────────
  if (step === 0) return (
    <div className="p-10 flex flex-col justify-center min-h-[500px]">
      <div className="max-w-lg">
        <div className="text-[#8A8A8A] text-[10px] font-bold tracking-[0.16em] mb-4">OPTIMISEUR MARKOWITZ</div>
        <h1 className="text-[#141414] font-black mb-4" style={{ fontSize: 44, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          Créez votre<br />portefeuille optimal.
        </h1>
        <p className="text-[#8A8A8A] text-sm leading-relaxed mb-8">
          En 7 questions, notre algorithme calcule le portefeuille qui maximise votre
          rendement ajusté du risque selon la théorie de Markowitz (1952).
        </p>
        <div className="flex gap-10 mb-10">
          {[["7","Questions"],["3","Méthodes"],["33","Actifs"]].map(([n,l]) => (
            <div key={l}>
              <div className="text-[#141414] font-black text-3xl" style={{ letterSpacing: "-0.02em" }}>{n}</div>
              <div className="text-[#8A8A8A] text-xs mt-1">{l}</div>
            </div>
          ))}
        </div>
        <div className="mb-6">
          <label className="text-[#8A8A8A] text-[10px] font-bold tracking-[0.12em] block mb-2">
            CAPITAL À INVESTIR (€)
          </label>
          <input
            type="number"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
            placeholder="Ex: 50000"
            className="border border-black/10 rounded-xl px-4 py-3 text-sm text-[#141414] outline-none focus:border-black/25 transition-colors w-48"
          />
        </div>
        <button
          onClick={() => setStep(1)}
          style={{ background: "#D5001C" }}
          className="text-white text-xs font-bold tracking-[0.14em] px-12 py-4 hover:opacity-85 transition-opacity"
        >
          CRÉER UN PORTEFEUILLE ZERO CGT →
        </button>
      </div>
    </div>
  );

  // ─── Écrans 1–7 : questions ────────────────────────────────────────────────
  if (step >= 1 && step <= QUESTIONS.length) {
    const q = QUESTIONS[step - 1];
    const progress = (step / QUESTIONS.length) * 100;
    return (
      <div className="p-10 min-h-[500px]">
        <div className="mb-12">
          <div className="flex justify-between mb-2">
            <span className="text-[10px] font-bold text-[#8A8A8A] tracking-[0.14em]">{q.id} / 7</span>
            <span className="text-[10px] text-[#8A8A8A]">{Math.round(progress)}%</span>
          </div>
          <div className="h-0.5 bg-black/6 rounded">
            <div className="h-full bg-[#D5001C] rounded transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="max-w-lg">
          <h2 className="text-[#141414] font-black mb-8" style={{ fontSize: 28, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            {q.q}
          </h2>
          <div className="space-y-3">
            {q.opts.map((opt) => {
              const sel = answers[step] === opt;
              const fl = flash === opt;
              return (
                <button
                  key={opt}
                  onClick={() => answer(opt)}
                  className="w-full text-left flex items-center justify-between rounded-xl px-5 py-4 transition-all border"
                  style={{
                    background: fl ? "#D5001C" : sel ? "#FAFAF8" : "white",
                    borderColor: fl || sel ? "#D5001C" : "rgba(0,0,0,0.08)",
                    color: fl ? "white" : "#141414",
                    fontWeight: sel ? 600 : 400,
                    fontSize: 14,
                  }}
                >
                  {opt}
                  {sel && !fl && <span style={{ color: "#D5001C" }}>✓</span>}
                </button>
              );
            })}
          </div>
          {step > 1 && (
            <button onClick={() => setStep((s) => s - 1)} className="mt-6 text-[#8A8A8A] text-xs hover:text-[#141414] transition-colors">
              ← Précédent
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Écran calcul ──────────────────────────────────────────────────────────
  if (step === 100) return (
    <div className="p-10 flex flex-col justify-center min-h-[500px]">
      <div className="max-w-md">
        <div className="text-[#8A8A8A] text-[10px] font-bold tracking-[0.16em] mb-4">CALCUL EN COURS</div>
        <h2 className="text-[#141414] font-black mb-10" style={{ fontSize: 30, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          Optimisation<br />du portefeuille...
        </h2>
        <div className="space-y-3 mb-8">
          {CALC_STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                style={{ background: calcStep >= i ? "#D5001C" : "rgba(0,0,0,0.08)" }}
              >
                {calcStep >= i && <span className="text-white text-[10px] font-bold">✓</span>}
              </div>
              <span className={`text-sm transition-colors duration-300 ${calcStep >= i ? "text-[#141414]" : "text-[#8A8A8A]"}`}>
                {s}
              </span>
            </div>
          ))}
        </div>
        <div className="h-0.5 bg-black/6 rounded mb-2">
          <div className="h-full bg-[#D5001C] rounded transition-all duration-300" style={{ width: `${calcPct}%` }} />
        </div>
        <div className="text-[#8A8A8A] text-xs">{calcPct}%</div>
      </div>
    </div>
  );

  // ─── Écran résultats ───────────────────────────────────────────────────────
  const selResult = results.find((r) => r.method === selectedMethod) ?? results[0];

  return (
    <div className="p-9 space-y-5">
      <div>
        <div className="text-[#8A8A8A] text-[10px] font-bold tracking-[0.12em] mb-1">PORTEFEUILLE ZERO CGT · RÉSULTATS</div>
        <h1 className="text-[#141414] font-black" style={{ fontSize: 34, letterSpacing: "-0.03em" }}>3 portefeuilles optimaux.</h1>
      </div>

      {/* 3 cards méthodes */}
      <div className="grid grid-cols-3 gap-4">
        {results.map((r) => {
          const sel = r.method === selectedMethod;
          return (
            <div
              key={r.method}
              onClick={() => setSelectedMethod(r.method)}
              className="rounded-2xl p-6 cursor-pointer transition-all relative"
              style={{
                background: sel ? "#141414" : "white",
                border: `2px solid ${sel ? "#141414" : r.rec ? "rgba(213,0,28,0.27)" : "rgba(0,0,0,0.07)"}`,
              }}
            >
              {r.rec && (
                <div className="absolute -top-3 right-4 bg-[#D5001C] text-white text-[8px] font-bold px-3 py-1 tracking-[0.1em]">
                  RECOMMANDÉ
                </div>
              )}
              <div className="text-[9px] font-bold tracking-[0.12em] mb-2" style={{ color: sel ? "rgba(255,255,255,0.3)" : "#8A8A8A" }}>
                {r.method.toUpperCase()}
              </div>
              <div className="text-sm font-bold mb-5" style={{ color: sel ? "white" : "#141414" }}>{r.label}</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Rendement", `+${r.ret.toFixed(1)}%`, r.ret > 0 ? (sel ? "#4ADE80" : "#16A34A") : "#DC2626"],
                  ["Volatilité", `${r.vol.toFixed(1)}%`, sel ? "rgba(255,255,255,0.4)" : "#8A8A8A"],
                  ["Sharpe", r.sharpe.toFixed(2), r.sharpe > 0.7 ? (sel ? "#4ADE80" : "#16A34A") : "#8A8A8A"],
                  ["VaR 95%", `−${r.var95.toFixed(1)}%`, sel ? "#F87171" : "#DC2626"],
                ].map(([label, val, col]) => (
                  <div key={label}>
                    <div className="text-[9px] mb-1" style={{ color: sel ? "rgba(255,255,255,0.25)" : "#8A8A8A" }}>{label}</div>
                    <div className="text-lg font-black" style={{ color: col }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Frontière efficiente */}
      {selResult?.frontier && selResult.frontier.length > 0 && (
        <div className="bg-white rounded-2xl p-6">
          <h3 className="text-sm font-bold text-[#141414] mb-4">Frontière efficiente</h3>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <XAxis dataKey="volatility" name="Volatilité" unit="%" tick={{ fontSize: 10, fill: "#aaa" }} tickLine={false} axisLine={false} />
              <YAxis dataKey="expectedReturn" name="Rendement" unit="%" tick={{ fontSize: 10, fill: "#aaa" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#141414", border: "none", borderRadius: 7, fontSize: 11, color: "white" }}
                formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
              />
              <Scatter data={selResult.frontier} fill="#D5001C" opacity={0.7} />
              <ReferenceLine y={selResult.ret} stroke="#D5001C" strokeDasharray="4 4" strokeOpacity={0.4} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Allocation */}
      {selResult && (
        <div className="bg-white rounded-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-bold text-[#141414]">Allocation recommandée</h3>
            <div className="text-xs text-[#8A8A8A]">Capital : {eur(selResult.weights.reduce((s, w) => s + w.amount, 0))}</div>
          </div>
          <div className="space-y-4">
            {selResult.weights.map((w) => (
              <div key={w.symbol} className="flex items-center gap-4">
                <div className="w-14 text-xs font-bold text-[#141414] flex-shrink-0">{w.symbol}</div>
                <div className="flex-1 h-1.5 bg-black/5 rounded-full">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(w.weight * 100).toFixed(0)}%`, background: TYPE_COLOR[w.type] }} />
                </div>
                <div className="w-8 text-right text-xs text-[#8A8A8A] flex-shrink-0">{(w.weight * 100).toFixed(0)}%</div>
                <div className="w-20 text-right text-xs font-bold text-[#141414] flex-shrink-0">{eur(w.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => { setStep(0); setResults([]); setCalcPct(0); setAnswers({}); }}
          className="px-6 py-3 border border-black/10 rounded-lg text-xs text-[#8A8A8A] hover:text-[#141414] transition-colors"
        >
          Recommencer
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ background: "#D5001C" }}
          className="text-white text-xs font-bold tracking-[0.12em] px-8 py-3 hover:opacity-85 transition-opacity disabled:opacity-50"
        >
          {saving ? "ENREGISTREMENT..." : "ENREGISTRER CE PORTEFEUILLE →"}
        </button>
      </div>
    </div>
  );
}

// ─── Mock résultats (si l'API échoue) ────────────────────────────────────────
function mockResults(capital: number): OptResult[] {
  const alloc = (weights: number[]) => {
    const symbols = [
      { symbol: "CSPX", name: "iShares Core S&P 500", type: "etf" },
      { symbol: "VWCE", name: "Vanguard All-World", type: "etf" },
      { symbol: "EQQQ", name: "Invesco NASDAQ-100", type: "etf" },
      { symbol: "PAEEM", name: "MSCI Emerging Markets", type: "etf" },
      { symbol: "MC", name: "LVMH", type: "stock" },
      { symbol: "BTC", name: "Bitcoin", type: "crypto" },
    ];
    return symbols.map((s, i) => ({ ...s, weight: weights[i], amount: capital * weights[i] }));
  };
  const frontier = Array.from({ length: 40 }, (_, i) => ({
    volatility: parseFloat((8 + i * 0.7).toFixed(1)),
    expectedReturn: parseFloat((4 + Math.sqrt(i) * 2.2).toFixed(1)),
  }));
  return [
    { method: "gmv", label: "Variance Minimale", ret: 8.2, vol: 11.4, sharpe: 0.69, var95: 18.8, cvar95: 23.5, mdd: 17.1,
      weights: alloc([0.35, 0.28, 0.15, 0.12, 0.07, 0.03]), frontier },
    { method: "maxsharpe", label: "Sharpe Maximum", ret: 12.7, vol: 14.2, sharpe: 0.87, var95: 23.4, cvar95: 29.3, mdd: 21.3, rec: true,
      weights: alloc([0.30, 0.22, 0.20, 0.10, 0.12, 0.06]), frontier },
    { method: "utility", label: "Utilité Maximale", ret: 10.4, vol: 12.8, sharpe: 0.76, var95: 21.1, cvar95: 26.4, mdd: 19.2,
      weights: alloc([0.32, 0.25, 0.18, 0.11, 0.09, 0.05]), frontier },
  ];
}
