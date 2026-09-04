"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useTheme } from "@/contexts/ThemeContext";
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
  const t = useTranslations("marketSymbol");
  const tNav = useTranslations("nav");
  const { symbol: slug } = use(params);
  const { theme } = useTheme();

  const tvInfo = getTradingViewSymbol(slug);

  if (!tvInfo) {
    return (
      <div className={styles.notFound}>
        <h1>{t("notFoundTitle")}</h1>
        <p>{t("notFoundBody", { symbol: slug })}</p>
        <Link href="/markets" className={styles.backLink}>
          {t("backToMarkets")}
        </Link>
      </div>
    );
  }

  const displayName = tvInfo.displayName;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/markets" className={styles.backLink}>
          {t("backShort")}
        </Link>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>{displayName}</h1>
        </div>
      </div>

      <div className={styles.chartPanel}>
        <AdvancedChartWidget tvSymbol={tvInfo.tvSymbol} theme={theme} />
      </div>

      <div className={styles.midGrid}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>{t("technicalAnalysis")}</h2>
          <div className={styles.panelBody}>
            <TechnicalAnalysisWidget tvSymbol={tvInfo.tvSymbol} theme={theme} />
          </div>
        </div>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>{t("performance")}</h2>
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
        <h2 className={styles.panelTitle}>{tNav("news")}</h2>
        <div className={`${styles.panelBody} ${styles.newsBody}`}>
          <TopStoriesWidget tvSymbol={tvInfo.tvSymbol} theme={theme} />
        </div>
      </div>
    </div>
  );
}
