import { useTranslations } from "next-intl";
import type { AdBannerContent } from "@/helpers/api";
import styles from "./HeaderSponsor.module.scss";

// The "header" / "sponsor_logo" ad placement — a small "Sponsored by
// {broker logo}" mark next to the site logo. Admin-configured per region
// (frontend/app/[locale]/admin/ads-placements, page "header"). Renders
// nothing if no admin has configured active content for the visitor's
// region, or the configured banner has no image.
export default function HeaderSponsor({ banner }: { banner: AdBannerContent | null }) {
  const t = useTranslations("nav");
  if (!banner?.image_url) return null;

  return (
    <a
      href={banner.link_url || "#"}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={styles.sponsor}
    >
      <span className={styles.sponsorLabel}>{t("sponsoredBy")}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.image_url} alt={banner.alt} className={styles.sponsorLogo} />
    </a>
  );
}
