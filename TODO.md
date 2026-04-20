# TODO — Zero CGP

## DB Cleanup (manual, non-urgent)

Crypto rows orphaned after code removal:
```sql
DELETE FROM dedup_groups WHERE symbol IN ('BTC-USD','ETH-USD','SOL-USD','BNB-USD','IBIT');
DELETE FROM assets_history WHERE symbol IN ('BTC-USD','ETH-USD','SOL-USD','BNB-USD','IBIT');
DELETE FROM assets_master WHERE symbol IN ('BTC-USD','ETH-USD','SOL-USD','BNB-USD','IBIT');
```

## Future improvements

### Solver
- [ ] Black-Litterman pour intégrer des views (permettrait factor ETFs sans biais historique)
- [ ] Shrinkage adaptatif sur T < 400w (actuellement α=0.4/(1+T/200), pourrait être plus agressif)
- [ ] CAPM dynamique (rf, beta, ERP calculés à la volée)

### Catalogue
- [ ] Enrichir catalogue AV (actuellement 6-8 actifs, limité par plateforme)
- [ ] Factor ETFs (MinVol, Momentum, Value) — à réintroduire quand Black-Litterman disponible
- [ ] ETFs régionaux (Japan, EM Asie, EM Latam) — safe à ajouter si historique > 700w
- [ ] ISINs manquants (572/684 sans ISIN dans assets_master)

### Testing
- [ ] Moyenner 3 runs Sonnet sur les cas borderline (T1, T10, T11) pour réduire variance juge
- [ ] selectUniverse refonte complète (trop de conditions imbriquées, 800 lignes)
- [ ] Cron job mise à jour assets_history (Vercel cron + Yahoo Finance)

### Learnings from DB enrichment attempt
- Factor ETFs (MSCI_WORLD_MINVOL etc.) : historiques post-2014 biaisent mu vers le haut
- TPXH.PA (Japan EUR hedgé) : siphonne le budget sur PEA modéré
- CACC.PA/C40.PA : créaient un doublon CAC40 non détecté par smartDedup
- Règle : enrichir avec des compléments géographiques (zones/pays), PAS des variantes factor
