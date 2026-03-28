// components/Treemap.tsx
"use client";
import { useState } from "react";
import { Asset } from "@/types";
import { eur, TYPE_COLOR } from "@/lib/utils";

interface TreemapProps { assets: Asset[] }

function TreeCell({ asset, colTotal, grandTotal }: {
  asset: Asset; colTotal: number; grandTotal: number;
}) {
  const [hov, setHov] = useState(false);
  const pct = (asset.value / grandTotal * 100).toFixed(1);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex flex-col justify-between p-3 cursor-pointer transition-all duration-150"
      style={{
        flex: asset.value / colTotal,
        background: hov ? TYPE_COLOR[asset.type] : TYPE_COLOR[asset.type] + "CC",
        minHeight: 56,
      }}
    >
      <span className="text-[10px] font-bold tracking-[0.1em] text-white/70 uppercase">
        {asset.symbol}
      </span>
      <div>
        <div className="text-white font-black text-base">{pct}%</div>
        <div className="text-white/50 text-[10px]">{eur(asset.value)}</div>
      </div>
    </div>
  );
}

export default function Treemap({ assets }: TreemapProps) {
  const sorted = [...assets].sort((a, b) => b.value - a.value);
  const tot = assets.reduce((s, a) => s + a.value, 0);
  let s1 = 0;
  const col1: Asset[] = [], col2: Asset[] = [];
  for (const a of sorted) {
    if (s1 < tot * 0.57) { col1.push(a); s1 += a.value; }
    else col2.push(a);
  }
  return (
    <div className="flex h-64 gap-1 rounded-xl overflow-hidden">
      <div className="flex flex-col gap-1" style={{ width: `${s1 / tot * 100}%` }}>
        {col1.map((a) => <TreeCell key={a.id} asset={a} colTotal={s1} grandTotal={tot} />)}
      </div>
      <div className="flex flex-col gap-1" style={{ width: `${(tot - s1) / tot * 100}%` }}>
        {col2.map((a) => <TreeCell key={a.id} asset={a} colTotal={tot - s1} grandTotal={tot} />)}
      </div>
    </div>
  );
}
