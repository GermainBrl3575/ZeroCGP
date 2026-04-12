"use client";
import { useState, useEffect, useRef } from "react";

const NAVY = "#0A1628";

export default function InfoBubble({ text, dark, onToggle }: { text: string; dark?: boolean; onToggle?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); onToggle?.(false); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onToggle]);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button onClick={e => { e.stopPropagation(); const next = !open; setOpen(next); onToggle?.(next); }} style={{
        width: 16, height: 16, borderRadius: "50%",
        background: dark ? "rgba(255,255,255,0.15)" : "rgba(30,58,110,0.12)",
        border: "none", color: dark ? "rgba(255,255,255,0.7)" : "#1E3A6E",
        fontSize: 9, fontWeight: 700, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontFamily: "Georgia,serif", fontStyle: "italic", lineHeight: 1,
      }}>i</button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)", width: 280,
          background: NAVY, color: "white", borderRadius: 10,
          padding: "12px 14px", fontSize: 11.5, lineHeight: 1.7,
          fontWeight: 300, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,.25)",
        }}>
          {text}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0, borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent", borderTop: `6px solid ${NAVY}` }} />
        </div>
      )}
    </div>
  );
}
