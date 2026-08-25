"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import UserNav from "@/components/UserNav";
import LoginModal from "@/components/LoginModal";
import { LoginModalProvider } from "@/contexts/LoginModalContext";
import { useTheme } from "@/contexts/ThemeContext";
import { SingleTickerWidget } from "@/components/TradingViewWidgets";
import { getSymbolByDisplayName, symbolHref } from "@/helpers/tradingviewSymbols";
import styles from "./page.module.scss";
import userStyles from "./(user)/user.module.scss";
import { publicApi, type HomepageData, type AdBannerContent } from "@/helpers/api";

/* ── static (non-API) data ── */
const FEATURED_COLORS = ["#f97316", "#7c3aed", "#0891b2", "#16a34a"];

/* Curated symbols shown on the homepage price sections. */
const HOMEPAGE_SYMBOLS = ["EUR/USD", "GBP/USD", "BTC/USD", "ETH/USD", "XAU/USD", "WTI Crude Oil"]
  .map(getSymbolByDisplayName)
  .filter((s): s is NonNullable<typeof s> => s !== null);

const CALENDAR_EVENTS = [
  { time: "12:30", event: "US CPI YoY", live: true },
  { time: "14:00", event: "BoC Rate Decision", live: true },
  { time: "18:00", event: "Fed Speak — Powell", live: false },
];

/* ── time-ago helper ── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60_000)}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/* Inline sponsor banner used before Cashback / Copy Trading / Signals. */
function InlineAdBanner({
  banner,
  onDismiss,
}: {
  banner: AdBannerContent;
  onDismiss: () => void;
}) {
  return (
    <div className={styles.adBanner}>
      <div className={styles.demoBannerLeft}>
        <span className={styles.sponsoredChip}>{banner.badge_text}</span>
        <div className={styles.demoBrokerLogo}>
          {banner.logo_src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner.logo_src}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            />
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <polyline
                points="2,14 7,8 11,11 18,4"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <div>
          <div className={styles.demoBrokerName}>{banner.sponsor_name}</div>
          <div className={styles.demoBrokerDesc}>{banner.description}</div>
        </div>
      </div>
      <div className={styles.heroTopActions}>
        {banner.link_url && (
          <a href={banner.link_url} className={styles.primeLearnMore}>
            {banner.cta_label || "Learn more"} ↗
          </a>
        )}
        {banner.dismissible && (
          <button className={styles.demoDismiss} onClick={onDismiss} aria-label="Dismiss">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
  const [data, setData] = useState<HomepageData | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    publicApi.homepage().then(setData).catch(console.error);
  }, []);

  const dismissBanner = (slot: string) =>
    setDismissedBanners((prev) => new Set(prev).add(slot));

  const getBanner = (slot: string) =>
    data?.ad_banners?.[slot] && !dismissedBanners.has(slot) ? data.ad_banners[slot] : null;

  const stickyTopBanner = getBanner("sticky_top_banner");
  const sidebarLeftBanner = getBanner("sidebar_left_banner");
  const sidebarRightBanner = getBanner("sidebar_right_banner");
  const preCashbackBanner = getBanner("pre_cashback_banner");
  const preCopytradingBanner = getBanner("pre_copytrading_banner");
  const preSignalsBanner = getBanner("pre_signals_banner");
  const preMarketsBanner = getBanner("pre_markets_banner");

  /* ── derived data (falls back to empty arrays while loading) ── */

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
    id: p.id,
    pair: p.pair,
    dir: p.direction as "LONG" | "SHORT",
    entry: p.entry_price,
    tp: p.take_profit ?? "—",
  }));

  const NEWS = (data?.latest_news ?? []).map((n) => ({
    id: n.id,
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
    id: a.id,
    pair: a.pair,
    tf: a.timeframe,
    bias: a.bias,
    up: a.bias === "Bullish",
  }));

  const FORUM_THREADS = (data?.recent_threads ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    replies: t.reply_count,
  }));

  return (
    <LoginModalProvider>
      <UserNav />

      {/* ══════════════════════════════
          Sticky sidebar ads (desktop only)
         ══════════════════════════════ */}
      {sidebarLeftBanner && (
        <div className={`${styles.stickySidebarAd} ${styles.stickySidebarLeft}`}>
          {sidebarLeftBanner.dismissible && (
            <button
              className={styles.stickySidebarDismiss}
              onClick={() => dismissBanner("sidebar_left_banner")}
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
          <span className={styles.sponsoredChip}>{sidebarLeftBanner.badge_text}</span>
          {sidebarLeftBanner.logo_src && (
            <a
              href={sidebarLeftBanner.link_url || "#"}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={styles.stickySidebarImageLink}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sidebarLeftBanner.logo_src} alt={sidebarLeftBanner.sponsor_name} className={styles.stickySidebarImage} />
            </a>
          )}
          <div className={styles.stickySidebarLabel}>{sidebarLeftBanner.sponsor_name}</div>
        </div>
      )}
      {sidebarRightBanner && (
        <div className={`${styles.stickySidebarAd} ${styles.stickySidebarRight}`}>
          {sidebarRightBanner.dismissible && (
            <button
              className={styles.stickySidebarDismiss}
              onClick={() => dismissBanner("sidebar_right_banner")}
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
          <span className={styles.sponsoredChip}>{sidebarRightBanner.badge_text}</span>
          {sidebarRightBanner.logo_src && (
            <a
              href={sidebarRightBanner.link_url || "#"}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={styles.stickySidebarImageLink}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sidebarRightBanner.logo_src} alt={sidebarRightBanner.sponsor_name} className={styles.stickySidebarImage} />
            </a>
          )}
          <div className={styles.stickySidebarLabel}>{sidebarRightBanner.sponsor_name}</div>
        </div>
      )}

      <div className={userStyles.main}>
      <div className={sidebarLeftBanner || sidebarRightBanner ? styles.sideAdGutter : undefined}>
      {/* ══════════════════════════════
          Sticky top sponsor banner
         ══════════════════════════════ */}
      {stickyTopBanner && (
        <div className={styles.stickyTopBanner}>
          <div className={styles.demoBannerLeft}>
            <span className={styles.sponsoredChip}>{stickyTopBanner.badge_text}</span>
            <div className={styles.demoBrokerLogo}>
              {stickyTopBanner.logo_src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={stickyTopBanner.logo_src}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                />
              ) : (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <polyline
                    points="2,14 7,8 11,11 18,4"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div>
              <div className={styles.demoBrokerName}>{stickyTopBanner.sponsor_name}</div>
              <div className={styles.demoBrokerDesc}>{stickyTopBanner.description}</div>
            </div>
          </div>
          <div className={styles.heroTopActions}>
            {stickyTopBanner.link_url && (
              <a href={stickyTopBanner.link_url} className={styles.primeLearnMore}>
                {stickyTopBanner.cta_label || "Learn more"} ↗
              </a>
            )}
            {stickyTopBanner.dismissible && (
              <button
                className={styles.demoDismiss}
                onClick={() => dismissBanner("sticky_top_banner")}
                aria-label="Dismiss"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

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
            {HOMEPAGE_SYMBOLS.map((s) => (
              <Link
                key={s.displayName}
                href={symbolHref(s.displayName)}
                className={styles.priceCard}
              >
                <div className={styles.tickerWrap}>
                  <SingleTickerWidget tvSymbol={s.tvSymbol} theme={theme} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ══════════════════════════════
          Cashback CTA
         ══════════════════════════════ */}
      {preCashbackBanner && (
        <InlineAdBanner
          banner={preCashbackBanner}
          onDismiss={() => dismissBanner("pre_cashback_banner")}
        />
      )}
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
          Copy Trading
         ══════════════════════════════ */}
      {preCopytradingBanner && (
        <InlineAdBanner
          banner={preCopytradingBanner}
          onDismiss={() => dismissBanner("pre_copytrading_banner")}
        />
      )}
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
          Signals (Plays)  +  Forex News
         ══════════════════════════════ */}
      {preSignalsBanner && (
        <InlineAdBanner
          banner={preSignalsBanner}
          onDismiss={() => dismissBanner("pre_signals_banner")}
        />
      )}
      <section className={styles.playsNewsGrid}>
        {/* Signals */}
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
              <span className={styles.cardTitle}>Signals</span>
            </div>
            <Link href="/plays" className={styles.allLink}>
              All →
            </Link>
          </div>
          <div className={styles.playsList}>
            {PLAYS.map((p) => (
              <div key={p.id} className={styles.playRow}>
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
              <div key={n.id} className={styles.newsRow}>
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
              <div key={a.id} className={styles.analysisRow}>
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
              <div key={t.id} className={styles.forumRow}>
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
          Markets Strip
         ══════════════════════════════ */}
      {preMarketsBanner && (
        <InlineAdBanner
          banner={preMarketsBanner}
          onDismiss={() => dismissBanner("pre_markets_banner")}
        />
      )}
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
          {HOMEPAGE_SYMBOLS.map((s) => (
            <Link
              key={s.displayName}
              href={symbolHref(s.displayName)}
              className={styles.stripCard}
            >
              <div className={styles.tickerWrap}>
                <SingleTickerWidget tvSymbol={s.tvSymbol} theme={theme} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════
          Featured Brokers
         ══════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.stripHeader}>
          <div className={styles.sectionTitleGroup}>
            <div className={styles.sectionIcon}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 2L12.39 7.26L18 8.18L14 12.08L14.9 18L10 15.27L5.1 18L6 12.08L2 8.18L7.61 7.26L10 2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.sectionTitleText}>
              <h2>Featured Brokers</h2>
              <p>Vetted brokers with the best cashback rates</p>
            </div>
          </div>
          <Link href="/brokers" className={styles.sectionLink}>
            See all →
          </Link>
        </div>
        <div className={styles.featuredGrid}>
          {(data?.broker_sections.featured ?? []).map((b, i) => (
            <Link href="/brokers" key={b.id} className={styles.featuredCard}>
              <div className={styles.featuredCardTop}>
                <span className={styles.featuredTag}>FEATURED BROKER</span>
                <span className={styles.adBadge}>AD</span>
              </div>
              <div className={styles.featuredCardBody}>
                {b.img_src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.img_src}
                    alt=""
                    className={styles.brokerLogoCircle}
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className={styles.brokerLogoCircle}
                    style={{ background: FEATURED_COLORS[i % FEATURED_COLORS.length] }}
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
                )}
                <div>
                  <div className={styles.brokerName}>{b.name}</div>
                  <div className={styles.brokerDesc}>
                    Up to {b.cashback_rate}% cashback
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      </div>
      </div>
      <footer className={userStyles.footer}>© 2026 CBFX — Trade smarter.</footer>
      <LoginModal />
    </LoginModalProvider>
  );
}
