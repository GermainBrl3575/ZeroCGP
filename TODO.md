# TODO — Zero CGP

## DB Cleanup (manual, non-urgent)

Crypto rows are orphaned after code removal. Safe to delete when convenient:

```sql
DELETE FROM dedup_groups WHERE symbol IN ('BTC-USD','ETH-USD','SOL-USD','BNB-USD','IBIT');
DELETE FROM assets_history WHERE symbol IN ('BTC-USD','ETH-USD','SOL-USD','BNB-USD','IBIT');
DELETE FROM assets_master WHERE symbol IN ('BTC-USD','ETH-USD','SOL-USD','BNB-USD','IBIT');
```

These rows don't cause harm (loadCatalogue loads them but `type === "crypto"` is filtered out in baseFilter). Cleanup is cosmetic.

## Future improvements

- [ ] Enrichir catalogue AV (6-8 actifs → 12+)
- [ ] Stocks PEA défensifs (alternatives aux bonds non-éligibles PEA)
- [ ] Zone Asie-Pacifique (5 ETFs → 8+)
- [ ] Optimiser BANK_BLOCKED Degiro
- [ ] CAPM dynamique (rf, beta, ERP à la volée)
- [ ] Cron job mise à jour assets_history (Vercel cron + Yahoo Finance)
- [ ] ISINs manquants (572/684 sans ISIN dans assets_master)
