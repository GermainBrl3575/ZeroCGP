// types/index.ts

export type AssetType = "etf" | "stock" | "crypto";

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  isin?: string | null;
  type: AssetType;
  quantity: number;
  currentPrice: number;
  value: number;
  weight: number;
  performance24h?: number;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  type: "manual" | "optimized";
  assets: Asset[];
  totalValue: number;
  profile?: InvestorProfile;
  method?: OptimizationMethod;
  created_at: string;
}

export interface InvestorProfile {
  horizon: "short" | "medium" | "long" | "vlong";
  riskProfile: "conservative" | "moderate" | "dynamic" | "aggressive";
  capital: number;
  maxDrawdown: "d10" | "d20" | "d35" | "unlimited";
  esgFilter: "none" | "light" | "strict";
  assetClasses: Array<"etf" | "stocks" | "bonds" | "crypto">;
  geography: "world" | "usHeavy" | "europe" | "emerging" | "noUSA";
  diversification: "concentrated" | "balanced" | "broad";
  openConstraint: string;
}

export type OptimizationMethod = "gmv" | "maxsharpe" | "utility";

export interface OptimizationResult {
  method: OptimizationMethod;
  weights: Array<{
    symbol: string;
    name: string;
    weight: number;
    type: AssetType;
  }>;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  var95: number;
  cvar95: number;
  maxDrawdown: number;
  capitalAllocation: Array<{
    symbol: string;
    name: string;
    amount: number;
    weight: number;
    type: AssetType;
  }>;
}

export interface EfficientFrontierPoint {
  expectedReturn: number;
  volatility: number;
}

export interface YahooQuote {
  symbol: string;
  shortName: string;
  longName?: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  quoteType: string;
  currency: string;
}
