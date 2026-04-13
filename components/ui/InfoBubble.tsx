"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const NAVY = "#0A1628";
let globalClose: (() => void) | null = null;

function getPortalTarget(): HTMLElement {
  return document.getElementById("tooltip-portal") || document.body;
}

export default function InfoBubble({ text, dark, onToggle }: { text: string; dark?: boolean; onToggle?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, down: false });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return;
      setOpen(false); onToggle?.(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, onToggle]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && globalClose) globalClose();
    const next = !open;
    if (next && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const down = rect.top < 200;
      const left = Math.max(10, Math.min(rect.left + rect.width / 2 - 140, window.innerWidth - 300));
      setPos({ top: down ? rect.bottom + 8 : rect.top - 8, left, down });
    }
    setOpen(next);
    onToggle?.(next);
    if (next) globalClose = () => { setOpen(false); onToggle?.(false); };
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      <button ref={btnRef} onClick={toggle} style={{
        width: 16, height: 16, borderRadius: "50%",
        background: dark ? "rgba(255,255,255,0.15)" : "rgba(30,58,110,0.12)",
        border: "none", color: dark ? "rgba(255,255,255,0.7)" : "#1E3A6E",
        fontSize: 9, fontWeight: 700, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontFamily: "Georgia,serif", fontStyle: "italic", lineHeight: 1,
      }}>i</button>
      {open && typeof document !== "undefined" && createPortal(
        <div style={{
          position: "fixed", zIndex: 99999, pointerEvents: "auto",
          top: pos.top, left: pos.left, width: 280,
          transform: pos.down ? "none" : "translateY(-100%)",
          background: NAVY, color: "white", borderRadius: 10,
          padding: "12px 14px", fontSize: 11.5, lineHeight: 1.7,
          fontWeight: 300, boxShadow: "0 12px 40px rgba(0,0,0,.4)",
          fontFamily: "Inter,sans-serif", whiteSpace: "pre-line",
        }}>
          {text}
        </div>,
        getPortalTarget()
      )}
    </span>
  );
}
