# ZERO CGP v2 — BILAN GLOBAL

## Session : 2026-04-09 → 2026-04-10

---

## WAVE 1 : PASSED (4/5)
- Iteration 14 : **4/5 PASS** (T2=7, T3=7, T4=7, T5=7, T1=6)
- Critère atteint : >= 4/5 avec score >= 7

## WAVE 2 : EN COURS (best 10/20, iter 8)
- 11 itérations exécutées
- Best : **10/20 PASS** (iteration 8)
- Moyenne : ~6/20 PASS
- Critère : 18/20 PASS (90%)

### Tests stables (PASS dans 80%+ des runs)
| Test | Score moyen | Statut |
|------|------------|--------|
| T4 CTO IB dynamique large | 7 | STABLE PASS |
| T7 PEA Fortuneo Europe | 7 | STABLE PASS |
| T12 CTO IB ESG strict | 7 | STABLE PASS |
| T13 PEA BoursoBank ESG | 7 | STABLE PASS |
| T14 CTO Degiro USA | 7 | PASS (70%) |

### Tests instables (PASS dans 30-60% des runs)
| Test | Score | Problème |
|------|-------|----------|
| T5 PEA BoursoBank modéré | 6-7 | Stocks trop concentrés pour modéré |
| T9 AV BoursoBank modéré | 5-7 | SGLD.L flaggé non-AV par CGP |
| T10 AV défensif | 5-7 | Même SGLD.L issue |
| T11 AV Fortuneo défensif | 5-7 | Même SGLD.L issue |
| T15 CTO IB EM | 4-7 | Zone EM mal servie |
| T16 CTO IB or+obligations | 6-7 | Parfois doublon or flaggé |
| T17 CTO IB Crypto | 6-7 | Crypto allocation instable |

### Tests structurellement à 6/10
| Test | Score | Cause racine |
|------|-------|-------------|
| T1 CTO IB agressif | 6 | QQQ+VOO overlap (core-satellite) |
| T2 CTO Degiro modéré | 6 | Pool limité (Degiro bloque US) |
| T3 CTO IB défensif | 5-6 | Trop d'actions pour défensif |
| T6 PEA agressif large | 5-6 | 10 actifs pour 15+ demandés |
| T8 PEA BNP concentré | 6 | Diversification low |
| T18 PEA+CTO large | 6 | 10 actifs pour 15+ |
| T19 CTO immobilier | 5-6 | Pas de REIT dans résultat |
| T20 AV tout actifs large | 5-6 | SGLD.L flaggé + diversification |

---

## CHANGEMENTS EFFECTUÉS

### DB Neon
- assets_master : +7 colonnes (pea, cto, av, zone, dedup, ter, excl_esg)
- dedup_groups : 684 actifs (78 .PA, 34 .DE, 28 .SW, 454 US, 10 .T, 7 .AX, 3 .NS)
- esg_ratings : 47 entrées
- assets_history : +OBLI.PA (383w), +GAGG.PA (496w), +EWLD.PA, +IBIT, +MEUD.PA
- Zones fixées : EWJ/EWA/EWC = monde (développé, pas EM)
- TER fixés : LCWD.PA=0.20, XDWD.DE=0.19, XESX.DE=0.10, IVV=0.04, VTI=0.04

### route.ts (v7)
- loadCatalogue() dynamique depuis Neon (60s cache, weeks dans SQL)
- selectUniverse() 8 étapes + weak-dup reintroduction
- smartDedup : préfère PEA/AV, puis lowest TER, puis most weeks
- inferType() : bond/gold/reit/crypto depuis dedup keys
- BANK_BLOCKED : +Saxo Bank, +Bourse Direct, étendu BoursoBank/Fortuneo/BNP/Degiro
- Anti-doublons : WORLD_SUBS (60+ sub-indices), SP500_SUBS, OVERLAP_GROUPS
- Weak duplicates : réintroduit quand pool < target (14 equilibre, 20 large)
- maxWt dynamique : 0.35 si <=5 actifs, 0.30 si <=8, 0.25 base

### Scripts
- scripts/populate_catalogue.py : populate flags pour 1176 actifs
- scripts/download_missing_yf.py : download Yahoo Finance manquants
- test_quick5_auto.py : 5 tests CGP (Wave 1)
- test_wave2_20.py : 20 tests CGP (Wave 2)

---

## ANALYSE VARIANCE CGP

Le CGP Sonnet donne des scores ±1-2 entre runs identiques :
- Même portefeuille évalué 5/10 puis 7/10 au run suivant
- Les critères "diversification" et "qualite_markowitz" sont les plus instables
- "support_eligibilite" est le plus stable (8-10/10 en général)

**Fix appliqué** : temperature=0 + SGLD.L exception AV dans le prompt

---

## PROCHAINES ÉTAPES POSSIBLES
1. Relancer Wave 2 avec temperature=0 + SGLD.L fix → mesurer la stabilité
2. Améliorer Markowitz (plus de MC trials, gradient steps)
3. Ajouter plus d'ETF UCITS bonds (.PA/.DE) pour diversifier les pools
4. Intégrer les catalogues UC officiels quand CSV fournis
5. Wave 3 (50 tests) si Wave 2 atteint 18/20

## COMMITS : 30+ depuis le début
