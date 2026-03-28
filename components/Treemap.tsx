"use client";
import { useState, useRef, useEffect } from "react";
import { Asset } from "@/types";
import { TYPE_COLOR } from "@/lib/utils";

function feur(n: number) {
  return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
}

function TreeCell({ asset, colTotal, grandTotal }: {
  asset: Asset; colTotal: number; grandTotal: number;
}) {
  const [hov, setHov] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState({ pct: 15, eur: 10, sym: 10 });

  useEffect(() => {
    if (!ref.current) return;
    const { offsetWidth: w, offsetHeight: h } = ref.current;
    // Adapter la taille de police selon la surface disponible
    const area = w * h;
    if (area < 4000) {
      setFontSize({ pct: 9, eur: 8, sym: 8 });
    } else if (area < 10000) {
      setFontSize({ pct: 11, eur: 9, sym: 9 });
    } else if (area < 25000) {
      setFontSize({ pct: 13, eur: 10, sym: 10 });
    } else {
      setFontSize({ pct: 15, eur: 11, sym: 10 });
    }
  }, []);

  const pctVal = (asset.value / grandTotal * 100).toFixed(1);
  const eurVal = feur(asset.value);
  const isSmall = (asset.value / grandTotal) < 0.06;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: asset.value / colTotal,
        background: hov ? TYPE_COLOR[asset.type] : TYPE_COLOR[asset.type] + "CC",
        padding: isSmall ? "6px 8px" : "12px 14px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        cursor: "pointer",
        transition: "background 0.15s",
        minHeight: 40,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <span style={{
        color: "rgba(255,255,255,0.75)",
        fontSize: fontSize.sym,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {asset.symbol}
      </span>
      <div style={{ overflow: "hidden" }}>
        <div style={{
          color: "white",
          fontSize: fontSize.pct,
          fontWeight: 800,
          lineHeight: 1.1,
          whiteSpace: "nowrap",
        }}>
          {pctVal}%
        </div>
        {!isSmall && (
          <div style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: fontSize.eur,
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {eurVal}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Treemap({ assets }: { assets: Asset[] }) {
  const sorted = [...assets].sort((a, b) => b.value - a.value);
  const tot = assets.reduce((s, a) => s + a.value, 0);
  let s1 = 0;
  const col1: Asset[] = [], col2: Asset[] = [];
  for (const a of sorted) {
    if (s1 < tot * 0.57) { col1.push(a); s1 += a.value; }
    else col2.push(a);
  }
  return (
    <div style={{ display: "flex", height: 280, gap: 3, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ width: `${s1/tot*100}%`, display: "flex", flexDirection: "column", gap: 3 }}>
        {col1.map(a => <TreeCell key={a.id} asset={a} colTotal={s1} grandTotal={tot} />)}
      </div>
      <div style={{ width: `${(tot-s1)/tot*100}%`, display: "flex", flexDirection: "column", gap: 3 }}>
        {col2.map(a => <TreeCell key={a.id} asset={a} colTotal={tot-s1} grandTotal={tot} />)}
      </div>
    </div>
  );
}
