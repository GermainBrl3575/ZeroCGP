# Zero CGP — Market Data Scripts

## Mise à jour automatique
Les données de marché sont mises à jour **automatiquement chaque dimanche à 6h UTC**
via GitHub Actions. Rien à faire manuellement.

## Déclencher une mise à jour manuelle
1. Aller sur https://github.com/GermainBrl3575/ZeroCGP/actions
2. Cliquer sur "📈 Update Market Data Weekly"
3. Cliquer "Run workflow" → "Run workflow"
4. La mise à jour se fait en ~5 minutes
5. Vercel redéploie automatiquement

## Lancer localement
```bash
pip install yfinance pandas numpy
python scripts/update_market_data.py
```

## Ce que fait le script
- Télécharge 5 ans de cours mensuels pour ~150 actifs via Yahoo Finance
- Calcule le rendement annuel moyen et la volatilité annualisée
- Génère lib/marketData.ts avec les nouvelles valeurs
- GitHub Actions commit et push → Vercel redéploie automatiquement
