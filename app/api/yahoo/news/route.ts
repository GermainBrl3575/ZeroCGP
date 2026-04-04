import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol") ?? "";
  if (!symbol) return NextResponse.json({ news: [] });

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=5&quotesCount=0`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ news: [] });
    const data = await res.json();
    const news = (data?.news ?? []).slice(0, 3).map((n: Record<string,unknown>) => ({
      title:     String(n.title ?? ""),
      publisher: String(n.publisher ?? ""),
      link:      String(n.link ?? ""),
      time:      n.providerPublishTime
        ? new Date((n.providerPublishTime as number) * 1000).toLocaleDateString("fr-FR", {day:"2-digit",month:"short"})
        : "",
    }));
    return NextResponse.json({ news });
  } catch {
    return NextResponse.json({ news: [] });
  }
}
