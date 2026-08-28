"use client";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { REGION_LABELS } from "@/helpers/regions";
import { COUNTRY_LABELS } from "@/helpers/countries";
import { withDebugIp } from "@/helpers/debugIp";
import styles from "./brokers.module.scss";

type Broker = {
  id: string;
  name: string;
  img_src: string | null;
  coverage_type: "region" | "country";
  geo_coverage: string[];
  cashback_rate: number;
  account_types_count: number;
  status: string;
};

type DisplayBroker = {
  id: string;
  name: string;
  imgSrc: string | null;
  company: string;
  status: string;
  rebate: string;
  accountTypesCount: number;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const BG_COLORS = [
  "#FF6B00",
  "#7c3aed",
  "#0891b2",
  "#16a34a",
  "#d97706",
  "#db2777",
];

export default function BrokersPage() {
  const t = useTranslations("brokers");
  const [brokers, setBrokers] = useState<DisplayBroker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(withDebugIp("/api/proxy/public/brokers"))
      .then((r) => {
        if (!r.ok) throw new Error("request failed");
        return r.json();
      })
      .then((data: Broker[]) => {
        if (cancelled) return;
        const mapped = data.map((b) => {
          const labels = b.coverage_type === "country" ? COUNTRY_LABELS : REGION_LABELS;
          return {
            id: b.id,
            name: b.name,
            imgSrc: b.img_src,
            company: b.geo_coverage.length
              ? b.geo_coverage.map((r) => labels[r] || r).join(" · ")
              : t("vettedPartner"),
            status: b.status,
            rebate: `${b.cashback_rate}%`,
            accountTypesCount: b.account_types_count,
          };
        });
        setBrokers(mapped);
      })
      .catch(() => {
        if (!cancelled) setError(t("unableToLoad"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = brokers.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.company || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("title")}</h1>
          <p className={styles.pageSubtitle}>{t("subtitle")}</p>
        </div>
      </div>

      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>⌕</span>
        <input
          className={styles.search}
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.empty}>{error}</div>
      ) : (
        <>
          <div className={styles.grid}>
            {filtered.map((b, i) => (
              <div key={b.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  {b.imgSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.imgSrc} alt="" className={styles.avatar} />
                  ) : (
                    <div
                      className={styles.avatar}
                      style={{ background: BG_COLORS[i % BG_COLORS.length] }}
                    >
                      {getInitials(b.name)}
                    </div>
                  )}
                  <div className={styles.brokerInfo}>
                    <div className={styles.brokerName}>{b.name}</div>
                    <div className={styles.brokerType}>
                      {b.accountTypesCount > 0
                        ? t("accountTypesCount", { count: b.accountTypesCount })
                        : t("vettedPartner")}
                    </div>
                  </div>
                  <div className={styles.featuredBadge}>{t("featured")}</div>
                </div>

                <div className={styles.brokerDesc}>{b.company}</div>

                <div className={styles.metrics}>
                  <div className={styles.metric}>
                    <span className={styles.metricValue}>{b.rebate}</span>
                    <span className={styles.metricLabel}>{t("rebate")}</span>
                  </div>
                  <div className={styles.metricDivider} />
                  <div className={styles.metric}>
                    <span className={`${styles.metricValue} ${styles.active}`}>
                      {t("active")}
                    </span>
                    <span className={styles.metricLabel}>{t("status")}</span>
                  </div>
                </div>

                <Link href={`/brokers/${b.id}`} className={styles.ctaBtn}>
                  {t("getCashback")}
                </Link>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className={styles.empty}>
              {search ? t("noMatchSearch", { search }) : t("noneInRegion")}
            </div>
          )}
        </>
      )}
    </>
  );
}
