# ZERO CGP v2 -- Progress Log

## Session started: 2026-04-09

## Current step: VAGUE 1 - Iteration 4

## Phase 1: DB Migration -- DONE
- [x] ALTER TABLE assets_master (pea, cto, av, zone, dedup, ter, excl_esg)
- [x] CREATE TABLE dedup_groups (175 entries)
- [x] CREATE TABLE esg_ratings (47 entries)
- [x] populate_catalogue.py run (1176 assets updated)

## Phase 2: Rewrite route.ts -- DONE (v7)
- [x] loadCatalogue() from Neon (INNER JOIN dedup_groups)
- [x] inferType() for bond/gold/reit/crypto from dedup keys
- [x] selectUniverse() 8-step architecture (complete rewrite)
- [x] smartDedup with PEA/AV preference
- [x] WORLD_SUBS anti-doublon (removes ALL sub-indices)
- [x] SP500_SUBS anti-doublon (removes sector/factor ETFs)
- [x] OVERLAP_GROUPS dedup (EM broad, US bonds, EU, Dev ex-US)
- [x] PEA no bonds (regulatory)
- [x] AV enrichment with SGLD.L/XGLE.DE/EPRE.PA

## Wave 1 (5 tests) - target 4/5 PASS
- Iteration 1: 1/5 PASS (20%) -- US sector flooding, AV 4 assets only
- Iteration 2: 0/5 PASS (0%) -- VEA/VGK overlap, 100% US for CTO monde
- Iteration 3: 0/5 PASS (0%) -- Still VGK/VEA overlap, AGG/BND dup, VWO/PAEEM dup
- Iteration 4: 0/5 PASS (0%) -- SP500 sub-cleanup not working despite correct dedup keys

## Key remaining bugs
1. CTO IB aggressive: XLK/VUG/VTV/SCHD still present alongside VOO despite SP500_SUBS cleanup
2. PEA moderate: 60% stocks, vol 17.8% (target 12-15%)
3. PEA Europe: 100% stocks, no ETFs (C50.PA missing)
4. CTO Degiro moderate: VWO + PAEEM.PA both present (overlap dedup not working)

## Commits
- c199b39 feat: v6 rewrite - dynamic catalogue from Neon
- b192d81 fix: restrict catalogue to curated dedup_groups
- e8839ab fix: infer types from dedup keys
- 3d16fab fix: geographic diversity + AV enrichment
- 26be75e fix: US sector cleanup when MSCI_WORLD present
- 32f9559 fix: overlap groups for EU/Dev ETFs
- 946f5de fix: final overlap cleanup after enrichment
- 70834c4 fix: aggressive anti-doublon for world sub-regions
- 6195479 feat: complete selectUniverse() v7 rewrite
- 72ad7b7 fix: SP500 sub-index cleanup + overlap dedup

## Hypothesis for bug #1
SP500_SUBS cleanup code IS in place and dedup keys ARE correct.
Possible cause: the cleanup runs but then enrichment step 5/6 re-adds them,
OR the smart dedup merges them with different dedup keys.
Need to add console.log to trace or restructure to ensure cleanup runs LAST.
