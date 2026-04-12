import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

// Cache: symbol → { perfs, ts }
const cache = new Map<string, { perfs: Record<string, number>; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const RANGES: { key: string; range: string; interval: string }[] = [
  { key: "1D", range: "1d",  interval: "5m" },
  { key: "1M", range: "1mo", interval: "1d" },
  { key: "3M", range: "3mo", interval: "1d" },
  { key: "6M", range: "6mo", interval: "1wk" },
  { key: "1Y", range: "1y",  interval: "1wk" },
  { key: "5Y", range: "5y",  interval: "1mo" },
];

async function fetchPerf(symbol: string, range: string, interval: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
    const res = await fetch(url, { headers: YF_HEADERS, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const current = result.meta?.regularMarketPrice as number;
    const closes = result.indicators?.quote?.[0]?.close as number[] | undefined;
    if (!current || !closes || closes.length === 0) return null;

    // Find first valid close price
    const first = closes.find((c: number | null) => c !== null && c > 0);
    if (!first || first <= 0) return null;

    return parseFloat(((current - first) / first * 100).toFixed(2));
  } catch {
    return null;
  }
}

async function getSymbolPerfs(symbol: string): Promise<Record<string, number>> {
  const now = Date.now();
  const cached = cache.get(symbol);
  if (cached && now - cached.ts < CACHE_TTL) return cached.perfs;

  const results = await Promise.all(
    RANGES.map(async (r) => {
      const pct = await fetchPerf(symbol, r.range, r.interval);
      return { key: r.key, pct };
    })
  );

  const perfs: Record<string, number> = {};
  for (const { key, pct } of results) {
    if (pct !== null) perfs[key] = pct;
  }

  cache.set(symbol, { perfs, ts: now });
  return perfs;
}

export async function POST(req: Request) {
  try {
    const { symbols } = await req.json() as { symbols: string[] };
    if (!symbols || symbols.length === 0) {
      return NextResponse.json({ perfs: {} });
    }

    // Fetch all symbols in parallel (max 15 concurrent)
    const chunks: string[][] = [];
    for (let i = 0; i < symbols.length; i += 15) {
      chunks.push(symbols.slice(i, i + 15));
    }

    const allPerfs: Record<string, Record<string, number>> = {};
    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(async (sym) => ({ sym, perfs: await getSymbolPerfs(sym) }))
      );
      for (const { sym, perfs } of results) {
        if (Object.keys(perfs).length > 0) allPerfs[sym] = perfs;
      }
    }

    return NextResponse.json({ perfs: allPerfs });
  } catch (err) {
    console.error("market/perf error:", err);
    return NextResponse.json({ perfs: {} }, { status: 500 });
  }
}
