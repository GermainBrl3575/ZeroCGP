export const ASSET_NAMES: Record<string, string> = {
  "CSPX":  "iShares S&P 500",
  "IWDA":  "MSCI World",
  "VWCE":  "Vanguard All-World",
  "EQQQ":  "Nasdaq 100",
  "PAEEM": "MSCI Émergents",
  "EPRE":  "Immobilier Europe",
  "SUSW":  "MSCI World ESG",
  "PANX":  "Amundi MSCI World",
  "QDVE":  "S&P 500 IT",
  "MC":    "LVMH",
  "AIR":   "Airbus",
  "ASML":  "ASML",
  "AAPL":  "Apple",
  "MSFT":  "Microsoft",
  "NOVO":  "Novo Nordisk",
  "NVDA":  "Nvidia",
  "TSLA":  "Tesla",
  "GOOGL": "Alphabet",
  "AMZN":  "Amazon",
  "META":  "Meta",
  "BTC":   "Bitcoin",
  "ETH":   "Ethereum",
  "URTH":  "MSCI World ETF",
  "EEM":   "iShares Émergents",
};

export function assetName(symbol: string): string {
  const base = symbol.split(".")[0].split("-")[0].toUpperCase();
  return ASSET_NAMES[base] ?? base;
}
