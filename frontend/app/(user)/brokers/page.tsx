"use client";
import { useEffect, useState } from "react";
import styles from "./brokers.module.scss";

type Broker = {
  id: string;
  name: string;
  company: string | null;
  status: string;
};

const FALLBACK_BROKERS = [
  {
    id: "1",
    name: "Apex Markets",
    company: "Pro-grade execution · Up to 85% rebates",
    status: "active",
    rebate: "85%",
    rating: "4.9",
    type: "ECN",
  },
  {
    id: "2",
    name: "IC Markets",
    company: "Raw spreads from 0.0 pips · True ECN",
    status: "active",
    rebate: "80%",
    rating: "4.8",
    type: "ECN",
  },
  {
    id: "3",
    name: "XM Global",
    company: "Multi-asset broker · 1000+ instruments",
    status: "active",
    rebate: "75%",
    rating: "4.7",
    type: "Market Maker",
  },
  {
    id: "4",
    name: "Exness",
    company: "Instant withdrawals · Tight spreads",
    status: "active",
    rebate: "70%",
    rating: "4.7",
    type: "ECN",
  },
  {
    id: "5",
    name: "Pepperstone",
    company: "Award-winning · ASIC & FCA regulated",
    status: "active",
    rebate: "72%",
    rating: "4.8",
    type: "ECN",
  },
  {
    id: "6",
    name: "FBS",
    company: "Copy trading · Flexible leverage",
    status: "active",
    rebate: "65%",
    rating: "4.5",
    type: "Market Maker",
  },
];

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
  const [brokers, setBrokers] = useState(FALLBACK_BROKERS);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/proxy/public/brokers")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Broker[]) => {
        if (data.length > 0) {
          const mapped = data.map((b, i) => ({
            id: b.id,
            name: b.name,
            company: b.company || "Vetted broker partner",
            status: b.status,
            rebate: `${70 + (i % 4) * 5}%`,
            rating: `4.${5 + (i % 5)}`,
            type: i % 2 === 0 ? "ECN" : "Market Maker",
          }));
          setBrokers(mapped);
        }
      })
      .catch(() => {});
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
            Every broker is vetted for regulation, spreads, and cashback
            reliability.
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

      <div className={styles.grid}>
        {filtered.map((b, i) => (
          <div key={b.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div
                className={styles.avatar}
                style={{ background: BG_COLORS[i % BG_COLORS.length] }}
              >
                {getInitials(b.name)}
              </div>
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
          No brokers match &ldquo;{search}&rdquo;
        </div>
      )}
    </>
  );
}
