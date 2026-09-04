"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ScoreBadge from "@/components/ScoreBadge";
import { publicApi, type PublicBroker } from "@/helpers/api";
import styles from "./BrokerCashbackStrip.module.scss";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Below this many brokers, duplicating the list to loop the scroll
// seamlessly (see below) just reads as the same handful of brokers shown
// twice — not enough content for the repeat to look like a continuous
// ticker rather than a glitch. Render them once, statically, instead.
const MARQUEE_MIN_BROKERS = 8;

// GET /public/brokers (publicApi.brokers()) already filters to brokers whose
// coverage includes the visitor's IP-detected country/region
// (backend/app/routers/public.py:_visible_to_visitor) — this strip is
// already region-aware for free, no client-side geo logic needed here.
export default function BrokerCashbackStrip() {
  const t = useTranslations("cashback.brokersStrip");
  const [brokers, setBrokers] = useState<PublicBroker[]>([]);

  useEffect(() => {
    publicApi
      .brokers()
      .then((all) => setBrokers(all.filter((b) => b.show_on_cashback)))
      .catch(() => setBrokers([]));
  }, []);

  if (brokers.length === 0) return null;

  const shouldScroll = brokers.length > MARQUEE_MIN_BROKERS;
  // Rendered twice back to back so the CSS animation can loop seamlessly by
  // translating exactly one copy's width, then snapping back unnoticed —
  // only worth doing once there's enough unique content for that repeat to
  // go unnoticed (see MARQUEE_MIN_BROKERS above).
  const track = shouldScroll ? [...brokers, ...brokers] : brokers;

  return (
    <div className={styles.brokerStrip}>
      <div className={styles.brokerStripLabel}>
        <span className={styles.brokerStripSpark}>🔥</span>
        {t("title")}
      </div>
      <div className={styles.brokerStripBand}>
        <div className={shouldScroll ? styles.brokerStripViewport : styles.brokerStripViewportStatic}>
          <div className={shouldScroll ? styles.brokerStripTrack : styles.brokerStripTrackStatic}>
            {track.map((b, i) => (
              <Link key={`${b.id}-${i}`} href={`/brokers/${b.id}`} className={styles.brokerStripItem}>
                {b.img_src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.img_src} alt="" className={styles.brokerStripIconImg} />
                ) : (
                  <div className={styles.brokerStripIcon}>{initials(b.name)}</div>
                )}
                <div className={styles.brokerStripBody}>
                  <span className={styles.brokerStripName}>{b.name}</span>
                  {b.cashback_rate > 0 && (
                    <span className={styles.brokerStripDesc}>{t("upToCashback", { rate: b.cashback_rate })}</span>
                  )}
                  <ScoreBadge score={b.rating} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
