import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

// Cache: symbol → { price, ts }
const cache = new Map<string, { price: number; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchYahooPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
    const res = await fetch(url, { headers: YF_HEADERS, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" && price > 0 ? price : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { symbols } = await req.json() as { symbols: string[] };
    if (!symbols || symbols.length === 0) {
      return NextResponse.json({ prices: {} });
    }

    const now = Date.now();
    const prices: Record<string, number> = {};

    // Check cache first, fetch missing
    const toFetch: string[] = [];
    for (const sym of symbols) {
      const cached = cache.get(sym);
      if (cached && now - cached.ts < CACHE_TTL) {
        prices[sym] = cached.price;
      } else {
        toFetch.push(sym);
      }
    }

    // Fetch from Yahoo in parallel
    if (toFetch.length > 0) {
      const results = await Promise.all(
        toFetch.map(async (sym) => {
          const price = await fetchYahooPrice(sym);
          return { sym, price };
        })
      );
      for (const { sym, price } of results) {
        if (price !== null) {
          prices[sym] = price;
          cache.set(sym, { price, ts: now });
        }
      }
    }

    return NextResponse.json({ prices });
  } catch (err) {
    console.error("asset-prices error:", err);
    return NextResponse.json({ prices: {} }, { status: 500 });
  }
}
