# ZERO CGP v2 -- Progress Log

## Session: 2026-04-09 → 2026-04-10
## Current step: VAGUE 2 - Iteration 4

## Wave 1: PASSED (4/5, iteration 14)
## Wave 2: 5/20 best (iteration 3), target 18/20

## Wave 2 Detail (iteration 3)
| # | Test | Score | Status |
|---|------|-------|--------|
| 1 | CTO IB ETF monde agressif | 6 | WARN |
| 2 | CTO Degiro ETF monde modere | 6 | WARN |
| 3 | CTO IB ETF monde defensif obligations | 6 | WARN |
| 4 | CTO IB ETF actions monde dynamique large | 6 | WARN |
| 5 | PEA BoursoBank ETF monde modere | 6 | WARN |
| 6 | PEA BoursoBank ETF monde agressif large | 6 | WARN |
| 7 | PEA Fortuneo ETF Europe dynamique | **7** | **PASS** |
| 8 | PEA BNP ETF monde modere concentre | 6 | WARN |
| 9 | AV BoursoBank ETF monde modere obligations | 6 | WARN |
| 10 | AV BoursoBank obligations seules defensif | **7** | **PASS** |
| 11 | AV Fortuneo ETF monde defensif | **7** | **PASS** |
| 12 | CTO IB ESG strict monde dynamique | 6 | WARN |
| 13 | PEA BoursoBank ESG strict monde dynamique | **7** | **PASS** |
| 14 | CTO Degiro ETF actions USA agressif | **7** | **PASS** |
| 15 | CTO IB ETF EM dynamique | 4 | FAIL |
| 16 | CTO IB ETF or obligations monde modere | 6 | WARN |
| 17 | CTO IB Crypto monde agressif | 6 | WARN |
| 18 | PEA+CTO BoursoBank monde dynamique large | 6 | WARN |
| 19 | CTO IB ETF immobilier monde modere | 6 | WARN |
| 20 | AV BoursoBank tout actifs monde modere large | 6 | WARN |

## Key Blockers for Wave 2
1. **14 tests at 6/10**: Systematic diversification penalty (5-8 assets for 8-10 requested)
2. **EM test FAIL**: SGLD.L + EWJ in EM portfolio (zone mismatch)
3. **Large 15+ tests**: Only 10 assets delivered (enrichment insufficient)
4. **CGP agent variance**: Same portfolio scores 6 or 7 depending on run

## Architecture
- 684 assets in dedup_groups (78 .PA, 34 .DE, 28 .SW, 454 US, etc.)
- selectUniverse v7.1: 8-step with overlap groups
- Dynamic catalogue from Neon (60s cache)
- CGP evaluation prompt calibrated for realistic scoring
