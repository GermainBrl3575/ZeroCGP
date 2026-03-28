// lib/yahoo.ts
// Toutes les fonctions Yahoo Finance s'exécutent côté serveur uniquement
// pour éviter les erreurs CORS.

const BASE1 = "https://query1.finance.yahoo.com";
const BASE2 = "https://query2.finance.yahoo.com";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

// ─── Prix temps réel ─────────────────────────────────────────────────────────

export async function getQuote(symbol: string) {
  const url = `${BASE1}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
  const res = await fetch(url, { headers, next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Yahoo quote error: ${res.status}`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error("Pas de données pour ce symbole");
  return {
    symbol: meta.symbol,
    price: meta.regularMarketPrice as number,
    previousClose: meta.chartPreviousClose as number,
    currency: meta.currency as string,
    changePercent:
      ((meta.regularMarketPrice - meta.chartPreviousClose) /
        meta.chartPreviousClose) *
      100,
  };
}

// ─── Historique (5 ans, mensuel) ─────────────────────────────────────────────

export async function getHistory(symbol: string) {
  const url = `${BASE1}/v8/finance/chart/${encodeURIComponent(symbol)}?range=5y&interval=1mo`;
  const res = await fetch(url, { headers, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Yahoo history error: ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error("Historique introuvable");
  const timestamps: number[] = result.timestamp;
  const closes: number[] = result.indicators.quote[0].close;
  return timestamps.map((t: number, i: number) => ({
    date: new Date(t * 1000).toISOString().slice(0, 7),
    close: closes[i],
  }));
}

// ─── Recherche (autocomplete ISIN / nom) ─────────────────────────────────────

export async function searchAssets(query: string) {
  const url = `${BASE2}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
  const res = await fetch(url, { headers, next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Yahoo search error: ${res.status}`);
  const data = await res.json();
  const quotes = data?.quotes ?? [];
  return quotes
    .filter((q: { quoteType: string }) =>
      ["ETF", "EQUITY", "CRYPTOCURRENCY"].includes(q.quoteType)
    )
    .map((q: {
      symbol: string;
      shortname?: string;
      longname?: string;
      quoteType: string;
      exchange?: string;
    }) => ({
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      type: mapType(q.quoteType),
      exchange: q.exchange,
    }));
}

function mapType(quoteType: string): "etf" | "stock" | "crypto" {
  if (quoteType === "ETF") return "etf";
  if (quoteType === "CRYPTOCURRENCY") return "crypto";
  return "stock";
}

// ─── Rendements mensuels (pour Markowitz) ────────────────────────────────────

export async function getMonthlyReturns(symbol: string): Promise<number[]> {
  const history = await getHistory(symbol);
  const closes = history.map((h) => h.close).filter(Boolean);
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return returns;
}
