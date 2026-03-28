"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { eur, TYPE_COLOR } from "@/lib/utils";

interface Row {
  id: number; symbol: string; name: string; isin: string;
  type: "etf"|"stock"|"crypto"; quantity: string; price: number|null;
  loading: boolean; error: string;
}

let rowId = 1;
const newRow = (): Row => ({ id: rowId++, symbol:"", name:"", isin:"", type:"etf", quantity:"", price:null, loading:false, error:"" });

const TYPE_LABEL: Record<string, string> = { etf:"ETF", stock:"STOCK", crypto:"CRYPTO" };
const TYPE_COLORS: Record<string, {bg:string,tx:string}> = {
  etf:   { bg:"#EFF6FF", tx:"#1D4ED8" },
  stock: { bg:"#F0FDF4", tx:"#15803D" },
  crypto:{ bg:"#FFFBEB", tx:"#92400E" },
};

export default function EntryPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([newRow(), newRow()]);
  const [suggestions, setSuggestions] = useState<Record<number, {symbol:string;name:string;type:"etf"|"stock"|"crypto"}[]>>({});
  const [saving, setSaving] = useState(false);
  const [pfName, setPfName] = useState("Mon Portefeuille");
  const [nameError, setNameError] = useState("");
  const [timers, setTimers] = useState<Record<number, ReturnType<typeof setTimeout>>>({});

  const update = (id: number, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const fetchPrice = useCallback(async (rowId: number, symbol: string) => {
    if (!symbol) return;
    update(rowId, { loading: true, error: "" });
    try {
      const res = await fetch(`/api/yahoo/quote?symbol=${encodeURIComponent(symbol)}`);
      const data = await res.json();
      if (data.price) update(rowId, { price: data.price, loading: false });
      else update(rowId, { loading: false, error: "Symbole introuvable" });
    } catch { update(rowId, { loading: false, error: "Erreur réseau" }); }
  }, []);

  const onSearchInput = (id: number, query: string) => {
    update(id, { isin: query, symbol: "", name: "", price: null });
    clearTimeout(timers[id]);
    if (query.length < 2) { setSuggestions(s => ({ ...s, [id]: [] })); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/yahoo/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(s => ({ ...s, [id]: data.results ?? [] }));
    }, 400);
    setTimers(prev => ({ ...prev, [id]: t }));
  };

  const selectSuggestion = (id: number, s: {symbol:string;name:string;type:"etf"|"stock"|"crypto"}) => {
    update(id, { symbol: s.symbol, name: s.name, type: s.type, isin: s.symbol });
    setSuggestions(prev => ({ ...prev, [id]: [] }));
    fetchPrice(id, s.symbol);
  };

  const addRow = () => setRows(r => [...r, newRow()]);
  const removeRow = (id: number) => setRows(r => r.filter(x => x.id !== id));

  const total = rows.reduce((s, r) => {
    const qty = parseFloat(r.quantity) || 0;
    return s + (r.price ? qty * r.price : 0);
  }, 0);

  async function handleSave() {
    setNameError("");
    if (!pfName.trim()) { setNameError("Le nom du portefeuille est obligatoire."); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    // Vérifier doublon de nom
    const { data: existing } = await supabase
      .from("portfolios").select("id").eq("user_id", user.id).eq("name", pfName.trim());
    if (existing && existing.length > 0) {
      setNameError(`Un portefeuille nommé "${pfName.trim()}" existe déjà. Choisissez un autre nom.`);
      setSaving(false); return;
    }

    try {
      const { data: pf } = await supabase.from("portfolios")
        .insert({ user_id: user.id, name: pfName.trim(), type: "manual" })
        .select().single();
      if (!pf) throw new Error("Erreur création portefeuille");

      const assets = rows
        .filter(r => r.symbol && parseFloat(r.quantity) > 0)
        .map(r => ({
          symbol: r.symbol, name: r.name || r.symbol,
          isin: r.isin.length === 12 ? r.isin : null,
          type: r.type, quantity: parseFloat(r.quantity),
          portfolio_id: pf.id,
        }));
      if (assets.length > 0) await supabase.from("portfolio_assets").insert(assets);
      router.push("/dashboard/portfolio");
    } catch (e) { console.error(e); setSaving(false); }
  }

  const COL = "grid-template-columns: 2fr 100px 130px 140px 52px";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400&family=Inter:wght@300;400;500&display=swap');
        .ep{padding:40px 48px;background:#F5F4F1;min-height:100%;font-family:'Inter',sans-serif}
        .ep-ey{font-size:9px;font-weight:500;letter-spacing:.18em;color:#1E3A6E;margin-bottom:12px}
        .ep-h1{font-family:'Cormorant Garant',serif;font-size:40px;font-weight:300;color:#0A1628;letter-spacing:-.02em;margin-bottom:8px}
        .ep-sub{font-size:13px;font-weight:300;color:#8A9BB0;margin-bottom:28px;line-height:1.6}
        .name-wrap{margin-bottom:24px}
        .name-label{font-size:9px;font-weight:500;letter-spacing:.16em;color:#8A9BB0;display:block;margin-bottom:8px}
        .name-input{background:white;border:1px solid rgba(10,22,40,.12);padding:10px 14px;font-size:14px;color:#0A1628;outline:none;transition:border-color 0.2s;font-family:'Inter',sans-serif;width:320px;border-radius:6px}
        .name-input:focus{border-color:#0A1628}
        .name-error{font-size:11px;color:#C0392B;margin-top:6px}
        .table-wrap{background:white;border-radius:14px;overflow:hidden;margin-bottom:24px}
        .table-head{display:grid;${COL};gap:0;padding:12px 20px;border-bottom:1px solid rgba(10,22,40,.06);background:#FAFAF9}
        .table-head-cell{font-size:9px;font-weight:500;letter-spacing:.12em;color:#8A9BB0}
        .table-row{display:grid;${COL};gap:0;padding:12px 20px;border-bottom:1px solid rgba(10,22,40,.04);align-items:center;position:relative}
        .table-row:last-child{border-bottom:none}
        .field-search{width:100%;border:1px solid rgba(10,22,40,.1);border-radius:7px;padding:9px 12px;font-size:13px;color:#0A1628;background:#FAFAF8;outline:none;transition:border-color 0.2s;font-family:'Inter',sans-serif}
        .field-search:focus{border-color:#0A1628}
        .field-qty{width:100%;border:1px solid rgba(10,22,40,.1);border-radius:7px;padding:9px 12px;font-size:13px;color:#0A1628;background:#FAFAF8;outline:none;transition:border-color 0.2s;font-family:'Inter',sans-serif}
        .field-qty:focus{border-color:#0A1628}
        .suggestions{position:absolute;top:100%;left:20px;width:calc(2fr);min-width:280px;max-width:380px;background:white;border:1px solid rgba(10,22,40,.1);border-radius:8px;box-shadow:0 8px 24px rgba(10,22,40,.08);z-index:50;overflow:hidden;margin-top:2px}
        .sug-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;transition:background 0.1s}
        .sug-item:hover{background:rgba(10,22,40,.03)}
        .sug-sym{font-size:12px;font-weight:600;color:#0A1628}
        .sug-name{font-size:11px;color:#8A9BB0;margin-left:8px}
        .sug-badge{font-size:9px;font-weight:700;padding:2px 7px;border-radius:3px}
        .add-btn{width:100%;padding:14px;text-align:center;font-size:12px;color:#8A9BB0;cursor:pointer;border-top:1px dashed rgba(10,22,40,.08);transition:all 0.2s;background:none;border-left:none;border-right:none;border-bottom:none;font-family:'Inter',sans-serif}
        .add-btn:hover{color:#0A1628;background:rgba(10,22,40,.02)}
        .del-btn{background:none;border:none;color:#ccc;cursor:pointer;font-size:16px;line-height:1;transition:color 0.15s;padding:4px}
        .del-btn:hover{color:#999}
        .footer{display:flex;justify-content:space-between;align-items:flex-end}
        .total-label{font-size:11px;color:#8A9BB0;margin-bottom:6px}
        .total-val{font-family:'Cormorant Garant',serif;font-size:42px;font-weight:300;color:#0A1628;letter-spacing:-.02em;line-height:1}
        .save-btn{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.16em;background:#0A1628;color:white;border:none;padding:16px 40px;cursor:pointer;transition:opacity 0.2s}
        .save-btn:hover{opacity:.82}
        .save-btn:disabled{opacity:.4;cursor:not-allowed}
        .val-cell{font-size:13px;font-weight:600;color:#0A1628;padding-right:8px}
        .loading-dot{color:#8A9BB0;font-size:12px}
        .err-text{font-size:10px;color:#C0392B;margin-top:3px}
      `}</style>

      <div className="ep">
        <div className="ep-ey">ÉTAPE 1 — SAISIE DU PORTEFEUILLE</div>
        <h1 className="ep-h1">Votre portefeuille actuel</h1>
        <p className="ep-sub">Recherchez un actif par nom, symbole ou ISIN. Le montant est calculé automatiquement.</p>

        {/* Nom du portefeuille */}
        <div className="name-wrap">
          <label className="name-label">NOM DU PORTEFEUILLE</label>
          <input
            type="text" value={pfName}
            onChange={e => { setPfName(e.target.value); setNameError(""); }}
            className="name-input" placeholder="Mon Portefeuille"
          />
          {nameError && <div className="name-error">{nameError}</div>}
        </div>

        <div className="table-wrap">
          {/* En-têtes alignées sur la même grille */}
          <div className="table-head">
            <div className="table-head-cell">ACTIF</div>
            <div className="table-head-cell">TYPE</div>
            <div className="table-head-cell">QUANTITÉ</div>
            <div className="table-head-cell">VALEUR (€)</div>
            <div />
          </div>

          {/* Lignes */}
          {rows.map(row => (
            <div key={row.id} className="table-row">
              {/* Actif */}
              <div style={{position:"relative"}}>
                <input
                  value={row.isin} onChange={e => onSearchInput(row.id, e.target.value)}
                  placeholder="Ex: CSPX, AAPL, FR0000131104..."
                  className="field-search"
                />
                {row.name && <div style={{fontSize:10,color:"#8A9BB0",marginTop:3,paddingLeft:2}}>{row.name}</div>}
                {row.error && <div className="err-text">{row.error}</div>}
                {(suggestions[row.id]?.length ?? 0) > 0 && (
                  <div className="suggestions">
                    {suggestions[row.id].map(s => (
                      <div key={s.symbol} className="sug-item" onClick={() => selectSuggestion(row.id, s)}>
                        <div>
                          <span className="sug-sym">{s.symbol}</span>
                          <span className="sug-name">{s.name}</span>
                        </div>
                        <span className="sug-badge" style={{background:TYPE_COLORS[s.type].bg,color:TYPE_COLORS[s.type].tx}}>
                          {TYPE_LABEL[s.type]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <span className="sug-badge" style={{
                  background:TYPE_COLORS[row.type].bg,
                  color:TYPE_COLORS[row.type].tx,
                }}>
                  {TYPE_LABEL[row.type]}
                </span>
              </div>

              {/* Quantité */}
              <input
                type="number" value={row.quantity}
                onChange={e => update(row.id, { quantity: e.target.value })}
                placeholder="0" min="0" step="any"
                className="field-qty"
              />

              {/* Valeur */}
              <div className="val-cell">
                {row.loading
                  ? <span className="loading-dot">...</span>
                  : row.price && parseFloat(row.quantity) > 0
                    ? eur(parseFloat(row.quantity) * row.price)
                    : <span style={{color:"#ccc"}}>—</span>
                }
              </div>

              {/* Supprimer */}
              <button className="del-btn" onClick={() => removeRow(row.id)}>×</button>
            </div>
          ))}

          <button className="add-btn" onClick={addRow}>+ Ajouter un actif</button>
        </div>

        <div className="footer">
          <div>
            <div className="total-label">Total portefeuille</div>
            <div className="total-val">{eur(total)}</div>
          </div>
          <button onClick={handleSave} disabled={saving || total === 0} className="save-btn">
            {saving ? "ENREGISTREMENT..." : "ENREGISTRER →"}
          </button>
        </div>
      </div>
    </>
  );
}
