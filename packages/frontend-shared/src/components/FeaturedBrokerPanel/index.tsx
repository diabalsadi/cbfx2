import { useTranslations } from "next-intl";
import type { AdBannerContent } from "@/helpers/api";
import styles from "./FeaturedBrokerPanel.module.scss";

// The "signin" ad placement's "Featured Broker" card — shown next to the
// login and register forms. The broker's own image (per language) is the
// whole ad. Renders nothing if no admin has configured active content for
// this slot, or the configured banner has no image (see useSigninBanner()).
export default function FeaturedBrokerPanel({ banner }: { banner: AdBannerContent | null }) {
  const t = useTranslations("loginModal");
  if (!banner?.image_url) return null;

  return (
    <div className={styles.brokerCard}>
      <span className={styles.featuredLabel}>{t("featuredBroker")}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.image_url} alt={banner.alt} className={styles.brokerImage} />
      <a
        href={banner.link_url || "#"}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={styles.openAccountBtn}
      >
        {t("openAccount")} ↗
      </a>
    </div>
  );
}
