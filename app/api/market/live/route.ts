import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

async function fetchQuote(symbol: string): Promise<{
  price: number; prev: number; currency: string;
} | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
    const res = await fetch(url, { headers: YF_HEADERS, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) return null;
    return {
      price: meta.regularMarketPrice as number,
      prev: (meta.chartPreviousClose ?? meta.regularMarketPrice) as number,
      currency: (meta.currency ?? "EUR") as string,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const client = await pool.connect();
  try {
    // Pick 10 random symbols from dedup_groups with names
    const { rows } = await client.query(`
      SELECT dg.symbol, am.name
      FROM dedup_groups dg
      JOIN assets_master am ON am.symbol = dg.symbol
      WHERE am.name IS NOT NULL AND length(am.name) > 2
      ORDER BY random()
      LIMIT 10
    `);

    // Fetch quotes in parallel
    const results = await Promise.all(
      rows.map(async (r) => {
        const q = await fetchQuote(r.symbol);
        if (!q || q.price <= 0) return null;
        const changePercent = q.prev > 0 ? ((q.price - q.prev) / q.prev) * 100 : 0;
        return {
          symbol: r.symbol,
          name: r.name,
          price: q.price,
          change: q.price - q.prev,
          changePercent,
          currency: q.currency,
        };
      })
    );

    const tickers = results.filter(Boolean);

    return NextResponse.json({ tickers }, {
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
  } catch (err) {
    console.error("market/live error:", err);
    return NextResponse.json({ tickers: [] }, { status: 500 });
  } finally {
    client.release();
  }
}
