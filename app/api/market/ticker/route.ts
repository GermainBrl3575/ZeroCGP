import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

export async function GET() {
  const client = await pool.connect();
  try {
    // Random 20 assets from dedup_groups with names, latest 2 prices
    const { rows } = await client.query(`
      SELECT am.symbol, am.name,
        (SELECT close FROM assets_history ah WHERE ah.symbol = am.symbol ORDER BY date DESC LIMIT 1) as last_price,
        (SELECT close FROM assets_history ah WHERE ah.symbol = am.symbol ORDER BY date DESC LIMIT 1 OFFSET 1) as prev_price
      FROM assets_master am
      INNER JOIN dedup_groups dg ON dg.symbol = am.symbol
      WHERE am.name IS NOT NULL AND length(am.name) > 2
      AND am.symbol IN (SELECT symbol FROM assets_history GROUP BY symbol HAVING COUNT(*) >= 200)
      ORDER BY random()
      LIMIT 20
    `);

    const tickers = rows
      .filter(r => r.last_price && r.prev_price)
      .map(r => ({
        symbol: r.symbol,
        name: r.name,
        price: parseFloat(r.last_price),
        change: ((parseFloat(r.last_price) - parseFloat(r.prev_price)) / parseFloat(r.prev_price)) * 100,
      }));

    return NextResponse.json({ tickers }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } finally {
    client.release();
  }
}
