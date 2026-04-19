# ZERO CGP — BILAN

## v3.1 — 2026-04-20 (stabilized, crypto removed)

### Wave 2 Results (Sonnet API judge, 20 tests)
- **20/20 PASS** ✓ (target: 18/20)
- **Score moyen: 7.05/10**
- **Distribution: 1×8, 19×7**
- **0 FAIL, 0 WARN**
- **Known variance: T1 (CTO IB agressif monde) oscillates 6-7 between runs** (Sonnet temp=0.3 borderline on 5-asset maxsharpe)

### Changes from v3.0
- Removed cryptocurrency support (BTC/ETH/SOL/BNB/IBIT) from optimizer
- Removed "Binance / Coinbase" from bank list
- Removed crypto from Q5 (asset classes), Q8 (supports), SupportBuilder
- Tested and rejected adaptive wMax cap (pool>=12→0.20): fixed T1 but caused regressions on T5/T12
- Final: flat WMAX_BY_TYPE.etf=0.35, no adaptive cap

### Baseline comparison
| Metric | v2 (Apr 10) | v3.0 (Apr 19) | **v3.1 (Apr 20)** |
|--------|------------|---------------|-------------------|
| Wave2 PASS | 10/20 | 18/20* | **20/20** |
| Score avg | 6.0/10 | 6.9/10 | **7.05/10** |
| Max ret | 30%+ | 15.8% | **15.8%** |
| FAIL | ~5 | 0 | **0** |
| Determinism | no | yes | **yes** |

*v3.0 18/20 included 1 crypto test (now removed)

---

## v3.0 — 2026-04-19 (Markowitz rewrite)

### Core fixes
1. **Geometric returns** with Bayes-Stein shrinkage (α = 0.4/(1+T/200))
2. **Pairwise covariance** + Ledoit-Wolf (no T=min truncation)
3. **λ-only risk aversion** (defensive=12, moderate=6, balanced=3, aggressive=1.5)
4. **Seeded RNG** mulberry32(42) for determinism
5. Removed: proxy substitution, diversity penalty, phase 3 re-run, profile-based wMin/wMax

### Files
- `lib/markowitz_v3.ts` — computeMoments + markowitz_v3 solver (349 lines)
- `__tests__/markowitz_v3.test.ts` — 28 unit tests
- `app/api/optimize/route.ts` — integration

---

## v2 — 2026-04-09 → 2026-04-10

### Results (historical)
- Wave 1: 4/5 PASS | Wave 2: 10/20 PASS | Wave 3: 10/50 PASS
- Score avg: 6.0/10
- Problems: arithmetic mu ×52, T=min truncation, proxy substitution ρ=1, stacked constraints
