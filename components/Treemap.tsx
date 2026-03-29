"use client";
import { useState } from "react";
import { Asset } from "@/types";

const PERF_DB: Record<string, Record<string, number>> = {
  "URTH":  {"1D":0.42,"1M":1.8,"3M":4.2,"6M":8.1,"1Y":18.5,"5Y":95.0,"10Y":232.0},
  "AAPL":  {"1D":0.85,"1M":3.1,"3M":8.4,"6M":14.2,"1Y":26.0,"5Y":198.0,"10Y":832.0},
  "MSFT":  {"1D":0.62,"1M":2.2,"3M":6.8,"6M":11.0,"1Y":18.0,"5Y":182.0,"10Y":742.0},
  "NVDA":  {"1D":2.14,"1M":8.4,"3M":22.0,"6M":48.0,"1Y":120.0,"5Y":1420.0,"10Y":8200.0},
  "AMZN":  {"1D":0.31,"1M":1.8,"3M":5.2,"6M":9.8,"1Y":22.0,"5Y":84.0,"10Y":1240.0},
  "GOOGL": {"1D":-0.28,"1M":1.2,"3M":3.8,"6M":7.4,"1Y":14.0,"5Y":92.0,"10Y":420.0},
  "META":  {"1D":1.02,"1M":4.8,"3M":12.0,"6M":24.0,"1Y":52.0,"5Y":180.0,"10Y":580.0},
  "TSLA":  {"1D":-1.8,"1M":-8.4,"3M":-18.0,"6M":-22.0,"1Y":12.0,"5Y":420.0,"10Y":1480.0},
  "IWDA":  {"1D":0.38,"1M":1.6,"3M":4.0,"6M":7.8,"1Y":17.2,"5Y":95.0,"10Y":232.0},
  "VWCE":  {"1D":0.35,"1M":1.5,"3M":3.8,"6M":7.4,"1Y":15.2,"5Y":82.0,"10Y":198.0},
  "CSPX":  {"1D":0.44,"1M":1.8,"3M":4.2,"6M":8.0,"1Y":18.5,"5Y":98.0,"10Y":241.0},
  "EQQQ":  {"1D":0.78,"1M":2.4,"3M":5.1,"6M":10.2,"1Y":22.3,"5Y":132.0,"10Y":389.0},
  "PAEEM": {"1D":-0.22,"1M":-0.8,"3M":2.1,"6M":4.2,"1Y":8.4,"5Y":21.0,"10Y":52.0},
  "MC":    {"1D":-0.54,"1M":-2.1,"3M":-8.4,"6M":-10.2,"1Y":-12.0,"5Y":68.0,"10Y":285.0},
  "AIR":   {"1D":0.18,"1M":0.6,"3M":3.2,"6M":5.8,"1Y":4.8,"5Y":38.0,"10Y":142.0},
  "ASML":  {"1D":-0.92,"1M":-3.2,"3M":-12.0,"6M":-8.0,"1Y":5.0,"5Y":178.0,"10Y":1820.0},
  "NOVO":  {"1D":-1.24,"1M":-4.1,"3M":-18.0,"6M":-24.0,"1Y":12.0,"5Y":288.0,"10Y":980.0},
  "BTC":   {"1D":2.8,"1M":8.2,"3M":28.0,"6M":42.0,"1Y":62.0,"5Y":890.0,"10Y":18400.0},
  "ETH":   {"1D":1.4,"1M":4.1,"3M":12.0,"6M":18.0,"1Y":28.0,"5Y":420.0,"10Y":6800.0},
  "EEM":   {"1D":-0.18,"1M":-0.6,"3M":1.8,"6M":3.6,"1Y":7.2,"5Y":18.0,"10Y":44.0},
};

const PERIODS = ["1D","1M","3M","6M","1Y","5Y","10Y"] as const;
type Period = typeof PERIODS[number];

// Seuils de couleur selon la période — plus prononcé autour de 0
const THRESHOLDS: Record<Period, number> = {
  "1D": 1.5, "1M": 5, "3M": 10, "6M": 15, "1Y": 25, "5Y": 80, "10Y": 200,
};

function getPerf(symbol: string, period: Period): number {
  const base = symbol.split(".")[0].split("-")[0].toUpperCase();
  if (PERF_DB[base]?.[period] !== undefined) return PERF_DB[base][period];
  // Fallback déterministe basé sur le nom
  const seed = symbol.charCodeAt(0) + symbol.charCodeAt(symbol.length - 1);
  return ((seed % 31) - 15) * 0.15;
}

// Courbe de saturation exponentielle — forte couleur même à faible %, gris neutre à 0
function perfColor(pct: number, period: Period): string {
  const cap = THRESHOLDS[period];
  // Saturation exponentielle : 0.3% en 1D donne déjà 20% d'intensité
  const raw = Math.abs(pct) / cap;
  const intensity = Math.min(1, Math.pow(raw, 0.5)); // racine carrée = saturation rapide

  if (Math.abs(pct) < 0.01) return "rgb(230,230,228)"; // neutre strict

  if (pct > 0) {
    // Gris clair → Vert vif (Finviz style)
    const r = Math.round(230 - intensity * (230 - 0));
    const g = Math.round(230 - intensity * (230 - 160));
    const b = Math.round(228 - intensity * (228 - 60));
    return `rgb(${r},${g},${b})`;
  } else {
    // Gris clair → Rouge vif
    const r = Math.round(230 - intensity * (230 - 190));
    const g = Math.round(230 - intensity * (230 - 30));
    const b = Math.round(228 - intensity * (228 - 30));
    return `rgb(${r},${g},${b})`;
  }
}

function textColor(pct: number, period: Period): string {
  const cap = THRESHOLDS[period];
  const intensity = Math.min(1, Math.pow(Math.abs(pct) / cap, 0.5));
  return intensity > 0.25 ? "white" : "#2D3748";
}

interface Cell {
  asset: Asset;
  colSpan: number;
  rowSpan: number;
  col: number;
  row: number;
}

function buildGrid(assets: Asset[], tot: number): Cell[] {
  const sorted = [...assets].sort((a, b) => b.value - a.value);
  const COLS = 5, ROWS = 5;
  const grid: boolean[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const cells: Cell[] = [];

  function isFree(r: number, c: number, rs: number, cs: number) {
    if (r + rs > ROWS || c + cs > COLS) return false;
    for (let ri = r; ri < r + rs; ri++)
      for (let ci = c; ci < c + cs; ci++)
        if (grid[ri][ci]) return false;
    return true;
  }
  function occupy(r: number, c: number, rs: number, cs: number) {
    for (let ri = r; ri < r + rs; ri++)
      for (let ci = c; ci < c + cs; ci++)
        grid[ri][ci] = true;
  }
  function findSlot(rs: number, cs: number): [number, number] | null {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (isFree(r, c, rs, cs)) return [r, c];
    return null;
  }

  for (const asset of sorted) {
    const w = asset.value / tot;
    let rs = 1, cs = 1;
    if      (w >= 0.35) { rs = 3; cs = 3; }
    else if (w >= 0.20) { rs = 2; cs = 3; }
    else if (w >= 0.12) { rs = 2; cs = 2; }
    else if (w >= 0.06) { rs = 1; cs = 2; }

    let slot: [number, number] | null = null;
    let tries = 0;
    while (!slot && tries < 5) {
      slot = findSlot(rs, cs);
      if (!slot) { if (cs > rs && cs > 1) cs--; else if (rs > 1) rs--; else break; }
      tries++;
    }
    if (!slot) slot = findSlot(1, 1);
    if (!slot) continue;
    occupy(slot[0], slot[1], rs, cs);
    cells.push({ asset, colSpan: cs, rowSpan: rs, col: slot[1], row: slot[0] });
  }
  return cells;
}

// Taille de police en fonction de la surface de la case (colSpan × rowSpan × hauteur)
const CELL_H = 58; // hauteur d'une rangée en px
function fontSizes(cs: number, rs: number): { sym: number; pct: number; sub: number; showSub: boolean } {
  const surface = cs * rs; // nombre de cases occupées
  if (surface >= 9) return { sym: 13, pct: 26, sub: 12, showSub: true };
  if (surface >= 6) return { sym: 11, pct: 20, sub: 10, showSub: true };
  if (surface >= 4) return { sym: 10, pct: 16, sub: 9,  showSub: true };
  if (surface >= 2) return { sym: 9,  pct: 13, sub: 0,  showSub: false };
  return               { sym: 8,  pct: 10, sub: 0,  showSub: false };
}

export default function Treemap({ assets }: { assets: Asset[] }) {
  const [period, setPeriod] = useState<Period>("1D");
  if (!assets.length) return null;

  const tot   = assets.reduce((s, a) => s + a.value, 0);
  const cells = buildGrid(assets, tot);

  return (
    <div>
      {/* Boutons période */}
      <div style={{ display:"flex", gap:4, marginBottom:14 }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: "5px 11px",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: ".06em",
            borderRadius: 5,
            border: "1px solid",
            cursor: "pointer",
            fontFamily: "'Inter',sans-serif",
            transition: "all 0.12s",
            background:   period === p ? "#0A1628" : "transparent",
            color:        period === p ? "white"   : "#8A9BB0",
            borderColor:  period === p ? "#0A1628" : "rgba(10,22,40,.1)",
          }}>
            {p}
          </button>
        ))}
      </div>

      {/* Légende gradient */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <div style={{ display:"flex", borderRadius:4, overflow:"hidden", height:10 }}>
          {[-1,-0.6,-0.25,0,0.25,0.6,1].map((v, i) => {
            const pct = v * THRESHOLDS[period];
            return <div key={i} style={{ width:22, background:perfColor(pct, period) }}/>;
          })}
        </div>
        <span style={{ fontSize:9, color:"#9CA3AF", letterSpacing:".04em" }}>
          Négatif → Neutre → Positif
        </span>
      </div>

      {/* Grille 5×5 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gridTemplateRows:    `repeat(5, ${CELL_H}px)`,
        gap: 3,
        borderRadius: 10,
        overflow: "hidden",
      }}>
        {cells.map(cell => {
          const pct  = getPerf(cell.asset.symbol, period);
          const bg   = perfColor(pct, period);
          const txt  = textColor(pct, period);
          const fs   = fontSizes(cell.colSpan, cell.rowSpan);
          const pad  = cell.colSpan * cell.rowSpan >= 4 ? "12px 14px" : "6px 8px";

          return (
            <div
              key={cell.asset.id}
              style={{
                gridColumn: `span ${cell.colSpan}`,
                gridRow:    `span ${cell.rowSpan}`,
                background: bg,
                padding:    pad,
                display:    "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflow:   "hidden",
                borderRadius: 4,
                cursor: "default",
                transition: "filter 0.12s",
              }}
              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.88)")}
              onMouseLeave={e => (e.currentTarget.style.filter = "none")}
            >
              {/* Symbole */}
              <div style={{
                fontSize:      fs.sym,
                fontWeight:    700,
                color:         txt,
                opacity:       0.82,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                whiteSpace:    "nowrap",
                overflow:      "hidden",
                textOverflow:  "ellipsis",
                lineHeight:    1.2,
              }}>
                {cell.asset.symbol.split(".")[0].split("-")[0]}
              </div>

              {/* Performance */}
              <div>
                <div style={{
                  fontSize:   fs.pct,
                  fontWeight: 800,
                  color:      txt,
                  lineHeight: 1,
                  marginTop:  2,
                }}>
                  {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                </div>
                {fs.showSub && (
                  <div style={{
                    fontSize: fs.sub,
                    color:    txt,
                    opacity:  0.55,
                    marginTop: 3,
                    lineHeight: 1.2,
                  }}>
                    {(cell.asset.value / tot * 100).toFixed(1)}% du ptf
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
