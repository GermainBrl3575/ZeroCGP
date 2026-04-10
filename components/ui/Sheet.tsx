"use client";
export default function Sheet({ children }: { children: React.ReactNode }) {
  return <div style={{
    background: "rgba(255,255,255,0.42)",
    borderRadius: 12,
    border: "0.5px solid rgba(5,11,20,0.035)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.8) inset, 0 20px 50px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.012)",
    padding: "48px 52px",
    position: "relative",
    width: "100%",
    height: "100%",
    minHeight: "100%",
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='.01'/%3E%3C/svg%3E")`,
  }}>
    <div style={{
      position: "absolute", top: 0, left: 20, right: 20, height: 1,
      background: "linear-gradient(90deg,transparent,rgba(255,255,255,.65) 30%,rgba(255,255,255,.85) 50%,rgba(255,255,255,.65) 70%,transparent)",
    }} />
    {children}
  </div>;
}
