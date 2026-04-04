#!/usr/bin/env python3
"""
Zero CGP — Mise à jour hebdomadaire des données de marché
- 1M, 6M  : données journalières (rolling 30j / 180j)
- 1A, 5A, 10A : données mensuelles
"""
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
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
  "HD","WMT","PG","KO","PEP","COST","MCD","NKE","SBUX",
  "XOM","CVX","NEE","T","VZ","TMUS",
  "BA","GE","CAT","HON","RTX","LMT","NOC","GD","UPS","DE",
  "LIN","APD","FCX",
  "MC.PA","RMS.PA","OR.PA","SU.PA","EL.PA","AIR.PA","SAF.PA","TTE.PA",
  "BNP.PA","ACA.PA","DSY.PA","KER.PA","SGO.PA","ML.PA",
  "SAP.DE","ASML.AS","ALV.DE","SIE.DE","IFX.DE","ADS.DE","MUV2.DE","BAS.DE",
  "NESN.SW","ROG.SW","NOVN.SW","NOVO-B.CO","CFR.SW","ZURN.SW","ABBN.SW",
  "SIKA.SW","LONN.SW","GIVN.SW",
  "INGA.AS","HEIA.AS","WKL.AS","PHIA.AS",
  "VOLV-B.ST","ATCO-A.ST","INVE-B.ST","EQNR.OL","DNB.OL",
  "DSV.CO","ORSTED.CO","NESTE.HE","KNEBV.HE",
  "ENI.MI","RACE.MI","UCG.MI","ISP.MI",
  "SAN.MC","IBE.MC","AMS.MC","TEF.MC",
  "AZN.L","GSK.L","RIO.L","BA.L","RR.L","LSEG.L","REL.L","HLMA.L",
  "LLOY.L","NWG.L","NG.L",
  "7203.T","6758.T","7974.T","8035.T","6861.T","6367.T","9984.T",
  "005930.KS","000660.KS","2330.TW","2454.TW",
  "9988.HK","0700.HK","BIDU","PDD",
  "TCS.NS","INFY.NS","HDFCBANK.NS",
  "BHP.AX","CBA.AX","CSL.AX","MQG.AX",
  "SHOP.TO","RY.TO","CNR.TO","BAM.TO",
  "VALE3.SA","WEGE3.SA","D05.SI",
  "BTC-EUR","ETH-EUR","SOL-EUR","BNB-EUR","XRP-EUR","ADA-EUR","AVAX-EUR",
]
SYMBOLS = list(dict.fromkeys(SYMBOLS))

def fetch_batch(syms, period, interval, batch_size=20):
    """Télécharge par batch"""
    all_data = {}
    for i in range(0, len(syms), batch_size):
        batch = syms[i:i+batch_size]
        print(f"  [{interval}] Batch {i//batch_size+1}: {batch[0]}...", flush=True)
        try:
            raw = yf.download(batch, period=period, interval=interval,
                              auto_adjust=True, progress=False, threads=True, timeout=30)
            if raw.empty: continue
            closes = raw["Close"] if "Close" in raw else raw
            if isinstance(closes, pd.Series):
                closes = closes.to_frame(name=batch[0])
            for sym in batch:
                if sym in closes.columns:
                    s = closes[sym].dropna()
                    if len(s) >= 5:
                        all_data[sym] = s
        except:
            for sym in batch:
                try:
                    d = yf.download(sym, period=period, interval=interval,
                                   auto_adjust=True, progress=False, timeout=15)
                    if not d.empty:
                        col = "Close" if "Close" in d else d.columns[0]
                        s = d[col].dropna()
                        if len(s) >= 5:
                            all_data[sym] = s
                except: pass
        time.sleep(0.3)
    return all_data

def pct_return(series, n):
    """Retour sur les n dernières périodes"""
    if len(series) < n + 1: return None
    last  = float(series.iloc[-1])
    start = float(series.iloc[-n-1])
    if start <= 0: return None
    r = (last - start) / start * 100
    if abs(r) > 500: return None  # filtre aberrations
    return round(r, 1)

def calc_annual_stats(monthly_series):
    """Rendement annuel et vol depuis cours mensuels"""
    rets = monthly_series.pct_change().dropna()
    if len(rets) < 12: return None, None
    ar = float(rets.mean() * 12)
    av = float(rets.std() * np.sqrt(12))
    if abs(ar) > 3 or av > 3 or av <= 0: return None, None
    return round(ar, 4), round(av, 4)

print(f"\n🔄 Zero CGP — Market Data Update ({datetime.now().strftime('%Y-%m-%d')})")
print(f"📊 {len(SYMBOLS)} symboles\n")

# ── Téléchargement journalier (pour 1M, 6M) ──────────────────
print("📥 Données journalières (90 jours)...")
daily_data = fetch_batch(SYMBOLS, period="3mo", interval="1d")
print(f"  ✅ {len(daily_data)} symboles\n")

# ── Téléchargement mensuel (pour 1A, 5A, 10A + stats Markowitz)
print("📥 Données mensuelles (10 ans)...")
monthly_data = fetch_batch(SYMBOLS, period="10y", interval="1mo")
print(f"  ✅ {len(monthly_data)} symboles\n")

# ── Calcul des métriques ─────────────────────────────────────
ret_annual, vol_annual = {}, {}
perf_1m, perf_6m, perf_1y, perf_5y, perf_10y = {}, {}, {}, {}, {}
failed = []

for sym in SYMBOLS:
    # 1M et 6M depuis données journalières (rolling 22j / 130j)
    if sym in daily_data:
        s = daily_data[sym]
        r1m = pct_return(s, 22)   # ~1 mois de trading
        r6m = pct_return(s, 130)  # ~6 mois de trading
        if r1m is not None: perf_1m[sym] = r1m
        if r6m is not None: perf_6m[sym] = r6m

    # 1A, 5A, 10A + stats depuis données mensuelles
    if sym in monthly_data:
        s = monthly_data[sym]
        r1y  = pct_return(s, 12)
        r5y  = pct_return(s, 60)
        r10y = pct_return(s, 120)
        if r1y  is not None: perf_1y[sym]  = r1y
        if r5y  is not None: perf_5y[sym]  = r5y
        if r10y is not None: perf_10y[sym] = r10y
        ar, av = calc_annual_stats(s)
        if ar is not None:
            ret_annual[sym] = ar
            vol_annual[sym] = av
    else:
        failed.append(sym)

print(f"✅ Stats calculées: {len(ret_annual)} symboles")
print(f"✅ Perfs 1M (journalier): {len(perf_1m)} symboles")
if failed:
    print(f"⚠️  Failed ({len(failed)}): {', '.join(failed[:8])}")

# ── Générer marketData.ts ─────────────────────────────────────
now = datetime.now().strftime("%Y-%m-%d")
lines = [
    f'// Auto-generated — Last update: {now} via Yahoo Finance',
    f'// 1M/6M = rolling journalier | 1A/5A/10A = cours mensuels',
    f'// GitHub Actions met à jour chaque dimanche automatiquement',
    f'',
    f'export const MARKET_DATA_UPDATED = "{now}";',
    f'export const MARKET_DATA_COVERAGE = {len(ret_annual)};',
    f'',
    f'export const HISTORICAL_RETURNS: Record<string, number> = {{',
]
for sym, v in sorted(ret_annual.items()):
    lines.append(f'  "{sym}": {v},')
lines += ['};', '']

lines += ['export const HISTORICAL_VOLS: Record<string, number> = {']
for sym, v in sorted(vol_annual.items()):
    lines.append(f'  "{sym}": {v},')
lines += ['};', '']

for label, d in [("1M",perf_1m),("6M",perf_6m),("1Y",perf_1y),("5Y",perf_5y),("10Y",perf_10y)]:
    lines += [f'export const PERF_{label}: Record<string, number> = {{']
    for sym, v in sorted(d.items()):
        lines.append(f'  "{sym}": {v},')
    lines += ['};', '']

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
    '// Retourne la VRAIE performance sur la période (rolling journalier pour 1M/6M)',
    'export function getRealPerf(symbol: string, period: "1M"|"6M"|"1A"|"5A"|"10A"): number | null {',
    '  // Essayer le symbole exact, puis sans suffixe bourse, puis base uppercase',
    '  const noSuffix = symbol.replace(/\\.(AS|DE|PA|SW|L|MI|MC|CO|OL|HK|T|NS|AX|TO|ST|SA|MX|SI|JK|KS|TW)$/,"");',
    '  const base = noSuffix.replace(/-B$/,"").replace(/-EUR$/,"").replace(/-USD$/,"");',
    '  const map: Record<string, Record<string,number>> = {',
    '    "1M": PERF_1M, "6M": PERF_6M, "1A": PERF_1Y, "5A": PERF_5Y, "10A": PERF_10Y,',
    '  };',
    '  const d = map[period];',
    '  if(!d) return null;',
    '  return d[symbol] ?? d[noSuffix] ?? d[base] ?? d[base.toUpperCase()] ?? null;',
    '}',
]

with open('lib/marketData.ts', 'w') as f:
    f.write('\n'.join(lines) + '\n')

print(f"\n✅ lib/marketData.ts mis à jour — {len(ret_annual)} actifs, 1M journalier")
