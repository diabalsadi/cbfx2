import { slugifySymbol } from "@/helpers/tradingviewSymbols";

export type MarketTab = "Forex" | "Crypto" | "Metals" | "Indices";

export interface MarketEntry {
  symbol: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
}

export const MARKETS: Record<MarketTab, MarketEntry[]> = {
  Forex: [
    { symbol: "EUR", name: "EUR/USD", price: "1.0842", change: "+0.32%", up: true },
    { symbol: "GBP", name: "GBP/USD", price: "1.2710", change: "-0.12%", up: false },
    { symbol: "USD", name: "USD/JPY", price: "157.21", change: "+0.41%", up: true },
    { symbol: "AUD", name: "AUD/USD", price: "0.6634", change: "+0.21%", up: true },
    { symbol: "USD", name: "USD/CHF", price: "0.9041", change: "-0.08%", up: false },
    { symbol: "NZD", name: "NZD/USD", price: "0.6115", change: "+0.15%", up: true },
    { symbol: "GBP", name: "GBP/JPY", price: "192.55", change: "+0.18%", up: true },
    { symbol: "EUR", name: "EUR/JPY", price: "170.42", change: "+0.27%", up: true },
  ],
  Crypto: [
    { symbol: "BTC", name: "BTC/USD", price: "68,420", change: "+1.84%", up: true },
    { symbol: "ETH", name: "ETH/USD", price: "3,612", change: "-0.74%", up: false },
    { symbol: "SOL", name: "SOL/USD", price: "178.42", change: "+3.21%", up: true },
    { symbol: "BNB", name: "BNB/USD", price: "594.10", change: "+0.88%", up: true },
    { symbol: "XRP", name: "XRP/USD", price: "0.5891", change: "-1.12%", up: false },
    { symbol: "ADA", name: "ADA/USD", price: "0.4520", change: "+2.05%", up: true },
  ],
  Metals: [
    { symbol: "XAU", name: "XAU/USD", price: "2,348.7", change: "-0.41%", up: false },
    { symbol: "XAG", name: "XAG/USD", price: "31.42", change: "+0.62%", up: true },
    { symbol: "XPT", name: "XPT/USD", price: "1,021.5", change: "-0.29%", up: false },
    { symbol: "XPD", name: "XPD/USD", price: "974.20", change: "+1.10%", up: true },
  ],
  Indices: [
    { symbol: "SPX", name: "S&P 500", price: "5,312.4", change: "+0.54%", up: true },
    { symbol: "NDX", name: "NASDAQ 100", price: "18,820", change: "+0.91%", up: true },
    { symbol: "DJI", name: "Dow Jones", price: "39,412", change: "+0.28%", up: true },
    { symbol: "DAX", name: "DAX 40", price: "18,241", change: "-0.17%", up: false },
    { symbol: "UKX", name: "FTSE 100", price: "8,220", change: "+0.33%", up: true },
    { symbol: "NKY", name: "Nikkei 225", price: "38,640", change: "-0.52%", up: false },
  ],
};

const BY_SLUG: Record<string, MarketEntry> = Object.fromEntries(
  Object.values(MARKETS)
    .flat()
    .map((m) => [slugifySymbol(m.name), m]),
);

export function getMarketEntryBySlug(slug: string): MarketEntry | null {
  return BY_SLUG[slug] ?? null;
}
