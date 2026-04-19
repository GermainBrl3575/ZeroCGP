#!/usr/bin/env python3
"""Import Linxea Spirit ETFs from CSV into Neon DB."""
import csv, json, urllib.request, urllib.error, time, psycopg2, re, sys
from datetime import datetime, timedelta

NEON = "postgresql://neondb_owner:npg_oG6NYIRxQn0S@ep-little-paper-alp3o3yc-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require"
CSV_PATH = "linxea_etfs_new.csv"

def yf_search_by_isin(isin):
    """Try to find Yahoo Finance ticker from ISIN."""
    # Try common exchanges
    for suffix in [".PA", ".DE", ".AS", ".L", ".SW", ""]:
        sym = isin + suffix if suffix else isin
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=1mo&interval=1wk"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
            if data.get("chart", {}).get("result"):
                return sym
        except:
            pass
        time.sleep(0.3)
    return None

def yf_download(sym, years=12):
    """Download weekly prices from Yahoo Finance."""
    end = int(datetime.now().timestamp())
    start = int((datetime.now() - timedelta(days=years * 365)).timestamp())
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?period1={start}&period2={end}&interval=1wk"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        result = data.get("chart", {}).get("result", [])
        if not result:
            return None
        r = result[0]
        ts = r.get("timestamp", [])
        closes = r.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        return [(datetime.fromtimestamp(t).strftime("%Y-%m-%d"), float(c))
                for t, c in zip(ts, closes) if c is not None]
    except:
        return None

def deduce_type_from_dedup(dedup):
    """Infer asset type from dedup key."""
    bond_keys = ["GOV", "BOND", "AGG", "CORP", "TIPS", "IG_", "HY_", "CREDIT"]
    gold_keys = ["GOLD", "PRECIOUS"]
    reit_keys = ["REIT", "REAL_ESTATE", "PROPERTY"]
    for k in bond_keys:
        if k in dedup.upper(): return "bond"
    for k in gold_keys:
        if k in dedup.upper(): return "gold"
    for k in reit_keys:
        if k in dedup.upper(): return "reit"
    return "etf"

def main():
    conn = psycopg2.connect(NEON)
    cur = conn.cursor()

    # Check existing ISINs in assets_master
    cur.execute("SELECT isin, symbol FROM assets_master WHERE isin IS NOT NULL")
    isin_to_sym = {r[0]: r[1] for r in cur.fetchall()}

    # Check existing symbols in dedup_groups
    cur.execute("SELECT symbol FROM dedup_groups")
    existing_dedup = {r[0] for r in cur.fetchall()}

    inserted = 0
    skipped = 0
    not_found = []

    with open(CSV_PATH) as f:
        reader = csv.reader(f)
        rows = list(reader)

    print(f"Processing {len(rows)} ETFs from Linxea CSV...")

    for row in rows:
        if len(row) < 7:
            continue
        isin, dedup_key, ter, pea, cto, av, zone = row[0].strip(), row[1].strip(), float(row[2]), row[3].strip() == "True", row[4].strip() == "True", row[5].strip() == "True", row[6].strip()

        # Check if ISIN already mapped to a symbol
        if isin in isin_to_sym:
            sym = isin_to_sym[isin]
            if sym in existing_dedup:
                skipped += 1
                continue
            # Add to dedup_groups
            cur.execute("INSERT INTO dedup_groups (symbol, dedup_key, ter) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING", (sym, dedup_key, ter))
            cur.execute("UPDATE assets_master SET pea=%s, cto=%s, av=%s, zone=%s, isin=%s WHERE symbol=%s", (pea, cto, av, zone, isin, sym))
            conn.commit()
            print(f"  {isin} → {sym} (existing, added to dedup)", flush=True)
            inserted += 1
            continue

        # Search by ISIN on Yahoo Finance
        print(f"  {isin} ({dedup_key}): ", end="", flush=True)
        sym = yf_search_by_isin(isin)
        if not sym:
            print("NOT FOUND on YF")
            not_found.append({"isin": isin, "dedup": dedup_key, "reason": "ISIN not found on Yahoo Finance"})
            continue

        # Download data
        prices = yf_download(sym)
        if not prices or len(prices) < 200:
            weeks = len(prices) if prices else 0
            print(f"{sym} only {weeks}w (need 200)")
            not_found.append({"isin": isin, "symbol": sym, "dedup": dedup_key, "reason": f"Only {weeks} weeks", "weeks": weeks})
            continue

        # Deduce type
        atype = deduce_type_from_dedup(dedup_key)

        # Insert
        cur.execute("INSERT INTO assets_master (symbol, name, sector, type, isin) VALUES (%s,%s,%s,%s,%s) ON CONFLICT (symbol) DO UPDATE SET isin=%s",
                     (sym, dedup_key, "linxea", atype, isin, isin))
        cur.execute("UPDATE assets_master SET pea=%s, cto=%s, av=%s, zone=%s WHERE symbol=%s", (pea, cto, av, zone, sym))
        cur.execute("INSERT INTO dedup_groups (symbol, dedup_key, ter) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING", (sym, dedup_key, ter))

        for date, close in prices:
            cur.execute("INSERT INTO assets_history (symbol, date, close) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING", (sym, date, close))

        conn.commit()
        print(f"{sym} → {len(prices)}w inserted")
        inserted += 1
        time.sleep(0.5)

    # Save not_found
    with open("not_found_linxea.json", "w") as f:
        json.dump(not_found, f, indent=2)

    cur.execute("SELECT COUNT(*) FROM dedup_groups")
    total = cur.fetchone()[0]

    print(f"\n{'='*50}")
    print(f"Inserted: {inserted}")
    print(f"Skipped (already in dedup): {skipped}")
    print(f"Not found: {len(not_found)}")
    print(f"Total dedup_groups: {total}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
