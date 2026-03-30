import { ASSET_UNIVERSE, AssetMeta, AssetClass, Region } from "./assetUniverse";

export interface FilterAnswers {
  horizon:     string; // Q1
  risk:        string; // Q2
  maxLoss:     string; // Q3
  esg:         string; // Q4
  classes:     string; // Q5 — comma-separated
  geo:         string; // Q6
  diversif:    string; // Q7
}

export function filterAssets(answers: FilterAnswers): AssetMeta[] {
  const classes = answers.classes?.toLowerCase() ?? "";
  const risk    = answers.risk?.toLowerCase() ?? "";
  const maxLoss = answers.maxLoss ?? "";
  const geo     = answers.geo?.toLowerCase() ?? "";
  const esg     = answers.esg?.toLowerCase() ?? "";
  const diversif= answers.diversif?.toLowerCase() ?? "";

  // ── 1. Classes d'actifs ──────────────────────────────────
  const wantTypes = new Set<AssetClass>();
  if (classes.includes("etf"))         { wantTypes.add("etf"); }
  if (classes.includes("actions") || classes.includes("action")) { wantTypes.add("stock"); }
  if (classes.includes("crypto"))      { wantTypes.add("crypto"); }
  if (classes.includes("obligations")) { wantTypes.add("bond"); }
  if (classes.includes("immobilier"))  { wantTypes.add("reit"); }
  if (wantTypes.size === 0)            { wantTypes.add("etf"); wantTypes.add("stock"); }

  // ── 2. Zones géographiques ───────────────────────────────
  const wantRegions = new Set<Region>();
  if (geo.includes("monde"))    { wantRegions.add("world"); wantRegions.add("global"); }
  if (geo.includes("usa") || geo.includes("états-unis")) { wantRegions.add("usa"); }
  if (geo.includes("europe"))   { wantRegions.add("europe"); }
  if (geo.includes("émergents") || geo.includes("emergents")) { wantRegions.add("emerging"); }
  if (geo.includes("asie"))     { wantRegions.add("asia"); }
  if (wantRegions.size === 0)   { ["world","global","usa","europe"].forEach(r => wantRegions.add(r as Region)); }

  // ── 3. ESG ───────────────────────────────────────────────
  const esgOnly = esg.includes("strict");
  const esgPartial = esg.includes("exclure") || esg.includes("armement");

  // ── 4. Profil de risque — limite les volatils ────────────
  const isConservative = risk.includes("conservateur");
  const isModerate     = risk.includes("modéré") || risk.includes("modere");
  const isAggressive   = risk.includes("agressif");

  // ── 5. Perte max — exclure les très volatils si besoin ───
  const maxLossPct = maxLoss.includes("10%") ? 10
    : maxLoss.includes("20%") ? 20
    : maxLoss.includes("35%") ? 35 : 100;

  // Exclure crypto si trop conservateur
  if ((isConservative || maxLossPct <= 10) && !classes.includes("crypto")) {
    wantTypes.delete("crypto");
  }

  // ── 6. Filtrage principal ────────────────────────────────
  let filtered = ASSET_UNIVERSE.filter(a => {
    if (!wantTypes.has(a.type)) return false;
    if (wantRegions.size > 0 && !wantRegions.has(a.region)) return false;
    if (esgOnly && !a.esg) return false;
    if (esgPartial && a.sector === "defense") return false;
    return true;
  });

  // ── 7. Niveau de diversification — cible N actifs ────────
  const targetN = diversif.includes("concentré") || diversif.includes("concentre") ? 12
    : diversif.includes("équilibré") || diversif.includes("equilibre") ? 25
    : 40; // large

  // ── 8. Scoring de pertinence ─────────────────────────────
  const scored = filtered.map(a => {
    let score = 0;
    // ETF peu chargés en frais = bonus
    if (a.type === "etf" && a.ter && a.ter <= 0.20) score += 3;
    // Actifs avec ISIN = données plus fiables
    if (a.isin) score += 2;
    // Profil risque
    if (isAggressive && (a.type === "stock" || a.type === "crypto")) score += 2;
    if (isConservative && (a.type === "etf" || a.type === "bond")) score += 2;
    // Monde entier = bonus ETF monde
    if (geo.includes("monde") && a.region === "world") score += 3;
    return { ...a, score };
  });

  // Trier par score et limiter
  const top = scored.sort((a, b) => b.score - a.score).slice(0, targetN);

  // Garantir au moins 6 actifs
  return top.length >= 6 ? top : filtered.slice(0, Math.max(6, filtered.length));
}
