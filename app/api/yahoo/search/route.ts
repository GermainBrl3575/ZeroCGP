// app/api/yahoo/search/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return NextResponse.json({ results: [] });

    const data = await res.json();
    const quotes = (data?.quotes ?? []) as Array<{
      symbol: string;
      shortname?: string;
      longname?: string;
      quoteType: string;
      exchange?: string;
    }>;

    const results = quotes
      .filter((q) => ["ETF", "EQUITY", "CRYPTOCURRENCY"].includes(q.quoteType))
      .slice(0, 6)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType === "ETF" ? "etf" : q.quoteType === "CRYPTOCURRENCY" ? "crypto" : "stock",
        exchange: q.exchange,
      }));

    return NextResponse.json({ results });
  } catch (e) {
    console.error("Yahoo search error:", e);
    return NextResponse.json({ results: [] });
  }
}
