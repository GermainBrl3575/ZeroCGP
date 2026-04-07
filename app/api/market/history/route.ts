import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// Pool de connexions Neon — réutilisé entre les requêtes
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol  = searchParams.get("symbol");
  const period  = searchParams.get("period") || "5y"; // 1y, 3y, 5y, 10y, 20y
  const format  = searchParams.get("format") || "weekly";

  if (!symbol) {
    return NextResponse.json({ error: "symbol requis" }, { status: 400 });
  }

  // Calculer la date de début selon la période
  const periodMap: Record<string, number> = {
    "1y": 1, "3y": 3, "5y": 5, "10y": 10, "20y": 20,
  };
  const years = periodMap[period] || 5;
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);

  try {
    const client = await pool.connect();
    try {
      // Récupérer l'historique
      const { rows } = await client.query(
        `SELECT date, open, high, low, close, volume
         FROM assets_history
         WHERE symbol = $1 AND date >= $2
         ORDER BY date ASC`,
        [symbol.toUpperCase(), startDate.toISOString().split("T")[0]]
      );

      if (rows.length === 0) {
        return NextResponse.json(
          { error: `Aucune donnée pour ${symbol}` },
          { status: 404 }
        );
      }

      // Format pour Recharts / Markowitz
      const data = rows.map(r => ({
        date:   r.date,
        open:   parseFloat(r.open),
        high:   parseFloat(r.high),
        low:    parseFloat(r.low),
        close:  parseFloat(r.close),
        volume: parseInt(r.volume) || 0,
      }));

      // Calculer rendements hebdomadaires (pour Markowitz)
      const returns = data.slice(1).map((r, i) => ({
        date:   r.date,
        return: (r.close - data[i].close) / data[i].close,
      }));

      return NextResponse.json({
        symbol: symbol.toUpperCase(),
        period,
        count:   data.length,
        data,
        returns, // rendements pour la matrice de covariance
      });

    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Neon query error:", err);
    return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
  }
}
