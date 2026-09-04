"use client";
import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/routing";

type TvTheme = "light" | "dark";

// TradingView's own supported widget locale codes — mostly a 1:1 match with
// ours, except Hindi ("hi_in" rather than "hi") and Arabic ("ar_AE" rather
// than plain "ar" — TradingView's widgets don't recognize "ar" or "ar_SA",
// verified against the live widget embed).
// https://www.tradingview.com/widget-docs/customization/#locales
const TV_LOCALE: Record<Locale, string> = {
  en: "en",
  ar: "ar_AE",
  es: "es",
  fa: "fa",
  pt: "pt",
  zh: "zh",
  vi: "vi",
  hi: "hi_in",
};

/** Maps the active app locale to a TradingView widget locale code — call
 * from any widget component so its chart/toolbar UI matches the page. */
function useTvLocale(): string {
  const locale = useLocale() as Locale;
  return TV_LOCALE[locale] ?? "en";
}

interface ScriptEmbedProps {
  scriptSrc: string;
  config: Record<string, unknown>;
}

/**
 * TradingView's embeddable widgets initialize themselves off a <script> tag
 * whose body is a JSON config, appended next to a target div — they aren't
 * React components, so the script has to be injected imperatively per mount.
 */
function TradingViewScriptEmbed({ scriptSrc, config }: ScriptEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const configKey = JSON.stringify(config);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.innerHTML = configKey;
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [scriptSrc, configKey]);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      // Isolated from the page's own dir — on ar/fa (RTL_LOCALES), the rest
      // of the app renders dir="rtl", but TradingView's embeds aren't built
      // to expect an RTL ancestor and can misbehave (including seemingly
      // ignoring their own `locale` config) when they inherit it. Forcing
      // ltr here keeps the widget in the direction context it actually
      // expects, regardless of the surrounding page.
      dir="ltr"
      style={{ height: "100%", width: "100%" }}
    />
  );
}

interface WidgetProps {
  tvSymbol: string;
  theme: TvTheme;
}

/** Compact single-symbol name + last price + change widget, no chart. */
export function SingleTickerWidget({ tvSymbol, theme }: WidgetProps) {
  const locale = useTvLocale();
  return (
    <TradingViewScriptEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js"
      config={{
        symbol: tvSymbol,
        width: "100%",
        locale,
        colorTheme: theme,
        isTransparent: true,
      }}
    />
  );
}

export function AdvancedChartWidget({ tvSymbol, theme }: WidgetProps) {
  const locale = useTvLocale();
  return (
    <TradingViewScriptEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
      config={{
        symbol: tvSymbol,
        interval: "60",
        theme,
        style: "1",
        locale,
        timezone: "Etc/UTC",
        allow_symbol_change: false,
        withdateranges: true,
        hide_side_toolbar: false,
        support_host: "https://www.tradingview.com",
        autosize: true,
      }}
    />
  );
}

export function TechnicalAnalysisWidget({ tvSymbol, theme }: WidgetProps) {
  const locale = useTvLocale();
  return (
    <TradingViewScriptEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
      config={{
        interval: "1D",
        width: "100%",
        height: "100%",
        symbol: tvSymbol,
        showIntervalTabs: true,
        locale,
        colorTheme: theme,
        isTransparent: true,
      }}
    />
  );
}

export function TopStoriesWidget({ tvSymbol, theme }: WidgetProps) {
  const locale = useTvLocale();
  return (
    <TradingViewScriptEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js"
      config={{
        feedMode: "symbol",
        symbol: tvSymbol,
        colorTheme: theme,
        isTransparent: true,
        displayMode: "regular",
        width: "100%",
        height: "100%",
        locale,
      }}
    />
  );
}

/** General financial newswire — not tied to a single symbol, unlike
 * TopStoriesWidget above. Used on the News route to supplement our own
 * admin-authored articles with a live third-party feed. */
export function MarketNewsWidget({ theme }: { theme: TvTheme }) {
  const locale = useTvLocale();
  return (
    <TradingViewScriptEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js"
      config={{
        feedMode: "all_symbols",
        colorTheme: theme,
        isTransparent: true,
        displayMode: "regular",
        width: "100%",
        height: "100%",
        locale,
      }}
    />
  );
}

/** Live economic/financial events calendar — not tied to a single symbol. */
export function EconomicCalendarWidget({ theme }: { theme: TvTheme }) {
  const locale = useTvLocale();
  return (
    <TradingViewScriptEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-events.js"
      config={{
        width: "100%",
        height: "100%",
        colorTheme: theme,
        isTransparent: true,
        locale,
        importanceFilter: "-1,0,1",
      }}
    />
  );
}

export function SymbolOverviewWidget({
  tvSymbol,
  theme,
  displayName,
}: WidgetProps & { displayName: string }) {
  const locale = useTvLocale();
  return (
    <TradingViewScriptEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js"
      config={{
        symbols: [[displayName, `${tvSymbol}|1D`]],
        chartOnly: false,
        width: "100%",
        height: "100%",
        locale,
        colorTheme: theme,
        autosize: true,
        showVolume: false,
        showMA: false,
        hideDateRanges: false,
        hideMarketStatus: false,
        hideSymbolLogo: false,
        scalePosition: "right",
        scaleMode: "Normal",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
        fontSize: "10",
        noTimeScale: false,
        valuesTracking: "1",
        changeMode: "price-and-percent",
        chartType: "area",
        headerFontSize: "medium",
        lineWidth: 2,
        lineType: 0,
        dateRanges: ["1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M"],
      }}
    />
  );
}
