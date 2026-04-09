#!/usr/bin/env node
/**
 * zerocgp_test15.mjs — 15 tests ciblés pour valider le nouvel optimiseur v6
 * 
 * Usage:
 *   1. Lance ton serveur: npm run dev
 *   2. Dans un autre terminal: node scripts/zerocgp_test15.mjs
 * 
 * Nécessite: ANTHROPIC_API_KEY dans .env ou en variable d'environnement
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { resolve } from "path";

// Charger .env si présent
try {
  const envPath = resolve(process.cwd(), ".env");
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const [key, ...val] = line.split("=");
    if (key && val.length) process.env[key.trim()] = val.join("=").trim().replace(/^["']|["']$/g, "");
  });
} catch {}

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("❌ ANTHROPIC_API_KEY manquant"); process.exit(1); }

const anthropic = new Anthropic({ apiKey: API_KEY });
const BASE = process.env.BASE_URL || "http://localhost:3000";

// ═══════════════════════════════════════════════════════════════
// 15 TESTS CIBLÉS — couvrent les 5 catégories de WARN principales
// ═══════════════════════════════════════════════════════════════

const TESTS = [
  // ── A: Doublons ETF/actions (problème #1) ─────────────────────
  {
    id: 1,
    label: "CTO IB ETF+actions monde agressif — doublons PANX+stocks",
    answers: {
      "1": "Plus de 10 ans",
      "2": "Agressif",
      "3": "Pas de limite",
      "4": "Pas de filtre ESG",
      "5": "ETF, Actions",
      "6": "Monde entier",
      "7": "Équilibré (8-10 actifs)",
      "8": "CTO",
      "9": "Interactive Brokers",
    },
    expect: "Pas de doublon ETF monde + constituants. Tech < 40%.",
  },
  {
    id: 2,
    label: "CTO Degiro ETF+actions monde dynamique large — overlap test",
    answers: {
      "1": "5 à 10 ans",
      "2": "Dynamique",
      "3": "-35%",
      "4": "Pas de filtre ESG",
      "5": "ETF, Actions",
      "6": "Monde entier",
      "7": "Large (15+ actifs)",
      "8": "CTO",
      "9": "Degiro",
    },
    expect: "15+ actifs, overlap ETF/stocks limité, concentration top3 < 50%.",
  },

  // ── B: Allocation incohérente avec profil (problème #2) ───────
  {
    id: 3,
    label: "AV BoursoBank monde DÉFENSIF obligations — doit avoir 40%+ bonds",
    answers: {
      "1": "2 à 5 ans",
      "2": "Conservateur",
      "3": "-10%",
      "4": "Pas de filtre ESG",
      "5": "ETF, Obligations",
      "6": "Monde entier",
      "7": "Équilibré (8-10 actifs)",
      "8": "Assurance-vie",
      "9": "BoursoBank",
    },
    expect: "Obligations >= 40%. Actions <= 35%. Pas de crypto.",
  },
  {
    id: 4,
    label: "CTO IB monde AGRESSIF — doit avoir 70%+ equity",
    answers: {
      "1": "Plus de 10 ans",
      "2": "Agressif",
      "3": "Pas de limite",
      "4": "Pas de filtre ESG",
      "5": "ETF, Actions",
      "6": "Monde entier",
      "7": "Large (15+ actifs)",
      "8": "CTO",
      "9": "Interactive Brokers",
    },
    expect: "Equity >= 70%. Obligations <= 15%. Bonne diversification sectorielle.",
  },
  {
    id: 5,
    label: "CTO TR monde MODÉRÉ — allocation équilibrée",
    answers: {
      "1": "5 à 10 ans",
      "2": "Modéré",
      "3": "-20%",
      "4": "Pas de filtre ESG",
      "5": "ETF, Obligations",
      "6": "Monde entier",
      "7": "Équilibré (8-10 actifs)",
      "8": "CTO",
      "9": "Trade Republic",
    },
    expect: "Equity 30-60%. Obligations 20-50%. Pas de surconcentration.",
  },

  // ── C: Sous-diversification PEA (problème #3) ────────────────
  {
    id: 6,
    label: "PEA BoursoBank monde agressif équilibré — min 6 actifs",
    answers: {
      "1": "Plus de 10 ans",
      "2": "Agressif",
      "3": "Pas de limite",
      "4": "Pas de filtre ESG",
      "5": "ETF",
      "6": "Monde entier",
      "7": "Équilibré (8-10 actifs)",
      "8": "PEA",
      "9": "BoursoBank",
    },
    expect: ">= 6 actifs. Pas de doublons MEUD/PANX/PUST au même poids.",
  },
  {
    id: 7,
    label: "PEA Fortuneo Europe dynamique large — diversification EU",
    answers: {
      "1": "5 à 10 ans",
      "2": "Dynamique",
      "3": "-35%",
      "4": "Pas de filtre ESG",
      "5": "ETF, Actions",
      "6": "Europe",
      "7": "Large (15+ actifs)",
      "8": "PEA",
      "9": "Fortuneo",
    },
    expect: "15+ actifs. Actions EU diversifiées. Pas de surpoids luxe/tech.",
  },

  // ── D: Concentration sectorielle tech (problème #4) ──────────
  {
    id: 8,
    label: "CTO IB USA agressif large — tech doit être < 40%",
    answers: {
      "1": "Plus de 10 ans",
      "2": "Agressif",
      "3": "Pas de limite",
      "4": "Pas de filtre ESG",
      "5": "ETF, Actions",
      "6": "USA / États-Unis",
      "7": "Large (15+ actifs)",
      "8": "CTO",
      "9": "Interactive Brokers",
    },
    expect: "Secteur tech < 40%. Diversification sectorielle. Top3 < 45%.",
  },

  // ── E: ESG strict (problème #5) ──────────────────────────────
  {
    id: 9,
    label: "CTO IB ESG strict monde dynamique — respect filtre ESG",
    answers: {
      "1": "5 à 10 ans",
      "2": "Dynamique",
      "3": "-35%",
      "4": "ESG strict",
      "5": "ETF, Actions",
      "6": "Monde entier",
      "7": "Équilibré (8-10 actifs)",
      "8": "CTO",
      "9": "Interactive Brokers",
    },
    expect: "Tous les actifs doivent être ESG. Pas de mega-cap tech non-ESG.",
  },

  // ── F: Marchés émergents ─────────────────────────────────────
  {
    id: 10,
    label: "CTO IB EM agressif large — concentration géo limitée",
    answers: {
      "1": "Plus de 10 ans",
      "2": "Agressif",
      "3": "Pas de limite",
      "4": "Pas de filtre ESG",
      "5": "ETF, Actions",
      "6": "Marchés émergents",
      "7": "Large (15+ actifs)",
      "8": "CTO",
      "9": "Interactive Brokers",
    },
    expect: ">= 40% EM. Pas de surconcentration Chine > 50%. Doublons EM limités.",
  },

  // ── G: Obligations seules ────────────────────────────────────
  {
    id: 11,
    label: "CTO IB obligations seules défensif — bonds only",
    answers: {
      "1": "Moins de 2 ans",
      "2": "Conservateur",
      "3": "-10%",
      "4": "Pas de filtre ESG",
      "5": "Obligations",
      "6": "Monde entier",
      "7": "Équilibré (8-10 actifs)",
      "8": "CTO",
      "9": "Interactive Brokers",
    },
    expect: "80%+ obligations. Pas d'actions. Vol faible.",
  },

  // ── H: Or + Immobilier ──────────────────────────────────────
  {
    id: 12,
    label: "CTO IB or+immo monde modéré — classes alternatives",
    answers: {
      "1": "5 à 10 ans",
      "2": "Modéré",
      "3": "-20%",
      "4": "Pas de filtre ESG",
      "5": "ETF, Obligations, Or / Matières premières, Immobilier",
      "6": "Monde entier",
      "7": "Équilibré (8-10 actifs)",
      "8": "CTO",
      "9": "Interactive Brokers",
    },
    expect: "Or >= 5%. REIT >= 5%. Obligations 20-50%. Bien diversifié.",
  },

  // ── I: Crypto mix ───────────────────────────────────────────
  {
    id: 13,
    label: "CTO+Crypto IB monde agressif — crypto plafonnée",
    answers: {
      "1": "Plus de 10 ans",
      "2": "Agressif",
      "3": "Pas de limite",
      "4": "Pas de filtre ESG",
      "5": "ETF, Actions, Crypto",
      "6": "Monde entier",
      "7": "Équilibré (8-10 actifs)",
      "8": "CTO, Crypto (Binance / Coinbase)",
      "9": "Interactive Brokers",
    },
    expect: "Crypto 5-20%. Equity >= 50%. Pas de surconcentration BTC.",
  },

  // ── J: Petit montant ────────────────────────────────────────
  {
    id: 14,
    label: "1000€ PEA BoursoBank monde agressif concentré",
    answers: {
      "1": "Plus de 10 ans",
      "2": "Agressif",
      "3": "Pas de limite",
      "4": "Pas de filtre ESG",
      "5": "ETF",
      "6": "Monde entier",
      "7": "Concentré (5 actifs)",
      "8": "PEA",
      "9": "BoursoBank",
    },
    capital: 1000,
    expect: "4-6 actifs. Tous PEA-éligibles. Pas de doublons indice.",
  },

  // ── K: Multi-support ────────────────────────────────────────
  {
    id: 15,
    label: "PEA+AV BoursoBank monde modéré large obligations",
    answers: {
      "1": "5 à 10 ans",
      "2": "Modéré",
      "3": "-20%",
      "4": "Pas de filtre ESG",
      "5": "ETF, Obligations",
      "6": "Monde entier",
      "7": "Large (15+ actifs)",
      "8": "PEA, Assurance-vie",
      "9": "BoursoBank",
    },
    expect: "Obligations 20-50%. 10+ actifs. Respect support PEA/AV.",
  },
];

// ═══════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════

async function callOptimize(test) {
  const body = { capital: test.capital || 50000, answers: test.answers };
  const res = await fetch(`${BASE}/api/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function evaluateWithClaude(test, result) {
  const maxSharpeResult = result.results?.find(r => r.rec) || result.results?.[1] || result.results?.[0];
  if (!maxSharpeResult) return { score: 0, ok: false, problems: ["No result returned"] };

  const weights = maxSharpeResult.weights || [];
  const weightStr = weights.map(w => `${w.symbol}(${w.weight}%)`).join(", ");

  const prompt = `Tu es un CGP expert Markowitz. Évalue ce portefeuille de 0 à 10.

TEST: ${test.label}
ATTENDU: ${test.expect}

RÉSULTAT (méthode Sharpe Maximum):
- Actifs: ${weights.length} → ${weightStr}
- Rendement: ${maxSharpeResult.ret}% | Vol: ${maxSharpeResult.vol}% | Sharpe: ${maxSharpeResult.sharpe}
- VaR 95%: ${maxSharpeResult.var95}%

PARAMÈTRES:
- Horizon: ${test.answers["1"]}
- Risque: ${test.answers["2"]}
- Perte max: ${test.answers["3"]}
- ESG: ${test.answers["4"]}
- Classes: ${test.answers["5"]}
- Zone: ${test.answers["6"]}
- Diversification: ${test.answers["7"]}
- Support: ${test.answers["8"]}
- Banque: ${test.answers["9"]}

Réponds UNIQUEMENT en JSON valide, sans backticks:
{"score":N,"ok":true/false,"problems":["pb1","pb2"]}

Score >= 7 = PASS. Vérifie: allocation cohérente avec le profil risque, pas de doublons ETF/actions, diversification suffisante, respect du support (PEA/AV/CTO), concentration sectorielle raisonnable.`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    return { score: 0, ok: false, problems: [`Claude eval error: ${e.message}`] };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  ZEROCGP v6 — 15 tests ciblés");
  console.log("═══════════════════════════════════════════════════\n");

  let pass = 0, warn = 0, fail = 0;
  const results = [];

  for (const test of TESTS) {
    process.stdout.write(`[${test.id}/15] ${test.label}... `);

    try {
      const optResult = await callOptimize(test);
      const maxSharpe = optResult.results?.find(r => r.rec) || optResult.results?.[1];
      const weights = maxSharpe?.weights || [];
      const nActifs = weights.length;
      const topW = weights.slice(0, 4).map(w => `${w.symbol}(${w.weight}%)`).join(", ");
      const sharpe = maxSharpe?.sharpe || 0;

      const evaluation = await evaluateWithClaude(test, optResult);
      const score = evaluation.score || 0;
      const status = score >= 7 ? "PASS" : score >= 4 ? "WARN" : "FAIL";

      if (status === "PASS") pass++;
      else if (status === "WARN") warn++;
      else fail++;

      console.log(`${status} [${score}/10]`);
      console.log(`  ${nActifs} actifs | S=${sharpe} | ${topW}`);
      if (evaluation.problems?.length) {
        evaluation.problems.slice(0, 2).forEach(p => console.log(`  ⚠ ${p.slice(0, 80)}`));
      }
      console.log();

      results.push({ id: test.id, label: test.label, score, status, nActifs, sharpe, problems: evaluation.problems });
    } catch (e) {
      fail++;
      console.log(`FAIL [erreur]`);
      console.log(`  ❌ ${e.message}\n`);
      results.push({ id: test.id, label: test.label, score: 0, status: "FAIL", problems: [e.message] });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // BILAN
  // ═══════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════");
  console.log(`  BILAN: ${pass} PASS | ${warn} WARN | ${fail} FAIL / 15`);
  console.log(`  Score >= 7: ${Math.round(pass / 15 * 100)}%`);
  console.log("═══════════════════════════════════════════════════");

  if (fail > 0) {
    console.log("\nÉCHECS:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`  [${r.score}] ${r.label}`);
      r.problems?.forEach(p => console.log(`    → ${p.slice(0, 100)}`));
    });
  }
  if (warn > 0) {
    console.log("\nWARNINGS:");
    results.filter(r => r.status === "WARN").forEach(r => {
      console.log(`  [${r.score}] ${r.label}`);
      r.problems?.slice(0, 1).forEach(p => console.log(`    → ${p.slice(0, 100)}`));
    });
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
