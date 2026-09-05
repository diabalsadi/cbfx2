"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { articlesApi, type Article } from "@/helpers/api";
import styles from "./analysis.module.scss";

const CATEGORIES = ["all", "crypto", "forex", "metals", "indices"] as const;

type CategoryFilter = (typeof CATEGORIES)[number];

export default function AnalysisPage() {
  const t = useTranslations("analysis");

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("justNow");
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  }

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");

  useEffect(() => {
    articlesApi
      .listAnalysis()
      .then(setArticles)
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : t("unableToLoad"),
        ),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredArticles =
    category === "all"
      ? articles
      : articles.filter((article) => article.market_category === category);
  const featured = filteredArticles[0];
  const latest = filteredArticles.slice(1);

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          <span className={styles.accent}>CBFX</span> {t("titleSuffix")}
        </h1>
        <div
          className={styles.filters}
          aria-label={t("filterAriaLabel")}
        >
          {CATEGORIES.map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.filterButton} ${category === value ? styles.activeFilter : ""}`}
              onClick={() => setCategory(value)}
            >
              {t(`categories.${value}`)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.skeleton}>
          <div className={styles.skeletonFeatured} />
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonRow} />
          ))}
        </div>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : articles.length === 0 ? (
        <p className={styles.empty}>{t("noneYet")}</p>
      ) : filteredArticles.length === 0 ? (
        <p className={styles.empty}>
          {t("noneInCategory", { category: t(`categories.${category}`) })}
        </p>
      ) : (
        <>
          {/* Featured / breaking */}
          {featured && (
            <Link href={`/analysis/${featured.id}`} className={styles.featured}>
              <div className={styles.breakingBadge}>{t("analysisBadge")}</div>
              <h2 className={styles.featuredTitle}>{featured.title}</h2>
              <div className={styles.featuredMeta}>
                {t("minRead", { min: 2 })} · {timeAgo(featured.created_at)}
              </div>
            </Link>
          )}

          {/* Latest list */}
          <div className={styles.latestSection}>
            <div className={styles.latestLabel}>{t("latestLabel")}</div>
            <div className={styles.list}>
              {latest.map((a, i) => (
                <Link
                  key={a.id}
                  href={`/analysis/${a.id}`}
                  className={styles.row}
                >
                  <div className={styles.rowLeft}>
                    {a.symbol && (
                      <span className={styles.symbol}>{a.symbol}</span>
                    )}
                    <span className={styles.rowTime}>
                      · {timeAgo(a.created_at)}
                    </span>
                  </div>
                  <div className={styles.rowTitle}>{a.title}</div>
                  {i < 2 && (
                    <span className={styles.hotBadge}>{t("trendingBadge")}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
