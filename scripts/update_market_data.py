#!/usr/bin/env python3
"""
Zero CGP — Mise à jour hebdomadaire des données de marché
Stocke les vraies performances par période (1M, 6M, 1A, 5A, 10A)
calculées depuis les cours historiques réels Yahoo Finance
"""
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime
import time, warnings
warnings.filterwarnings("ignore")

SYMBOLS = [
  "IWDA.AS","VWCE.DE","CSPX.AS","EQQQ.DE","MEUD.PA","SXRT.DE","EXW1.DE",
  "XDWD.DE","SUSW.PA","PAEEM.PA","IEMM.L","XLK","XLF","XLV","XLE","XLI",
  "SOXX","SMH","ARKK","BOTZ","ICLN","DRIV",
  "IBGL.AS","AGGH.L","TLT","HYG","LQD","EMB","DBZB.DE",
  "EPRE.PA","IQQP.DE","SGLD.L","CMOD.L","AIGA.DE",
  "AAPL","MSFT","NVDA","AMZN","GOOGL","META","TSLA","AVGO","AMD","QCOM",
  "TXN","AMAT","LRCX","KLAC","CRM","ADBE","NFLX","NOW","CRWD","DDOG",
  "NET","MU","INTC","CHKP","CYBR",
  "JPM","V","MA","GS","BRK-B","MS","BAC","BX","SPGI","MCO",
  "UNH","JNJ","LLY","PFE","MRK","ABBV","AMGN","REGN","VRTX","ISRG","TMO",
  "HD","WMT","PG","KO","PEP","COST","MCD","NKE",
  "XOM","CVX","NEE","T","VZ","BA","GE","CAT","HON",
  "RTX","LMT","NOC","GD","LIN","APD","FCX",
  "MC.PA","RMS.PA","OR.PA","SU.PA","EL.PA","AIR.PA","SAF.PA","TTE.PA",
  "BNP.PA","ACA.PA","DSY.PA","SGO.PA",
  "SAP.DE","ASML.AS","ALV.DE","SIE.DE","IFX.DE","ADS.DE","MUV2.DE",
  "NESN.SW","ROG.SW","NOVN.SW","NOVO-B.CO","CFR.SW","ZURN.SW","ABBN.SW","SIKA.SW","LONN.SW",
  "INGA.AS","HEIA.AS","WKL.AS",
  "VOLV-B.ST","ATCO-A.ST","EQNR.OL","DNB.OL","DSV.CO","ORSTED.CO",
  "ENI.MI","RACE.MI","UCG.MI","ISP.MI","SAN.MC","IBE.MC",
  "AZN.L","GSK.L","RIO.L","BA.L","RR.L","LSEG.L","REL.L","HLMA.L",
  "7203.T","6758.T","7974.T","8035.T","6861.T",
  "005930.KS","000660.KS","2330.TW","2454.TW",
  "9988.HK","0700.HK","BIDU",
  "TCS.NS","INFY.NS","HDFCBANK.NS",
  "BHP.AX","CBA.AX","CSL.AX","MQG.AX",
  "SHOP.TO","RY.TO","CNR.TO","BAM.TO",
  "VALE3.SA","WEGE3.SA","D05.SI",
  "BTC-EUR","ETH-EUR","SOL-EUR","BNB-EUR","XRP-EUR","ADA-EUR","AVAX-EUR",
]
SYMBOLS = list(dict.fromkeys(SYMBOLS))

def fetch_history(symbols, period="10y", batch_size=20):
    """Télécharge 10 ans de cours mensuels pour calculer toutes les périodes"""
    all_data = {}
    for i in range(0, len(symbols), batch_size):
        batch = symbols[i:i+batch_size]
        print(f"  Batch {i//batch_size+1}/{(len(symbols)+batch_size-1)//batch_size}: {batch[0]}...", flush=True)
        try:
            raw = yf.download(batch, period=period, interval="1mo",
                              auto_adjust=True, progress=False, threads=True, timeout=30)
            if raw.empty: continue
            closes = raw["Close"] if "Close" in raw else raw
            if isinstance(closes, pd.Series):
                closes = closes.to_frame(name=batch[0])
            for sym in batch:
                if sym in closes.columns:
                    s = closes[sym].dropna()
                    if len(s) >= 12:
                        all_data[sym] = s
        except:
            for sym in batch:
                try:
                    d = yf.download(sym, period=period, interval="1mo",
                                   auto_adjust=True, progress=False, timeout=20)
                    if not d.empty:
                        col = "Close" if "Close" in d else d.columns[0]
                        s = d[col].dropna()
                        if len(s) >= 12:
                            all_data[sym] = s
                except: pass
        time.sleep(0.3)
    return all_data

def calc_period_return(series, n_months):
    """Calcule le vrai retour sur N mois depuis aujourd'hui"""
    if len(series) < n_months + 1:
        return None
    # Prendre le dernier prix et le prix d'il y a n_months
    last  = series.iloc[-1]
    start = series.iloc[-n_months-1] if len(series) > n_months else series.iloc[0]
    if start <= 0: return None
    return (last - start) / start

def calc_stats(series):
    """Calcule rendement annuel et vol depuis retours mensuels"""
    rets = series.pct_change().dropna()
    if len(rets) < 12: return None, None
    ar = float(rets.mean() * 12)
    av = float(rets.std() * np.sqrt(12))
    if abs(ar) > 3 or av > 3 or av <= 0: return None, None
    return round(ar, 4), round(av, 4)

print(f"\n🔄 Zero CGP — Market Data Update")
print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}")
print(f"📊 {len(SYMBOLS)} symboles\n")

print("📥 Téléchargement des données (10 ans)...")
data = fetch_history(SYMBOLS, period="10y")
print(f"✅ {len(data)}/{len(SYMBOLS)} symboles récupérés\n")

# Calculer toutes les métriques
ret_annual, vol_annual = {}, {}
perf_1m, perf_6m, perf_1y, perf_5y, perf_10y = {}, {}, {}, {}, {}
failed = []

# Correspondances périodes → mois
PERIODS = {"1m":1, "6m":6, "1y":12, "5y":60, "10y":120}

for sym in SYMBOLS:
    if sym not in data:
        failed.append(sym); continue
    s = data[sym]
    ar, av = calc_stats(s)
    if ar is None:
        failed.append(sym); continue

    ret_annual[sym] = ar
    vol_annual[sym] = av

    # Vraies performances par période
    for key, n in PERIODS.items():
        r = calc_period_return(s, n)
        if r is not None:
            val = round(r * 100, 1)  # en %
            if   key=="1m":  perf_1m[sym]  = val
            elif key=="6m":  perf_6m[sym]  = val
            elif key=="1y":  perf_1y[sym]  = val
            elif key=="5y":  perf_5y[sym]  = val
            elif key=="10y": perf_10y[sym] = val

print(f"✅ Stats calculées pour {len(ret_annual)} symboles")
if failed:
    print(f"⚠️  Failed ({len(failed)}): {', '.join(failed[:10])}")

now = datetime.now().strftime("%Y-%m-%d")
lines = [
    f'// Auto-generated — Last update: {now} via Yahoo Finance (cours réels)',
    f'// Performances calculées sur les VRAIS cours historiques mensuels',
    f'// Mis à jour chaque dimanche automatiquement par GitHub Actions',
    f'',
    f'export const MARKET_DATA_UPDATED = "{now}";',
    f'export const MARKET_DATA_COVERAGE = {len(ret_annual)};',
    f'',
    f'// ── Rendements annuels moyens (5 ans) — pour Markowitz ─',
    f'export const HISTORICAL_RETURNS: Record<string, number> = {{',
]
for sym, v in sorted(ret_annual.items()):
    lines.append(f'  "{sym}": {v},')
lines += ['};', '']

lines += [
    '// ── Volatilités annualisées (5 ans) — pour Markowitz ──',
    'export const HISTORICAL_VOLS: Record<string, number> = {',
]
for sym, v in sorted(vol_annual.items()):
    lines.append(f'  "{sym}": {v},')
lines += ['};', '']

# Performances réelles par période
for label, d in [("1M", perf_1m), ("6M", perf_6m), ("1A", perf_1y), ("5A", perf_5y), ("10A", perf_10y)]:
    lines += [f'// ── Performances réelles {label} ────────────────────────',
              f'export const PERF_{label.replace("A","Y")}: Record<string, number> = {{']
    for sym, v in sorted(d.items()):
        lines.append(f'  "{sym}": {v},')
    lines += ['};', '']

# Fonctions helper
lines += [
    'export function getAnnualReturn(symbol: string, fallback = 0.10): number {',
    '  const b = symbol.split(".")[0].split("-")[0].toUpperCase();',
    '  return HISTORICAL_RETURNS[symbol] ?? HISTORICAL_RETURNS[b] ?? fallback;',
    '}',
    '',
    'export function getAnnualVol(symbol: string, fallback = 0.25): number {',
    '  const b = symbol.split(".")[0].split("-")[0].toUpperCase();',
    '  return HISTORICAL_VOLS[symbol] ?? HISTORICAL_VOLS[b] ?? fallback;',
    '}',
    '',
    'export function getRealPerf(symbol: string, period: "1M"|"6M"|"1A"|"5A"|"10A"): number | null {',
    '  const b = symbol.split(".")[0].split("-")[0];',
    '  const map: Record<string, Record<string,number>> = {',
    '    "1M": PERF_1M, "6M": PERF_6M, "1A": PERF_1Y, "5A": PERF_5Y, "10A": PERF_10Y,',
    '  };',
    '  const d = map[period];',
    '  return d[symbol] ?? d[b] ?? d[b.toUpperCase()] ?? null;',
    '}',
]

with open('lib/marketData.ts', 'w') as f:
    f.write('\n'.join(lines) + '\n')

print(f"\n✅ lib/marketData.ts mis à jour")
print(f"   Rendements annuels  : {len(ret_annual)}")
print(f"   Perfs 1M réelles   : {len(perf_1m)}")
print(f"   Perfs 1A réelles   : {len(perf_1y)}")
print(f"   Date               : {now}")
