// app/dashboard/entry/page.tsx
"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, createPortfolio, upsertAssets } from "@/lib/supabase";
import { validateISIN, eur, TYPE_COLOR } from "@/lib/utils";

interface Row {
  id: number;
  symbol: string;
  name: string;
  isin: string;
  type: "etf" | "stock" | "crypto";
  quantity: string;
  price: number | null;
  loading: boolean;
  error: string;
}

let rowId = 1;
const newRow = (): Row => ({
  id: rowId++,
  symbol: "",
  name: "",
  isin: "",
  type: "etf",
  quantity: "",
  price: null,
  loading: false,
  error: "",
});

export default function EntryPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [suggestions, setSuggestions] = useState<Record<number, unknown[]>>({});
  const [saving, setSaving] = useState(false);
  const [debounceTimers, setDebounceTimers] = useState<Record<number, ReturnType<typeof setTimeout>>>({});

  const update = (id: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const fetchPrice = useCallback(async (rowId: number, symbol: string) => {
    if (!symbol) return;
    update(rowId, { loading: true, error: "" });
    try {
      const res = await fetch(`/api/yahoo/quote?symbol=${encodeURIComponent(symbol)}`);
      const data = await res.json();
      if (data.price) {
        update(rowId, { price: data.price, loading: false });
      } else {
        update(rowId, { loading: false, error: "Symbole introuvable" });
      }
    } catch {
      update(rowId, { loading: false, error: "Erreur réseau" });
    }
  }, []);

  const onSearchInput = (id: number, query: string) => {
    update(id, { isin: query, symbol: "", name: "", price: null });
    clearTimeout(debounceTimers[id]);
    if (query.length < 2) { setSuggestions((s) => ({ ...s, [id]: [] })); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/yahoo/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions((s) => ({ ...s, [id]: data.results ?? [] }));
    }, 400);
    setDebounceTimers((prev) => ({ ...prev, [id]: t }));
  };

  const selectSuggestion = (id: number, s: { symbol: string; name: string; type: "etf" | "stock" | "crypto" }) => {
    update(id, { symbol: s.symbol, name: s.name, type: s.type, isin: s.symbol });
    setSuggestions((prev) => ({ ...prev, [id]: [] }));
    fetchPrice(id, s.symbol);
  };

  const addRow = () => setRows((r) => [...r, newRow()]);
  const removeRow = (id: number) => setRows((r) => r.filter((x) => x.id !== id));

  const total = rows.reduce((s, r) => {
    const qty = parseFloat(r.quantity) || 0;
    return s + (r.price ? qty * r.price : 0);
  }, 0);

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    try {
      const pf = await createPortfolio(user.id, "Portefeuille de départ", "manual");
      const assets = rows
        .filter((r) => r.symbol && parseFloat(r.quantity) > 0)
        .map((r) => ({
          symbol: r.symbol,
          name: r.name || r.symbol,
          isin: validateISIN(r.isin) ? r.isin : undefined,
          type: r.type,
          quantity: parseFloat(r.quantity),
        }));
      await upsertAssets(pf.id, assets);
      router.push("/dashboard/portfolio");
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  }

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <div className="text-[#8A8A8A] text-[10px] font-bold tracking-[0.15em] mb-2">
        ÉTAPE 1 — SAISIE DU PORTEFEUILLE
      </div>
      <h1 className="text-[#141414] text-4xl font-black mb-2" style={{ letterSpacing: "-0.03em" }}>
        Votre portefeuille actuel
      </h1>
      <p className="text-[#8A8A8A] text-sm mb-8">
        Recherchez un actif par nom, symbole ou ISIN. Le montant est calculé automatiquement.
      </p>

      <div className="bg-white rounded-2xl p-6 mb-6">
        {/* En-têtes */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_32px] gap-3 pb-3 mb-4 border-b border-black/5">
          {["ACTIF", "TYPE", "QUANTITÉ", "VALEUR (€)", ""].map((h) => (
            <div key={h} className="text-[#8A8A8A] text-[9px] font-bold tracking-[0.1em]">{h}</div>
          ))}
        </div>

        {/* Lignes */}
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_32px] gap-3 items-center mb-4 relative">
            {/* Recherche actif */}
            <div className="relative">
              <input
                value={row.isin}
                onChange={(e) => onSearchInput(row.id, e.target.value)}
                placeholder="Ex: CSPX, BTC-EUR, FR0000131104..."
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm text-[#141414] bg-[#FAFAF8] outline-none focus:border-black/25 transition-colors"
              />
              {row.name && (
                <div className="text-[10px] text-[#8A8A8A] mt-1 truncate">{row.name}</div>
              )}
              {row.error && (
                <div className="text-[10px] text-red-500 mt-1">{row.error}</div>
              )}
              {/* Suggestions */}
              {(suggestions[row.id] as unknown[])?.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black/10 rounded-lg shadow-lg z-50 overflow-hidden">
                  {(suggestions[row.id] as { symbol: string; name: string; type: "etf" | "stock" | "crypto"; exchange: string }[]).map((s) => (
                    <button
                      key={s.symbol}
                      onClick={() => selectSuggestion(row.id, s)}
                      className="w-full text-left px-3 py-2.5 hover:bg-black/3 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-[#141414]">{s.symbol}</span>
                        <span className="text-[11px] text-[#8A8A8A] ml-2">{s.name}</span>
                      </div>
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded"
                        style={{
                          background: TYPE_COLOR[s.type] + "18",
                          color: TYPE_COLOR[s.type],
                        }}
                      >
                        {s.type.toUpperCase()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Type badge */}
            <div>
              <span
                className="text-[9px] font-bold px-2 py-1 rounded"
                style={{
                  background: TYPE_COLOR[row.type] + "18",
                  color: TYPE_COLOR[row.type],
                }}
              >
                {row.type.toUpperCase()}
              </span>
            </div>

            {/* Quantité */}
            <input
              type="number"
              value={row.quantity}
              onChange={(e) => update(row.id, { quantity: e.target.value })}
              placeholder="0"
              min="0"
              step="any"
              className="border border-black/10 rounded-lg px-3 py-2 text-sm text-[#141414] bg-[#FAFAF8] outline-none focus:border-black/25 transition-colors"
            />

            {/* Valeur calculée */}
            <div className="text-sm font-bold text-[#141414] text-right">
              {row.loading ? (
                <span className="text-[#8A8A8A] text-xs">...</span>
              ) : row.price && parseFloat(row.quantity) > 0 ? (
                eur(parseFloat(row.quantity) * row.price)
              ) : (
                <span className="text-[#8A8A8A]">—</span>
              )}
            </div>

            {/* Supprimer */}
            <button
              onClick={() => removeRow(row.id)}
              className="text-[#ccc] hover:text-[#999] text-lg leading-none transition-colors"
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={addRow}
          className="w-full mt-2 border border-dashed border-black/12 rounded-xl py-3 text-[#8A8A8A] text-xs hover:text-[#666] hover:border-black/20 transition-colors"
        >
          + Ajouter un actif
        </button>
      </div>

      {/* Footer total + save */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[#8A8A8A] text-xs mb-1">Total portefeuille</div>
          <div className="text-[#141414] text-4xl font-black" style={{ letterSpacing: "-0.03em" }}>
            {eur(total)}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || total === 0}
          style={{ background: "#D5001C" }}
          className="text-white text-xs font-bold tracking-[0.14em] px-10 py-4 hover:opacity-85 transition-opacity disabled:opacity-40"
        >
          {saving ? "ENREGISTREMENT..." : "ENREGISTRER →"}
        </button>
      </div>
    </div>
  );
}
