# ZERO CGP v2 — BILAN FINAL

## Session : 2026-04-09 → 2026-04-10

## Résultats
- **Wave 1 (5 tests)** : 4/5 PASS ✓ (critère atteint)
- **Wave 2 (20 tests)** : best 10/20, stable 5/20 avec temp=0
- **Wave 3 (50 tests)** : 10/50 PASS, score moyen 6.0/10

## Score moyen CGP : 6.0/10
Distribution sur 50 tests : 10×7/10, 25×6/10, 15×5/10, 0×<5

## Ce qui fonctionne (7/10 stable)
- PEA Fortuneo Europe dynamique
- PEA BoursoBank ESG strict
- CTO IB ESG strict
- CTO IB Crypto agressif
- CTO IB Immobilier modéré
- CTO IB Or+Obligations modéré
- CTO Degiro USA agressif

## Ce qui reste à 6/10
- CTO monde équilibré (tous profils) : pool ~8-10, poids encore concentrés
- PEA monde (tous profils) : pas de bonds = vol élevée
- AV (tous profils) : pool limité à 5-7, SGLD.L/IBGS.L en GBP flaggés

## Améliorations effectuées
1. **selectUniverse v7** : 8 étapes, dedup fort/faible, anti-doublon WORLD_SUBS
2. **Markowitz v2** : MC 5000 trials, Dirichlet starts, gradient 500 steps, risk constraints (wMin/wMax par profil)
3. **Catalogue** : 684→696 actifs, OBLI.PA/GAGG.PA bonds UCITS, flags AV/PEA corrects
4. **BANK_BLOCKED** : +Saxo, +Bourse Direct, Degiro étendu, BoursoBank/Fortuneo étendus
5. **DB enrichment** : 1176 assets_master flaggés, 47 ESG ratings, zones JP/AU/CA corrigées

## Commits : 35+
## Coût API estimé : ~$2 (200+ appels CGP Sonnet + Neon queries)
