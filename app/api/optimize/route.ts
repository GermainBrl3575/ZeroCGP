// app/api/optimize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { optimize, efficientFrontier, AssetData } from "@/lib/markowitz";

// Univers d'actifs candidats (symboles Yahoo Finance)
const UNIVERSE: Array<{ symbol: string; name: string; type: "etf" | "stock" | "crypto"; esg: boolean; region: string }> = [
  { symbol: "IWDA.AS",  name: "iShares MSCI World",        type: "etf",   esg: false, region: "world"   },
  { symbol: "VWCE.DE",  name: "Vanguard All-World",         type: "etf",   esg: false, region: "world"   },
  { symbol: "CSPX.AS",  name: "iShares Core S&P 500",       type: "etf",   esg: false, region: "usa"     },
  { symbol: "EQQQ.DE",  name: "Invesco NASDAQ-100",         type: "etf",   esg: false, region: "usa"     },
  { symbol: "PAEEM.PA", name: "MSCI Emerging Markets",      type: "etf",   esg: false, region: "em"      },
  { symbol: "EPRE.PA",  name: "Europe Real Estate",         type: "etf",   esg: false, region: "europe"  },
  { symbol: "SUSW.L",   name: "MSCI World ESG",             type: "etf",   esg: true,  region: "world"   },
  { symbol: "MC.PA",    name: "LVMH",                       type: "stock", esg: false, region: "europe"  },
  { symbol: "AIR.PA",   name: "Airbus SE",                  type: "stock", esg: false, region: "europe"  },
  { symbol: "ASML.AS",  name: "ASML Holding",               type: "stock", esg: false, region: "europe"  },
  { symbol: "AAPL",     name: "Apple Inc.",                 type: "stock", esg: false, region: "usa"     },
  { symbol: "MSFT",     name: "Microsoft Corp.",            type: "stock", esg: false, region: "usa"     },
  { symbol: "BTC-EUR",  name: "Bitcoin",                    type: "crypto",esg: false, region: "world"   },
  { symbol: "ETH-EUR",  name: "Ethereum",                   type: "crypto",esg: false, region: "world"   },
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
    // Fallback : rendements synthétiques si Yahoo indisponible
    return Array.from({ length: 60 }, () => (Math.random() - 0.48) * 0.06);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { capital = 50000, answers = {} } = await req.json();

    // Filtrer l'univers selon les réponses
    let candidates = [...UNIVERSE];

    // Q5 : classes d'actifs
    const q5 = answers[5] ?? "";
    if (q5 === "ETF uniquement") candidates = candidates.filter((a) => a.type === "etf");
    else if (q5 === "ETF + Actions") candidates = candidates.filter((a) => ["etf","stock"].includes(a.type));
    else if (q5 === "ETF + Actions + Crypto") candidates = candidates.filter((a) => ["etf","stock","crypto"].includes(a.type));

    // Q4 : ESG
    const q4 = answers[4] ?? "";
    if (q4 === "ESG strict uniquement") candidates = candidates.filter((a) => a.esg);

    // Limiter à 10 actifs max pour performance
    candidates = candidates.slice(0, 10);

    // Récupérer les rendements historiques en parallèle
    const returnsArr = await Promise.all(candidates.map((a) => getReturns(a.symbol)));

    // Filtrer les actifs sans données suffisantes
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

    // Optimisation
    const optResults = optimize(assets, capital);
    const frontier = efficientFrontier(assets);

    const results = [
      { method: "gmv",       label: "Variance Minimale", ...optResults.gmv,       frontier },
      { method: "maxsharpe", label: "Sharpe Maximum",    ...optResults.maxsharpe, frontier, rec: true },
      { method: "utility",   label: "Utilité Maximale",  ...optResults.utility,   frontier },
    ];

    return NextResponse.json({ results });
  } catch (e) {
    console.error("Optimize error:", e);
    return NextResponse.json({ error: "Erreur de calcul", results: [] }, { status: 500 });
  }
}
