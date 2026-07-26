"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import styles from "./page.module.scss";
import { publicApi, type HomepageData } from "@/helpers/api";

const SymbolChart = dynamic(() => import("@/components/SymbolChart"), {
  ssr: false,
});

/* ── static (non-API) data ── */
const FEATURED_BROKERS = [
  {
    name: "Apex Markets",
    desc: "Pro-grade execution. Up to 85% rebates.",
    color: "#f97316",
  },
  {
    name: "Apex Markets",
    desc: "Pro-grade execution. Up to 85% rebates.",
    color: "#f97316",
  },
];

const SPONSORED = [
  { label: "XM", color: "#e53e3e", bg: "#2a1010" },
  { label: "FBS", color: "#2563eb", bg: "#101a2a" },
  { label: "EX", color: "#059669", bg: "#0f2318" },
  { label: "PP", color: "#7c3aed", bg: "#1a1028" },
  { label: "OA", color: "#dc2626", bg: "#2a1010" },
  { label: "IG", color: "#0284c7", bg: "#0e1d2a" },
];

const CALENDAR_EVENTS = [
  { time: "12:30", event: "US CPI YoY", live: true },
  { time: "14:00", event: "BoC Rate Decision", live: true },
  { time: "18:00", event: "Fed Speak — Powell", live: false },
];

/* ── market entry type for the chart modal ── */
type MarketEntry = { pair: string; price: string; change: string; up: boolean };

/* ── time-ago helper ── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60_000)}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function HomePage() {
  const [selected, setSelected] = useState<MarketEntry | null>(null);
  const [demoDismissed, setDemoDismissed] = useState(false);
  const [data, setData] = useState<HomepageData | null>(null);

  useEffect(() => {
    publicApi.homepage().then(setData).catch(console.error);
  }, []);

  /* ── derived data (falls back to empty arrays while loading) ── */
  const MARKET_PRICES: MarketEntry[] = (data?.market_prices ?? []).map((m) => ({
    pair: m.symbol,
    price: m.price,
    change: m.change_pct,
    up: m.direction === "up",
  }));

  const COPY_TRADERS = (data?.top_traders ?? []).map((t) => ({
    name: t.name,
    initials: t.avatar_initials,
    followers:
      t.followers >= 1000
        ? `${(t.followers / 1000).toFixed(1)}k`
        : String(t.followers),
    roi: `+${t.roi_12m.toFixed(0)}%`,
  }));

  const PLAYS = (data?.open_plays ?? []).map((p) => ({
    pair: p.pair,
    dir: p.direction as "LONG" | "SHORT",
    entry: p.entry_price,
    tp: p.take_profit ?? "—",
  }));

  const NEWS = (data?.latest_news ?? []).map((n) => ({
    cat:
      n.title.includes("BTC") || n.title.includes("ETH")
        ? "CRYPTO"
        : n.title.includes("USD") || n.title.includes("NFP")
          ? "USD"
          : n.title.includes("EUR") || n.title.includes("ECB")
            ? "EUR"
            : "FX",
    time: timeAgo(n.created_at),
    headline: n.title,
  }));

  const ANALYSIS = (data?.latest_analysis ?? []).map((a) => ({
    pair: a.pair,
    tf: a.timeframe,
    bias: a.bias,
    up: a.bias === "Bullish",
  }));

  const FORUM_THREADS = (data?.recent_threads ?? []).map((t) => ({
    title: t.title,
    replies: t.reply_count,
  }));

  return (
    <>
      {/* ══════════════════════════════
          Hero card
         ══════════════════════════════ */}
      <div className={styles.heroCard}>
        <div className={styles.heroBlob} />
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.eyebrow}>
              <span>CBFX</span>
              <span className={styles.dot} />
              <span className={styles.sub}>PRO</span>
            </div>
            <h1 className={styles.headline}>
              Trade smarter.
              <br />
              <span className={styles.accent}>Earn on every pip.</span>
            </h1>
            <p className={styles.subline}>
              Cashback, copy trading, premium signals and a live community — all
              in one cockpit.
            </p>
            <div className={styles.ctas}>
              <Link href="/login" className={styles.btnPrimary}>
                Get started ↗
              </Link>
              <Link href="/copy-trading" className={styles.btnSecondary}>
                Explore copy trading
              </Link>
            </div>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <svg className={styles.statSvg} viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zM4 17a6 6 0 0112 0"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <div>
                  <span className={styles.statValue}>120k+</span>
                  <span className={styles.statLabel}>Active traders</span>
                </div>
              </div>
              <div className={styles.stat}>
                <svg className={styles.statSvg} viewBox="0 0 20 20" fill="none">
                  <rect
                    x="2"
                    y="7"
                    width="16"
                    height="12"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M6 7V5a4 4 0 018 0v2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <div>
                  <span className={styles.statValue}>30+</span>
                  <span className={styles.statLabel}>Vetted brokers</span>
                </div>
              </div>
              <div className={styles.stat}>
                <svg className={styles.statSvg} viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 2v4M10 14v4M2 10h4M14 10h4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="10"
                    cy="10"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                <div>
                  <span className={styles.statValue}>&lt;10ms</span>
                  <span className={styles.statLabel}>Signal latency</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.priceGrid}>
            {MARKET_PRICES.map((m) => (
              <div
                key={m.pair}
                className={styles.priceCard}
                onClick={() => setSelected(m)}
                style={{ cursor: "pointer" }}
              >
                <div className={styles.pair}>{m.pair}</div>
                <div className={styles.price}>{m.price}</div>
                <div
                  className={`${styles.change} ${m.up ? styles.up : styles.down}`}
                >
                  <span className={styles.changeArrow}>{m.up ? "↗" : "↘"}</span>{" "}
                  {m.change}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ══════════════════════════════
          Featured Brokers
         ══════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.featuredGrid}>
          {FEATURED_BROKERS.map((b, i) => (
            <Link href="/brokers" key={i} className={styles.featuredCard}>
              <div className={styles.featuredCardTop}>
                <span className={styles.featuredTag}>FEATURED BROKER</span>
                <span className={styles.adBadge}>AD</span>
              </div>
              <div className={styles.featuredCardBody}>
                <div
                  className={styles.brokerLogoCircle}
                  style={{ background: b.color }}
                >
                  <svg viewBox="0 0 32 32" fill="none" width="20" height="20">
                    <polyline
                      points="4,22 10,14 16,18 24,8"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <div className={styles.brokerName}>{b.name}</div>
                  <div className={styles.brokerDesc}>{b.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════
          Sponsored Brokers
         ══════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sponsoredLabel}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2L12.39 7.26L18 8.18L14 12.08L14.9 18L10 15.27L5.1 18L6 12.08L2 8.18L7.61 7.26L10 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span>SPONSORED BROKERS</span>
          </div>
          <span className={styles.adBadge}>AD</span>
        </div>
        <div className={styles.sponsoredGrid}>
          {SPONSORED.map((s) => (
            <div
              key={s.label}
              className={styles.sponsoredCard}
              style={
                {
                  "--broker-color": s.color,
                  "--broker-bg": s.bg,
                } as React.CSSProperties
              }
            >
              <div className={styles.sponsoredLogo}>
                <span>{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════
          Markets Strip
         ══════════════════════════════ */}
      <section className={styles.marketsSection}>
        <div className={styles.stripHeader}>
          <div className={styles.sectionTitleGroup}>
            <div className={styles.sectionIcon}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <polyline
                  points="2,14 7,8 11,11 18,4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.sectionTitleText}>
              <h2>Markets</h2>
              <p>Live prices across forex, crypto &amp; metals</p>
            </div>
          </div>
          <Link href="/markets" className={styles.sectionLink}>
            View all →
          </Link>
        </div>
        <div className={styles.marketsStrip}>
          {MARKET_PRICES.map((m) => (
            <div
              key={m.pair}
              className={styles.stripCard}
              onClick={() => setSelected(m)}
            >
              <div className={styles.stripPair}>{m.pair}</div>
              <div className={styles.stripPrice}>{m.price}</div>
              <div
                className={`${styles.stripChange} ${m.up ? styles.up : styles.down}`}
              >
                {m.up ? "↗" : "↘"} {m.change}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════
          Copy Trading
         ══════════════════════════════ */}
      <section className={styles.copySection}>
        <div className={styles.stripHeader}>
          <div className={styles.sectionTitleGroup}>
            <div className={styles.sectionIcon}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10h12M10 4l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.sectionTitleText}>
              <h2>Copy Trading</h2>
              <p>Top performing traders this week</p>
            </div>
          </div>
          <Link href="/copy-trading" className={styles.sectionLink}>
            View all →
          </Link>
        </div>
        <div className={styles.copyGrid}>
          {COPY_TRADERS.map((t) => (
            <div key={t.name} className={styles.traderCard}>
              <div className={styles.traderTop}>
                <div className={styles.traderAvatar}>{t.initials}</div>
                <div>
                  <div className={styles.traderName}>{t.name}</div>
                  <div className={styles.traderFollowers}>
                    {t.followers} followers
                  </div>
                </div>
              </div>
              <div className={styles.traderBottom}>
                <span className={styles.traderRoi}>{t.roi}</span>
                <span className={styles.traderRoiLabel}>12 mo ROI</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════
          Demo broker sponsored banner
         ══════════════════════════════ */}
      {!demoDismissed && (
        <div className={styles.demoBanner}>
          <div className={styles.demoBannerLeft}>
            <span className={styles.sponsoredChip}>SPONSORED</span>
            <div className={styles.demoBrokerLogo}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <polyline
                  points="2,14 7,8 11,11 18,4"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className={styles.demoBrokerName}>Demo FX Broker</div>
              <div className={styles.demoBrokerDesc}>
                Trade with confidence. 0 commission on all pairs.
              </div>
            </div>
          </div>
          <button
            className={styles.demoDismiss}
            onClick={() => setDemoDismissed(true)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ══════════════════════════════
          Our Plays  +  Forex News
         ══════════════════════════════ */}
      <section className={styles.playsNewsGrid}>
        {/* Plays */}
        <div className={styles.playsCard}>
          <div className={styles.cardHeader}>
            <div className={styles.sectionTitleGroup}>
              <div className={styles.sectionIcon}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <polygon
                    points="4,3 16,10 4,17"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className={styles.cardTitle}>Our Plays</span>
            </div>
            <Link href="/plays" className={styles.allLink}>
              All →
            </Link>
          </div>
          <div className={styles.playsList}>
            {PLAYS.map((p) => (
              <div key={p.pair} className={styles.playRow}>
                <div className={styles.playLeft}>
                  <span className={styles.playPair}>{p.pair}</span>
                  <span
                    className={`${styles.playDir} ${p.dir === "LONG" ? styles.long : styles.short}`}
                  >
                    {p.dir}
                  </span>
                </div>
                <div className={styles.playRight}>
                  Entry {p.entry} · TP {p.tp}
                </div>
                <button className={styles.playStar} aria-label="Star">
                  ☆
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Forex News */}
        <div className={styles.newsCard}>
          <div className={styles.cardHeader}>
            <div className={styles.sectionTitleGroup}>
              <div className={styles.sectionIcon}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <rect
                    x="2"
                    y="3"
                    width="16"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M6 7h8M6 10h8M6 13h5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className={styles.cardTitle}>Forex News</span>
            </div>
            <Link href="/news" className={styles.allLink}>
              All →
            </Link>
          </div>
          <div className={styles.newsList}>
            {NEWS.map((n) => (
              <div key={n.headline} className={styles.newsRow}>
                <div className={styles.newsMeta}>
                  <span className={styles.newsCat}>{n.cat}</span>
                  <span className={styles.newsTime}>⏱ {n.time}</span>
                </div>
                <div className={styles.newsHeadline}>{n.headline}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          Featured Partners
         ══════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sponsoredLabel}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2L12.39 7.26L18 8.18L14 12.08L14.9 18L10 15.27L5.1 18L6 12.08L2 8.18L7.61 7.26L10 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span>FEATURED PARTNERS</span>
          </div>
          <span className={styles.adBadge}>AD</span>
        </div>
        <div className={styles.sponsoredGrid}>
          {SPONSORED.map((s) => (
            <div
              key={`fp-${s.label}`}
              className={styles.sponsoredCard}
              style={
                {
                  "--broker-color": s.color,
                  "--broker-bg": s.bg,
                } as React.CSSProperties
              }
            >
              <div className={styles.sponsoredLogo}>
                <span>{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════
          Analysis  +  Forum  +  Calendar
         ══════════════════════════════ */}
      <section className={styles.triGrid}>
        {/* Technical Analysis */}
        <div className={styles.triCard}>
          <div className={styles.cardHeader}>
            <div className={styles.sectionTitleGroup}>
              <div className={styles.sectionIcon}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                  <polyline
                    points="2,14 7,8 11,11 18,4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className={styles.cardTitle}>Technical Analysis</span>
            </div>
            <Link href="/analysis" className={styles.allLink}>
              All →
            </Link>
          </div>
          <div className={styles.analysisList}>
            {ANALYSIS.map((a) => (
              <div key={a.pair} className={styles.analysisRow}>
                <div>
                  <span className={styles.analysisPair}>{a.pair}</span>
                  <span className={styles.analysisTf}>{a.tf}</span>
                </div>
                <span
                  className={`${styles.analysisBias} ${a.up ? styles.bullish : styles.bearish}`}
                >
                  {a.up ? "↑" : "↓"} {a.bias}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Studies Forum */}
        <div className={styles.triCard}>
          <div className={styles.cardHeader}>
            <div className={styles.sectionTitleGroup}>
              <div className={styles.sectionIcon}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M2 4h16v10H2zM6 17h8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className={styles.cardTitle}>Studies Forum</span>
            </div>
            <Link href="/forum" className={styles.allLink}>
              All →
            </Link>
          </div>
          <div className={styles.forumList}>
            {FORUM_THREADS.map((t) => (
              <div key={t.title} className={styles.forumRow}>
                <div className={styles.forumTitle}>{t.title}</div>
                <div className={styles.forumReplies}>{t.replies} replies</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Calendar */}
        <div className={styles.triCard}>
          <div className={styles.cardHeader}>
            <div className={styles.sectionTitleGroup}>
              <div className={styles.sectionIcon}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                  <rect
                    x="2"
                    y="3"
                    width="16"
                    height="15"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M6 1v4M14 1v4M2 8h16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className={styles.cardTitle}>Live Calendar</span>
            </div>
            <Link href="/calendar" className={styles.allLink}>
              All →
            </Link>
          </div>
          <div className={styles.calList}>
            {CALENDAR_EVENTS.map((e) => (
              <div key={e.event} className={styles.calRow}>
                <span className={styles.calTime}>{e.time}</span>
                <span className={styles.calEvent}>{e.event}</span>
                <span
                  className={`${styles.calDot} ${e.live ? styles.live : ""}`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          PrimeTrade sponsored banner
         ══════════════════════════════ */}
      <div className={styles.primeBanner}>
        <div className={styles.primeBannerLeft}>
          <div className={styles.primeLogo}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <polyline
                points="2,14 7,8 11,11 18,4"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className={styles.primeChips}>
              <span className={styles.sponsoredChip}>SPONSORED</span>
              <span className={styles.adBadge}>AD</span>
            </div>
            <div className={styles.primeName}>PrimeTrade</div>
            <div className={styles.primeDesc}>
              Trade with a trusted partner — exclusive perks for CBFX members.
            </div>
          </div>
        </div>
        <a href="#" className={styles.primeLearnMore}>
          Learn more ↗
        </a>
      </div>

      {/* ══════════════════════════════
          Cashback CTA
         ══════════════════════════════ */}
      <div className={styles.cashbackBanner}>
        <div className={styles.cashbackLeft}>
          <div className={styles.cashbackIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect
                x="2"
                y="5"
                width="20"
                height="14"
                rx="3"
                stroke="white"
                strokeWidth="1.8"
              />
              <path d="M2 10h20" stroke="white" strokeWidth="1.8" />
              <circle cx="8" cy="16" r="1.5" fill="white" />
            </svg>
          </div>
          <div>
            <div className={styles.cashbackTitle}>Cashback on every trade</div>
            <div className={styles.cashbackSub}>
              Rebates auto-credited to your account — no spreadsheets.
            </div>
          </div>
        </div>
        <Link href="/cashback" className={styles.cashbackBtn}>
          See your rebates ↗
        </Link>
      </div>

      {/* ══════════════════════════════
          More Partner Brokers
         ══════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sponsoredLabel}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2L12.39 7.26L18 8.18L14 12.08L14.9 18L10 15.27L5.1 18L6 12.08L2 8.18L7.61 7.26L10 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span>MORE PARTNER BROKERS</span>
          </div>
          <span className={styles.adBadge}>AD</span>
        </div>
        <div className={styles.sponsoredGrid}>
          {SPONSORED.map((s) => (
            <div
              key={`mp-${s.label}`}
              className={styles.sponsoredCard}
              style={
                {
                  "--broker-color": s.color,
                  "--broker-bg": s.bg,
                } as React.CSSProperties
              }
            >
              <div className={styles.sponsoredLogo}>
                <span>{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Chart modal */}
      {selected && (
        <SymbolChart
          symbol={selected.pair.split("/")[0]}
          name={selected.pair}
          price={selected.price}
          change={selected.change}
          up={selected.up}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
