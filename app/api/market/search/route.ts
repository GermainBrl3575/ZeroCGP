import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") || "";

  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT symbol, name, sector, type
         FROM assets_master
         WHERE active = true
           AND (
             symbol ILIKE $1
             OR name ILIKE $1
             OR sector ILIKE $1
           )
         ORDER BY
           CASE WHEN symbol ILIKE $2 THEN 0 ELSE 1 END,
           length(symbol)
         LIMIT 20`,
        [`%${q}%`, `${q}%`]
      );
      return NextResponse.json({ results: rows });
    } finally {
      client.release();
    }
  } catch (err) {
    return NextResponse.json({ error: "Erreur recherche" }, { status: 500 });
  }
}
