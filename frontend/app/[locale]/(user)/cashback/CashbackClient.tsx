"use client";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import BrokerCashbackStrip from "@/components/BrokerCashbackStrip";
import { type MT5Account, type WalletTransaction } from "@/helpers/api";
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
    pending_expected_amount: 22.10, metaapi_connection_status: "connected", created_at: daysAgoISO(120),
  },
  {
    id: "mock-2", broker_id: "mock-xm", broker_name: "XM Global", broker_img_src: null,
    mt5_number: "88213765", account_type: null, balance: 54.10, lifetime_earned: 289.20,
    pending_expected_amount: 9.60, metaapi_connection_status: "connected", created_at: daysAgoISO(90),
  },
  {
    id: "mock-3", broker_id: "mock-pep", broker_name: "Pepperstone", broker_img_src: null,
    mt5_number: "91345612", account_type: null, balance: 76.90, lifetime_earned: 198.50,
    pending_expected_amount: 14.30, metaapi_connection_status: "connected", created_at: daysAgoISO(60),
  },
];

const MOCK_TRANSACTIONS: WalletTransaction[] = [
  { id: "mock-t1", mt5_account_id: "mock-1", broker_name: "IC Markets", mt5_number: "50219384", type: "credit", amount: 45.20, description: "Cashback rebate", created_at: daysAgoISO(2) },
  { id: "mock-t2", mt5_account_id: "mock-2", broker_name: "XM Global", mt5_number: "88213765", type: "debit", amount: 25.00, description: "Withdrawal to Skrill", created_at: daysAgoISO(5) },
  { id: "mock-t3", mt5_account_id: "mock-3", broker_name: "Pepperstone", mt5_number: "91345612", type: "credit", amount: 76.90, description: "Cashback rebate", created_at: daysAgoISO(9) },
  { id: "mock-t4", mt5_account_id: "mock-1", broker_name: "IC Markets", mt5_number: "50219384", type: "credit", amount: 38.90, description: "Cashback rebate", created_at: daysAgoISO(16) },
  { id: "mock-t5", mt5_account_id: "mock-1", broker_name: "IC Markets", mt5_number: "50219384", type: "debit", amount: 60.00, description: "Withdrawal to bank account", created_at: daysAgoISO(30) },
];

// BrokerCashbackStrip moved to @/components/BrokerCashbackStrip so it can
// also be reused on the Account page's Manage Accounts tab — see
// AccountClient.tsx.

// Pure marketing/preview page — signed-in users are redirected to /account,
// which is now the real wallet (Wallet/History/Manage Accounts tabs). Kept
// here so /cashback stays valuable for signed-out visitors: it's a public
// entry point with its own SEO metadata and nav link, showing off the
// cashback feature with example data before anyone has to sign up.
export default function CashbackPage() {
  const t = useTranslations("cashback");
  const locale = useLocale();
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric" });
  const { user, loading: authLoading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/account");
  }, [user, router]);

  if (authLoading || user) return null;

  const accounts = MOCK_ACCOUNTS;
  const transactions = MOCK_TRANSACTIONS;

  const available = accounts.reduce((sum, a) => sum + a.balance, 0);
  const lifetime = accounts.reduce((sum, a) => sum + a.lifetime_earned, 0);
  const brokerCount = new Set(accounts.map((a) => a.broker_id)).size;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
      </div>

      <BrokerCashbackStrip />

      <div className={styles.previewBanner}>
        <span>{t("previewBanner")}</span>
        <button className={styles.previewSignInBtn} onClick={openLoginModal}>
          {t("previewSignIn")}
        </button>
      </div>

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
          <button className={styles.withdrawBtn} onClick={openLoginModal}>
            {t("withdraw")}
          </button>
          <button className={styles.addAccountBtn} onClick={openLoginModal}>
            {t("addAccount")}
          </button>
        </div>
      </div>

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
        <div className={styles.list}>
          {accounts.map((a) => (
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
          ))}
        </div>
      </div>

      {/* History — money in / money out */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t("history")}</div>
        <div className={styles.list}>
          {transactions.map((tx) => (
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
                <div className={`${styles.txAmount} ${tx.type === "credit" ? styles.credit : styles.debit}`}>
                  {tx.type === "credit" ? "+" : "−"} ${tx.amount.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
