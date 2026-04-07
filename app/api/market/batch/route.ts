import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

export async function POST(req: NextRequest) {
  const { symbols, period = "5y" } = await req.json();

  if (!Array.isArray(symbols) || symbols.length === 0) {
    return NextResponse.json({ error: "symbols[] requis" }, { status: 400 });
  }

  const years = { "1y":1,"3y":3,"5y":5,"10y":10,"20y":20 }[period as string] || 5;
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);

  try {
    const client = await pool.connect();
    try {
      const syms = symbols.map((s: string) => s.toUpperCase());

      const { rows } = await client.query(
        `SELECT symbol, date, close
         FROM assets_history
         WHERE symbol = ANY($1) AND date >= $2
         ORDER BY symbol, date ASC`,
        [syms, startDate.toISOString().split("T")[0]]
      );

      // Regrouper par symbole
      const grouped: Record<string, {date: string; close: number}[]> = {};
      rows.forEach(r => {
        if (!grouped[r.symbol]) grouped[r.symbol] = [];
        grouped[r.symbol].push({ date: r.date, close: parseFloat(r.close) });
      });

      // Calculer les rendements hebdomadaires par actif
      const returns: Record<string, number[]> = {};
      Object.entries(grouped).forEach(([sym, prices]) => {
        returns[sym] = prices.slice(1).map((p, i) =>
          (p.close - prices[i].close) / prices[i].close
        );
      });

      return NextResponse.json({
        symbols: syms,
        period,
        grouped, // prix bruts
        returns, // rendements pour Markowitz
        dates: grouped[syms[0]]?.slice(1).map(p => p.date) || [],
      });

    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Batch query error:", err);
    return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
  }
}
