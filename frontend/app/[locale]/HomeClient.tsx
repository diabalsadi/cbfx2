"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState, useEffect } from "react";
import UserNav from "@/components/UserNav";
import LoginModal from "@/components/LoginModal";
import { LoginModalProvider } from "@/contexts/LoginModalContext";
import { useTheme } from "@/contexts/ThemeContext";
import { SingleTickerWidget, EconomicCalendarWidget, MarketNewsWidget } from "@/components/TradingViewWidgets";
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


/* Broker-supplied image banner used before Cashback / Copy Trading / Signals /
   Markets, and (with sticky=true) the sticky-top slot. The image itself is
   the whole ad — already resolved to the visitor's language by the backend. */
function ImageAdBanner({
  banner,
  onDismiss,
  sticky = false,
}: {
  banner: AdBannerContent;
  onDismiss: () => void;
  sticky?: boolean;
}) {
  const t = useTranslations("home");
  if (!banner.image_url) return null;
  return (
    <div className={sticky ? styles.stickyTopBanner : styles.adBanner}>
      <a
        href={banner.link_url || "#"}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={styles.adBannerImageLink}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner.image_url} alt={banner.alt} className={styles.adBannerImg} />
      </a>
      {banner.dismissible && (
        <button className={styles.adBannerDismiss} onClick={onDismiss} aria-label={t("dismiss")}>
          ✕
        </button>
      )}
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations("home");
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

  const COPY_TRADERS = (data?.top_traders ?? []).map((trader) => ({
    name: trader.name,
    initials: trader.avatar_initials,
    followers:
      trader.followers >= 1000
        ? `${(trader.followers / 1000).toFixed(1)}k`
        : String(trader.followers),
    roi: `+${trader.roi_12m.toFixed(0)}%`,
  }));

  const PLAYS = (data?.open_plays ?? []).map((p) => ({
    id: p.id,
    pair: p.pair,
    dir: p.direction as "LONG" | "SHORT",
    entry: p.entry_price,
    tp: p.take_profit ?? "—",
  }));

  const ANALYSIS = (data?.latest_analysis ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    symbol: a.symbol,
  }));

  const FORUM_THREADS = (data?.recent_threads ?? []).map((thread) => ({
    id: thread.id,
    title: thread.title,
    replies: thread.reply_count,
  }));

  return (
    <LoginModalProvider>
      <UserNav />

      {/* ══════════════════════════════
          Sticky sidebar ads (desktop only)
         ══════════════════════════════ */}
      {sidebarLeftBanner?.image_url && (
        <div className={`${styles.stickySidebarAd} ${styles.stickySidebarLeft}`}>
          {sidebarLeftBanner.dismissible && (
            <button
              className={styles.stickySidebarDismiss}
              onClick={() => dismissBanner("sidebar_left_banner")}
              aria-label={t("dismiss")}
            >
              ✕
            </button>
          )}
          <a
            href={sidebarLeftBanner.link_url || "#"}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={styles.stickySidebarImageLink}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sidebarLeftBanner.image_url} alt={sidebarLeftBanner.alt} className={styles.stickySidebarImage} />
          </a>
        </div>
      )}
      {sidebarRightBanner?.image_url && (
        <div className={`${styles.stickySidebarAd} ${styles.stickySidebarRight}`}>
          {sidebarRightBanner.dismissible && (
            <button
              className={styles.stickySidebarDismiss}
              onClick={() => dismissBanner("sidebar_right_banner")}
              aria-label={t("dismiss")}
            >
              ✕
            </button>
          )}
          <a
            href={sidebarRightBanner.link_url || "#"}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={styles.stickySidebarImageLink}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sidebarRightBanner.image_url} alt={sidebarRightBanner.alt} className={styles.stickySidebarImage} />
          </a>
        </div>
      )}

      <div className={userStyles.main}>
      <div className={sidebarLeftBanner?.image_url || sidebarRightBanner?.image_url ? styles.sideAdGutter : undefined}>
      {/* ══════════════════════════════
          Sticky top sponsor banner
         ══════════════════════════════ */}
      {stickyTopBanner && (
        <ImageAdBanner
          banner={stickyTopBanner}
          onDismiss={() => dismissBanner("sticky_top_banner")}
          sticky
        />
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
              {t("hero.title1")}
              <br />
              <span className={styles.accent}>{t("hero.title2")}</span>
            </h1>
            <p className={styles.subline}>{t("hero.subtitle")}</p>
            <div className={styles.ctas}>
              <Link href="/login" className={styles.btnPrimary}>
                {t("hero.getStarted")} ↗
              </Link>
              <Link href="/copy-trading" className={styles.btnSecondary}>
                {t("hero.exploreCopyTrading")}
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
                  <span className={styles.statLabel}>{t("hero.activeTraders")}</span>
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
                  <span className={styles.statLabel}>{t("hero.vettedBrokers")}</span>
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
                  <span className={styles.statLabel}>{t("hero.signalLatency")}</span>
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
        <ImageAdBanner
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
            <div className={styles.cashbackTitle}>{t("cashback.title")}</div>
            <div className={styles.cashbackSub}>{t("cashback.subtitle")}</div>
          </div>
        </div>
        <Link href="/cashback" className={styles.cashbackBtn}>
          {t("cashback.cta")} ↗
        </Link>
      </div>

      {/* ══════════════════════════════
          Copy Trading
         ══════════════════════════════ */}
      {preCopytradingBanner && (
        <ImageAdBanner
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
              <h2>{t("copyTrading.title")}</h2>
              <p>{t("copyTrading.subtitle")}</p>
            </div>
          </div>
          <Link href="/copy-trading" className={styles.sectionLink}>
            {t("copyTrading.viewAll")} →
          </Link>
        </div>
        <div className={styles.copyGrid}>
          {COPY_TRADERS.map((trader) => (
            <div key={trader.name} className={styles.traderCard}>
              <div className={styles.traderTop}>
                <div className={styles.traderAvatar}>{trader.initials}</div>
                <div>
                  <div className={styles.traderName}>{trader.name}</div>
                  <div className={styles.traderFollowers}>
                    {trader.followers} {t("copyTrading.followers")}
                  </div>
                </div>
              </div>
              <div className={styles.traderBottom}>
                <span className={styles.traderRoi}>{trader.roi}</span>
                <span className={styles.traderRoiLabel}>{t("copyTrading.roiLabel")}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════
          Signals (Plays)  +  Forex News
         ══════════════════════════════ */}
      {preSignalsBanner && (
        <ImageAdBanner
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
              <span className={styles.cardTitle}>{t("signals.title")}</span>
            </div>
            <Link href="/plays" className={styles.allLink}>
              {t("signals.all")} →
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
                  {t("signals.entryTp", { entry: p.entry, tp: p.tp })}
                </div>
                <button className={styles.playStar} aria-label={t("signals.star")}>
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
              <span className={styles.cardTitle}>{t("news.title")}</span>
            </div>
            <Link href="/news" className={styles.allLink}>
              {t("signals.all")} →
            </Link>
          </div>
          <div className={styles.newsWidgetBody}>
            <MarketNewsWidget theme={theme} />
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
              <span className={styles.cardTitle}>{t("triGrid.technicalAnalysis")}</span>
            </div>
            <Link href="/analysis" className={styles.allLink}>
              {t("signals.all")} →
            </Link>
          </div>
          <div className={styles.analysisList}>
            {ANALYSIS.map((a) => (
              <Link key={a.id} href={`/analysis/${a.id}`} className={styles.analysisRow}>
                {a.symbol && <span className={styles.analysisPair}>{a.symbol}</span>}
                <span className={styles.analysisTitle}>{a.title}</span>
              </Link>
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
              <span className={styles.cardTitle}>{t("triGrid.studiesForum")}</span>
            </div>
            <Link href="/forum" className={styles.allLink}>
              {t("signals.all")} →
            </Link>
          </div>
          <div className={styles.forumList}>
            {FORUM_THREADS.map((thread) => (
              <div key={thread.id} className={styles.forumRow}>
                <div className={styles.forumTitle}>{thread.title}</div>
                <div className={styles.forumReplies}>
                  {thread.replies} {t("triGrid.replies")}
                </div>
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
              <span className={styles.cardTitle}>{t("triGrid.liveCalendar")}</span>
            </div>
            <Link href="/calendar" className={styles.allLink}>
              {t("signals.all")} →
            </Link>
          </div>
          <div className={styles.calWidgetBody}>
            <EconomicCalendarWidget theme={theme} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          Markets Strip
         ══════════════════════════════ */}
      {preMarketsBanner && (
        <ImageAdBanner
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
              <h2>{t("markets.title")}</h2>
              <p>{t("markets.subtitle")}</p>
            </div>
          </div>
          <Link href="/markets" className={styles.sectionLink}>
            {t("copyTrading.viewAll")} →
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
              <h2>{t("featuredBrokers.title")}</h2>
              <p>{t("featuredBrokers.subtitle")}</p>
            </div>
          </div>
          <Link href="/brokers" className={styles.sectionLink}>
            {t("featuredBrokers.seeAll")} →
          </Link>
        </div>
        <div className={styles.featuredGrid}>
          {(data?.broker_sections.featured ?? []).map((b, i) => (
            <Link href="/brokers" key={b.id} className={styles.featuredCard}>
              <div className={styles.featuredCardTop}>
                <span className={styles.featuredTag}>{t("featuredBrokers.tag")}</span>
                <span className={styles.adBadge}>{t("featuredBrokers.ad")}</span>
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
                    {t("featuredBrokers.upToCashback", { rate: b.cashback_rate })}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      </div>
      </div>
      <footer className={userStyles.footer}>{t("footer", { year: new Date().getFullYear() })}</footer>
      <LoginModal />
    </LoginModalProvider>
  );
}
