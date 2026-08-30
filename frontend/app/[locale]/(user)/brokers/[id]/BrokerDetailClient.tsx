"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import {
  publicApi,
  brokerRatingApi,
  type PublicBrokerOffer,
  type BrokerAccountType,
} from "@/helpers/api";
import ScoreBadge from "@/components/ScoreBadge";
import RegulatorSeal from "@/components/RegulatorSeal";
import { REGION_LABELS } from "@/helpers/regions";
import { COUNTRY_LABELS } from "@/helpers/countries";
import { regulatorInfo } from "@/helpers/regulators";
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

function instrumentLabel(
  entry: { category: string | null; symbol: string | null },
  t: ReturnType<typeof useTranslations>,
): string {
  if (entry.symbol) return entry.symbol;
  if (entry.category && isInstrumentCategory(entry.category)) return t(`categories.${entry.category}`);
  return entry.category ?? "—";
}

// Every account-type name referenced by any spread row, in the order
// account types were defined — spreads are keyed by name (see SpreadInfo),
// so a row may be missing a value for a given column if that instrument
// hasn't been priced for that account type yet.
function spreadColumns(broker: PublicBrokerOffer): string[] {
  const names = new Set<string>();
  broker.account_types.forEach((at) => names.add(at.name));
  broker.spreads.forEach((s) => Object.keys(s.spreads).forEach((n) => names.add(n)));
  return broker.account_types.map((at) => at.name).filter((n) => names.has(n));
}

// The "Cashback per Asset Class" summary: rows are every category actually
// used in any account type's cashback list, columns are account types, cells
// are the best ($/lot) rate for that category within that account type — or
// a flat-rate note when the account type has no structured cashback list at
// all (falls back to the broker's headline cashback_rate).
function cashbackSummaryRows(broker: PublicBrokerOffer): InstrumentCategory[] {
  const present = new Set<string>();
  broker.account_types.forEach((at) =>
    at.cashback.forEach((c) => {
      if (c.category) present.add(c.category);
    }),
  );
  return INSTRUMENT_CATEGORIES.filter((cat) => present.has(cat));
}

function bestRateForCategory(at: BrokerAccountType, category: string): number | null {
  const matches = at.cashback.filter((c) => c.category === category);
  if (matches.length === 0) return null;
  return Math.max(...matches.map((c) => c.rate));
}

function SectionEyebrow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className={styles.eyebrow}>
      <span className={styles.eyebrowIcon}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

const USER_RATING_VALUES = [1, 2, 3, 4, 5];

function RateBrokerPrompt({ brokerId }: { brokerId: string }) {
  const t = useTranslations("brokerDetail.rateBroker");
  const { user } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [myRating, setMyRating] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    brokerRatingApi
      .mine(brokerId)
      .then((r) => setMyRating(r?.rating ?? null))
      .catch(() => setMyRating(null))
      .finally(() => setChecked(true));
  }, [brokerId, user]);

  const submit = (value: number) => {
    setSaving(true);
    brokerRatingApi
      .submit(brokerId, value)
      .then(() => setMyRating(value))
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  if (!user) {
    return (
      <div className={styles.ratePrompt}>
        <span>{t("signInToRate")}</span>
        <button type="button" className={styles.rateSignInBtn} onClick={openLoginModal}>
          {t("signIn")}
        </button>
      </div>
    );
  }

  if (!checked) return null;

  return (
    <div className={styles.ratePrompt}>
      <span>{myRating != null ? t("yourRating") : t("rateThisBroker")}</span>
      <div className={styles.rateStars}>
        {USER_RATING_VALUES.map((v) => (
          <button
            key={v}
            type="button"
            disabled={saving}
            className={`${styles.rateStar} ${myRating != null && v <= myRating ? styles.rateStarActive : ""}`}
            onClick={() => submit(v)}
            aria-label={`${v} / 5`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
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
  const hasSafetyInfo =
    broker.regulations.length > 0 ||
    broker.segregated_funds ||
    broker.negative_balance_protection ||
    !!broker.compensation_scheme;
  const distinctRegulators = [...new Set(broker.regulations.map((r) => r.regulator))];
  const spreadCols = spreadColumns(broker);
  const summaryRows = cashbackSummaryRows(broker);

  return (
    <div className={styles.page}>
      <Link href="/cashback" className={styles.backLink}>
        {t("backToBrokers")}
      </Link>

      <div className={styles.header}>
        {broker.img_src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={broker.img_src} alt="" className={styles.avatar} />
        ) : (
          <div className={styles.avatar}>{getInitials(broker.name)}</div>
        )}
        <div className={styles.headerBody}>
          <h1 className={styles.name}>{broker.name}</h1>
          {broker.tagline && <p className={styles.tagline}>{broker.tagline}</p>}
          <div className={styles.metaRow}>
            {broker.rating != null && (
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("trustScore")}</span>
                <ScoreBadge score={broker.rating} size="sm" />
              </span>
            )}
            {broker.user_rating_count > 0 && (
              <span className={styles.metaItem}>
                {t("userRating", {
                  avg: broker.user_rating_avg ?? 0,
                  count: broker.user_rating_count,
                })}
              </span>
            )}
            {(broker.founded_year || broker.headquarters) && (
              <span className={styles.metaItem}>
                {[
                  broker.founded_year ? t("foundedIn", { year: broker.founded_year }) : null,
                  broker.headquarters,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </div>
          <div className={styles.coverage}>
            {broker.geo_coverage.map((c) => labels[c] || c).join(" · ") || t("vettedPartner")}
          </div>
        </div>
        {distinctRegulators.length > 0 && (
          <div className={styles.heroSeals}>
            {distinctRegulators.map((code) => (
              <RegulatorSeal key={code} code={code} size="sm" />
            ))}
          </div>
        )}
      </div>

      {broker.about && <p className={styles.about}>{broker.about}</p>}

      <div className={styles.quickFacts}>
        <div className={styles.quickFact}>
          <div className={styles.quickFactLabel}>{t("cashbackRate")}</div>
          <div className={styles.quickFactValue}>{t("flatRate", { rate: broker.cashback_rate })}</div>
        </div>
        {broker.min_deposit != null && (
          <div className={styles.quickFact}>
            <div className={styles.quickFactLabel}>{t("minDeposit")}</div>
            <div className={styles.quickFactValue}>${broker.min_deposit}</div>
          </div>
        )}
        {broker.max_leverage && (
          <div className={styles.quickFact}>
            <div className={styles.quickFactLabel}>{t("maxLeverage")}</div>
            <div className={styles.quickFactValue}>{broker.max_leverage}</div>
          </div>
        )}
        {broker.execution_type && (
          <div className={styles.quickFact}>
            <div className={styles.quickFactLabel}>{t("executionType")}</div>
            <div className={styles.quickFactValue}>{broker.execution_type}</div>
          </div>
        )}
      </div>

      <div className={styles.ctaRow}>
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
        <Link href={`/brokers/compare?a=${broker.id}`} className={styles.compareBtn}>
          {t("compareWithAnother")}
        </Link>
      </div>

      <RateBrokerPrompt brokerId={broker.id} />

      {hasSafetyInfo && (
        <section className={styles.section}>
          <SectionEyebrow icon="🛡️" label={t("regulationEyebrow")} />
          <h2 className={styles.sectionTitle}>{t("regulationTitle")}</h2>
          {broker.regulations.length > 0 && (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{t("regulator")}</th>
                  <th>{t("licenseNumber")}</th>
                  <th>{t("activeSince")}</th>
                </tr>
              </thead>
              <tbody>
                {broker.regulations.map((r, i) => {
                  const info = regulatorInfo(r.regulator);
                  return (
                    <tr key={i}>
                      <td>
                        {info.code}
                        {info.jurisdiction ? ` (${info.jurisdiction})` : ""}
                      </td>
                      <td>{r.license_number || "—"}</td>
                      <td>{r.active_since || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <ul className={styles.checklist}>
            {broker.segregated_funds && <li>{t("segregatedFunds")}</li>}
            {broker.negative_balance_protection && <li>{t("negativeBalanceProtection")}</li>}
            {broker.compensation_scheme && <li>{broker.compensation_scheme}</li>}
          </ul>
        </section>
      )}

      {broker.spreads.length > 0 && (
        <section className={styles.section}>
          <SectionEyebrow icon="📊" label={t("tradingConditionsEyebrow")} />
          <h2 className={styles.sectionTitle}>{t("tradingConditionsTitle")}</h2>
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{t("instrument")}</th>
                  {spreadCols.map((name) => (
                    <th key={name}>{name}</th>
                  ))}
                  <th>{t("commission")}</th>
                </tr>
              </thead>
              <tbody>
                {broker.spreads.map((s, i) => (
                  <tr key={i}>
                    <td>{instrumentLabel(s, t)}</td>
                    {spreadCols.map((name) => (
                      <td key={name}>{s.spreads[name] || "—"}</td>
                    ))}
                    <td>{s.commission || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <SectionEyebrow icon="💼" label={t("accountTypesEyebrow")} />
        <h2 className={styles.sectionTitle}>{t("accountTypesTitle")}</h2>
        {broker.account_types.length === 0 ? (
          <p className={styles.hint}>{t("noAccountTypes", { rate: broker.cashback_rate })}</p>
        ) : (
          <div className={styles.accountTypeGrid}>
            {broker.account_types.map((at, i) => (
              <div key={i} id={`account-type-${i}`} className={styles.accountTypeCard}>
                <div className={styles.accountTypeName}>{at.name}</div>
                {at.description && (
                  <p className={styles.accountTypeDesc}>{at.description}</p>
                )}
                {(at.min_deposit != null || at.spread_from || at.commission || at.swap_free) && (
                  <div className={styles.accountTypeSpecs}>
                    {at.min_deposit != null && (
                      <span>{t("accountTypeMinDeposit", { amount: at.min_deposit })}</span>
                    )}
                    {at.spread_from && <span>{t("accountTypeSpreadFrom", { spread: at.spread_from })}</span>}
                    {at.commission && <span>{t("accountTypeCommission", { commission: at.commission })}</span>}
                    {at.swap_free && <span>{t("accountTypeSwapFreeLabel")}</span>}
                  </div>
                )}
                {at.cashback.length === 0 ? (
                  <p className={styles.hint}>{t("usesFlatRate", { rate: broker.cashback_rate })}</p>
                ) : (
                  <table className={styles.rateTable}>
                    <tbody>
                      {at.cashback.map((c, j) => (
                        <tr key={j}>
                          <td>{instrumentLabel(c, t)}</td>
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

      {summaryRows.length > 0 && (
        <section className={styles.section}>
          <SectionEyebrow icon="💰" label={t("cashbackSummaryEyebrow")} />
          <h2 className={styles.sectionTitle}>{t("cashbackSummaryTitle")}</h2>
          <p className={styles.hint}>{t("cashbackSummaryHint")}</p>
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{t("assetClass")}</th>
                  {broker.account_types.map((at, i) => (
                    <th key={i}>
                      <a href={`#account-type-${i}`} className={styles.accountTypeLink}>
                        {at.name}
                      </a>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((cat) => (
                  <tr key={cat}>
                    <td>{t(`categories.${cat}`)}</td>
                    {broker.account_types.map((at, i) => {
                      if (at.cashback.length === 0) {
                        return <td key={i}>{t("flatRateCell", { rate: broker.cashback_rate })}</td>;
                      }
                      const rate = bestRateForCategory(at, cat);
                      return <td key={i}>{rate != null ? t("upToPerLot", { rate }) : "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {broker.platforms.length > 0 && (
        <section className={styles.section}>
          <SectionEyebrow icon="🖥️" label={t("platformsEyebrow")} />
          <h2 className={styles.sectionTitle}>{t("platformsTitle")}</h2>
          <div className={styles.platformGrid}>
            {broker.platforms.map((p, i) => (
              <div key={i} className={styles.platformCard}>
                <div className={styles.platformName}>{p.name}</div>
                {p.description && <p className={styles.hint}>{p.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {broker.funding_methods.length > 0 && (
        <section className={styles.section}>
          <SectionEyebrow icon="🌐" label={t("fundingEyebrow")} />
          <h2 className={styles.sectionTitle}>{t("fundingTitle")}</h2>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>{t("method")}</th>
                <th>{t("processingTime")}</th>
                <th>{t("fee")}</th>
              </tr>
            </thead>
            <tbody>
              {broker.funding_methods.map((f, i) => (
                <tr key={i}>
                  <td>{f.method}</td>
                  <td>{f.processing_time || "—"}</td>
                  <td>{f.fee || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className={styles.section}>
        <SectionEyebrow icon="✅" label={t("payoutEyebrow")} />
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

      {(broker.support_channels.length > 0 ||
        broker.support_languages.length > 0 ||
        broker.support_hours) && (
        <section className={styles.section}>
          <SectionEyebrow icon="🎧" label={t("supportEyebrow")} />
          <h2 className={styles.sectionTitle}>{t("supportTitle")}</h2>
          <div className={styles.supportGrid}>
            {broker.support_channels.length > 0 && (
              <div>
                <div className={styles.payoutLabel}>{t("supportChannels")}</div>
                <div className={styles.payoutValue}>{broker.support_channels.join(", ")}</div>
              </div>
            )}
            {broker.support_languages.length > 0 && (
              <div>
                <div className={styles.payoutLabel}>{t("supportLanguages")}</div>
                <div className={styles.payoutValue}>{broker.support_languages.join(", ")}</div>
              </div>
            )}
            {broker.support_hours && (
              <div>
                <div className={styles.payoutLabel}>{t("supportHours")}</div>
                <div className={styles.payoutValue}>{broker.support_hours}</div>
              </div>
            )}
          </div>
        </section>
      )}

      {(broker.pros.length > 0 || broker.cons.length > 0) && (
        <section className={styles.section}>
          <SectionEyebrow icon="⭐" label={t("prosConsEyebrow")} />
          <h2 className={styles.sectionTitle}>{t("prosConsTitle")}</h2>
          <div className={styles.prosConsGrid}>
            {broker.pros.length > 0 && (
              <div className={styles.prosCard}>
                <div className={styles.prosConsLabel}>{t("pros")}</div>
                <ul className={styles.checklist}>
                  {broker.pros.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {broker.cons.length > 0 && (
              <div className={styles.consCard}>
                <div className={styles.prosConsLabel}>{t("cons")}</div>
                <ul className={styles.crosslist}>
                  {broker.cons.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {broker.terms_text && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("termsTitle")}</h2>
          <p className={styles.termsText}>{broker.terms_text}</p>
        </section>
      )}
    </div>
  );
}
