import { NextRequest, NextResponse } from "next/server";
import { optimize, efficientFrontier, AssetData } from "@/lib/markowitz";

const UNIVERSE = [
  { symbol: "IWDA.AS",  name: "iShares MSCI World",      type: "etf" as const,   region: "world" },
  { symbol: "VWCE.DE",  name: "Vanguard All-World",       type: "etf" as const,   region: "world" },
  { symbol: "CSPX.AS",  name: "iShares Core S&P 500",     type: "etf" as const,   region: "usa"   },
  { symbol: "EQQQ.DE",  name: "Invesco NASDAQ-100",       type: "etf" as const,   region: "usa"   },
  { symbol: "PAEEM.PA", name: "MSCI Emerging Markets",    type: "etf" as const,   region: "em"    },
  { symbol: "MC.PA",    name: "LVMH",                     type: "stock" as const, region: "europe"},
  { symbol: "AAPL",     name: "Apple Inc.",               type: "stock" as const, region: "usa"   },
  { symbol: "MSFT",     name: "Microsoft Corp.",          type: "stock" as const, region: "usa"   },
  { symbol: "BTC-EUR",  name: "Bitcoin",                  type: "crypto" as const,region: "world" },
  { symbol: "ETH-EUR",  name: "Ethereum",                 type: "crypto" as const,region: "world" },
];

async function getReturns(symbol: string): Promise<number[]> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/yahoo/history?symbol=${encodeURIComponent(symbol)}`);
    const data = await res.json();
    const closes: number[] = (data.history ?? []).map((h: { close: number }) => h.close).filter(Boolean);
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    return returns;
  } catch {
    return Array.from({ length: 60 }, () => (Math.random() - 0.48) * 0.06);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { capital = 50000, answers = {} } = await req.json();

    let candidates = [...UNIVERSE];
    const q5 = answers[5] ?? "";
    if (q5 === "ETF uniquement") candidates = candidates.filter((a) => a.type === "etf");
    else if (q5 === "ETF + Actions") candidates = candidates.filter((a) => ["etf","stock"].includes(a.type));

    candidates = candidates.slice(0, 10);

    const returnsArr = await Promise.all(candidates.map((a) => getReturns(a.symbol)));
    const validIndices = returnsArr.map((r, i) => r.length >= 20 ? i : -1).filter((i) => i >= 0);
    const assets: AssetData[] = validIndices.map((i) => ({
      symbol: candidates[i].symbol,
      name: candidates[i].name,
      type: candidates[i].type,
      returns: returnsArr[i],
    }));

    if (assets.length < 3) {
      return NextResponse.json({ error: "Données insuffisantes", results: [] }, { status: 422 });
    }

    const optResults = optimize(assets, capital);
    const frontier = efficientFrontier(assets);

    const results = [
      { method: "gmv",       label: "Variance Minimale", expectedReturn: optResults.gmv.expectedReturn,       volatility: optResults.gmv.volatility,       sharpeRatio: optResults.gmv.sharpeRatio,       var95: optResults.gmv.var95,       weights: optResults.gmv.capitalAllocation, frontier },
      { method: "maxsharpe", label: "Sharpe Maximum",    expectedReturn: optResults.maxsharpe.expectedReturn, volatility: optResults.maxsharpe.volatility, sharpeRatio: optResults.maxsharpe.sharpeRatio, var95: optResults.maxsharpe.var95, weights: optResults.maxsharpe.capitalAllocation, frontier, rec: true },
      { method: "utility",   label: "Utilité Maximale",  expectedReturn: optResults.utility.expectedReturn,   volatility: optResults.utility.volatility,   sharpeRatio: optResults.utility.sharpeRatio,   var95: optResults.utility.var95,   weights: optResults.utility.capitalAllocation, frontier },
    ];

    return NextResponse.json({ results });
  } catch (e) {
    console.error("Optimize error:", e);
    return NextResponse.json({ error: "Erreur de calcul", results: [] }, { status: 500 });
  }
}
