// app/api/yahoo/quote/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol requis" }, { status: 400 });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Yahoo Finance indisponible" }, { status: 502 });
    }

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta) {
      return NextResponse.json({ error: "Symbole introuvable" }, { status: 404 });
    }

    const price = meta.regularMarketPrice as number;
    const prev = meta.chartPreviousClose as number;

    return NextResponse.json({
      symbol: meta.symbol,
      price,
      previousClose: prev,
      currency: meta.currency,
      changePercent: prev > 0 ? ((price - prev) / prev) * 100 : 0,
    });
  } catch (e) {
    console.error("Yahoo quote error:", e);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
