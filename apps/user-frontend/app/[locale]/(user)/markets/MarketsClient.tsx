"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { SingleTickerWidget } from "@/components/TradingViewWidgets";
import { getSymbols, symbolHref, type MarketTab } from "@/helpers/tradingviewSymbols";
import styles from "./markets.module.scss";

const TABS: MarketTab[] = ["Forex", "Crypto", "Metals", "Indices", "Commodities"];

export default function MarketsPage() {
  const t = useTranslations("markets");
  const [activeTab, setActiveTab] = useState<MarketTab>("Forex");
  const [search, setSearch] = useState("");
  const { theme } = useTheme();

  const filtered = getSymbols(activeTab).filter((s) =>
    s.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            className={styles.search}
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>{t("noMatch", { search })}</div>
        ) : (
          filtered.map((s) => (
            <Link
              key={s.displayName}
              href={symbolHref(s.displayName)}
              className={styles.row}
            >
              <div className={styles.tickerWrap}>
                <SingleTickerWidget tvSymbol={s.tvSymbol} theme={theme} />
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
