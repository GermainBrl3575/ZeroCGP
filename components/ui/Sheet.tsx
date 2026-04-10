"use client";
const C = { sheet: "rgba(255,255,255,0.42)", sheetShadow: "0 1px 0 rgba(255,255,255,0.8) inset, 0 20px 50px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.012)", borderCard: "rgba(5,11,20,0.09)" };
export default function Sheet({ children }: { children: React.ReactNode }) {
  return <div style={{
    background: C.sheet, borderRadius: 12, border: "0.5px solid rgba(5,11,20,0.035)",
    boxShadow: C.sheetShadow, padding: "48px 52px", maxWidth: 680, position: "relative",
  }}>
    <div style={{ position: "absolute", top: 0, left: 20, right: 20, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.65) 30%,rgba(255,255,255,.85) 50%,rgba(255,255,255,.65) 70%,transparent)" }} />
    {children}
  </div>;
}
