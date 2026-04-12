"use client";

const SHIMMER_CSS = `
@keyframes skShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes skFadeIn{from{opacity:0}to{opacity:1}}
`;

const shimmerBg = "linear-gradient(90deg, rgba(229,228,226,0.35) 25%, rgba(255,255,255,0.55) 50%, rgba(229,228,226,0.35) 75%)";
const shimmerStyle = (w: string | number, h: number, delay = 0): React.CSSProperties => ({
  width: w, height: h, borderRadius: 4,
  background: shimmerBg, backgroundSize: "800px 100%",
  animation: `skShimmer 1.5s ease infinite, skFadeIn .4s ease both`,
  animationDelay: `${delay}s, ${delay}s`,
});

function Block({ w, h, delay = 0, style }: { w: string | number; h: number; delay?: number; style?: React.CSSProperties }) {
  return <div style={{ ...shimmerStyle(w, h, delay), ...style }} />;
}

// ─── SkeletonTable: generic rows (badge + name + subtitle + value) ─────────
export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 6, border: "0.5px solid rgba(5,11,20,0.06)", background: "rgba(255,255,255,.72)" }}>
            <Block w={38} h={18} delay={i * 0.06} style={{ borderRadius: 4 }} />
            <div style={{ flex: 1 }}>
              <Block w="60%" h={12} delay={i * 0.06 + 0.02} />
              <Block w="40%" h={9} delay={i * 0.06 + 0.04} style={{ marginTop: 6 }} />
            </div>
            <div style={{ textAlign: "right" }}>
              <Block w={60} h={16} delay={i * 0.06 + 0.02} />
              <Block w={40} h={10} delay={i * 0.06 + 0.04} style={{ marginTop: 4, marginLeft: "auto" }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── SkeletonBox: generic chart/graph placeholder ──────────────────────────
export function SkeletonBox({ height = 200 }: { height?: number }) {
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div style={{ borderRadius: 10, border: "0.5px solid rgba(5,11,20,0.05)", padding: 24, background: "rgba(255,255,255,.5)" }}>
        <Block w="30%" h={14} delay={0} />
        <Block w="50%" h={10} delay={0.06} style={{ marginTop: 8 }} />
        <Block w="100%" h={height} delay={0.12} style={{ marginTop: 16, borderRadius: 8 }} />
      </div>
    </>
  );
}

// ─── SkeletonMap: placeholder for WorldMap ─────────────────────────────────
export function SkeletonMap() {
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div style={{ borderRadius: 12, border: "0.5px solid rgba(5,11,20,0.035)", background: "rgba(255,255,255,0.42)", padding: 0, overflow: "hidden" }}>
        <Block w="100%" h={420} delay={0} style={{ borderRadius: 12 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 0" }}>
            <Block w={6} h={6} delay={i * 0.06} style={{ borderRadius: "50%" }} />
            <Block w={100} h={11} delay={i * 0.06 + 0.02} />
            <div style={{ flex: 1 }}><Block w="100%" h={2} delay={i * 0.06 + 0.04} /></div>
            <Block w={40} h={12} delay={i * 0.06 + 0.06} />
          </div>
        ))}
      </div>
    </>
  );
}

// ─── SkeletonResults: 3 portfolio cards + tabs + allocation ───────────────
export function SkeletonResults() {
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div>
        {/* Header */}
        <Block w={200} h={10} delay={0} style={{ marginBottom: 16 }} />
        <Block w={340} h={32} delay={0.06} style={{ marginBottom: 28 }} />

        {/* 3 cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 28 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ borderRadius: 10, padding: "28px 24px", border: "0.5px solid rgba(5,11,20,0.09)", background: i === 1 ? "rgba(26,58,106,0.06)" : "rgba(255,255,255,.72)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <Block w={70} h={9} delay={i * 0.08} />
                <Block w={16} h={16} delay={i * 0.08} style={{ borderRadius: "50%" }} />
              </div>
              <Block w="70%" h={16} delay={i * 0.08 + 0.04} style={{ marginBottom: 24 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[0, 1, 2, 3].map(j => (
                  <div key={j}>
                    <Block w={50} h={8} delay={i * 0.08 + j * 0.04 + 0.06} style={{ marginBottom: 6 }} />
                    <Block w={60} h={18} delay={i * 0.08 + j * 0.04 + 0.08} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 28, borderBottom: ".5px solid rgba(5,11,20,0.07)" }}>
          <Block w={90} h={12} delay={0.3} style={{ margin: "12px 24px" }} />
          <Block w={150} h={12} delay={0.36} style={{ margin: "12px 24px" }} />
          <Block w={160} h={12} delay={0.42} style={{ margin: "12px 24px" }} />
        </div>

        {/* Allocation rows */}
        <Block w="35%" h={20} delay={0.48} style={{ marginBottom: 16 }} />
        <SkeletonTable rows={5} />
      </div>
    </>
  );
}

// ─── SkeletonPortfolio: stat cards + chart + asset list ───────────────────
export function SkeletonPortfolio() {
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div style={{ padding: "36px 44px" }}>
        {/* Title */}
        <Block w={180} h={14} delay={0} style={{ marginBottom: 8 }} />
        <Block w={120} h={28} delay={0.06} style={{ marginBottom: 28 }} />

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: 22 }}>
              <Block w={60} h={9} delay={i * 0.06} style={{ marginBottom: 12 }} />
              <Block w={90} h={22} delay={i * 0.06 + 0.04} />
              <Block w={50} h={10} delay={i * 0.06 + 0.08} style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: "white", borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <Block w={120} h={12} delay={0.3} />
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2, 3, 4].map(i => <Block key={i} w={32} h={22} delay={0.32 + i * 0.04} style={{ borderRadius: 5 }} />)}
            </div>
          </div>
          <Block w="100%" h={200} delay={0.5} style={{ borderRadius: 8 }} />
        </div>

        {/* Asset list */}
        <div style={{ background: "white", borderRadius: 14, padding: 22 }}>
          <Block w={100} h={12} delay={0.6} style={{ marginBottom: 16 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < 4 ? "0.5px solid rgba(10,22,40,0.06)" : "none" }}>
              <Block w={36} h={16} delay={0.66 + i * 0.06} style={{ borderRadius: 4 }} />
              <div style={{ flex: 1 }}>
                <Block w="50%" h={12} delay={0.68 + i * 0.06} />
                <Block w="30%" h={9} delay={0.70 + i * 0.06} style={{ marginTop: 5 }} />
              </div>
              <Block w={55} h={14} delay={0.68 + i * 0.06} />
              <Block w={45} h={10} delay={0.70 + i * 0.06} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
