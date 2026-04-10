#!/usr/bin/env python3
"""Download missing Yahoo Finance data for assets in dedup_groups but not in assets_history."""
import psycopg2, urllib.request, json, time, sys
from datetime import datetime, timedelta

NEON_URL = "postgresql://neondb_owner:npg_oG6NYIRxQn0S@ep-little-paper-alp3o3yc-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require"

def get_missing_symbols(conn):
    """Find symbols in dedup_groups but with < 200 weeks in assets_history."""
    cur = conn.cursor()
    cur.execute("""
        SELECT dg.symbol, dg.dedup_key,
            COALESCE((SELECT COUNT(*) FROM assets_history WHERE symbol=dg.symbol), 0) as weeks
        FROM dedup_groups dg
        WHERE dg.symbol NOT IN (
            SELECT symbol FROM assets_history
            GROUP BY symbol HAVING COUNT(*) >= 200
        )
        AND dg.symbol NOT LIKE '^%'
        AND dg.symbol NOT LIKE '%=F'
        AND dg.symbol NOT LIKE '%=X'
        ORDER BY dg.symbol
    """)
    return cur.fetchall()

def download_yahoo(symbol, years=12):
    """Download weekly price data from Yahoo Finance."""
    end = int(datetime.now().timestamp())
    start = int((datetime.now() - timedelta(days=years*365)).timestamp())
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=1wk"

    headers = {"User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        result = data.get("chart", {}).get("result", [])
        if not result:
            return None
        r = result[0]
        timestamps = r.get("timestamp", [])
        closes = r.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        if not timestamps or not closes:
            return None
        # Build (date, close) pairs
        prices = []
        for ts, close in zip(timestamps, closes):
            if close is not None:
                dt = datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                prices.append((dt, float(close)))
        return prices
    except Exception as e:
        print(f"  YF error for {symbol}: {e}")
        return None

def insert_prices(conn, symbol, prices):
    """Insert prices into assets_history."""
    cur = conn.cursor()
    for date, close in prices:
        cur.execute("""
            INSERT INTO assets_history (symbol, date, close)
            VALUES (%s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (symbol, date, close))
    conn.commit()
    return len(prices)

def ensure_master(conn, symbol, dedup_key):
    """Ensure symbol exists in assets_master."""
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM assets_master WHERE symbol=%s", (symbol,))
    if not cur.fetchone():
        # Deduce name and type
        name = symbol
        atype = "stock"
        if "-USD" in symbol: atype = "crypto"
        elif any(symbol.endswith(s) for s in [".PA",".DE",".L",".AS"]):
            if dedup_key in ["MSCI_WORLD","SP500","NASDAQ100","EUROSTOXX50","EUR_GOV","EUR_GOV_ST","EUR_AGG","GOLD_EU"]:
                atype = "etf"
        cur.execute("""
            INSERT INTO assets_master (symbol, name, sector, type)
            VALUES (%s, %s, 'unknown', %s)
            ON CONFLICT DO NOTHING
        """, (symbol, name, atype))
        conn.commit()
        print(f"  Created assets_master entry for {symbol}")

def main():
    conn = psycopg2.connect(NEON_URL)
    missing = get_missing_symbols(conn)
    print(f"Found {len(missing)} symbols with < 200 weeks of data")

    downloaded = 0
    failed = []
    skipped = 0

    for symbol, dedup_key, current_weeks in missing:
        if current_weeks >= 150:  # Close enough, skip
            skipped += 1
            continue

        print(f"Downloading {symbol} (dedup={dedup_key}, current={current_weeks}w)...", end=" ", flush=True)

        prices = download_yahoo(symbol)
        if prices and len(prices) >= 100:
            ensure_master(conn, symbol, dedup_key)
            n = insert_prices(conn, symbol, prices)
            print(f"OK ({n} weeks)")
            downloaded += 1
        elif prices:
            print(f"Too few data ({len(prices)} weeks)")
            failed.append((symbol, f"only {len(prices)} weeks"))
        else:
            # Try alternative tickers
            alts = []
            if "." not in symbol and "-" not in symbol:
                # US stock, no alternative needed
                pass
            elif symbol.endswith(".PA"):
                alts = [symbol.replace(".PA", ".PA=F")]

            success = False
            for alt in alts:
                prices = download_yahoo(alt)
                if prices and len(prices) >= 100:
                    ensure_master(conn, symbol, dedup_key)
                    n = insert_prices(conn, symbol, prices)
                    print(f"OK via {alt} ({n} weeks)")
                    downloaded += 1
                    success = True
                    break

            if not success:
                print("FAILED")
                failed.append((symbol, "no data"))

        time.sleep(0.5)  # Rate limit

    print(f"\n{'='*50}")
    print(f"Downloaded: {downloaded}")
    print(f"Skipped (>=150w): {skipped}")
    print(f"Failed: {len(failed)}")
    if failed:
        print("Failed symbols:")
        for sym, reason in failed[:20]:
            print(f"  {sym}: {reason}")
        # Save to not_found.json
        with open("not_found.json", "w") as f:
            json.dump([{"symbol": s, "reason": r} for s, r in failed], f, indent=2)

    conn.close()

if __name__ == "__main__":
    main()
