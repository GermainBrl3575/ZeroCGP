# ZERO CGP v2 -- Progress Log

## Session: 2026-04-09
## Current step: VAGUE 1 - Iteration 6 (score 6/10 consistent)

## Status Summary
- DB Migration: DONE (assets_master + dedup_groups + esg_ratings)
- selectUniverse() v7: DONE (complete rewrite, 8-step architecture)
- Dynamic catalogue: DONE (loadCatalogue from Neon)
- Wave 1: 0/5 PASS but all 5 tests score 6/10 (WARN, not FAIL)
- Wave 2/3: Not started

## Wave 1 Results (Iteration 6)
| Test | Score | Key Issue |
|------|-------|-----------|
| CTO IB aggressive | 6/10 | QQQ+VOO overlap, EWC overweight |
| PEA BoursoBank moderate | 6/10 | Vol 17.7% too high, too many stocks |
| AV BoursoBank defensive | 6/10 | Only 5 assets (need 8-10), SGLD.L AV debatable |
| PEA Fortuneo Europe | 6/10 | C50.PA + individual stocks overlap |
| CTO Degiro moderate | 6/10 | Only 5 assets (need 8-10), near-equal weights |

## Key Remaining Issues
1. **Pool too small**: Many portfolios have only 4-5 assets (target 8-10)
   - Root cause: aggressive anti-doublon + bond cap + limited AV-eligible ETFs
   - Fix: expand enrichment lists, relax bond cap when pool < 6
2. **Near-equal weights**: Markowitz gives ~22-24% to each (optimization failure with few assets)
   - Root cause: with only 4-5 assets, there's not enough freedom for differentiation
   - Fix: more assets in pool
3. **QQQ+VOO overlap (~40%)**: CGP agent always flags this
   - Could remove one for aggressive, or accept as "core-satellite"
4. **PEA moderate vol**: 17.7% > 12-15% target
   - Root cause: PEA can't have bonds, and stocks are volatile

## Architecture (v7)
```
ETAPE 1: baseFilter + smartDedup (1 per dedup, prefer PEA/AV)
ETAPE 2: WORLD anti-doublon (removes ALL sub-indices except aggressive)
ETAPE 3: EM anti-doublon (broad → remove single-country)
ETAPE 4: Core-satellite (defensive/moderate: 1 world, aggressive: SP500+NASDAQ)
ETAPE 4b: SP500 anti-doublon (removes sector/factor ETFs)
           Overlap groups (EM, EU, Dev, US bonds)
ETAPE 5: CTO/AV enrichment (VWO for non-aggressive, country ETFs for aggressive)
          AV enrichment (SGLD.L, XGLE.DE, EPRE.PA for small pools)
ETAPE 6: PEA enrichment (PAEEM, C50, MEUD, EPRE)
ETAPE 7: Bond auto-add (skip PEA), EUR_GOV max 1, bond cap 2-4
ETAPE 8: Fallback (relax zone if pool < 4)
```

## Commits (15 total)
- c199b39 feat: v6 rewrite
- 6195479 feat: v7 complete rewrite
- cb07ed2 fix: bond cap + minETFPct (latest)

## Next Steps
1. Expand pool for CTO/AV/PEA enrichment (add more assets)
2. Reduce anti-doublon aggressiveness (keep EWC, EWJ as complements)
3. Consider accepting QQQ+VOO overlap as intentional for aggressive
4. Address user request for catalogue scraping (deferred)
