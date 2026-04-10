"use client";
import { useState, useEffect, useRef } from "react";

interface TickerItem { symbol: string; name: string; price: number; change: number }

const C = {
  navyText: "rgba(5,11,20,0.88)",
  textLight: "rgba(5,11,20,0.36)",
  gUp: "rgba(22,90,52,0.75)",
  gDn: "rgba(150,50,48,0.75)",
};

export default function Ticker() {
  const [data, setData] = useState<TickerItem[]>([]);
  const [slotA, setSlotA] = useState(0);
  const [slotB, setSlotB] = useState(5);
  const [showA, setShowA] = useState(true);
  const tick = useRef(0);
  const N = 5; // items visible at once

  // Fetch ticker data
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/market/ticker");
        const d = await r.json();
        if (d.tickers?.length) setData(d.tickers);
      } catch {}
    }
    load();
    const id = setInterval(load, 300000); // refresh every 5 min
    return () => clearInterval(id);
  }, []);

  // Crossfade rotation
  useEffect(() => {
    if (data.length < N) return;
    const id = setInterval(() => {
      tick.current += 1;
      const next = (tick.current * N) % data.length;
      if (showA) { setSlotB(next); setShowA(false); }
      else { setSlotA(next); setShowA(true); }
    }, 8000);
    return () => clearInterval(id);
  }, [showA, data.length]);

  if (data.length === 0) return null;

  const getItems = (offset: number) =>
    Array.from({ length: N }, (_, i) => data[(offset + i) % data.length]);

  const renderLayer = (items: TickerItem[]) => items.map((p, i) => (
    <div key={p.symbol + i} style={{
      display: "flex", alignItems: "center", flex: 1,
      paddingRight: 12, marginRight: i < N - 1 ? 12 : 0,
      borderRight: i < N - 1 ? "0.5px solid rgba(5,11,20,0.05)" : "none",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 500, color: C.navyText, letterSpacing: "-0.01em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{p.name}</div>
        <div style={{ fontSize: 9, fontWeight: 400, color: C.textLight, letterSpacing: "0.03em", marginTop: 1 }}>
          {p.symbol}
        </div>
      </div>
      <div style={{ textAlign: "right" as const, marginLeft: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: C.navyText, fontVariantNumeric: "tabular-nums" }}>
          {p.price.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </div>
        <div style={{
          fontSize: 9.5, fontWeight: 400, fontVariantNumeric: "tabular-nums",
          color: p.change >= 0 ? C.gUp : C.gDn, marginTop: 1,
        }}>
          {p.change >= 0 ? "+" : ""}{p.change.toFixed(2)}%
        </div>
      </div>
    </div>
  ));

  const layerStyle = (visible: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", padding: "11px 0",
    position: "absolute", inset: 0,
    opacity: visible ? 1 : 0,
    transition: "opacity 1.6s cubic-bezier(.16,1,.3,1)",
  });

  return (
    <div style={{
      padding: "0 44px", borderBottom: "0.5px solid rgba(5,11,20,0.07)",
      background: "rgba(249,248,246,.9)", backdropFilter: "blur(6px)",
    }}>
      <div style={{ position: "relative", height: 44 }}>
        <div style={layerStyle(showA)}>{renderLayer(getItems(slotA))}</div>
        <div style={layerStyle(!showA)}>{renderLayer(getItems(slotB))}</div>
      </div>
    </div>
  );
}
