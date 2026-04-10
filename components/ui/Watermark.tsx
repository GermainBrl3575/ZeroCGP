"use client";

export default function Watermark() {
  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
      <svg
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position:"absolute", bottom:"-5%", right:"-5%", width:"65%", height:"auto", opacity:0.032 }}
      >
        {/* Grid */}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`h${i}`} x1="50" y1={60 + i * 60} x2="750" y2={60 + i * 60} stroke="#050B14" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`v${i}`} x1={50 + i * 58.33} y1="60" x2={50 + i * 58.33} y2="540" stroke="#050B14" strokeWidth="0.5" />
        ))}
        {/* Frontier curve */}
        <path
          d="M120,480 C160,460 200,380 260,320 C320,260 380,200 440,170 C500,140 560,125 620,118 C680,112 720,115 740,120"
          stroke="#050B14"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Dots on the curve */}
        {[
          [120,480],[180,420],[240,340],[310,270],[380,210],[440,170],[510,145],[580,125],[640,118],[720,118],
        ].map(([cx, cy], i) => (
          <circle key={`d${i}`} cx={cx} cy={cy} r={i === 5 ? 5 : 3} fill="#050B14" />
        ))}
        {/* Tangent line (CML) */}
        <line x1="80" y1="520" x2="700" y2="100" stroke="#050B14" strokeWidth="0.8" strokeDasharray="6 4" />
      </svg>
    </div>
  );
}
