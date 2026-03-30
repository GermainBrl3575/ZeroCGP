#!/usr/bin/env python3
"""
Zero CGP — Mise à jour hebdomadaire des données de marché via Yahoo Finance
Génère lib/marketData.ts avec rendements, volatilités et corrélations actualisés
"""

import yfinance as yf
import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta
import sys
import time

# ── Univers complet à mettre à jour ──────────────────────────
SYMBOLS = [
    # ETF
    "IWDA.AS","VWCE.DE","CSPX.AS","EQQQ.DE","SWRD.PA","SUSW.PA","PAEEM.PA",
    "SXRT.DE","EXW1.DE","XLK","XLF","XLV","XLE","XLI","SOXX","SMH",
    "ICLN","ARKK","BOTZ","DRIV",
    "IBGL.AS","TLT","HYG","LQD","EMB",
    "EPRE.PA","IQQP.DE","AMT","PLD","EQIX","O",
    "SGLD.L","CMOD.L",
    # US Tech
    "AAPL","MSFT","NVDA","AMZN","GOOGL","META","TSLA","AVGO",
    "AMD","QCOM","TXN","AMAT","LRCX","KLAC","CRM","ADBE","NFLX",
    "NOW","SNOW","DDOG","CRWD","ZS","NET","MU","INTC",
    # US Finance
    "JPM","V","MA","GS","BRK-B","MS","BAC","BX","SPGI","MCO","PYPL","COIN","SQ",
    # US Santé
    "UNH","JNJ","LLY","PFE","MRK","ABBV","AMGN","GILD","REGN","VRTX","MRNA","ISRG","TMO","CI",
    # US Conso / Industriel
    "HD","WMT","PG","KO","PEP","COST","MCD","SBUX","NKE","DIS",
    "BA","GE","CAT","HON","RTX","LMT","NOC","GD","UPS","DE",
    "XOM","CVX","LIN","APD","FCX","NEE","T","VZ","TMUS",
    # UK / France / Allemagne
    "AZN.L","GSK.L","RIO.L","BA.L","RR.L","LSEG.L","REL.L","NG.L",
    "MC.PA","RMS.PA","OR.PA","SU.PA","AIR.PA","SAF.PA","TTE.PA","BNP.PA","STM.PA",
    "SAP.DE","ASML.AS","ALV.DE","SIE.DE","IFX.DE","ADS.DE","MUV2.DE","BAS.DE",
    # Suisse / Nordiques / Autres Europe
    "NESN.SW","ROG.SW","NOVN.SW","CFR.SW","ZURN.SW","ABBN.SW","SIKA.SW","LONN.SW",
    "NOVO-B.CO","DSV.CO","ORSTED.CO","EQNR.OL","NESTE.HE",
    "ENI.MI","RACE.MI","UCG.MI","SAN.MC","IBE.MC","AMS.MC",
    # Asie
    "7203.T","6758.T","7974.T","9432.T","8035.T","6861.T",
    "005930.KS","000660.KS","2330.TW","2454.TW",
    "9988.HK","700.HK","3690.HK","9618.HK","1299.HK",
    "TCS.NS","INFY.NS","HDFCBANK.NS",
    "BHP.AX","CBA.AX","CSL.AX","ANZ.AX","MQG.AX",
    "D05.SI","SEA","CHKP","CYBR",
    # Émergents
    "VALE3.SA","PETR4.SA","WEGE3.SA","AMXL.MX","2222.SR","NPSNY","BBCA.JK",
    "SHOP.TO","RY.TO","CNR.TO","BAM.TO",
    # Crypto
    "BTC-EUR","ETH-EUR","SOL-EUR","BNB-EUR","XRP-EUR","ADA-EUR","AVAX-EUR",
]

def fetch_data(symbols, period="5y", batch_size=20):
    """Télécharge les cours historiques par batch pour éviter les timeouts"""
    all_data = {}
    total = len(symbols)

    for i in range(0, total, batch_size):
        batch = symbols[i:i+batch_size]
        print(f"  Batch {i//batch_size+1}/{(total+batch_size-1)//batch_size}: {', '.join(batch[:3])}...")
        try:
            raw = yf.download(
                batch,
                period=period,
                interval="1mo",
                auto_adjust=True,
                progress=False,
                threads=True,
                timeout=30,
            )
            if raw.empty:
                continue

            closes = raw["Close"] if "Close" in raw else raw
            if isinstance(closes, pd.Series):
                closes = closes.to_frame(name=batch[0])

            for sym in batch:
                if sym in closes.columns:
                    series = closes[sym].dropna()
                    if len(series) >= 12:
                        all_data[sym] = series
        except Exception as e:
            print(f"  ⚠️  Batch error: {e}")
            # Essayer symbole par symbole pour ce batch
            for sym in batch:
                try:
                    d = yf.download(sym, period=period, interval="1mo",
                                   auto_adjust=True, progress=False, timeout=15)
                    if not d.empty and len(d) >= 12:
                        col = "Close" if "Close" in d else d.columns[0]
                        all_data[sym] = d[col].dropna()
                except:
                    pass
        time.sleep(0.5)  # Rate limiting respectueux

    return all_data

def compute_stats(price_series):
    """Calcule rendement annuel et volatilité annualisée depuis les cours mensuels"""
    if len(price_series) < 12:
        return None, None
    returns = price_series.pct_change().dropna()
    if returns.empty or returns.std() == 0:
        return None, None
    annual_ret = float(returns.mean() * 12)
    annual_vol = float(returns.std() * np.sqrt(12))
    # Sanity checks
    if abs(annual_ret) > 3.0 or annual_vol > 3.0 or annual_vol <= 0:
        return None, None
    return round(annual_ret, 4), round(annual_vol, 4)

def main():
    print(f"\n🔄 Zero CGP — Market Data Update")
    print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"📊 Symbols to fetch: {len(SYMBOLS)}\n")

    # Télécharger les données
    print("📥 Fetching Yahoo Finance data...")
    price_data = fetch_data(SYMBOLS)
    print(f"✅ Got data for {len(price_data)}/{len(SYMBOLS)} symbols\n")

    # Calculer les statistiques
    ret_data = {}
    vol_data = {}
    failed = []

    for sym in SYMBOLS:
        if sym in price_data:
            ret, vol = compute_stats(price_data[sym])
            if ret is not None:
                ret_data[sym] = ret
                vol_data[sym] = vol
            else:
                failed.append(sym)
        else:
            failed.append(sym)

    print(f"✅ Computed stats for {len(ret_data)} symbols")
    if failed:
        print(f"⚠️  Failed ({len(failed)}): {', '.join(failed[:10])}{'...' if len(failed)>10 else ''}")

    # Générer le fichier TypeScript
    now = datetime.now().strftime("%Y-%m-%d")

    ts_lines = [
        f'// Auto-generated by Zero CGP Market Data Updater',
        f'// Last update: {now} via Yahoo Finance (5Y monthly returns)',
        f'// DO NOT EDIT MANUALLY — updated every Sunday by GitHub Actions',
        f'',
        f'export const MARKET_DATA_UPDATED = "{now}";',
        f'export const MARKET_DATA_COVERAGE = {len(ret_data)};',
        f'',
        f'// Annual returns (5Y average, updated weekly)',
        f'export const HISTORICAL_RETURNS: Record<string, number> = {{',
    ]

    for sym, ret in sorted(ret_data.items()):
        ts_lines.append(f'  "{sym}": {ret},')

    ts_lines += [
        '};',
        '',
        '// Annual volatility (5Y, annualized from monthly, updated weekly)',
        'export const HISTORICAL_VOLS: Record<string, number> = {',
    ]

    for sym, vol in sorted(vol_data.items()):
        ts_lines.append(f'  "{sym}": {vol},')

    ts_lines += [
        '};',
        '',
        '// Helper functions',
        'export function getAnnualReturn(symbol: string, fallback = 0.10): number {',
        '  const base = symbol.split(".")[0].split("-")[0].toUpperCase();',
        '  return HISTORICAL_RETURNS[symbol] ?? HISTORICAL_RETURNS[base] ?? fallback;',
        '}',
        '',
        'export function getAnnualVol(symbol: string, fallback = 0.25): number {',
        '  const base = symbol.split(".")[0].split("-")[0].toUpperCase();',
        '  return HISTORICAL_VOLS[symbol] ?? HISTORICAL_VOLS[base] ?? fallback;',
        '}',
    ]

    output = '\n'.join(ts_lines) + '\n'

    with open('lib/marketData.ts', 'w') as f:
        f.write(output)

    print(f"\n✅ lib/marketData.ts generated")
    print(f"   Coverage: {len(ret_data)}/{len(SYMBOLS)} symbols")
    print(f"   Date: {now}")

    # Stats de qualité
    avg_ret = np.mean(list(ret_data.values()))
    avg_vol = np.mean(list(vol_data.values()))
    print(f"   Avg return: {avg_ret:.1%}/year")
    print(f"   Avg vol:    {avg_vol:.1%}/year")
    print(f"\n🚀 Done! Vercel will redeploy automatically after git push.\n")

if __name__ == "__main__":
    main()
