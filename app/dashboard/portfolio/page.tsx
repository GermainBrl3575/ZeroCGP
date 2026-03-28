// app/dashboard/portfolio/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Asset } from "@/types";
import { eur, pct, TYPE_COLOR, cn } from "@/lib/utils";
import Treemap from "@/components/Treemap";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
} from "recharts";

const PERIODS = ["1J", "1S", "1M", "3M", "6M", "1A", "MAX"];
const TYPE_BADGE: Record<string, string> = {
  etf:    "bg-blue-50 text-blue-700",
  stock:  "bg-green-50 text-green-700",
  crypto: "bg-amber-50 text-amber-700",
};

export default function PortfolioPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [period, setPeriod] = useState("1M");
  const [loading, setLoading] = useState(true);
  const [perfData, setPerfData] = useState<{ j: string; v: number }[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: portfolios } = await supabase
        .from("portfolios")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .order("created_at", { ascending: false });

      if (!portfolios || portfolios.length === 0) {
        router.push("/dashboard/entry");
        return;
      }

      const pfId = portfolios[0].id;
      const { data: rawAssets } = await supabase
        .from("portfolio_assets")
        .select("*")
        .eq("portfolio_id", pfId);

      if (!rawAssets || rawAssets.length === 0) {
        setLoading(false);
        return;
      }

      // Récupérer les prix temps réel
      const enriched: Asset[] = await Promise.all(
        rawAssets.map(async (a) => {
          try {
            const res = await fetch(`/api/yahoo/quote?symbol=${a.symbol}`);
            const q = await res.json();
            return {
              id: a.id,
              symbol: a.symbol,
              name: a.name,
              isin: a.isin,
              type: a.type as "etf" | "stock" | "crypto",
              quantity: a.quantity,
              currentPrice: q.price ?? 0,
              value: a.quantity * (q.price ?? 0),
              weight: 0,
              performance24h: q.changePercent ?? 0,
            };
          } catch {
            return {
              id: a.id, symbol: a.symbol, name: a.name, isin: a.isin,
              type: a.type as "etf" | "stock" | "crypto",
              quantity: a.quantity, currentPrice: 0, value: 0, weight: 0,
            };
          }
        })
      );

      const tot = enriched.reduce((s, a) => s + a.value, 0);
      const final = enriched.map((a) => ({ ...a, weight: tot > 0 ? a.value / tot : 0 }));
      setAssets(final);

      // Générer un graphique de démo (en prod : fetch historique réel)
      const demo = Array.from({ length: 30 }, (_, i) => ({
        j: `J-${29 - i}`,
        v: Math.round(tot * 0.9 + i * (tot * 0.003) + Math.sin(i * 0.7) * tot * 0.015),
      }));
      setPerfData(demo);
      setLoading(false);
    }
    load();
  }, [router]);

  const total = assets.reduce((s, a) => s + a.value, 0);
  const gain = assets.reduce((s, a) => s + a.value * (a.performance24h ?? 0) / 100, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-[#8A8A8A] text-xs tracking-[0.2em]">CHARGEMENT...</div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <p className="text-[#8A8A8A]">Aucun actif dans ce portefeuille.</p>
        <button
          onClick={() => router.push("/dashboard/entry")}
          style={{ background: "#D5001C" }}
          className="text-white text-xs font-bold tracking-[0.14em] px-8 py-3"
        >
          AJOUTER DES ACTIFS →
        </button>
      </div>
    );
  }

  return (
    <div className="p-9 space-y-5">
      {/* Header */}
      <div>
        <div className="text-[#8A8A8A] text-[10px] font-bold tracking-[0.12em] mb-2">
          PORTEFEUILLE DE DÉPART
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <div className="text-[#141414] font-black leading-none" style={{ fontSize: 40, letterSpacing: "-0.03em" }}>
              {eur(total)}
            </div>
            <div className={cn("text-sm font-medium mt-1.5", gain >= 0 ? "text-green-600" : "text-red-600")}>
              {pct(total > 0 ? gain / total * 100 : 0)} · {gain >= 0 ? "+" : ""}{eur(gain)} aujourd'hui
            </div>
          </div>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-semibold border rounded-md transition-colors",
                  period === p
                    ? "bg-[#141414] text-white border-[#141414]"
                    : "bg-transparent text-[#8A8A8A] border-black/10 hover:border-black/20"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Treemap */}
      <div className="bg-white rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-[#141414]">Répartition</h2>
          <div className="flex gap-4">
            {[["etf","ETF"],["stock","Action"],["crypto","Crypto"]].map(([t,l]) => (
              <div key={t} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ background: TYPE_COLOR[t] }} />
                <span className="text-[11px] text-[#8A8A8A]">{l}</span>
              </div>
            ))}
          </div>
        </div>
        <Treemap assets={assets} />
      </div>

      {/* Graphique perf */}
      <div className="bg-white rounded-2xl p-6">
        <h2 className="text-sm font-bold text-[#141414] mb-4">Performance 30 jours</h2>
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={perfData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="j" tick={{ fontSize: 9, fill: "#aaa" }} tickLine={false} axisLine={false} interval={9} />
            <YAxis tick={{ fontSize: 9, fill: "#aaa" }} tickLine={false} axisLine={false} tickFormatter={(v) => eur(v)} width={74} />
            <Tooltip
              contentStyle={{ background: "#141414", border: "none", borderRadius: 7, fontSize: 11, color: "white" }}
              formatter={(v: number) => [eur(v), "Valeur"]}
            />
            <Line type="monotone" dataKey="v" stroke="#D5001C" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table actifs */}
      <div className="bg-white rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-[#141414]">Actifs</h2>
          <button
            onClick={() => router.push("/dashboard/entry")}
            className="text-[10px] text-[#8A8A8A] hover:text-[#141414] transition-colors"
          >
            ⚙ Gérer
          </button>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-black/[0.06]">
              {["ACTIF","TYPE","QTÉ","PRIX","VALEUR","POIDS","24H"].map((h) => (
                <th key={h} className="pb-2 px-2 text-[9px] font-bold text-[#8A8A8A] tracking-[0.09em] text-right first:text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...assets].sort((a, b) => b.value - a.value).map((a, i) => (
              <tr key={a.id} className={cn("transition-colors hover:bg-black/[0.01]", i < assets.length - 1 ? "border-b border-black/[0.04]" : "")}>
                <td className="py-3 px-2">
                  <div className="font-bold text-[13px] text-[#141414]">{a.symbol}</div>
                  <div className="text-[10px] text-[#8A8A8A] mt-0.5 max-w-[160px] truncate">{a.name}</div>
                </td>
                <td className="py-3 px-2 text-right">
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", TYPE_BADGE[a.type])}>
                    {a.type.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-2 text-right text-xs text-[#141414]">{a.quantity}</td>
                <td className="py-3 px-2 text-right text-xs text-[#8A8A8A]">
                  {a.currentPrice > 0 ? eur(a.currentPrice) : "—"}
                </td>
                <td className="py-3 px-2 text-right text-sm font-bold text-[#141414]">{eur(a.value)}</td>
                <td className="py-3 px-2 text-right text-xs text-[#8A8A8A]">{(a.weight * 100).toFixed(1)}%</td>
                <td className={cn("py-3 px-2 text-right text-xs font-semibold",
                  (a.performance24h ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {pct(a.performance24h ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
