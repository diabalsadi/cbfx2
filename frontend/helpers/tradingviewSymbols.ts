/** Turns a display name ("EUR/USD", "S&P 500") into a URL-safe route slug. */
export function slugifySymbol(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type MarketTab = "Forex" | "Crypto" | "Metals" | "Indices" | "Commodities";

export interface TradingViewSymbolInfo {
  /** Display name as shown across the app, e.g. "EUR/USD" */
  displayName: string;
  /** TradingView ticker, e.g. "FX:EURUSD" */
  tvSymbol: string;
  /** Market group shown as a tab on the markets page */
  category: MarketTab;
}

/**
 * Maps every pair/instrument name used on the markets page and homepage
 * to its TradingView ticker. Keyed by slug for O(1) route lookup.
 */
const SYMBOLS: TradingViewSymbolInfo[] = [
  // Forex
  { displayName: "EUR/USD", tvSymbol: "FX:EURUSD", category: "Forex" },
  { displayName: "GBP/USD", tvSymbol: "FX:GBPUSD", category: "Forex" },
  { displayName: "USD/JPY", tvSymbol: "FX:USDJPY", category: "Forex" },
  { displayName: "AUD/USD", tvSymbol: "FX:AUDUSD", category: "Forex" },
  { displayName: "USD/CHF", tvSymbol: "FX:USDCHF", category: "Forex" },
  { displayName: "NZD/USD", tvSymbol: "FX:NZDUSD", category: "Forex" },
  { displayName: "GBP/JPY", tvSymbol: "FX:GBPJPY", category: "Forex" },
  { displayName: "EUR/JPY", tvSymbol: "FX:EURJPY", category: "Forex" },

  // Crypto
  { displayName: "BTC/USD", tvSymbol: "BINANCE:BTCUSDT", category: "Crypto" },
  { displayName: "ETH/USD", tvSymbol: "BINANCE:ETHUSDT", category: "Crypto" },
  { displayName: "SOL/USD", tvSymbol: "BINANCE:SOLUSDT", category: "Crypto" },
  { displayName: "BNB/USD", tvSymbol: "BINANCE:BNBUSDT", category: "Crypto" },
  { displayName: "XRP/USD", tvSymbol: "BINANCE:XRPUSDT", category: "Crypto" },
  { displayName: "ADA/USD", tvSymbol: "BINANCE:ADAUSDT", category: "Crypto" },

  // Metals
  { displayName: "XAU/USD", tvSymbol: "OANDA:XAUUSD", category: "Metals" },
  { displayName: "XAG/USD", tvSymbol: "OANDA:XAGUSD", category: "Metals" },
  { displayName: "XPT/USD", tvSymbol: "OANDA:XPTUSD", category: "Metals" },
  { displayName: "XPD/USD", tvSymbol: "OANDA:XPDUSD", category: "Metals" },

  // Indices — uses FOREXCOM/INDEX tickers (not TVC's real exchange feed):
  // the exchange-licensed index data requires a real-time agreement that
  // anonymous embedded widgets don't have, and shows "This symbol is only
  // available on TradingView" instead. These CFD/composite equivalents are
  // freely embeddable, same as the OANDA tickers used for Metals above.
  { displayName: "S&P 500", tvSymbol: "FOREXCOM:SPXUSD", category: "Indices" },
  { displayName: "NASDAQ 100", tvSymbol: "FOREXCOM:NSXUSD", category: "Indices" },
  { displayName: "Dow Jones", tvSymbol: "FOREXCOM:DJI", category: "Indices" },
  { displayName: "DAX 40", tvSymbol: "INDEX:DEU40", category: "Indices" },
  { displayName: "FTSE 100", tvSymbol: "FOREXCOM:UKXGBP", category: "Indices" },
  { displayName: "Nikkei 225", tvSymbol: "INDEX:NKY", category: "Indices" },

  // Commodities
  { displayName: "WTI Crude Oil", tvSymbol: "TVC:USOIL", category: "Commodities" },
  { displayName: "Brent Crude Oil", tvSymbol: "TVC:UKOIL", category: "Commodities" },
];

const BY_SLUG: Record<string, TradingViewSymbolInfo> = Object.fromEntries(
  SYMBOLS.map((s) => [slugifySymbol(s.displayName), s]),
);

export function getTradingViewSymbol(
  slug: string,
): TradingViewSymbolInfo | null {
  return BY_SLUG[slug] ?? null;
}

export function symbolHref(displayName: string): string {
  return `/markets/${slugifySymbol(displayName)}`;
}

/** All symbols, optionally filtered to one tab/category. */
export function getSymbols(category?: MarketTab): TradingViewSymbolInfo[] {
  return category ? SYMBOLS.filter((s) => s.category === category) : SYMBOLS;
}

export function getSymbolByDisplayName(
  displayName: string,
): TradingViewSymbolInfo | null {
  return SYMBOLS.find((s) => s.displayName === displayName) ?? null;
}
