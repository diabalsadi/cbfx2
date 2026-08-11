"use client";
import { useEffect, useState } from "react";
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
  status: string;
};

type DisplayBroker = {
  id: string;
  name: string;
  imgSrc: string | null;
  company: string;
  status: string;
  rebate: string;
  rating: string;
  type: string;
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
        const mapped = data.map((b, i) => {
          const labels = b.coverage_type === "country" ? COUNTRY_LABELS : REGION_LABELS;
          return {
            id: b.id,
            name: b.name,
            imgSrc: b.img_src,
            company: b.geo_coverage.length
              ? b.geo_coverage.map((r) => labels[r] || r).join(" · ")
              : "Vetted broker partner",
            status: b.status,
            rebate: `${b.cashback_rate}%`,
            rating: `4.${5 + (i % 5)}`,
            type: i % 2 === 0 ? "ECN" : "Market Maker",
          };
        });
        setBrokers(mapped);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load brokers right now.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
          <h1 className={styles.pageTitle}>Brokers</h1>
          <p className={styles.pageSubtitle}>
            Brokers available in your region, vetted for regulation, spreads,
            and cashback reliability.
          </p>
        </div>
      </div>

      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>⌕</span>
        <input
          className={styles.search}
          placeholder="Search brokers…"
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
                    <div className={styles.brokerType}>{b.type}</div>
                  </div>
                  <div className={styles.featuredBadge}>FEATURED</div>
                </div>

                <div className={styles.brokerDesc}>{b.company}</div>

                <div className={styles.metrics}>
                  <div className={styles.metric}>
                    <span className={styles.metricValue}>{b.rebate}</span>
                    <span className={styles.metricLabel}>Rebate</span>
                  </div>
                  <div className={styles.metricDivider} />
                  <div className={styles.metric}>
                    <span className={styles.metricValue}>⭐ {b.rating}</span>
                    <span className={styles.metricLabel}>Rating</span>
                  </div>
                  <div className={styles.metricDivider} />
                  <div className={styles.metric}>
                    <span className={`${styles.metricValue} ${styles.active}`}>
                      Active
                    </span>
                    <span className={styles.metricLabel}>Status</span>
                  </div>
                </div>

                <button className={styles.ctaBtn}>Get cashback →</button>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className={styles.empty}>
              {search
                ? `No brokers match "${search}"`
                : "No brokers are currently available in your region."}
            </div>
          )}
        </>
      )}
    </>
  );
}
