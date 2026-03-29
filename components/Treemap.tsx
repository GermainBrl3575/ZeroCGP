"use client";
import { useState } from "react";
import { Asset } from "@/types";

// Performances historiques simulées par actif (en %)
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
  "MSFT.": {"1D":0.62,"1M":2.2,"3M":6.8,"6M":11.0,"1Y":18.0,"5Y":182.0,"10Y":742.0},
};

const PERIODS = ["1D","1M","3M","6M","1Y","5Y","10Y"] as const;
type Period = typeof PERIODS[number];

function getPerf(symbol: string, period: Period): number {
  const base = symbol.split(".")[0].toUpperCase();
  return PERF_DB[base]?.[period] ?? PERF_DB[symbol]?.[period] ?? (Math.random() * 10 - 5);
}

// Couleur rouge→blanc→vert selon la perf
function perfColor(pct: number): string {
  const abs = Math.min(Math.abs(pct), 20); // cap à ±20%
  const intensity = abs / 20;
  if (pct >= 0) {
    // Blanc → Vert foncé
    const r = Math.round(255 - intensity * (255 - 21));
    const g = Math.round(255 - intensity * (255 - 128));
    const b = Math.round(255 - intensity * (255 - 61));
    return `rgb(${r},${g},${b})`;
  } else {
    // Blanc → Rouge foncé
    const r = Math.round(255 - intensity * (255 - 185));
    const g = Math.round(255 - intensity * (255 - 28));
    const b = Math.round(255 - intensity * (255 - 28));
    return `rgb(${r},${g},${b})`;
  }
}

function textColor(pct: number): string {
  const abs = Math.min(Math.abs(pct), 20);
  return abs > 4 ? "white" : "#1a1a1a";
}

interface Cell {
  asset: Asset;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
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
    let attempts = 0;
    while (!slot && attempts < 6) {
      slot = findSlot(rs, cs);
      if (!slot) { if (cs > rs && cs > 1) cs--; else if (rs > 1) rs--; else break; }
      attempts++;
    }
    if (!slot) slot = findSlot(1, 1);
    if (!slot) continue;

    occupy(slot[0], slot[1], rs, cs);
    cells.push({ asset, col: slot[1], row: slot[0], colSpan: cs, rowSpan: rs });
  }
  return cells;
}

export default function Treemap({ assets, period }: { assets: Asset[]; period?: Period }) {
  const [activePeriod, setActivePeriod] = useState<Period>(period ?? "1D");

  if (!assets.length) return null;
  const tot   = assets.reduce((s, a) => s + a.value, 0);
  const cells = buildGrid(assets, tot);

  return (
    <div>
      {/* Sélecteur de période */}
      <div style={{ display:"flex", gap:4, marginBottom:14 }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setActivePeriod(p)} style={{
            padding:"5px 12px",
            fontSize:10,
            fontWeight:600,
            borderRadius:5,
            border:"1px solid",
            cursor:"pointer",
            fontFamily:"'Inter',sans-serif",
            letterSpacing:".06em",
            transition:"all 0.15s",
            background: activePeriod === p ? "#0A1628" : "transparent",
            color:       activePeriod === p ? "white"   : "#8A9BB0",
            borderColor: activePeriod === p ? "#0A1628" : "rgba(10,22,40,.1)",
          }}>
            {p}
          </button>
        ))}
      </div>

      {/* Légende */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
        <div style={{ display:"flex", gap:2 }}>
          {[-15,-8,-3,0,3,8,15].map(v => (
            <div key={v} style={{ width:18, height:8, borderRadius:2, background:perfColor(v) }}/>
          ))}
        </div>
        <span style={{ fontSize:9, color:"#8A9BB0", marginLeft:4 }}>Négatif → Positif</span>
      </div>

      {/* Heatmap 5×5 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gridTemplateRows:    "repeat(5, 58px)",
        gap: 3,
        borderRadius: 10,
        overflow: "hidden",
      }}>
        {cells.map(cell => {
          const pct      = getPerf(cell.asset.symbol, activePeriod);
          const bg       = perfColor(pct);
          const txtColor = textColor(pct);
          const isLarge  = cell.colSpan > 1 || cell.rowSpan > 1;
          const isTiny   = cell.colSpan === 1 && cell.rowSpan === 1 && cell.asset.value / tot < 0.05;

          return (
            <div key={cell.asset.id} style={{
              gridColumn: `span ${cell.colSpan}`,
              gridRow:    `span ${cell.rowSpan}`,
              background: bg,
              padding:    isTiny ? "6px 8px" : isLarge ? "16px 18px" : "10px 12px",
              display:    "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflow: "hidden",
              borderRadius: 4,
              transition: "filter 0.15s",
              cursor: "default",
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.88)")}
            onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
            >
              <div style={{
                fontSize: isTiny ? 9 : isLarge ? 13 : 10,
                fontWeight: 700,
                color: txtColor,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                opacity: 0.85,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {cell.asset.symbol}
              </div>

              <div>
                <div style={{
                  fontSize: isTiny ? 10 : isLarge ? 22 : 13,
                  fontWeight: 800,
                  color: txtColor,
                  lineHeight: 1.1,
                }}>
                  {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                </div>
                {!isTiny && (
                  <div style={{
                    fontSize: isLarge ? 11 : 9,
                    color: txtColor,
                    opacity: 0.6,
                    marginTop: 2,
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
