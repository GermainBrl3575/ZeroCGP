# ZERO CGP — BILAN

## v3.2 — 2026-04-20 (adaptive wMax + DB rollback)

### Wave 2 (20 tests, Sonnet API)
- **17/18 PASS hors infra (94%)** | 1 WARN (variance Sonnet T11) | 2 FAIL infra (timeout)
- Score moyen: **7.0/10** (hors infra)
- Distribution: 1×8, 16×7, 1×6 (hors 2 infra)

### Wave 3 (50 tests, Sonnet API) — baseline pré-fix
- 40/50 PASS (80%) | 6.9/10 avg
- À re-mesurer avec le fix Large-only

### Changes from v3.1
- **Enrichissement DB (22 dedup_keys)** : ROLLBACK complet (684→706→684)
  - Factor ETFs (XDEQ/XDEM/XDEV/XDWH) biaisaient mu avec historiques post-2014
  - TPXH.PA/DJE.PA siphonnaient le budget Markowitz sur PEA modéré
  - CACC.PA/C40.PA créaient un doublon CAC40/CAC40_ESG
  - Apprentissage : enrichir avec des compléments géographiques, pas des variantes factor
- **wMax adaptatif Q7=Large** : cap 15% (pool≥12) / 20% (pool≥8) quand user demande "Large (15+ actifs)"
  - Résultat : 5-8 actifs → 11-14 actifs sur les profils Large
  - Aucun impact sur Concentrated ou Balanced (Markowitz décide librement)
- **Tentative cap Balanced (0.22)** : REVERT — dégradait T3 défensif, T12 ESG
  - Conclusion : capper en Balanced contredit Markowitz quand un ETF broad doit dominer

### Baseline comparison

| Metric | v2 (Apr 10) | v3.1 (Apr 20) | **v3.2 (Apr 20)** |
|--------|------------|---------------|-------------------|
| Wave2 PASS | 10/20 | 20/20 | **17/18 hors infra** |
| Wave2 avg | 6.0 | 7.05 | **7.0** |
| Wave3 PASS | 10/50 | 40/50 | **TBD** |
| Determinism | no | yes | **yes** |
| Q7=Large actifs | 5-8 | 5-8 | **11-14** |

---

## v3.1 — 2026-04-20 (stable baseline)

- Wave2: 20/20 PASS, 7.05/10
- Wave3: 40/50 PASS, 6.9/10 (83% hors infra)
- Crypto removed, flat wMax, no adaptive cap

## v3.0 — 2026-04-19 (Markowitz rewrite)

- Geometric returns + Bayes-Stein shrinkage
- Pairwise covariance + Ledoit-Wolf
- λ-only risk aversion, seeded RNG, no hacks

## v2 — 2026-04-10 (historical)

- Wave2: 10/20 | Wave3: 10/50 | Avg: 6.0/10
