import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

// Cache per-asset geo exposure
const cache = new Map<string, { countries: Record<string, number>; desc: string }>();

export async function POST(req: Request) {
  try {
    const { weights } = await req.json() as {
      weights: { symbol: string; name: string; weight: number; type: string }[];
    };

    if (!weights || weights.length === 0) {
      return NextResponse.json({ error: "No weights" }, { status: 400 });
    }

    // Check which assets need fetching
    const toFetch = weights.filter(w => !cache.has(w.symbol));

    if (toFetch.length > 0) {
      const assetList = toFetch
        .map(w => `- ${w.symbol} (${w.name}, type: ${w.type})`)
        .join("\n");

      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `Tu es un analyste financier. Pour chaque actif ci-dessous, estime la répartition géographique en codes ISO3 (USA, FRA, DEU, GBR, JPN, CHN, etc.).

Actifs :
${assetList}

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :
{
  "SYMBOL1": { "countries": { "USA": 65.0, "GBR": 10.0, "JPN": 8.0 }, "desc": "ETF répliquant le MSCI World..." },
  "SYMBOL2": { "countries": { "FRA": 100.0 }, "desc": "Action française du secteur..." }
}

Règles :
- Clés = codes ISO3 (3 lettres majuscules)
- Les pourcentages de chaque actif totalisent ~100%
- Inclus uniquement les pays > 1%
- desc = 1 phrase décrivant l'actif
- Pour les ETF monde (MSCI World, S&P500...), détaille les principaux pays
- Pour les actions individuelles, le pays du siège = 100%`,
          },
        ],
      });

      const text = msg.content[0].type === "text" ? msg.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]) as Record<string, { countries: Record<string, number>; desc: string }>;
        // Cache each asset individually
        for (const [symbol, exposure] of Object.entries(data)) {
          cache.set(symbol, exposure);
        }
      }
    }

    // Build response from cache
    const result: Record<string, { countries: Record<string, number>; desc: string }> = {};
    for (const w of weights) {
      if (cache.has(w.symbol)) {
        result[w.symbol] = cache.get(w.symbol)!;
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("geo-exposure error:", err);
    return NextResponse.json(
      { error: "Failed to analyze geo exposure" },
      { status: 500 }
    );
  }
}
