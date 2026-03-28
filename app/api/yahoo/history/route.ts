// app/api/yahoo/history/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol requis" }, { status: 400 });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5y&interval=1mo`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return NextResponse.json({ error: "Erreur Yahoo" }, { status: 502 });

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return NextResponse.json({ error: "Pas de données" }, { status: 404 });

    const timestamps: number[] = result.timestamp ?? [];
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];

    const history = timestamps
      .map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 7), close: closes[i] }))
      .filter((h) => h.close != null);

    return NextResponse.json({ symbol, history });
  } catch (e) {
    console.error("Yahoo history error:", e);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
