"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import type { ReferralStats } from "@/helpers/api";
import { chartSx } from "@/helpers/chartTheme";
import ChartThemeProvider from "@/components/ChartThemeProvider";
import styles from "./ReferralStatsPanel.module.scss";

const PieChart = dynamic(() => import("@mui/x-charts/PieChart").then((m) => m.PieChart), {
  ssr: false,
});
const BarChart = dynamic(() => import("@mui/x-charts/BarChart").then((m) => m.BarChart), {
  ssr: false,
});

type Range = "weekly" | "monthly";

interface ReferralStatsPanelProps {
  referralCode: string | null;
  stats: ReferralStats | null;
  loading: boolean;
  error?: string;
}

export default function ReferralStatsPanel({ referralCode, stats, loading, error }: ReferralStatsPanelProps) {
  const [range, setRange] = useState<Range>("weekly");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const referralLink = referralCode && origin ? `${origin}/register?referral=${referralCode}` : "";

  const countryData = useMemo(
    () =>
      Object.entries(stats?.by_country || {}).map(([country, count], i) => ({
        id: i,
        value: count,
        label: country,
      })),
    [stats]
  );

  const buckets = range === "weekly" ? stats?.weekly : stats?.monthly;

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={styles.panel}>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Your Referral Link</h2>
        <div className={styles.field}>
          <label className={styles.label}>Referral Code</label>
          <input className={styles.input} value={referralCode || "—"} disabled readOnly />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Shareable Link</label>
          <div className={styles.linkRow}>
            <input className={styles.input} value={referralLink} disabled readOnly />
            <button className={styles.copyBtn} onClick={handleCopy} disabled={!referralLink}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Referred</span>
          <span className={styles.statValue}>
            {loading ? "—" : (stats?.total ?? 0).toLocaleString("en-US")}
          </span>
          <span className={styles.statSub}>People who signed up with your code</span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.cardTitle}>Referrals over time</h2>
          <div className={styles.rangeToggle}>
            <button
              className={range === "weekly" ? styles.rangeBtnActive : styles.rangeBtn}
              onClick={() => setRange("weekly")}
            >
              Week
            </button>
            <button
              className={range === "monthly" ? styles.rangeBtnActive : styles.rangeBtn}
              onClick={() => setRange("monthly")}
            >
              Month
            </button>
          </div>
        </div>
        {!loading && buckets && (
          <ChartThemeProvider>
            <BarChart
              xAxis={[{ scaleType: "band", data: buckets.map((b) => b.label) }]}
              series={[{ data: buckets.map((b) => b.count), color: "#D9641E" }]}
              height={260}
              grid={{ horizontal: true }}
              sx={chartSx}
            />
          </ChartThemeProvider>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>By Country</h2>
        {!loading && countryData.length > 0 ? (
          <ChartThemeProvider>
            <PieChart series={[{ data: countryData, innerRadius: 40 }]} height={260} sx={chartSx} />
          </ChartThemeProvider>
        ) : (
          !loading && <p className={styles.hint}>No referred signups yet.</p>
        )}
      </div>
    </div>
  );
}
