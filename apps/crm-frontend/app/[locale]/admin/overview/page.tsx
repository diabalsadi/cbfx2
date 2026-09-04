"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, visitsApi, mt5AccountsApi, type VisitStats } from "@/helpers/api";
import { COUNTRY_LABELS } from "@/helpers/countries";
import { chartSx } from "@/helpers/chartTheme";
import ChartThemeProvider from "@/components/ChartThemeProvider";
import Card from "@/components/Card";
import styles from "./Overview.module.scss";

const PieChart = dynamic(() => import("@mui/x-charts/PieChart").then((m) => m.PieChart), {
  ssr: false,
});
const BarChart = dynamic(() => import("@mui/x-charts/BarChart").then((m) => m.BarChart), {
  ssr: false,
});

interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_budget: number;
  total_impressions: number;
  total_clicks: number;
  total_spend: number;
  ctr: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  budget: number;
}

type VisitRange = "daily" | "weekly" | "monthly" | "yearly";
const VISIT_RANGES: { key: VisitRange; labelKey: "day" | "week" | "month" | "year" }[] = [
  { key: "daily", labelKey: "day" },
  { key: "weekly", labelKey: "week" },
  { key: "monthly", labelKey: "month" },
  { key: "yearly", labelKey: "year" },
];

export default function OverviewPage() {
  const t = useTranslations("adminOverview");
  const tAdminNav = useTranslations("admin.nav");
  const locale = useLocale();
  const { user } = useAuth();
  const role = user?.role || "";
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);

  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [visitRange, setVisitRange] = useState<VisitRange>("daily");
  const [visitCountry, setVisitCountry] = useState("");

  useEffect(() => {
    if (role === "super_admin" || role === "broker") {
      Promise.all([
        api.get<CampaignStats>("/campaigns/stats").catch(() => null),
        api.get<Campaign[]>("/campaigns/").catch(() => []),
      ])
        .then(([s, c]) => {
          setStats(s);
          setCampaigns((c as Campaign[]).slice(0, 5));
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (role !== "super_admin" && role !== "broker") return;
    setActiveUsersLoading(true);
    mt5AccountsApi
      .activeCount()
      .then((r) => setActiveUsers(r.active_users))
      .catch(() => setActiveUsers(null))
      .finally(() => setActiveUsersLoading(false));
  }, [role]);

  useEffect(() => {
    if (role !== "super_admin" && role !== "broker") {
      setVisitsLoading(false);
      return;
    }
    setVisitsLoading(true);
    visitsApi
      .stats(visitCountry || undefined)
      .then(setVisitStats)
      .catch(() => setVisitStats(null))
      .finally(() => setVisitsLoading(false));
  }, [role, visitCountry]);

  const visitCountryOptions = useMemo(
    () =>
      Object.keys(visitStats?.by_country || {})
        .sort((a, b) => (COUNTRY_LABELS[a] || a).localeCompare(COUNTRY_LABELS[b] || b)),
    [visitStats]
  );

  const visitCountryData = useMemo(
    () =>
      Object.entries(visitStats?.by_country || {}).map(([code, count], i) => ({
        id: i,
        value: count,
        label: COUNTRY_LABELS[code] || code,
      })),
    [visitStats]
  );

  const visitBuckets = visitStats?.[visitRange];

  const fmt = (n: number) => n.toLocaleString(locale);
  const fmtCurr = (n: number) =>
    "$" +
    n.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return (
    <div className={styles.container}>
      {/* Stats row - broker/super admin */}
      {(role === "broker" || role === "super_admin") && (
        <>
          <div className={styles.statsGrid}>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>{t("activeUsers")}</span>
              <span className={styles.statValue}>
                {activeUsersLoading ? "—" : fmt(activeUsers ?? 0)}
              </span>
              <span className={styles.statSub}>{t("activeUsersSub")}</span>
            </Card>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>{t("totalCampaigns")}</span>
              <span className={styles.statValue}>
                {loading ? "—" : fmt(stats?.total_campaigns ?? 0)}
              </span>
              <span className={styles.statSub}>
                {t("active", { count: stats?.active_campaigns ?? 0 })}
              </span>
            </Card>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>{t("totalImpressions")}</span>
              <span className={styles.statValue}>
                {loading ? "—" : fmt(stats?.total_impressions ?? 0)}
              </span>
              <span className={styles.statSub}>{t("acrossAllCampaigns")}</span>
            </Card>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>{t("totalClicks")}</span>
              <span className={styles.statValue}>
                {loading ? "—" : fmt(stats?.total_clicks ?? 0)}
              </span>
              <span className={styles.statSub}>{t("ctr", { rate: stats?.ctr ?? 0 })}</span>
            </Card>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>{t("totalSpend")}</span>
              <span className={styles.statValue}>
                {loading ? "—" : fmtCurr(stats?.total_spend ?? 0)}
              </span>
              <span className={styles.statSub}>
                {t("budget", { amount: fmtCurr(stats?.total_budget ?? 0) })}
              </span>
            </Card>
          </div>

          <div className={styles.grid2}>
            <Card className={styles.campaignCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t("recentCampaigns")}</h2>
                <Link href="/admin/ads-campaigns" className={styles.seeAll}>
                  {t("seeAll")}
                </Link>
              </div>
              {loading ? (
                <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  {t("loading")}
                </span>
              ) : campaigns.length === 0 ? (
                <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  {t("noCampaigns")}
                </span>
              ) : (
                campaigns.map((c) => (
                  <div key={c.id} className={styles.campaignRow}>
                    <span className={styles.campaignName}>{c.name}</span>
                    <span
                      className={`${styles.campaignStatus} ${styles[c.status] || ""}`}
                    >
                      {c.status}
                    </span>
                  </div>
                ))
              )}
            </Card>

            <Card>
              <h2 className={styles.sectionTitle}>{t("quickActions")}</h2>
              <div className={styles.quickActions}>
                <Link href="/admin/ads-campaigns" className={styles.actionBtn}>
                  <span>◉</span>
                  <span>{t("newCampaign")}</span>
                </Link>
                <Link href="/admin/referral-clients" className={styles.actionBtn}>
                  <span>⇄</span>
                  <span>{t("addClient")}</span>
                </Link>
                <Link href="/admin/reports" className={styles.actionBtn}>
                  <span>▣</span>
                  <span>{tAdminNav("reports")}</span>
                </Link>
              </div>
            </Card>
          </div>

          <div className={styles.grid2}>
            <Card className={styles.campaignCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t("visitorsOverTime")}</h2>
                <div className={styles.visitControls}>
                  <select
                    className={styles.countrySelect}
                    value={visitCountry}
                    onChange={(e) => setVisitCountry(e.target.value)}
                  >
                    <option value="">{t("allCountries")}</option>
                    {visitCountryOptions.map((code) => (
                      <option key={code} value={code}>
                        {COUNTRY_LABELS[code] || code}
                      </option>
                    ))}
                  </select>
                  <div className={styles.rangeToggle}>
                    {VISIT_RANGES.map((r) => (
                      <button
                        key={r.key}
                        className={visitRange === r.key ? styles.rangeBtnActive : styles.rangeBtn}
                        onClick={() => setVisitRange(r.key)}
                      >
                        {t(r.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {!visitsLoading && visitBuckets && (
                <ChartThemeProvider>
                  <BarChart
                    xAxis={[{ scaleType: "band", data: visitBuckets.map((b) => b.label) }]}
                    series={[{ data: visitBuckets.map((b) => b.count), color: "#D9641E" }]}
                    height={260}
                    grid={{ horizontal: true }}
                    sx={chartSx}
                  />
                </ChartThemeProvider>
              )}
            </Card>

            <Card>
              <h2 className={styles.sectionTitle}>{t("visitorsByCountry")}</h2>
              {!visitsLoading && visitCountryData.length > 0 ? (
                <ChartThemeProvider>
                  <PieChart series={[{ data: visitCountryData, innerRadius: 40 }]} height={260} sx={chartSx} />
                </ChartThemeProvider>
              ) : (
                !visitsLoading && (
                  <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{t("noVisitors")}</span>
                )
              )}
            </Card>
          </div>
        </>
      )}

      {/* Editor view */}
      {role === "editor" && (
        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <span className={styles.statLabel}>{t("welcome")}</span>
            <span className={styles.statValue} style={{ fontSize: 22 }}>
              {user?.name || user?.email}
            </span>
            <span className={styles.statSub}>{t("editorAccount")}</span>
          </Card>
          <Link
            href="/admin/articles/new"
            className={styles.actionBtn}
            style={{ textDecoration: "none" }}
          >
            <span>✏️</span>
            <span>{t("writeNewArticle")}</span>
          </Link>
          <Link
            href="/admin/articles"
            className={styles.actionBtn}
            style={{ textDecoration: "none" }}
          >
            <span>◎</span>
            <span>{t("myArticles")}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
