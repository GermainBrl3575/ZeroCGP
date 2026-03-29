"use client";
import { useState } from "react";
import { Asset } from "@/types";
import { TYPE_COLOR } from "@/lib/utils";

function feur(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(n);
}

interface Cell {
  asset: Asset;
  col: number;   // 0–4
  row: number;   // 0–4
  colSpan: number; // 1 ou 2
  rowSpan: number; // 1 ou 2
}

function TreeCell({ asset, grandTotal, colSpan, rowSpan }: {
  asset: Asset; grandTotal: number; colSpan: number; rowSpan: number;
}) {
  const [hov, setHov] = useState(false);
  const pct     = (asset.value / grandTotal * 100).toFixed(1);
  const isLarge = colSpan > 1 || rowSpan > 1;
  const isTiny  = colSpan === 1 && rowSpan === 1 && asset.value / grandTotal < 0.04;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow:    `span ${rowSpan}`,
        background: hov ? TYPE_COLOR[asset.type] : TYPE_COLOR[asset.type] + "CC",
        padding:    isTiny ? "6px 8px" : isLarge ? "18px 20px" : "10px 12px",
        display:    "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        cursor:     "pointer",
        transition: "background 0.15s",
        overflow:   "hidden",
        borderRadius: 5,
      }}
    >
      <span style={{
        color: "rgba(255,255,255,0.8)",
        fontSize: isTiny ? 9 : isLarge ? 12 : 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {asset.symbol}
      </span>
      <div>
        <div style={{
          color: "white",
          fontSize: isTiny ? 10 : isLarge ? 20 : 13,
          fontWeight: 800,
          lineHeight: 1.1,
        }}>
          {pct}%
        </div>
        {!isTiny && (
          <div style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: isTiny ? 0 : isLarge ? 12 : 10,
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {feur(asset.value)}
          </div>
        )}
      </div>
    </div>
  );
}

// Algorithme de placement treemap 5×5 proportionnel
// Les gros actifs occupent plusieurs cases, les petits une seule
function buildGrid(assets: Asset[], tot: number): Cell[] {
  const sorted = [...assets].sort((a, b) => b.value - a.value);
  const COLS = 5;
  const ROWS = 5;
  // Grille de slots occupés (false = libre)
  const grid: boolean[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const cells: Cell[] = [];

  function isFree(r: number, c: number, rs: number, cs: number): boolean {
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

  function findFreeSlot(rs: number, cs: number): [number, number] | null {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (isFree(r, c, rs, cs)) return [r, c];
    return null;
  }

  for (const asset of sorted) {
    const w = asset.value / tot;
    // Décider du span selon le poids
    let rs = 1, cs = 1;
    if      (w >= 0.35) { rs = 3; cs = 3; }
    else if (w >= 0.20) { rs = 2; cs = 3; }
    else if (w >= 0.12) { rs = 2; cs = 2; }
    else if (w >= 0.06) { rs = 1; cs = 2; }

    // Réduire si pas de place
    let slot: [number, number] | null = null;
    while (rs >= 1 && cs >= 1 && !slot) {
      slot = findFreeSlot(rs, cs);
      if (!slot) {
        if (cs > rs) cs--;
        else if (rs > 1) rs--;
        else break;
      }
    }

    // Fallback : chercher n'importe quel slot libre 1×1
    if (!slot) slot = findFreeSlot(1, 1);
    if (!slot) continue; // grille pleine

    occupy(slot[0], slot[1], rs, cs);
    cells.push({ asset, col: slot[1], row: slot[0], colSpan: cs, rowSpan: rs });
  }

  return cells;
}

export default function Treemap({ assets }: { assets: Asset[] }) {
  if (!assets.length) return null;
  const tot   = assets.reduce((s, a) => s + a.value, 0);
  const cells = buildGrid(assets, tot);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gridTemplateRows:    "repeat(5, 56px)",
      gap: 4,
      borderRadius: 10,
      overflow: "hidden",
    }}>
      {cells.map(cell => (
        <TreeCell
          key={cell.asset.id}
          asset={cell.asset}
          grandTotal={tot}
          colSpan={cell.colSpan}
          rowSpan={cell.rowSpan}
        />
      ))}
    </div>
  );
}
