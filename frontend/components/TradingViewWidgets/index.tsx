"use client";
import { useEffect, useRef } from "react";

type TvTheme = "light" | "dark";

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
      style={{ height: "100%", width: "100%" }}
    />
  );
}

interface WidgetProps {
  tvSymbol: string;
  theme: TvTheme;
}

export function AdvancedChartWidget({ tvSymbol, theme }: WidgetProps) {
  return (
    <TradingViewScriptEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
      config={{
        symbol: tvSymbol,
        interval: "60",
        theme,
        style: "1",
        locale: "en",
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
  return (
    <TradingViewScriptEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
      config={{
        interval: "1D",
        width: "100%",
        height: "100%",
        symbol: tvSymbol,
        showIntervalTabs: true,
        locale: "en",
        colorTheme: theme,
        isTransparent: true,
      }}
    />
  );
}

export function TopStoriesWidget({ tvSymbol, theme }: WidgetProps) {
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
        locale: "en",
      }}
    />
  );
}

export function SymbolOverviewWidget({
  tvSymbol,
  theme,
  displayName,
}: WidgetProps & { displayName: string }) {
  return (
    <TradingViewScriptEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js"
      config={{
        symbols: [[displayName, `${tvSymbol}|1D`]],
        chartOnly: false,
        width: "100%",
        height: "100%",
        locale: "en",
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
