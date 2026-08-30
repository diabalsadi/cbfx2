"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { publicApi, type PublicBroker, type PublicBrokerOffer } from "@/helpers/api";
import ScoreBadge from "@/components/ScoreBadge";
import { REGULATOR_LABELS } from "@/helpers/regulators";
import styles from "./compare.module.scss";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function BrokerPicker({
  label,
  brokers,
  selectedId,
  onSelect,
}: {
  label: string;
  brokers: PublicBroker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("brokerCompare");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = brokers.find((b) => b.id === selectedId) ?? null;

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const filtered = brokers.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.picker} ref={ref}>
      <div className={styles.pickerLabel}>{label}</div>
      <button type="button" className={styles.pickerTrigger} onClick={() => setOpen((o) => !o)}>
        {selected ? selected.name : t("selectBroker")}
        <span className={styles.caret}>▾</span>
      </button>
      {open && (
        <div className={styles.pickerPanel}>
          <input
            className={styles.pickerSearch}
            placeholder={t("searchBrokers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className={styles.pickerList}>
            {filtered.length === 0 ? (
              <div className={styles.pickerEmpty}>{t("noBrokers")}</div>
            ) : (
              filtered.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  className={styles.pickerOption}
                  onClick={() => {
                    onSelect(b.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {b.img_src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.img_src} alt="" className={styles.pickerOptionImg} />
                  ) : (
                    <div className={styles.pickerOptionImgFallback}>{initials(b.name)}</div>
                  )}
                  {b.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BrokerColumn({ broker }: { broker: PublicBrokerOffer | null }) {
  const t = useTranslations("brokerCompare");

  if (!broker) {
    return <div className={styles.column}><p className={styles.empty}>{t("pickToCompare")}</p></div>;
  }

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        {broker.img_src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={broker.img_src} alt="" className={styles.columnImg} />
        ) : (
          <div className={styles.columnImgFallback}>{initials(broker.name)}</div>
        )}
        <div className={styles.columnName}>{broker.name}</div>
      </div>

      <div className={styles.metricList}>
        <div className={styles.metric}>
          <span>{t("trustScore")}</span>
          <ScoreBadge score={broker.rating} size="sm" />
        </div>
        <div className={styles.metric}>
          <span>{t("cashbackRate")}</span>
          <strong>{broker.cashback_rate}%</strong>
        </div>
        {broker.min_deposit != null && (
          <div className={styles.metric}>
            <span>{t("minDeposit")}</span>
            <strong>${broker.min_deposit}</strong>
          </div>
        )}
        {broker.max_leverage && (
          <div className={styles.metric}>
            <span>{t("maxLeverage")}</span>
            <strong>{broker.max_leverage}</strong>
          </div>
        )}
        {broker.execution_type && (
          <div className={styles.metric}>
            <span>{t("executionType")}</span>
            <strong>{broker.execution_type}</strong>
          </div>
        )}
      </div>

      {broker.regulation_badges.length > 0 && (
        <div className={styles.badgeRow}>
          {broker.regulation_badges.map((code) => (
            <span key={code} className={styles.badge}>
              {REGULATOR_LABELS[code] || code}
            </span>
          ))}
        </div>
      )}

      {broker.spreads.length > 0 && (
        <div className={styles.subsection}>
          <div className={styles.subsectionTitle}>{t("spreads")}</div>
          {broker.spreads.map((s, i) => (
            <div key={i} className={styles.subsectionRow}>
              <span>{s.symbol}</span>
              <span>{s.typical_spread || "—"}</span>
            </div>
          ))}
        </div>
      )}

      {broker.account_types.length > 0 && (
        <div className={styles.subsection}>
          <div className={styles.subsectionTitle}>{t("accountTypes")}</div>
          {broker.account_types.map((at, i) => (
            <div key={i} className={styles.subsectionRow}>
              <span>{at.name}</span>
              <span>{at.min_deposit != null ? `$${at.min_deposit}` : "—"}</span>
            </div>
          ))}
        </div>
      )}

      {broker.platforms.length > 0 && (
        <div className={styles.subsection}>
          <div className={styles.subsectionTitle}>{t("platforms")}</div>
          <p className={styles.subsectionText}>{broker.platforms.map((p) => p.name).join(", ")}</p>
        </div>
      )}

      {broker.pros.length > 0 && (
        <div className={styles.subsection}>
          <div className={styles.subsectionTitle}>{t("pros")}</div>
          <ul className={styles.checklist}>
            {broker.pros.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {broker.cons.length > 0 && (
        <div className={styles.subsection}>
          <div className={styles.subsectionTitle}>{t("cons")}</div>
          <ul className={styles.checklist}>
            {broker.cons.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Reads ?a=/?b= (e.g. a broker page's "Compare with another broker" link)
// as a lazy useState initializer — runs synchronously during the first
// client render rather than in an effect, so there's no effect-to-effect
// setState cascade into the broker-fetch effects below. Guarded for SSR,
// where window isn't available yet; harmless since aId/bId only drive which
// fetch runs next; they're never rendered as text themselves.
function initialIdFromQuery(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

export default function CompareClient() {
  const t = useTranslations("brokerCompare");

  const [brokers, setBrokers] = useState<PublicBroker[]>([]);
  const [aId, setAId] = useState<string | null>(() => initialIdFromQuery("a"));
  const [bId, setBId] = useState<string | null>(() => initialIdFromQuery("b"));
  const [brokerA, setBrokerA] = useState<PublicBrokerOffer | null>(null);
  const [brokerB, setBrokerB] = useState<PublicBrokerOffer | null>(null);

  useEffect(() => {
    publicApi.brokers().then(setBrokers).catch(() => setBrokers([]));
  }, []);

  useEffect(() => {
    if (!aId) return;
    let cancelled = false;
    publicApi
      .brokerOffer(aId)
      .then((data) => {
        if (!cancelled) setBrokerA(data);
      })
      .catch(() => {
        if (!cancelled) setBrokerA(null);
      });
    return () => {
      cancelled = true;
    };
  }, [aId]);

  useEffect(() => {
    if (!bId) return;
    let cancelled = false;
    publicApi
      .brokerOffer(bId)
      .then((data) => {
        if (!cancelled) setBrokerB(data);
      })
      .catch(() => {
        if (!cancelled) setBrokerB(null);
      });
    return () => {
      cancelled = true;
    };
  }, [bId]);

  const select = (which: "a" | "b", id: string) => {
    if (which === "a") setAId(id);
    else setBId(id);

    // Keep the URL shareable/bookmarkable without a full navigation —
    // same rationale as reading it back with window.location above.
    const params = new URLSearchParams(window.location.search);
    params.set(which, id);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
        <p className={styles.pageSubtitle}>{t("subtitle")}</p>
      </div>

      <div className={styles.pickerRow}>
        <BrokerPicker label={t("brokerA")} brokers={brokers} selectedId={aId} onSelect={(id) => select("a", id)} />
        <BrokerPicker label={t("brokerB")} brokers={brokers} selectedId={bId} onSelect={(id) => select("b", id)} />
      </div>

      <div className={styles.columns}>
        <BrokerColumn broker={aId ? brokerA : null} />
        <BrokerColumn broker={bId ? brokerB : null} />
      </div>
    </div>
  );
}
