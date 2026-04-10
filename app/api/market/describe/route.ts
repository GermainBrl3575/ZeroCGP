import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import Anthropic from "@anthropic-ai/sdk";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  const symbol = new URL(req.url).searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol requis" }, { status: 400 });

  const sym = symbol.toUpperCase();
  const client = await pool.connect();

  try {
    // 1. Vérifier le cache Neon
    const { rows } = await client.query(
      `SELECT symbol, name, sector, type, description, isin, country, inception_year
       FROM assets_master WHERE symbol = $1`,
      [sym]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Actif non trouvé" }, { status: 404 });
    }

    const asset = rows[0];

    // 2. Si description déjà en cache → retourner directement
    if (asset.description && asset.description.length > 50) {
      return NextResponse.json({
        symbol: asset.symbol,
        name: asset.name,
        sector: asset.sector,
        description: asset.description,
        isin: asset.isin,
        country: asset.country,
        inception_year: asset.inception_year,
        cached: true,
      });
    }

    // 3. Générer avec Claude Haiku (le moins cher)
    const prompt = `Tu es un analyste financier expert. Génère une description concise et précise pour cet actif financier.

Actif: ${asset.name} (${sym})
Type: ${asset.type}
Secteur: ${asset.sector}

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{
  "description": "2-3 phrases max. Inclure: (1) ce que fait la société/le fonds, (2) une anecdote marquante ou fait différenciateur (ex: première voiture au monde, inventeur du Post-it, etc.), (3) position sur son marché.",
  "isin": "code ISIN si connu, sinon null",
  "country": "pays d'origine (ex: France, USA, Allemagne)",
  "inception_year": année de création en nombre entier ou null
}

Exemples de bonnes descriptions:
- "Toyota est le premier constructeur automobile mondial par volume, fondé en 1937 au Japon. Pionnier de la production lean (Toyota Production System), il a révolutionné l'industrie manufacturière mondiale. Premier constructeur à dépasser 10 millions de véhicules/an."
- "IWDA est l'ETF MSCI World d'iShares, exposant à 1 600 grandes entreprises des pays développés en une seule ligne. Avec 80 milliards d'encours, c'est le principal ETF monde en Europe. TER de 0.20%/an."`;

    const response = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    // Parser le JSON retourné par Claude
    let parsed: {
      description: string;
      isin: string | null;
      country: string | null;
      inception_year: number | null;
    } = { description: "", isin: null, country: null, inception_year: null };

    try {
      const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback si Claude ne retourne pas un JSON propre
      parsed.description = raw.slice(0, 300);
    }

    // 4. Sauvegarder dans Neon pour le cache
    await client.query(
      `UPDATE assets_master
       SET description = $1,
           isin = COALESCE($2, isin),
           country = COALESCE($3, country),
           inception_year = COALESCE($4, inception_year)
       WHERE symbol = $5`,
      [
        parsed.description || `${asset.name} — ${asset.sector}.`,
        parsed.isin,
        parsed.country,
        parsed.inception_year,
        sym,
      ]
    );

    return NextResponse.json({
      symbol: sym,
      name: asset.name,
      sector: asset.sector,
      description: parsed.description,
      isin: parsed.isin,
      country: parsed.country,
      inception_year: parsed.inception_year,
      cached: false,
    });

  } finally {
    client.release();
  }
}
