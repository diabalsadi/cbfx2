import type { AdBannerContent } from "@/helpers/api";
import styles from "./FeaturedBrokerPanel.module.scss";

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2L3 5v5c0 4.5 3 8.5 7 9.5 4-1 7-5 7-9.5V5L10 2z"
        stroke="#f97316"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2l2.4 5.2 5.6.8-4 3.9.9 5.6L10 15l-4.9 2.5.9-5.6-4-3.9 5.6-.8L10 2z"
        stroke="#f97316"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The "signin" ad placement's "Featured Broker" card — shown next to the
// login and register forms. Renders nothing if no admin has configured
// active content for this slot (see useSigninBanner()).
export default function FeaturedBrokerPanel({ banner }: { banner: AdBannerContent | null }) {
  if (!banner) return null;

  return (
    <div className={styles.brokerCard}>
      <div className={styles.brokerCardTop}>
        <span className={styles.featuredLabel}>FEATURED BROKER</span>
        <span className={styles.sponsoredLabel}>{banner.badge_text}</span>
      </div>

      <div className={styles.brokerHeader}>
        <div className={styles.brokerLogo}>
          {banner.logo_src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner.logo_src}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            />
          ) : (
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <polyline
                points="4,22 10,14 16,18 24,8"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <div>
          <div className={styles.brokerName}>{banner.sponsor_name}</div>
          <div className={styles.brokerTagline}>{banner.description}</div>
        </div>
      </div>

      {banner.features.length > 0 && (
        <ul className={styles.featureList}>
          {banner.features.map((feature, i) => (
            <li key={feature}>
              {i === 0 ? <ShieldIcon /> : <StarIcon />}
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.brokerCta}>
        <a href={banner.link_url || "#"} className={styles.openAccountBtn}>
          {banner.cta_label || "Open account"} ↗
        </a>
        {banner.disclaimer && <p className={styles.disclaimer}>{banner.disclaimer}</p>}
      </div>
    </div>
  );
}
