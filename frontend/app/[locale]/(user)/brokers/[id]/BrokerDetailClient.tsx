"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { publicApi, type PublicBrokerOffer } from "@/helpers/api";
import { REGION_LABELS } from "@/helpers/regions";
import { COUNTRY_LABELS } from "@/helpers/countries";
import { INSTRUMENT_CATEGORIES, type InstrumentCategory } from "@/helpers/instrumentCategories";
import styles from "./brokerDetail.module.scss";

function isInstrumentCategory(value: string): value is InstrumentCategory {
  return (INSTRUMENT_CATEGORIES as readonly string[]).includes(value);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function BrokerDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("brokerDetail");

  const [broker, setBroker] = useState<PublicBrokerOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    publicApi
      .brokerOffer(id)
      .then((data) => {
        if (!cancelled) setBroker(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("notFound"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className={styles.state}>{t("loading")}</div>;
  if (error || !broker) return <div className={styles.state}>{error || t("notFound")}</div>;

  const labels = broker.coverage_type === "country" ? COUNTRY_LABELS : REGION_LABELS;

  return (
    <div className={styles.page}>
      <Link href="/brokers" className={styles.backLink}>
        {t("backToBrokers")}
      </Link>

      <div className={styles.header}>
        {broker.img_src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={broker.img_src} alt="" className={styles.avatar} />
        ) : (
          <div className={styles.avatar}>{getInitials(broker.name)}</div>
        )}
        <div>
          <h1 className={styles.name}>{broker.name}</h1>
          <div className={styles.coverage}>
            {broker.geo_coverage.map((c) => labels[c] || c).join(" · ") || t("vettedPartner")}
          </div>
        </div>
        <div className={styles.rateBadge}>
          {t("flatRate", { rate: broker.cashback_rate })}
        </div>
      </div>

      {broker.referral_url ? (
        <a
          className={styles.ctaBtn}
          href={broker.referral_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          {t("registerWith", { name: broker.name })}
        </a>
      ) : (
        <div className={styles.ctaUnavailable}>{t("registerUnavailable")}</div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("accountTypesTitle")}</h2>
        {broker.account_types.length === 0 ? (
          <p className={styles.hint}>{t("noAccountTypes", { rate: broker.cashback_rate })}</p>
        ) : (
          <div className={styles.accountTypeGrid}>
            {broker.account_types.map((at, i) => (
              <div key={i} className={styles.accountTypeCard}>
                <div className={styles.accountTypeName}>{at.name}</div>
                {at.description && (
                  <p className={styles.accountTypeDesc}>{at.description}</p>
                )}
                {at.cashback.length === 0 ? (
                  <p className={styles.hint}>{t("usesFlatRate", { rate: broker.cashback_rate })}</p>
                ) : (
                  <table className={styles.rateTable}>
                    <tbody>
                      {at.cashback.map((c, j) => (
                        <tr key={j}>
                          <td>
                            {c.symbol ||
                              (c.category && isInstrumentCategory(c.category)
                                ? t(`categories.${c.category}`)
                                : c.category)}
                          </td>
                          <td className={styles.rateValue}>{t("perLotRate", { rate: c.rate })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("payoutTitle")}</h2>
        <div className={styles.payoutRow}>
          <div>
            <div className={styles.payoutLabel}>{t("payoutDestination")}</div>
            <div className={styles.payoutValue}>
              {broker.payout_destination === "wallet" ? t("payoutWallet") : t("payoutTradingAccount")}
            </div>
          </div>
          <div>
            <div className={styles.payoutLabel}>{t("payoutDuration")}</div>
            <div className={styles.payoutValue}>
              {broker.payout_duration_days != null
                ? t("payoutDurationDays", { days: broker.payout_duration_days })
                : t("payoutDurationUnspecified")}
            </div>
          </div>
        </div>
      </section>

      {broker.terms_text && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("termsTitle")}</h2>
          <p className={styles.termsText}>{broker.terms_text}</p>
        </section>
      )}
    </div>
  );
}
