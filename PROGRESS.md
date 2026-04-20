# ZERO CGP — BILAN

## v3.1 — 2026-04-20 (production-ready)

### Wave 2 (20 tests, Sonnet API judge)
- **20/20 PASS** ✓ | Score moyen: **7.05/10** | Distribution: 1×8, 19×7
- Known variance: T1 (CTO IB agressif) oscillates 6-7 between runs

### Wave 3 (50 tests, Sonnet API judge)
- **40/50 PASS** (80%) | Score moyen: **6.9/10** | Distribution: 1×8, 39×7, 8×6, 2×0
- **83% PASS hors infra** (40/48, 2 timeouts Sonnet)

### Wave 3 — Analyse des 10 non-PASS

**Structurels (4) — limites produit connues, pas des bugs :**
- T3 CTO IB défensif monde (6/10) : vol 9.9% haute pour défensif, λ=12 met 55% equity
- T15 PEA BB défensif monde (6/10) : PEA sans obligations = vol structurellement élevée (16.7%)
- T24 AV BB agressif monde (6/10) : pool AV limité à 6 actifs, Sharpe plafonné
- T38 CTO IB oblig seules (6/10) : Sharpe négatif (-0.09) car rendement bonds < rf 3%

**Pools régionaux limités (2) :**
- T32 CTO IB USA modéré (6/10) : pool mono-zone, diversification limitée
- T33 CTO IB Asie dynamique (6/10) : 5 actifs seulement en zone Asie-Pacifique

**Variance juge Sonnet (2) — borderline 6/7 :**
- T20 AV BB dynamique monde (6/10) : pool 6 actifs, Sharpe 0.50, jugement borderline
- T43 CTO TR monde modéré (6/10) : score identique à d'autres modérés qui passent à 7

**Infra (2) — pas liés au solver :**
- T27 CTO Degiro ESG strict modéré : timeout Sonnet API (read operation timed out)
- T31 PEA BB Europe modéré : eval fail (Sonnet API error)

### Baseline comparison

| Metric | v2 (Apr 10) | **v3.1 (Apr 20)** | Δ |
|--------|------------|-------------------|---|
| Wave2 PASS | 10/20 (50%) | **20/20 (100%)** | +10 |
| Wave2 avg | 6.0/10 | **7.05/10** | +1.05 |
| Wave3 PASS | 10/50 (20%) | **40/50 (80%)** | +30 |
| Wave3 avg | 6.0/10 | **6.9/10** | +0.9 |
| Max ret | 30%+ | **15.8%** | fixed |
| Determinism | no | **yes** (mulberry32) | fixed |
| FAIL (score < 5) | ~15 | **0** | fixed |

---

## Architecture v3

### Core fixes (from v2)
1. **Geometric returns** + Bayes-Stein shrinkage (α = 0.4/(1+T/200))
2. **Pairwise covariance** + Ledoit-Wolf (δ = min(1, max(0.05, N/T_avg)))
3. **λ-only risk aversion** (defensive=12, moderate=6, balanced=3, aggressive=1.5)
4. **Seeded RNG** mulberry32(42) for determinism
5. **Crypto removed** from optimizer (BTC/ETH/SOL/BNB/IBIT)
6. Removed: proxy substitution, diversity penalty, phase 3 re-run, profile-based wMin/wMax
7. Tested and rejected: adaptive wMax cap (caused regressions T5/T12)

### Key files
- `lib/markowitz_v3.ts` — computeMoments + markowitz_v3 solver (349 lines)
- `__tests__/markowitz_v3.test.ts` — 28 unit tests
- `app/api/optimize/route.ts` — selectUniverse + integration
- `lib/optimize.ts` — shared pure functions (exported for testing)

### Chantiers d'amélioration futurs
- Enrichir le catalogue AV (actuellement 6-8 actifs, limité par plateforme)
- Ajouter des stocks PEA pour défensif (bonds non-éligibles PEA → besoin d'alternatives défensives)
- Enrichir zone Asie-Pacifique (actuellement 5 ETFs, insuffisant pour diversification)
- Optimiser le pool Degiro (BANK_BLOCKED très long, réduit le pool effectif)
- CAPM dynamique (risk-free rate, beta, ERP calculés à la volée)

---

## v2 — 2026-04-09 → 2026-04-10 (historical)

- Wave 1: 4/5 | Wave 2: 10/20 | Wave 3: 10/50 | Avg: 6.0/10
- Problems: arithmetic mu ×52, T=min truncation, proxy ρ=1, stacked constraints
