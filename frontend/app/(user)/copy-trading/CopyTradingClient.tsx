"use client";
import { useState } from "react";
import { useLoginModal } from "@/contexts/LoginModalContext";
import styles from "./copy-trading.module.scss";

const TRADERS = [
  {
    name: "Alex Morgan",
    initials: "AM",
    country: "🇺🇸",
    followers: "12.4k",
    roi: "+184%",
    winRate: "73%",
    trades: 214,
    drawdown: "8.2%",
    monthly: "+15.3%",
    color: "#f97316",
  },
  {
    name: "Priya Shah",
    initials: "PS",
    country: "🇮🇳",
    followers: "9.1k",
    roi: "+147%",
    winRate: "69%",
    trades: 189,
    drawdown: "6.7%",
    monthly: "+12.2%",
    color: "#8b5cf6",
  },
  {
    name: "Marco R.",
    initials: "MR",
    country: "🇮🇹",
    followers: "7.8k",
    roi: "+121%",
    winRate: "66%",
    trades: 302,
    drawdown: "10.1%",
    monthly: "+10.1%",
    color: "#06b6d4",
  },
  {
    name: "Yuki Tanaka",
    initials: "YT",
    country: "🇯🇵",
    followers: "6.2k",
    roi: "+98%",
    winRate: "71%",
    trades: 156,
    drawdown: "5.4%",
    monthly: "+8.2%",
    color: "#ec4899",
  },
  {
    name: "Carlos Vega",
    initials: "CV",
    country: "🇲🇽",
    followers: "5.5k",
    roi: "+87%",
    winRate: "64%",
    trades: 278,
    drawdown: "11.3%",
    monthly: "+7.3%",
    color: "#10b981",
  },
  {
    name: "Sofia L.",
    initials: "SL",
    country: "🇩🇪",
    followers: "4.9k",
    roi: "+76%",
    winRate: "68%",
    trades: 133,
    drawdown: "7.8%",
    monthly: "+6.3%",
    color: "#f59e0b",
  },
  {
    name: "Kwame Acheampong",
    initials: "KA",
    country: "🇬🇭",
    followers: "4.1k",
    roi: "+64%",
    winRate: "62%",
    trades: 198,
    drawdown: "9.5%",
    monthly: "+5.3%",
    color: "#3b82f6",
  },
  {
    name: "Emma Wilson",
    initials: "EW",
    country: "🇬🇧",
    followers: "3.7k",
    roi: "+58%",
    winRate: "67%",
    trades: 97,
    drawdown: "4.9%",
    monthly: "+4.8%",
    color: "#ef4444",
  },
  {
    name: "Jin Park",
    initials: "JP",
    country: "🇰🇷",
    followers: "3.2k",
    roi: "+51%",
    winRate: "65%",
    trades: 172,
    drawdown: "6.2%",
    monthly: "+4.3%",
    color: "#84cc16",
  },
];

const TABS = ["All", "Top Gainers", "Most Copied", "Trending", "Low Risk"];

export default function CopyTradingPage() {
  const { openLoginModal } = useLoginModal();
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = TRADERS.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10h12M10 4l6 6-6 6"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className={styles.title}>Copy Trading</h1>
            <p className={styles.subtitle}>
              Automatically replicate top trader strategies in your account
            </p>
          </div>
        </div>
        <button className={styles.becomeTraderBtn} onClick={openLoginModal}>
          Become a trader ↗
        </button>
      </div>

      {/* ── Stats bar ── */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statVal}>9,400+</span>
          <span className={styles.statLbl}>Signal providers</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statVal}>+47%</span>
          <span className={styles.statLbl}>Avg 12-mo ROI</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statVal}>120k+</span>
          <span className={styles.statLbl}>Active copiers</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statVal}>Real-time</span>
          <span className={styles.statLbl}>Trade execution</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={styles.filterRow}>
        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className={styles.searchBox}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
            <circle
              cx="9"
              cy="9"
              r="6"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M14 14l3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Search traders…"
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Trader grid ── */}
      <div className={styles.grid}>
        {filtered.map((t) => (
          <div key={t.name} className={styles.card}>
            {/* Card top */}
            <div className={styles.cardTop}>
              <div className={styles.avatar} style={{ background: t.color }}>
                {t.initials}
              </div>
              <div className={styles.traderInfo}>
                <div className={styles.traderName}>
                  {t.name} <span className={styles.flag}>{t.country}</span>
                </div>
                <div className={styles.traderFollowers}>
                  {t.followers} followers
                </div>
              </div>
              <div className={styles.roiBadge}>{t.roi}</div>
            </div>

            {/* Stats row */}
            <div className={styles.cardStats}>
              <div className={styles.cardStat}>
                <span
                  className={styles.cardStatVal}
                  style={{ color: "#16a34a" }}
                >
                  {t.winRate}
                </span>
                <span className={styles.cardStatLbl}>Win rate</span>
              </div>
              <div className={styles.cardStat}>
                <span className={styles.cardStatVal}>{t.trades}</span>
                <span className={styles.cardStatLbl}>Trades</span>
              </div>
              <div className={styles.cardStat}>
                <span
                  className={styles.cardStatVal}
                  style={{ color: "#dc2626" }}
                >
                  {t.drawdown}
                </span>
                <span className={styles.cardStatLbl}>Max DD</span>
              </div>
              <div className={styles.cardStat}>
                <span
                  className={styles.cardStatVal}
                  style={{ color: "#16a34a" }}
                >
                  {t.monthly}
                </span>
                <span className={styles.cardStatLbl}>Monthly</span>
              </div>
            </div>

            {/* Mini ROI chart (SVG sparkline) */}
            <div className={styles.sparklineWrap}>
              <Sparkline color={t.color} />
            </div>

            {/* Action */}
            <button className={styles.copyBtn} onClick={openLoginModal}>
              Copy trader
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Simple seeded SVG sparkline */
function Sparkline({ color }: { color: string }) {
  // deterministic "random" points based on color string
  const seed = color.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pts = Array.from({ length: 12 }, (_, i) => {
    const x = (i / 11) * 100;
    const y = 50 - (((seed * (i + 3)) % 71) - 35) * 0.55;
    return `${x},${y}`;
  });
  const d = `M${pts.join(" L")}`;
  return (
    <svg
      viewBox="0 0 100 70"
      preserveAspectRatio="none"
      className={styles.sparkline}
    >
      <path
        d={d}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={`${d} L100,70 L0,70 Z`} fill={color} fillOpacity="0.08" />
    </svg>
  );
}
