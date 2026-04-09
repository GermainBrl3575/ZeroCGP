# ZERO CGP v2 -- Progress Log

## Session: 2026-04-09 → 2026-04-10
## Current step: VAGUE 1 - Iteration 10

## Wave 1 Results (best scores per test)
| Test | Best Score | Status |
|------|-----------|--------|
| T1 CTO IB aggressive | 7/10 (iter 7) → 6/10 (iter 10) | WARN |
| T2 PEA BoursoBank moderate | 7/10 (iter 9) | PASS (was) |
| T3 AV BoursoBank defensive | 6/10 | WARN |
| T4 PEA Fortuneo Europe | 6/10 | WARN |
| T5 CTO Degiro moderate | 7/10 (iter 10) | PASS |

## Key Fix History
- iter 1-3: Anti-doublon too weak → US sector flooding
- iter 4-6: Anti-doublon too aggressive → pool too small (4-5 assets)
- iter 7: Expanded dedup_groups 175→684 → more assets available
- iter 8-10: Fixed SGLD.L/IGLN.L for AV gold, VOO/IVV dedup, Degiro UCITS

## Recurring Issues (all tests 6/10)
1. **qualite_markowitz 4-5/10**: Near-equal weights with few assets
2. **doublon_indices 5-6/10**: Partial overlaps (World ETF + individual stocks)
3. **coherence_risque**: Vol too high for moderate (17.8% PEA)

## Architecture Summary
- 684 assets in dedup_groups
- loadCatalogue from Neon (60s cache)
- selectUniverse v7: 8-step architecture
- Static catalogue fallback with 100+ curated assets
- inferType from dedup keys for bond/gold/reit/crypto

## Commits: 20+ since start
