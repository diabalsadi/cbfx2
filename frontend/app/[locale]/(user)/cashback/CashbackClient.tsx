"use client";
import { useState, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import StarRating from "@/components/StarRating";
import {
  mt5AccountsApi,
  publicApi,
  type MT5Account,
  type WalletTransaction,
  type PublicBroker,
} from "@/helpers/api";
import styles from "./cashback.module.scss";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Known mock transaction descriptions (see MOCK_TRANSACTIONS below) mapped to
// their translation key, so the signed-out preview renders in the visitor's
// locale — real transactions come from the backend and aren't translated.
const MOCK_DESCRIPTION_KEY: Record<string, "cashbackRebate" | "withdrawSkrill" | "withdrawBank"> = {
  "Cashback rebate": "cashbackRebate",
  "Withdrawal to Skrill": "withdrawSkrill",
  "Withdrawal to bank account": "withdrawBank",
};

function daysAgoISO(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

// Shown to signed-out visitors so the page isn't just an empty prompt — the
// same layout renders this instead of real data, with a banner explaining
// it's an example.
const MOCK_ACCOUNTS: MT5Account[] = [
  {
    id: "mock-1", broker_id: "mock-ic", broker_name: "IC Markets", broker_img_src: null,
    mt5_number: "50219384", account_type: null, balance: 128.40, lifetime_earned: 512.90,
    metaapi_connection_status: "connected", created_at: daysAgoISO(120),
  },
  {
    id: "mock-2", broker_id: "mock-xm", broker_name: "XM Global", broker_img_src: null,
    mt5_number: "88213765", account_type: null, balance: 54.10, lifetime_earned: 289.20,
    metaapi_connection_status: "connected", created_at: daysAgoISO(90),
  },
  {
    id: "mock-3", broker_id: "mock-pep", broker_name: "Pepperstone", broker_img_src: null,
    mt5_number: "91345612", account_type: null, balance: 76.90, lifetime_earned: 198.50,
    metaapi_connection_status: "connected", created_at: daysAgoISO(60),
  },
];

const MOCK_TRANSACTIONS: WalletTransaction[] = [
  { id: "mock-t1", mt5_account_id: "mock-1", broker_name: "IC Markets", mt5_number: "50219384", type: "credit", amount: 45.20, description: "Cashback rebate", created_at: daysAgoISO(2) },
  { id: "mock-t2", mt5_account_id: "mock-2", broker_name: "XM Global", mt5_number: "88213765", type: "debit", amount: 25.00, description: "Withdrawal to Skrill", created_at: daysAgoISO(5) },
  { id: "mock-t3", mt5_account_id: "mock-3", broker_name: "Pepperstone", mt5_number: "91345612", type: "credit", amount: 76.90, description: "Cashback rebate", created_at: daysAgoISO(9) },
  { id: "mock-t4", mt5_account_id: "mock-1", broker_name: "IC Markets", mt5_number: "50219384", type: "credit", amount: 38.90, description: "Cashback rebate", created_at: daysAgoISO(16) },
  { id: "mock-t5", mt5_account_id: "mock-1", broker_name: "IC Markets", mt5_number: "50219384", type: "debit", amount: 60.00, description: "Withdrawal to bank account", created_at: daysAgoISO(30) },
];

// Below this many brokers, duplicating the list to loop the scroll
// seamlessly (see below) just reads as the same handful of brokers shown
// twice — not enough content for the repeat to look like a continuous
// ticker rather than a glitch. Render them once, statically, instead.
const MARQUEE_MIN_BROKERS = 8;

function BrokerCashbackStrip() {
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
        <div
          className={
            shouldScroll ? styles.brokerStripViewport : styles.brokerStripViewportStatic
          }
        >
          <div className={shouldScroll ? styles.brokerStripTrack : styles.brokerStripTrackStatic}>
            {track.map((b, i) => (
              <Link
                key={`${b.id}-${i}`}
                href={`/brokers/${b.id}`}
                className={styles.brokerStripItem}
              >
                {b.img_src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.img_src} alt="" className={styles.brokerStripIconImg} />
                ) : (
                  <div className={styles.brokerStripIcon}>{initials(b.name)}</div>
                )}
                <div className={styles.brokerStripBody}>
                  <span className={styles.brokerStripName}>{b.name}</span>
                  {b.cashback_rate > 0 && (
                    <span className={styles.brokerStripDesc}>
                      {t("upToCashback", { rate: b.cashback_rate })}
                    </span>
                  )}
                  <StarRating rating={b.rating} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddAccountModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const t = useTranslations("cashback.addModal");
  const [brokers, setBrokers] = useState<PublicBroker[]>([]);
  const [brokersLoading, setBrokersLoading] = useState(true);
  const [brokerId, setBrokerId] = useState("");
  const [mt5Number, setMt5Number] = useState("");
  const [server, setServer] = useState("");
  const [platform, setPlatform] = useState<"mt5" | "mt4">("mt5");
  const [investorPassword, setInvestorPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    publicApi
      .brokers()
      .then(setBrokers)
      .catch(() => setBrokers([]))
      .finally(() => setBrokersLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerId) {
      setError(t("selectBrokerError"));
      return;
    }
    if (!mt5Number.trim()) {
      setError(t("mt5RequiredError"));
      return;
    }
    if (!server.trim()) {
      setError(t("serverRequiredError"));
      return;
    }
    if (!investorPassword.trim()) {
      setError(t("investorPasswordRequiredError"));
      return;
    }
    setError("");
    setSaving(true);
    try {
      await mt5AccountsApi.create({
        broker_id: brokerId,
        mt5_number: mt5Number.trim(),
        server: server.trim(),
        platform,
        investor_password: investorPassword,
      });
      onAdded();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("addFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{t("title")}</h3>
          <button onClick={onClose} className={styles.modalClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.field}>
            <label className={styles.label}>{t("broker")}</label>
            <select
              className={styles.select}
              value={brokerId}
              onChange={(e) => setBrokerId(e.target.value)}
              disabled={brokersLoading || brokers.length === 0}
              required
            >
              <option value="" disabled>
                {brokersLoading ? t("loadingBrokers") : t("selectBroker")}
              </option>
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {t("brokerOption", { name: b.name, rate: b.cashback_rate })}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("mt5Number")}</label>
            <input
              className={styles.input}
              value={mt5Number}
              onChange={(e) => setMt5Number(e.target.value)}
              placeholder={t("mt5Placeholder")}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("server")}</label>
            <input
              className={styles.input}
              value={server}
              onChange={(e) => setServer(e.target.value)}
              placeholder={t("serverPlaceholder")}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("platform")}</label>
            <select
              className={styles.select}
              value={platform}
              onChange={(e) => setPlatform(e.target.value as "mt4" | "mt5")}
            >
              <option value="mt5">MT5</option>
              <option value="mt4">MT4</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("investorPassword")}</label>
            <input
              className={styles.input}
              type="password"
              value={investorPassword}
              onChange={(e) => setInvestorPassword(e.target.value)}
              placeholder={t("investorPasswordPlaceholder")}
              autoComplete="new-password"
              required
            />
            <p className={styles.fieldHint}>{t("investorPasswordHint")}</p>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={saving}>
            {saving ? t("adding") : t("addAccountBtn")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CashbackPage() {
  const t = useTranslations("cashback");
  const locale = useLocale();
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric" });
  const { user, loading: authLoading } = useAuth();
  const { openLoginModal } = useLoginModal();

  const [realAccounts, setRealAccounts] = useState<MT5Account[]>([]);
  const [realTransactions, setRealTransactions] = useState<WalletTransaction[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const fetchData = useCallback(() => {
    Promise.all([mt5AccountsApi.listMine(), mt5AccountsApi.listTransactions()])
      .then(([accounts, transactions]) => {
        setRealAccounts(accounts);
        setRealTransactions(transactions);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => setDataLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  if (authLoading) return null;

  const isPreview = !user;
  const accounts = isPreview ? MOCK_ACCOUNTS : realAccounts;
  const transactions = isPreview ? MOCK_TRANSACTIONS : realTransactions;
  const loading = !isPreview && dataLoading;

  const available = accounts.reduce((sum, a) => sum + a.balance, 0);
  const lifetime = accounts.reduce((sum, a) => sum + a.lifetime_earned, 0);
  const brokerCount = new Set(accounts.map((a) => a.broker_id)).size;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
      </div>

      <BrokerCashbackStrip />

      {isPreview && (
        <div className={styles.previewBanner}>
          <span>{t("previewBanner")}</span>
          <button className={styles.previewSignInBtn} onClick={openLoginModal}>
            {t("previewSignIn")}
          </button>
        </div>
      )}

      {/* Balance card */}
      <div className={styles.balanceCard}>
        <div className={styles.balanceLabel}>
          <span className={styles.balanceIcon}>💳</span>
          {t("availableBalance")}
        </div>
        <div className={styles.balanceAmount}>${available.toFixed(2)}</div>
        <div className={styles.lifetimeLabel}>
          {t("lifetimeEarnedApprox", { amount: `$${lifetime.toFixed(2)}` })}
        </div>

        <div className={styles.balanceActions}>
          <button
            className={styles.withdrawBtn}
            onClick={isPreview ? openLoginModal : () => setShowWithdraw(true)}
          >
            {t("withdraw")}
          </button>
          <button
            className={styles.addAccountBtn}
            onClick={isPreview ? openLoginModal : () => setShowAdd(true)}
          >
            {t("addAccount")}
          </button>
        </div>
      </div>

      {/* Withdraw modal */}
      {showWithdraw && (
        <div className={styles.modalOverlay} onClick={() => setShowWithdraw(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{t("withdrawModalTitle")}</h3>
              <button onClick={() => setShowWithdraw(false)} className={styles.modalClose}>
                ✕
              </button>
            </div>
            <p className={styles.modalText}>{t("withdrawUnavailable")}</p>
          </div>
        </div>
      )}

      {/* Add account modal */}
      {showAdd && (
        <AddAccountModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            fetchData();
          }}
        />
      )}

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <div className={styles.statValue}>${available.toFixed(2)}</div>
          <div className={styles.statLabel}>{t("statAvailable")}</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>${lifetime.toFixed(2)}</div>
          <div className={styles.statLabel}>{t("statLifetime")}</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{brokerCount}</div>
          <div className={styles.statLabel}>{t("statBrokers")}</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{accounts.length}</div>
          <div className={styles.statLabel}>{t("statAccounts")}</div>
        </div>
      </div>

      {/* Accounts */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t("yourAccounts")}</div>
        {error && <p className={styles.errorMsg}>{error}</p>}
        <div className={styles.list}>
          {loading ? (
            <div className={styles.empty}>{t("loading")}</div>
          ) : accounts.length === 0 ? (
            <div className={styles.empty}>{t("noAccounts")}</div>
          ) : (
            accounts.map((a) => (
              <div key={a.id} className={styles.row}>
                <div className={styles.rowLeft}>
                  {a.broker_img_src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.broker_img_src} alt="" className={styles.accountAvatarImg} />
                  ) : (
                    <div className={styles.accountAvatar}>{initials(a.broker_name)}</div>
                  )}
                  <div>
                    <div className={styles.brokerName}>{a.broker_name}</div>
                    <div className={styles.payoutDate}>MT5 #{a.mt5_number}</div>
                  </div>
                </div>
                <div className={styles.rowRight}>
                  <div className={styles.amount}>${a.balance.toFixed(2)}</div>
                  <div className={styles.payoutDate}>
                    {t("lifetimeSuffix", { amount: `$${a.lifetime_earned.toFixed(2)}` })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* History — money in / money out */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t("history")}</div>
        <div className={styles.list}>
          {loading ? (
            <div className={styles.empty}>{t("loading")}</div>
          ) : transactions.length === 0 ? (
            <div className={styles.empty}>{t("noTransactions")}</div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className={styles.row}>
                <div className={styles.rowLeft}>
                  <div>
                    <div className={styles.brokerName}>
                      {MOCK_DESCRIPTION_KEY[tx.description]
                        ? t(`transactions.${MOCK_DESCRIPTION_KEY[tx.description]}`)
                        : tx.description}
                    </div>
                    <div className={styles.payoutDate}>
                      {tx.broker_name} · MT5 #{tx.mt5_number} · {formatDate(tx.created_at)}
                    </div>
                  </div>
                </div>
                <div className={styles.rowRight}>
                  <div
                    className={`${styles.txAmount} ${tx.type === "credit" ? styles.credit : styles.debit}`}
                  >
                    {tx.type === "credit" ? "+" : "−"} ${tx.amount.toFixed(2)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
