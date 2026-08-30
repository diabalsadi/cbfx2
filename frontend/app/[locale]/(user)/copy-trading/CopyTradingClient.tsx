"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import ProGate from "@/components/ProGate";
import {
  copyTradersApi,
  copySubscriptionsApi,
  mt5AccountsApi,
  type CopyTrader,
  type CopySubscription,
  type MT5Account,
} from "@/helpers/api";
import styles from "./copy-trading.module.scss";

const TAB_KEYS = ["all", "topGainers", "mostCopied", "trending", "lowRisk"] as const;

const SUB_STATUS_LABEL_KEYS: Record<
  string,
  "mySubscriptions.status_pending" | "mySubscriptions.status_active" | "mySubscriptions.status_paused" | "mySubscriptions.status_stopped" | "mySubscriptions.status_error"
> = {
  pending: "mySubscriptions.status_pending",
  active: "mySubscriptions.status_active",
  paused: "mySubscriptions.status_paused",
  stopped: "mySubscriptions.status_stopped",
  error: "mySubscriptions.status_error",
};

// Deterministic per-trader accent color — same seeding technique as the
// sparkline below, since real traders have no stored color field.
const PALETTE = ["#f97316", "#8b5cf6", "#06b6d4", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#ef4444"];
function colorForTrader(id: string): string {
  const seed = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTE[seed % PALETTE.length];
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function CopyTradingPage() {
  const t = useTranslations("copyTrading");
  const { user } = useAuth();
  const { openLoginModal } = useLoginModal();

  const [traders, setTraders] = useState<CopyTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof TAB_KEYS)[number]>("all");
  const [search, setSearch] = useState("");

  const [subscriptions, setSubscriptions] = useState<CopySubscription[]>([]);
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [subscribeTrader, setSubscribeTrader] = useState<CopyTrader | null>(null);
  const [stoppingId, setStoppingId] = useState<string | null>(null);

  useEffect(() => {
    copyTradersApi
      .list()
      .then((all) => setTraders(all.filter((tr) => tr.is_live)))
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  const refreshSubscriptions = () => {
    copySubscriptionsApi.listMine().then(setSubscriptions).catch(() => setSubscriptions([]));
  };

  useEffect(() => {
    if (!user) {
      setSubscriptions([]);
      setAccounts([]);
      return;
    }
    refreshSubscriptions();
    mt5AccountsApi.listMine().then(setAccounts).catch(() => setAccounts([]));
  }, [user]);

  const filtered = traders.filter((trader) => trader.name.toLowerCase().includes(search.toLowerCase()));

  const handleCopyClick = (trader: CopyTrader) => {
    if (!user) {
      openLoginModal();
      return;
    }
    setSubscribeTrader(trader);
  };

  const handleStop = async (subscriptionId: string) => {
    setStoppingId(subscriptionId);
    try {
      await copySubscriptionsApi.stop(subscriptionId);
      refreshSubscriptions();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("mySubscriptions.stopFailed"));
    } finally {
      setStoppingId(null);
    }
  };

  return (
    <ProGate feature="copyTrading">
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10h12M10 4l6 6-6 6"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className={styles.title}>{t("title")}</h1>
            <p className={styles.subtitle}>{t("subtitle")}</p>
          </div>
        </div>
        <button className={styles.becomeTraderBtn} onClick={openLoginModal}>
          {t("becomeTrader")}
        </button>
      </div>

      {/* ── Stats bar ── */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statVal}>{traders.length}</span>
          <span className={styles.statLbl}>{t("stats.signalProviders")}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statVal}>{t("stats.realTime")}</span>
          <span className={styles.statLbl}>{t("stats.tradeExecution")}</span>
        </div>
      </div>

      {/* ── My Copy Subscriptions ── */}
      {user && subscriptions.length > 0 && (
        <div className={styles.mySubs}>
          <h2 className={styles.mySubsTitle}>{t("mySubscriptions.title")}</h2>
          <div className={styles.mySubsList}>
            {subscriptions
              .filter((s) => s.status !== "stopped")
              .map((sub) => (
                <div key={sub.id} className={styles.mySubRow}>
                  <div className={styles.mySubInfo}>
                    <span className={styles.mySubTrader}>{sub.copy_trader_name}</span>
                    <span className={styles.mySubAccount}>
                      {sub.broker_name} · {sub.mt5_number} · {sub.multiplier}x
                    </span>
                  </div>
                  <span className={`${styles.subStatus} ${styles[`subStatus_${sub.status}`] || ""}`}>
                    {t(SUB_STATUS_LABEL_KEYS[sub.status] ?? "mySubscriptions.status_pending")}
                  </span>
                  <button
                    className={styles.stopBtn}
                    disabled={stoppingId === sub.id}
                    onClick={() => handleStop(sub.id)}
                  >
                    {stoppingId === sub.id ? t("mySubscriptions.stopping") : t("mySubscriptions.stop")}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className={styles.filterRow}>
        <div className={styles.tabs}>
          {TAB_KEYS.map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>
        <div className={styles.searchBox}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Trader grid ── */}
      {loading ? (
        <p className={styles.emptyState}>{t("loading")}</p>
      ) : loadError ? (
        <p className={styles.emptyState}>{loadError}</p>
      ) : filtered.length === 0 ? (
        <p className={styles.emptyState}>{t("noTraders")}</p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((trader) => {
            const color = colorForTrader(trader.id);
            return (
              <div key={trader.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.avatar} style={{ background: color }}>
                    {trader.avatar_initials}
                  </div>
                  <div className={styles.traderInfo}>
                    <div className={styles.traderName}>{trader.name}</div>
                    <div className={styles.traderFollowers}>
                      {formatFollowers(trader.followers)} {t("followers")}
                    </div>
                  </div>
                  <div className={styles.roiBadge}>
                    {trader.roi_12m >= 0 ? "+" : ""}
                    {trader.roi_12m}%
                  </div>
                </div>

                <div className={styles.cardStats}>
                  <div className={styles.cardStat}>
                    <span className={styles.cardStatVal} style={{ color: "#16a34a" }}>
                      {trader.win_rate}%
                    </span>
                    <span className={styles.cardStatLbl}>{t("winRate")}</span>
                  </div>
                  <div className={styles.cardStat}>
                    <span className={styles.cardStatVal}>
                      {trader.roi_3m >= 0 ? "+" : ""}
                      {trader.roi_3m}%
                    </span>
                    <span className={styles.cardStatLbl}>{t("roi3m")}</span>
                  </div>
                  <div className={styles.cardStat}>
                    <span className={styles.cardStatVal} style={{ color: "#dc2626" }}>
                      {trader.drawdown}%
                    </span>
                    <span className={styles.cardStatLbl}>{t("maxDd")}</span>
                  </div>
                  <div className={styles.cardStat}>
                    <span className={styles.cardStatVal} style={{ color: "#16a34a" }}>
                      {trader.roi_1m >= 0 ? "+" : ""}
                      {trader.roi_1m}%
                    </span>
                    <span className={styles.cardStatLbl}>{t("roi1m")}</span>
                  </div>
                </div>

                <div className={styles.sparklineWrap}>
                  <Sparkline color={color} />
                </div>

                <button className={styles.copyBtn} onClick={() => handleCopyClick(trader)}>
                  {t("copyTrader")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {subscribeTrader && (
      <SubscribeModal
        trader={subscribeTrader}
        accounts={accounts}
        onClose={() => setSubscribeTrader(null)}
        onSubscribed={() => {
          setSubscribeTrader(null);
          refreshSubscriptions();
        }}
      />
    )}
    </ProGate>
  );
}

function SubscribeModal({
  trader,
  accounts,
  onClose,
  onSubscribed,
}: {
  trader: CopyTrader;
  accounts: MT5Account[];
  onClose: () => void;
  onSubscribed: () => void;
}) {
  const t = useTranslations("copyTrading.subscribeModal");
  const [accountId, setAccountId] = useState("");
  const [multiplier, setMultiplier] = useState("1");
  const [tradingPassword, setTradingPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      setError(t("selectAccountError"));
      return;
    }
    if (!tradingPassword.trim()) {
      setError(t("passwordRequiredError"));
      return;
    }
    setError("");
    setSaving(true);
    try {
      await copySubscriptionsApi.create({
        copy_trader_id: trader.id,
        mt5_account_id: accountId,
        trading_password: tradingPassword,
        multiplier: parseFloat(multiplier) || 1,
      });
      onSubscribed();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("subscribeFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{t("title", { name: trader.name })}</h3>
          <button onClick={onClose} className={styles.modalClose} aria-label={t("close")}>
            ✕
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className={styles.modalForm}>
            <p>{t("noAccounts")}</p>
            <p className={styles.fieldHint}>{t("noAccountsHint")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.modalForm}>
            <div className={styles.field}>
              <label className={styles.label}>{t("account")}</label>
              <select className={styles.select} value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                <option value="" disabled>
                  {t("selectAccount")}
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.broker_name} · {a.mt5_number}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("multiplier")}</label>
              <input
                className={styles.input}
                type="number"
                min="0.1"
                step="0.1"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
              />
              <p className={styles.fieldHint}>{t("multiplierHint")}</p>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("tradingPassword")}</label>
              <input
                className={styles.input}
                type="password"
                value={tradingPassword}
                onChange={(e) => setTradingPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <p className={styles.fieldHint}>{t("tradingPasswordHint")}</p>
            </div>

            <p className={styles.consent}>{t("consent", { name: trader.name })}</p>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button className={styles.submitBtn} type="submit" disabled={saving}>
              {saving ? t("subscribing") : t("subscribeBtn")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* Simple seeded SVG sparkline */
function Sparkline({ color }: { color: string }) {
  const seed = color.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pts = Array.from({ length: 12 }, (_, i) => {
    const x = (i / 11) * 100;
    const y = 50 - (((seed * (i + 3)) % 71) - 35) * 0.55;
    return `${x},${y}`;
  });
  const d = `M${pts.join(" L")}`;
  return (
    <svg viewBox="0 0 100 70" preserveAspectRatio="none" className={styles.sparkline}>
      <path d={d} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${d} L100,70 L0,70 Z`} fill={color} fillOpacity="0.08" />
    </svg>
  );
}
