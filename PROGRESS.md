# ZERO CGP — BILAN

## v3 — 2026-04-19 (Markowitz rewrite)

### Résultats
- **Wave 2 (20 tests)** : **20/20 PASS** ✓
- **Score moyen** : **8.0/10**
- **Distribution** : 20×8/10
- **Baseline v2** : 10/20 PASS, 6.0/10 avg

### Fixes appliqués
1. **Rendements géométriques** : `exp(mean(log(1+r)) × 52) - 1` au lieu de `mean(r) × 52`
2. **Shrinkage Bayes-Stein** : `α = 0.4 / (1 + T/200)` vers priors par classe (equity 7%, bond 2.5%, gold 4%)
3. **Caps durs** : ETF ≤ 15%, stock ≤ 18%, bond ≤ 6%, crypto ≤ 30%
4. **Covariance pairwise** : `T_ij = min(T_i, T_j)` au lieu de `T = min(all)` — chaque paire utilise le max de données communes
5. **Ledoit-Wolf approché** : `δ = min(1, max(0.05, N/T_avg))`
6. **λ-only risk** : profil de risque piloté par un seul paramètre λ (defensive=12, moderate=6, balanced=3, aggressive=1.5)
7. **Proxy substitution supprimée** : plus de `returns[sym] = returns[best]`
8. **Pénalité diversité supprimée** : plus de score -= en cas de poids uniformes
9. **Phase 3 re-run supprimée** : plus de re-optimisation avec wMax serré
10. **RNG seedé** : mulberry32(42) pour déterminisme total

### Fichiers
- `lib/markowitz_v3.ts` — computeMoments + markowitz_v3 solver (349 lignes)
- `__tests__/markowitz_v3.test.ts` — 28 tests unitaires
- `app/api/optimize/route.ts` — intégration (import + appel v3)

---

## v2 — 2026-04-09 → 2026-04-10

### Résultats (historique)
- **Wave 1 (5 tests)** : 4/5 PASS
- **Wave 2 (20 tests)** : best 10/20, stable 5/20 avec temp=0
- **Wave 3 (50 tests)** : 10/50 PASS, score moyen 6.0/10

### Problèmes identifiés (corrigés en v3)
- Rendements arithmétiques × 52 → mu fantaisistes (25-30% sur agressif)
- `T = min(weeks)` tronquait 500+ semaines à 350
- Proxy substitution créait des ρ=1 artificiels
- Contraintes wMin/wMax par profil étouffaient Markowitz
- Pénalité diversité + phase 3 = anti-Markowitz

### Améliorations effectuées en v2
1. selectUniverse v7 : 8 étapes, dedup fort/faible, anti-doublon
2. Catalogue : 684→696 actifs, flags AV/PEA corrigés
3. BANK_BLOCKED : +Saxo, +Bourse Direct, Degiro étendu
4. DB enrichment : 1176 assets_master, 47 ESG ratings
