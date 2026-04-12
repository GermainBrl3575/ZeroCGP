"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { SkeletonMap } from "@/components/ui/Skeleton";

const C = {
  cream: "#F9F8F6", navy: "#050B14", navyText: "rgba(5,11,20,0.88)", navyMid: "#0c1a2e",
  sapphire: "#1a3a6a", sapphireAccent: "#2a5494", sapphireGlow: "rgba(26,58,106,0.25)",
  border: "rgba(5,11,20,0.07)", borderCard: "rgba(5,11,20,0.09)",
  text: "rgba(5,11,20,0.78)", textMid: "rgba(5,11,20,0.52)", textLight: "rgba(5,11,20,0.36)",
  landDefault: "#E8E4DE", landStroke: "#D5D0C8",
  sheet: "rgba(255,255,255,0.42)",
  sheetShadow: "0 1px 0 rgba(255,255,255,0.8) inset, 0 20px 50px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.012)",
};
const EASE = "0.7s cubic-bezier(.16,1,.3,1)";

const COUNTRY_NAMES: Record<string,string> = {
  USA:"États-Unis",FRA:"France",NLD:"Pays-Bas",DEU:"Allemagne",GBR:"Royaume-Uni",JPN:"Japon",CHN:"Chine",IND:"Inde",
  BRA:"Brésil",ZAF:"Afrique du Sud",KOR:"Corée du Sud",TWN:"Taïwan",CHE:"Suisse",ESP:"Espagne",ITA:"Italie",
  AUS:"Australie",CAN:"Canada",MEX:"Mexique",IDN:"Indonésie",THA:"Thaïlande",MYS:"Malaisie",SGP:"Singapour",
  SWE:"Suède",DNK:"Danemark",NOR:"Norvège",FIN:"Finlande",BEL:"Belgique",IRL:"Irlande",AUT:"Autriche",PRT:"Portugal",
  SAU:"Arabie Saoudite",ARE:"Émirats",RUS:"Russie",TUR:"Turquie",POL:"Pologne",CZE:"Tchéquie",HUN:"Hongrie",
  CHL:"Chili",COL:"Colombie",PER:"Pérou",PHL:"Philippines",VNM:"Vietnam",NZL:"Nouvelle-Zélande",HKG:"Hong Kong",ISR:"Israël",
};
const ISO3_TO_ID: Record<string,number> = {
  USA:840,FRA:250,NLD:528,DEU:276,GBR:826,JPN:392,CHN:156,IND:356,BRA:76,ZAF:710,KOR:410,TWN:158,CHE:756,ESP:724,ITA:380,
  AUS:36,CAN:124,MEX:484,IDN:360,THA:764,MYS:458,SGP:702,SWE:752,DNK:208,NOR:578,FIN:246,BEL:56,IRL:372,AUT:40,PRT:620,
  SAU:682,ARE:784,RUS:643,TUR:792,POL:616,CZE:203,HUN:348,CHL:152,COL:170,PER:604,PHL:608,VNM:704,NZL:554,HKG:344,ISR:376,
};

type GeoExposureData = Record<string, { countries: Record<string,number>; desc: string }>;
interface Props { weights: { symbol:string; name:string; type:string; weight:number }[]; geoExposure: GeoExposureData; loading?: boolean }

function decodeGeometry(geom: any, topology: any) {
  const { arcs: topoArcs, transform } = topology;
  if (!transform || !topoArcs) return null;
  const { scale, translate } = transform;
  function decodeArc(arcIdx: number) {
    const reverse = arcIdx < 0;
    const arc = topoArcs[reverse ? ~arcIdx : arcIdx];
    if (!arc) return [];
    let x = 0, y = 0;
    const coords = arc.map(([dx,dy]: [number,number]) => { x+=dx; y+=dy; return [x*scale[0]+translate[0], y*scale[1]+translate[1]]; });
    return reverse ? coords.reverse() : coords;
  }
  function decodeRing(ring: number[]) {
    let coords: number[][] = [];
    ring.forEach(arcIdx => { const decoded = decodeArc(arcIdx); if (coords.length>0) decoded.shift(); coords = coords.concat(decoded); });
    return coords;
  }
  if (geom.type === "Polygon") return { type:"Polygon", coordinates:geom.arcs.map(decodeRing) };
  if (geom.type === "MultiPolygon") return { type:"MultiPolygon", coordinates:geom.arcs.map((poly:any) => poly.map(decodeRing)) };
  return null;
}

export default function WorldMapExposure({ weights, geoExposure, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [worldData, setWorldData] = useState<any>(null);
  const [hovered, setHovered] = useState<string|null>(null);
  const [tooltip, setTooltip] = useState({ x:0, y:0 });
  const [loaded, setLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const { countryWeights, countryAssets } = useMemo(() => {
    const cw: Record<string,number> = {};
    const ca: Record<string,{symbol:string;name:string;weight:number;localPct:number;desc:string}[]> = {};
    weights.forEach(w => {
      const exposure = geoExposure[w.symbol];
      if (!exposure) return;
      Object.entries(exposure.countries).forEach(([code, pct]) => {
        const contribution = (w.weight * pct) / 100;
        cw[code] = (cw[code]||0) + contribution;
        if (!ca[code]) ca[code] = [];
        ca[code].push({ symbol:w.symbol, name:w.name, weight:w.weight, localPct:pct, desc:exposure.desc });
      });
    });
    return { countryWeights:cw, countryAssets:ca };
  }, [weights, geoExposure]);

  const maxWeight = useMemo(() => Math.max(...Object.values(countryWeights), 1), [countryWeights]);
  const idToIso3 = useMemo(() => { const m: Record<number,string> = {}; Object.entries(ISO3_TO_ID).forEach(([iso, id]) => { m[id] = iso; }); return m; }, []);
  const projection = useMemo(() => d3.geoNaturalEarth1().scale(155).translate([420,200]).rotate([-10,0]), []);
  const pathGen = useMemo(() => d3.geoPath().projection(projection), [projection]);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r => r.json()).then(data => { setWorldData(data); setTimeout(()=>setLoaded(true),100); }).catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = d3.select(svgRef.current); const g = d3.select(gRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([1, 8]).translateExtent([[0,0],[840,420]])
      .on("zoom", (event) => { g.attr("transform", event.transform.toString()); setZoomLevel(event.transform.k); });
    svg.call(zoom);
    svg.on("dblclick.zoom", () => { svg.transition().duration(700).ease(d3.easeCubicOut).call(zoom.transform, d3.zoomIdentity); });
    return () => { svg.on(".zoom", null); };
  }, [worldData, loading]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const preventScroll = (e: WheelEvent) => { e.preventDefault(); };
    container.addEventListener("wheel", preventScroll, { passive: false });
    return () => container.removeEventListener("wheel", preventScroll);
  }, []);

  const countries = useMemo(() => {
    if (!worldData) return [];
    const geom = worldData.objects.countries;
    const features: any[] = [];
    if (geom.type === "GeometryCollection") {
      geom.geometries.forEach((g:any) => {
        const feature = { type:"Feature", id:g.id, properties:g.properties||{}, geometry:decodeGeometry(g, worldData) };
        if (feature.geometry) features.push(feature);
      });
    }
    return features;
  }, [worldData]);

  const handleMouseMove = (e: React.MouseEvent, code: string) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x:e.clientX-rect.left, y:e.clientY-rect.top-10 });
    setHovered(code);
  };
  const hasData = Object.keys(geoExposure).length > 0;

  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
        <span style={{ fontSize:10, fontWeight:500, letterSpacing:".15em", textTransform:"uppercase", color:C.sapphire, opacity:.65 }}>Exposition géographique</span>
        <div style={{ flex:1, height:".5px", background:`linear-gradient(90deg, ${C.borderCard}, transparent)` }} />
      </div>
      <h3 style={{ fontSize:22, fontWeight:500, color:C.navyText, letterSpacing:"-.02em", marginBottom:6, fontFamily:"Inter,sans-serif" }}>Où sont vos actifs ?</h3>
      <p style={{ fontSize:13, fontWeight:400, color:C.textLight, marginBottom:24, fontFamily:"Inter,sans-serif" }}>
        {loading ? "Analyse géographique en cours…" : "Chaque pays s'illumine en fonction de votre exposition. Zoomez avec la molette, glissez pour explorer."}
      </p>
      <div ref={containerRef} style={{ background:C.sheet, borderRadius:12, border:"0.5px solid rgba(5,11,20,0.035)", boxShadow:C.sheetShadow, padding:0, position:"relative", overflow:"hidden",
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='.008'/%3E%3C/svg%3E")` }}>
        <div style={{ position:"absolute", bottom:16, right:16, zIndex:10 }}>
          <div style={{ fontSize:9, fontWeight:400, color:C.textLight, textAlign:"right" }}>{zoomLevel > 1 ? `${zoomLevel.toFixed(1)}× · Double-clic pour réinitialiser` : "Molette pour zoomer"}</div>
        </div>
        {(loading || !worldData) && <SkeletonMap />}
        {worldData && !loading && (
          <svg ref={svgRef} viewBox="0 0 840 420" style={{ width:"100%", height:"auto", display:"block", cursor:"grab", borderRadius:12, touchAction:"none" }}>
            <rect width="840" height="420" fill={C.cream} />
            <g ref={gRef}>
              <path d={pathGen(d3.geoGraticule10()) as string} fill="none" stroke={C.navy} strokeWidth="0.12" opacity="0.05" />
              {countries.map((feat:any, i:number) => {
                const iso3 = idToIso3[feat.id];
                const weight = iso3 ? countryWeights[iso3]||0 : 0;
                const hasExposure = weight > 0 && hasData;
                const isHov = hovered === iso3;
                const intensity = hasExposure ? Math.max(0.25, Math.min(0.9, (weight/maxWeight)*0.9)) : 0;
                const d = pathGen(feat);
                if (!d) return null;
                return (<path key={feat.id||i} d={d}
                  fill={hasExposure ? (isHov ? C.sapphireAccent : C.sapphire) : C.landDefault}
                  fillOpacity={hasExposure ? (isHov ? Math.min(intensity+0.1,1) : intensity) : 1}
                  stroke={hasExposure ? (isHov ? C.sapphireAccent : "rgba(26,58,106,0.3)") : C.landStroke}
                  strokeWidth={hasExposure ? (isHov ? 1 : 0.4) : 0.25}
                  onMouseMove={hasExposure ? (e) => handleMouseMove(e, iso3) : undefined}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: hasExposure ? "pointer" : "grab", transition: "fill .5s ease, fill-opacity .5s ease, stroke .5s ease, stroke-width .3s ease", filter: isHov ? `drop-shadow(0 0 10px ${C.sapphireGlow})` : "none" }}
                />);
              })}
              <path d={pathGen({type:"Sphere"}) as string} fill="none" stroke={C.navy} strokeWidth="0.3" opacity="0.08" />
            </g>
          </svg>
        )}
        {hovered && countryWeights[hovered] > 0 && (
          <div style={{ position:"absolute", left:tooltip.x, top:tooltip.y, transform:"translate(-50%,-100%)", pointerEvents:"none", zIndex:20, background:C.navy, borderRadius:10, padding:"14px 18px", minWidth:250, boxShadow:`0 8px 32px rgba(0,0,0,.3), 0 0 16px ${C.sapphireGlow}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
              <span style={{ fontSize:13, fontWeight:500, color:"rgba(255,255,255,.92)", fontFamily:"Inter,sans-serif" }}>{COUNTRY_NAMES[hovered]||hovered}</span>
              <span style={{ fontSize:14, fontWeight:500, color:C.sapphireAccent, fontVariantNumeric:"tabular-nums", fontFamily:"Inter,sans-serif" }}>{countryWeights[hovered].toFixed(1)}%</span>
            </div>
            <div style={{ height:".3px", background:"rgba(255,255,255,.08)", marginBottom:10 }} />
            {(countryAssets[hovered]||[]).map((asset:any) => (
              <div key={asset.symbol} style={{ padding:"5px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:500, color:"rgba(255,255,255,.85)", fontFamily:"Inter,sans-serif" }}>{asset.name}</div>
                  <div style={{ fontSize:9, fontWeight:400, color:"rgba(255,255,255,.3)", marginTop:1, fontFamily:"Inter,sans-serif" }}>{asset.localPct}% de cet actif · {asset.weight}% du portfolio</div>
                </div>
              </div>
            ))}
            <div style={{ position:"absolute", bottom:-5, left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"5px solid transparent", borderRight:"5px solid transparent", borderTop:`5px solid ${C.navy}` }} />
          </div>
        )}
      </div>
      {hasData && Object.keys(countryWeights).length > 0 && (
        <div style={{ marginTop:24 }}>
          <h4 style={{ fontSize:14, fontWeight:500, color:C.navyText, letterSpacing:"-.02em", marginBottom:14, fontFamily:"Inter,sans-serif" }}>Top pays par exposition</h4>
          {Object.entries(countryWeights).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([code, weight]) => (
            <div key={code} onMouseEnter={() => setHovered(code)} onMouseLeave={() => setHovered(null)}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"9px 0", borderBottom:`.5px solid ${C.border}`, opacity: hovered && hovered !== code ? 0.35 : 1, transition:`opacity ${EASE}`, cursor:"default" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:hovered===code?C.sapphireAccent:C.sapphire, opacity:0.5+(weight/maxWeight)*0.5, transition:`all ${EASE}`, boxShadow:hovered===code?`0 0 6px ${C.sapphireGlow}`:"none" }} />
              <span style={{ fontSize:12, fontWeight:hovered===code?500:400, color:hovered===code?C.navyText:C.textMid, width:120, flexShrink:0, transition:`all ${EASE}`, fontFamily:"Inter,sans-serif" }}>{COUNTRY_NAMES[code]||code}</span>
              <div style={{ flex:1, height:2, borderRadius:1, background:"rgba(26,58,106,.06)", overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:1, width:`${(weight/maxWeight)*100}%`, background:hovered===code?`linear-gradient(90deg,${C.sapphireAccent}50,${C.sapphireAccent})`:`linear-gradient(90deg,${C.sapphire}30,${C.sapphire})`, boxShadow:hovered===code?`0 0 4px ${C.sapphireGlow}`:"none", transition:`all ${EASE}` }} />
              </div>
              <span style={{ fontSize:13, fontWeight:500, color:C.navyText, fontVariantNumeric:"tabular-nums", width:50, textAlign:"right", fontFamily:"Inter,sans-serif" }}>{weight.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
      {hasData && (
        <div style={{ display:"flex", gap:24, marginTop:20 }}>
          {[{label:"Exposition forte",bg:C.sapphire,opacity:0.8},{label:"Exposition modérée",bg:C.sapphire,opacity:0.35},{label:"Exposition faible",bg:C.sapphire,opacity:0.15},{label:"Non exposé",bg:C.landDefault,opacity:1,border:true}].map(l => (
            <div key={l.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:10, height:10, borderRadius:2, background:l.bg, opacity:l.opacity, border:(l as any).border?`.5px solid ${C.landStroke}`:"none" }} />
              <span style={{ fontSize:10, fontWeight:400, color:C.textLight, fontFamily:"Inter,sans-serif" }}>{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
