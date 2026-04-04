import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol") ?? "";
  if (!symbol) return NextResponse.json({ news: [] });

  // Essayer plusieurs endpoints Yahoo Finance
  const base = symbol.split(".")[0].split("-")[0];
  const urls = [
    // RSS feed Yahoo Finance — le plus fiable
    `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`,
    `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(base)}&region=US&lang=en-US`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; bot/1.0)" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.includes("<item>")) continue;

      // Parser le RSS
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
      const news = items.slice(0, 3).map(item => {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
          ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
        const link  = item.match(/<link>(.*?)<\/link>/)?.[1]
          ?? item.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? "";
        const pub   = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1]
          ?? item.match(/<dc:creator>(.*?)<\/dc:creator>/)?.[1] ?? "Yahoo Finance";
        const date  = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
        const d     = date ? new Date(date) : null;
        const time  = d && !isNaN(d.getTime())
          ? d.toLocaleDateString("fr-FR", {day:"2-digit",month:"short"}) : "";
        return { title: title.trim(), publisher: pub.trim(), link: link.trim(), time };
      }).filter(n => n.title);

      if (news.length > 0) return NextResponse.json({ news });
    } catch { continue; }
  }

  return NextResponse.json({ news: [] });
}
