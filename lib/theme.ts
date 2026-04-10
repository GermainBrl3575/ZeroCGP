/* ZERO CGP — Design System Constants */

export const C = {
  cream: "#F9F8F6",
  navy: "#050B14",
  navyText: "rgba(5,11,20,0.88)",
  navyMid: "#0c1a2e",
  sapphire: "#1a3a6a",
  sapphireAccent: "#2a5494",
  sapphireGlow: "rgba(26,58,106,0.25)",
  sapphireSoft: "rgba(26,58,106,0.05)",
  gold: "#c9a84c",
  bordeaux: "rgba(175,60,60,0.62)",
  bordeauxH: "rgba(175,60,60,0.92)",
  gUp: "rgba(22,90,52,0.75)",
  gDn: "rgba(150,50,48,0.75)",
  border: "rgba(5,11,20,0.07)",
  borderCard: "rgba(5,11,20,0.09)",
  text: "rgba(5,11,20,0.78)",
  textMid: "rgba(5,11,20,0.52)",
  textLight: "rgba(5,11,20,0.36)",
  sheet: "rgba(255,255,255,0.42)",
  sheetShadow: "0 1px 0 rgba(255,255,255,0.8) inset, 0 20px 50px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.012)",
};

export const CARD: React.CSSProperties = {
  borderRadius: 6,
  border: `0.5px solid ${C.borderCard}`,
  padding: "17px 22px",
  background: "rgba(255,255,255,0.72)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.015)",
};

export const EASE = "0.7s cubic-bezier(.16,1,.3,1)";

export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',sans-serif}
  ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(5,11,20,.06);border-radius:3px}
  @keyframes sideIn{0%{opacity:0;transform:translateX(-8px) scale(.988)}100%{opacity:1;transform:translateX(0) scale(1)}}
  @keyframes breathe{0%,100%{opacity:.35}50%{opacity:.75}}
  @keyframes grain{0%{transform:translate(0)}100%{transform:translate(-40px,-40px)}}
  @keyframes cardIn{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
  h1,h2,p,label,span,div,button,input{font-family:'Inter',sans-serif}
`;
