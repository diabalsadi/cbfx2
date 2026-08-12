/** Turns a display name ("EUR/USD", "S&P 500") into a URL-safe route slug. */
export function slugifySymbol(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface TradingViewSymbolInfo {
  /** Display name as shown across the app, e.g. "EUR/USD" */
  displayName: string;
  /** TradingView ticker, e.g. "FX:EURUSD" */
  tvSymbol: string;
}

/**
 * Maps every pair/instrument name used on the markets page and homepage
 * to its TradingView ticker. Keyed by slug for O(1) route lookup.
 */
const SYMBOLS: TradingViewSymbolInfo[] = [
  // Forex
  { displayName: "EUR/USD", tvSymbol: "FX:EURUSD" },
  { displayName: "GBP/USD", tvSymbol: "FX:GBPUSD" },
  { displayName: "USD/JPY", tvSymbol: "FX:USDJPY" },
  { displayName: "AUD/USD", tvSymbol: "FX:AUDUSD" },
  { displayName: "USD/CHF", tvSymbol: "FX:USDCHF" },
  { displayName: "NZD/USD", tvSymbol: "FX:NZDUSD" },
  { displayName: "GBP/JPY", tvSymbol: "FX:GBPJPY" },
  { displayName: "EUR/JPY", tvSymbol: "FX:EURJPY" },

  // Crypto
  { displayName: "BTC/USD", tvSymbol: "BINANCE:BTCUSDT" },
  { displayName: "ETH/USD", tvSymbol: "BINANCE:ETHUSDT" },
  { displayName: "SOL/USD", tvSymbol: "BINANCE:SOLUSDT" },
  { displayName: "BNB/USD", tvSymbol: "BINANCE:BNBUSDT" },
  { displayName: "XRP/USD", tvSymbol: "BINANCE:XRPUSDT" },
  { displayName: "ADA/USD", tvSymbol: "BINANCE:ADAUSDT" },

  // Metals
  { displayName: "XAU/USD", tvSymbol: "OANDA:XAUUSD" },
  { displayName: "XAG/USD", tvSymbol: "OANDA:XAGUSD" },
  { displayName: "XPT/USD", tvSymbol: "OANDA:XPTUSD" },
  { displayName: "XPD/USD", tvSymbol: "OANDA:XPDUSD" },

  // Indices
  { displayName: "S&P 500", tvSymbol: "TVC:SPX" },
  { displayName: "NASDAQ 100", tvSymbol: "TVC:NDX" },
  { displayName: "Dow Jones", tvSymbol: "TVC:DJI" },
  { displayName: "DAX 40", tvSymbol: "XETR:DAX" },
  { displayName: "FTSE 100", tvSymbol: "TVC:UKX" },
  { displayName: "Nikkei 225", tvSymbol: "TVC:NI225" },
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
