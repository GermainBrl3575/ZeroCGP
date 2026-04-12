"use client";
import { useState } from "react";
import { Asset } from "@/types";

type PerfData = { p1d:number; p1m:number; p3m:number; p6m:number; p1a:number; p5a:number; p10a:number };
type Perfs = Record<string, PerfData>;

const PERIODS = ["1D","1M","3M","6M","1Y","5Y","10Y"] as const;
type Period = typeof PERIODS[number];
const PERIOD_KEY: Record<Period, keyof PerfData> = { "1D":"p1d","1M":"p1m","3M":"p3m","6M":"p6m","1Y":"p1a","5Y":"p5a","10Y":"p10a" };
const THRESH: Record<Period,number> = { "1D":1.5,"1M":5,"3M":10,"6M":15,"1Y":25,"5Y":80,"10Y":200 };

function getPerf(sym: string, p: Period, perfs: Perfs): number | null {
  const data = perfs[sym];
  if (!data) return null;
  const val = data[PERIOD_KEY[p]];
  return val !== undefined ? val : null;
}

function perfColor(pct: number | null, p: Period): string {
  if (pct === null) return "rgb(226,225,222)";
  const cap = THRESH[p];
  const i = Math.min(1, Math.pow(Math.abs(pct) / cap, 0.45));
  if (Math.abs(pct) < 0.005) return "rgb(226,225,222)";
  if (pct > 0) {
    const r = Math.round(226 - i * 226); const g = Math.round(225 - i * 77); const b = Math.round(222 - i * 172);
    return `rgb(${r},${g},${b})`;
  }
  const r = Math.round(226 - i * 46); const g = Math.round(225 - i * 200); const b = Math.round(222 - i * 197);
  return `rgb(${r},${g},${b})`;
}

function txtCol(pct: number | null, p: Period): string {
  if (pct === null) return "#2D3748";
  return Math.min(1, Math.pow(Math.abs(pct) / THRESH[p], 0.45)) > 0.22 ? "white" : "#2D3748";
}

interface Strip { asset: Asset; flexBasis: number }
interface Row { strips: Strip[]; height: number }

function buildRows(assets: Asset[], tot: number, W: number, H: number): Row[] {
  const sorted = [...assets].sort((a, b) => b.value - a.value);
  const rows: Row[] = [];
  let remaining = [...sorted];
  let remainH = H;

  while (remaining.length > 0) {
    let best: Asset[] = []; let bestRatio = Infinity;
    for (let n = 1; n <= remaining.length; n++) {
      const group = remaining.slice(0, n);
      const groupW = group.reduce((s, a) => s + a.value / tot, 0) * W;
      const rowH = remainH * (group.reduce((s, a) => s + a.value / tot, 0) / remaining.reduce((s, a) => s + a.value / tot, 0));
      const maxRatio = Math.max(...group.map(a => {
        const w = a.value / tot / group.reduce((s, x) => s + x.value / tot, 0) * groupW;
        return Math.max(w / rowH, rowH / w);
      }));
      if (maxRatio < bestRatio) { bestRatio = maxRatio; best = group; }
      else break;
    }
    if (best.length === 0) best = [remaining[0]];
    const groupTot = best.reduce((s, a) => s + a.value / tot, 0);
    const rowH = Math.max(40, remainH * (groupTot / remaining.reduce((s, a) => s + a.value / tot, 0)));
    rows.push({
      height: rowH,
      strips: best.map(a => ({ asset: a, flexBasis: (a.value / tot / groupTot) * 100 })),
    });
    remaining = remaining.slice(best.length);
    remainH -= rowH;
  }
  return rows;
}

export default function Treemap({ assets, perfs = {} }: { assets: Asset[]; perfs?: Perfs }) {
  const [period, setPeriod] = useState<Period>("1M");
  if (!assets.length) return null;
  const tot = assets.reduce((s, a) => s + a.value, 0);
  const TOTAL_H = 300;
  const rows = buildRows(assets, tot, 900, TOTAL_H);

  // Detect markets closed: all 1D perfs are 0 or missing
  const marketsClosed = period === "1D" && assets.every(a => {
    const p = getPerf(a.symbol, "1D", perfs);
    return p === null || Math.abs(p) < 0.005;
  });
  // Find last trading day (most recent weekday before today)
  const lastSession = (() => {
    const d = new Date();
    do { d.setDate(d.getDate() - 1); } while (d.getDay() === 0 || d.getDay() === 6);
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  })();

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: "5px 11px", fontSize: 10, fontWeight: 600, letterSpacing: ".06em",
            borderRadius: 5, border: "1px solid", cursor: "pointer", fontFamily: "'Inter',sans-serif", transition: "all .12s",
            background: period === p ? "#0A1628" : "transparent", color: period === p ? "white" : "#8A9BB0",
            borderColor: period === p ? "#0A1628" : "rgba(10,22,40,.1)",
          }}>{p}</button>
        ))}
      </div>
      {marketsClosed && (
        <div style={{ fontSize: 11, color: "rgba(5,11,20,0.3)", marginBottom: 10, fontFamily: "'Inter',sans-serif" }}>
          Marchés fermés — dernière séance : {lastSession}
        </div>
      )}
      <div style={{ display: "flex", gap: 2, marginBottom: 10, alignItems: "center" }}>
        <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 8 }}>
          {[-1, -0.5, -0.15, 0, 0.15, 0.5, 1].map((v, i) => (
            <div key={i} style={{ width: 20, background: perfColor(v * THRESH[period], period) }} />
          ))}
        </div>
        <span style={{ fontSize: 9, color: "#9CA3AF", marginLeft: 6, letterSpacing: ".04em" }}>Négatif → Neutre → Positif</span>
      </div>
      <div style={{ width: "100%", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column", gap: 3 }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 3, height: row.height, flexShrink: 0 }}>
            {row.strips.map(({ asset, flexBasis }) => {
              const pct = getPerf(asset.symbol, period, perfs);
              const bg = perfColor(pct, period);
              const tc = txtCol(pct, period);
              const small = flexBasis < 12 || row.height < 44;
              return (
                <div key={asset.id} style={{
                  flexBasis: `${flexBasis}%`, flexGrow: 0, flexShrink: 0,
                  background: bg, borderRadius: 4, padding: small ? "5px 7px" : "10px 12px",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  overflow: "hidden", cursor: "default", transition: "filter .12s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.filter = "brightness(.88)")}
                  onMouseLeave={e => (e.currentTarget.style.filter = "none")}
                >
                  <div style={{ fontSize: small ? 8 : 10, fontWeight: 700, color: tc, opacity: .8, letterSpacing: ".05em", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {asset.symbol.split(".")[0].split("-")[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: small ? 10 : 13, fontWeight: 800, color: tc, lineHeight: 1 }}>
                      {pct !== null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"}
                    </div>
                    {!small && <div style={{ fontSize: 8, color: tc, opacity: .55, marginTop: 2 }}>
                      {(asset.value / tot * 100).toFixed(1)}% du ptf
                    </div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
