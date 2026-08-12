"use client";

import { use } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { getMarketEntryBySlug } from "@/data/marketSymbols";
import { getTradingViewSymbol } from "@/helpers/tradingviewSymbols";
import {
  AdvancedChartWidget,
  TechnicalAnalysisWidget,
  TopStoriesWidget,
  SymbolOverviewWidget,
} from "@/components/TradingViewWidgets";
import styles from "./symbol.module.scss";

export default function SymbolPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: slug } = use(params);
  const { theme } = useTheme();

  const tvInfo = getTradingViewSymbol(slug);
  const entry = getMarketEntryBySlug(slug);

  if (!tvInfo) {
    return (
      <div className={styles.notFound}>
        <h1>Symbol not found</h1>
        <p>We don&rsquo;t have data for &ldquo;{slug}&rdquo;.</p>
        <Link href="/markets" className={styles.backLink}>
          ← Back to Markets
        </Link>
      </div>
    );
  }

  const displayName = entry?.name ?? tvInfo.displayName;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/markets" className={styles.backLink}>
          ← Markets
        </Link>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>{displayName}</h1>
          {entry && (
            <div className={styles.priceBlock}>
              <span className={styles.price}>{entry.price}</span>
              <span
                className={`${styles.change} ${entry.up ? styles.up : styles.down}`}
              >
                {entry.up ? "↗" : "↘"} {entry.change}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.chartPanel}>
        <AdvancedChartWidget tvSymbol={tvInfo.tvSymbol} theme={theme} />
      </div>

      <div className={styles.midGrid}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Technical Analysis</h2>
          <div className={styles.panelBody}>
            <TechnicalAnalysisWidget tvSymbol={tvInfo.tvSymbol} theme={theme} />
          </div>
        </div>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Performance</h2>
          <div className={styles.panelBody}>
            <SymbolOverviewWidget
              tvSymbol={tvInfo.tvSymbol}
              theme={theme}
              displayName={displayName}
            />
          </div>
        </div>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>News</h2>
        <div className={`${styles.panelBody} ${styles.newsBody}`}>
          <TopStoriesWidget tvSymbol={tvInfo.tvSymbol} theme={theme} />
        </div>
      </div>
    </div>
  );
}
