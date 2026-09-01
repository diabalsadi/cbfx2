"use client";
import { useState, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import BrokerCashbackStrip from "@/components/BrokerCashbackStrip";
import {
  usersApi,
  mt5AccountsApi,
  publicApi,
  withdrawalRequestsApi,
  type MT5Account,
  type WalletTransaction,
  type PublicBroker,
  type WithdrawalMethod,
  type WithdrawalRequest,
  type WithdrawalDestinationDetails,
} from "@/helpers/api";
import styles from "./account.module.scss";

const KNOWN_ROLES = ["super_admin", "editor", "broker", "user"] as const;
const TAB_KEYS = ["personal", "security", "wallet", "history", "manage"] as const;

// Mirrors backend/app/routers/mt5_accounts.py's _BROKEN_LINK_STATUSES —
// used here only to decide whether to show the Reconnect/Remove buttons at
// all; the backend remains the authority on whether either action actually
// succeeds (Remove also checks for cashback history and live copy
// subscriptions, which aren't known client-side).
const BROKEN_LINK_STATUSES = new Set(["not_connected", "pending", "error"]);

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Same known-mock-description mapping CashbackClient.tsx uses for its
// preview — real transaction descriptions come from the backend verbatim.
const MOCK_DESCRIPTION_KEY: Record<string, "cashbackRebate" | "withdrawSkrill" | "withdrawBank"> = {
  "Cashback rebate": "cashbackRebate",
  "Withdrawal to Skrill": "withdrawSkrill",
  "Withdrawal to bank account": "withdrawBank",
};

function AddAccountModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
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

const WITHDRAWAL_METHODS: WithdrawalMethod[] = ["crypto", "bank_wire", "fund_mt5"];

function WithdrawModal({
  accounts,
  onClose,
  onSubmitted,
}: {
  accounts: MT5Account[];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const t = useTranslations("cashback.withdrawModal");
  // Any account with something to withdraw is pickable — whether its broker
  // actually offers a withdrawal method is decided per-selected-account
  // below (see the "noMethodsForBroker" branch), not by hiding the account
  // from the picker entirely.
  const eligibleAccounts = accounts.filter((a) => a.balance > 0);

  const [accountId, setAccountId] = useState(eligibleAccounts[0]?.id ?? "");
  const account = eligibleAccounts.find((a) => a.id === accountId) ?? null;

  const [method, setMethod] = useState<WithdrawalMethod | "">("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [network, setNetwork] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [holderName, setHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [swiftBic, setSwiftBic] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      setError(t("selectAccountError"));
      return;
    }
    if (!method) {
      setError(t("selectMethodError"));
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError(t("amountRequiredError"));
      return;
    }
    // Compare in whole cents — account.balance accumulates via repeated
    // float addition (rebate credits) and can drift by fractions of a cent,
    // which would otherwise reject an amount that looks identical to the
    // displayed 2-decimal balance.
    if (Math.round(amountNum * 100) > Math.round(account.balance * 100)) {
      setError(t("amountExceedsBalance"));
      return;
    }

    let destination_details: WithdrawalDestinationDetails = {};
    if (method === "crypto") {
      if (!currency.trim() || !network.trim() || !walletAddress.trim()) {
        setError(t("cryptoFieldsRequired"));
        return;
      }
      destination_details = { currency: currency.trim(), network: network.trim(), wallet_address: walletAddress.trim() };
    } else if (method === "bank_wire") {
      if (!holderName.trim() || !bankName.trim() || !accountNumber.trim() || !swiftBic.trim()) {
        setError(t("bankFieldsRequired"));
        return;
      }
      destination_details = {
        holder_name: holderName.trim(),
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        swift_bic: swiftBic.trim(),
      };
    }

    setError("");
    setSaving(true);
    try {
      await withdrawalRequestsApi.create({
        mt5_account_id: account.id,
        amount: amountNum,
        method,
        destination_details,
      });
      setDone(true);
      onSubmitted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("submitFailed"));
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

        {done ? (
          <div className={styles.modalForm}>
            <p className={styles.success}>{t("success")}</p>
            <button className={styles.submitBtn} type="button" onClick={onClose}>
              {t("closeBtn")}
            </button>
          </div>
        ) : eligibleAccounts.length === 0 ? (
          <div className={styles.modalForm}>
            <p className={styles.fieldHint}>{t("noEligibleAccounts")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.modalForm}>
            <div className={styles.field}>
              <label className={styles.label}>{t("account")}</label>
              <select
                className={styles.select}
                value={accountId}
                onChange={(e) => {
                  setAccountId(e.target.value);
                  setMethod("");
                }}
                required
              >
                {eligibleAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {t("accountOption", { broker: a.broker_name, mt5Number: a.mt5_number, balance: a.balance.toFixed(2) })}
                  </option>
                ))}
              </select>
            </div>

            {account && account.withdrawal_methods.length === 0 ? (
              <p className={styles.fieldHint}>{t("noMethodsForBroker")}</p>
            ) : (
              <>
                <div className={styles.field}>
                  <label className={styles.label}>{t("method")}</label>
                  <select
                    className={styles.select}
                    value={method}
                    onChange={(e) => setMethod(e.target.value as WithdrawalMethod)}
                    required
                  >
                    <option value="" disabled>
                      {t("selectMethod")}
                    </option>
                    {WITHDRAWAL_METHODS.filter((m) => account?.withdrawal_methods.includes(m)).map((m) => (
                      <option key={m} value={m}>
                        {t(`method_${m}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>{t("amount")}</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t("amountPlaceholder")}
                    required
                  />
                  {account && (
                    <p className={styles.fieldHint}>
                      {t("availableForAccount", { amount: account.balance.toFixed(2) })}{" "}
                      <button
                        type="button"
                        className={styles.maxBtn}
                        onClick={() => setAmount(account.balance.toFixed(2))}
                      >
                        {t("useMax")}
                      </button>
                    </p>
                  )}
                </div>
              </>
            )}

            {method === "crypto" && (
              <>
                <div className={styles.field}>
                  <label className={styles.label}>{t("currency")}</label>
                  <input
                    className={styles.input}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder={t("currencyPlaceholder")}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("network")}</label>
                  <input
                    className={styles.input}
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    placeholder={t("networkPlaceholder")}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("walletAddress")}</label>
                  <input
                    className={styles.input}
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {method === "bank_wire" && (
              <>
                <div className={styles.field}>
                  <label className={styles.label}>{t("holderName")}</label>
                  <input
                    className={styles.input}
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("bankName")}</label>
                  <input
                    className={styles.input}
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("accountNumber")}</label>
                  <input
                    className={styles.input}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("swiftBic")}</label>
                  <input
                    className={styles.input}
                    value={swiftBic}
                    onChange={(e) => setSwiftBic(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {method === "fund_mt5" && <p className={styles.fieldHint}>{t("fundMt5Note")}</p>}

            {error && <p className={styles.errorMsg}>{error}</p>}

            {(!account || account.withdrawal_methods.length > 0) && (
              <button className={styles.submitBtn} type="submit" disabled={saving}>
                {saving ? t("submitting") : t("submitBtn")}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default function AccountPage() {
  const t = useTranslations("account");
  const tNav = useTranslations("nav");
  const tRoles = useTranslations("account.roles");
  const tShared = useTranslations("cashback");
  const locale = useLocale();
  const roleLabel = (role: string) =>
    (KNOWN_ROLES as readonly string[]).includes(role) ? tRoles(role as (typeof KNOWN_ROLES)[number]) : role;
  const { user, loading, refreshUser } = useAuth();
  const { openLoginModal } = useLoginModal();

  const [activeTab, setActiveTab] = useState<(typeof TAB_KEYS)[number]>("personal");

  const [name, setName] = useState(user?.name ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    Promise.all([mt5AccountsApi.listMine(), mt5AccountsApi.listTransactions(), withdrawalRequestsApi.listMine()])
      .then(([accts, txs, withdrawalReqs]) => {
        setAccounts(accts);
        setTransactions(txs);
        setWithdrawals(withdrawalReqs);
      })
      .catch((e: unknown) => setDataError(e instanceof Error ? e.message : tShared("loadFailed")))
      .finally(() => setDataLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  if (loading) return null;

  if (!user) {
    return (
      <div className={styles.signedOut}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
        <p className={styles.signedOutText}>{t("signInPrompt")}</p>
        <button className={styles.signInBtn} onClick={openLoginModal}>
          {tNav("signIn")}
        </button>
      </div>
    );
  }

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(t("nameEmptyError"));
      return;
    }
    setNameError("");
    setNameSaved(false);
    setNameSaving(true);
    try {
      await usersApi.updateMe({ name: name.trim() });
      await refreshUser();
      setNameSaved(true);
    } catch (e: unknown) {
      setNameError(e instanceof Error ? e.message : t("nameUpdateFailed"));
    } finally {
      setNameSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError(t("passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("passwordMismatch"));
      return;
    }
    setPasswordError("");
    setPasswordSaved(false);
    setPasswordSaving(true);
    try {
      await usersApi.updateMe({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
    } catch (e: unknown) {
      setPasswordError(e instanceof Error ? e.message : t("passwordUpdateFailed"));
    } finally {
      setPasswordSaving(false);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric" });

  const actualTotal = accounts.reduce((sum, a) => sum + a.balance, 0);
  const estimateTotal = accounts.reduce((sum, a) => sum + a.pending_expected_amount, 0);
  const lifetimeTotal = accounts.reduce((sum, a) => sum + a.lifetime_earned, 0);

  // A single chronological feed instead of two separate lists — an approved
  // withdrawal is dropped here because it already has its own WalletTransaction
  // debit row (created at approval time, see backend/app/services/withdrawal.py),
  // so including both would show the same withdrawal twice.
  type HistoryEntry =
    | { kind: "transaction"; date: string; tx: WalletTransaction }
    | { kind: "withdrawal"; date: string; withdrawal: WithdrawalRequest };
  const historyFeed: HistoryEntry[] = [
    ...transactions.map((tx): HistoryEntry => ({ kind: "transaction", date: tx.created_at, tx })),
    ...withdrawals
      .filter((w) => w.status !== "approved")
      .map((w): HistoryEntry => ({ kind: "withdrawal", date: w.created_at, withdrawal: w })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleRemoveAccount = async (account: MT5Account) => {
    if (!confirm(t("manage.removeConfirm", { broker: account.broker_name, mt5Number: account.mt5_number }))) return;
    setRemovingId(account.id);
    try {
      await mt5AccountsApi.remove(account.id);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("manage.removeFailed"));
    } finally {
      setRemovingId(null);
    }
  };

  const handleReconnectAccount = async (account: MT5Account) => {
    setReconnectingId(account.id);
    try {
      const updated = await mt5AccountsApi.reconnect(account.id);
      setAccounts((prev) => prev.map((a) => (a.id === account.id ? updated : a)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("manage.reconnectFailed"));
    } finally {
      setReconnectingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
        <p className={styles.pageSubtitle}>{t("subtitle")}</p>
      </div>

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

      {activeTab === "personal" && (
        <div className={styles.narrowSection}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t("personalInfo")}</h2>

            <div className={styles.field}>
              <label className={styles.label}>{t("email")}</label>
              <input className={styles.input} value={user.email} disabled readOnly />
              <span className={styles.hint}>{t("emailHint")}</span>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("accountType")}</label>
              <input className={styles.input} value={roleLabel(user.role)} disabled readOnly />
            </div>

            <form onSubmit={handleNameSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="name">
                  {t("name")}
                </label>
                <input
                  id="name"
                  className={styles.input}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameSaved(false);
                  }}
                  placeholder={t("namePlaceholder")}
                />
              </div>

              {nameError && <p className={styles.error}>{nameError}</p>}
              {nameSaved && <p className={styles.success}>{t("saved")}</p>}

              <button className={styles.submitBtn} type="submit" disabled={nameSaving}>
                {nameSaving ? t("saving") : t("saveChanges")}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className={styles.narrowSection}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t("security")}</h2>

            <form onSubmit={handlePasswordSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="currentPassword">
                  {t("currentPassword")}
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  className={styles.input}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="newPassword">
                  {t("newPassword")}
                </label>
                <input
                  id="newPassword"
                  type="password"
                  className={styles.input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="confirmPassword">
                  {t("confirmNewPassword")}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className={styles.input}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {passwordError && <p className={styles.error}>{passwordError}</p>}
              {passwordSaved && <p className={styles.success}>{t("passwordUpdated")}</p>}

              <button className={styles.submitBtn} type="submit" disabled={passwordSaving}>
                {passwordSaving ? t("saving") : t("updatePassword")}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "wallet" && (
        <>
          <div className={styles.manageHeader}>
            <p className={styles.sectionSubtitle}>{t("wallet.subtitle")}</p>
            <button className={styles.addAccountBtn} onClick={() => setShowWithdraw(true)}>
              {tShared("withdraw")}
            </button>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <div className={styles.statValue}>${actualTotal.toFixed(2)}</div>
              <div className={styles.statLabel}>{t("wallet.statActual")}</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>${estimateTotal.toFixed(2)}</div>
              <div className={styles.statLabel}>{t("wallet.statEstimate")}</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>${lifetimeTotal.toFixed(2)}</div>
              <div className={styles.statLabel}>{t("wallet.statLifetime")}</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{accounts.length}</div>
              <div className={styles.statLabel}>{t("wallet.statAccounts")}</div>
            </div>
          </div>

          {dataError && <p className={styles.errorMsg}>{dataError}</p>}

          <div className={styles.list}>
            {dataLoading ? (
              <div className={styles.empty}>{tShared("loading")}</div>
            ) : accounts.length === 0 ? (
              <div className={styles.empty}>{tShared("noAccounts")}</div>
            ) : (
              accounts.map((a) => (
                <div key={a.id} className={styles.walletRow}>
                  <div className={styles.rowLeft}>
                    {a.broker_img_src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.broker_img_src} alt="" className={styles.accountAvatarImg} />
                    ) : (
                      <div className={styles.accountAvatar}>{initials(a.broker_name)}</div>
                    )}
                    <div>
                      <div className={styles.brokerName}>{a.broker_name}</div>
                      <div className={styles.payoutDate}>
                        MT5 #{a.mt5_number} · {tShared("lifetimeSuffix", { amount: `$${a.lifetime_earned.toFixed(2)}` })}
                      </div>
                    </div>
                  </div>
                  <div className={styles.walletSplit}>
                    <div className={styles.walletFigure}>
                      <div className={styles.amount}>${a.balance.toFixed(2)}</div>
                      <div className={styles.walletFigureLabel}>{t("wallet.actualLabel")}</div>
                    </div>
                    <div className={`${styles.walletFigure} ${styles.walletEstimateFigure}`}>
                      <div className={styles.estimateAmount}>${a.pending_expected_amount.toFixed(2)}</div>
                      <div className={styles.walletFigureLabel}>{t("wallet.estimateLabel")}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {accounts.length > 0 && <p className={styles.estimateHint}>{t("wallet.estimateHint")}</p>}
        </>
      )}

      {activeTab === "history" && (
        <>
          <p className={styles.sectionSubtitle}>{t("history.subtitle")}</p>

          <div className={styles.list}>
            {dataLoading ? (
              <div className={styles.empty}>{tShared("loading")}</div>
            ) : historyFeed.length === 0 ? (
              <div className={styles.empty}>{tShared("noTransactions")}</div>
            ) : (
              historyFeed.map((entry) =>
                entry.kind === "transaction" ? (
                  <div key={entry.tx.id} className={styles.row}>
                    <div className={styles.rowLeft}>
                      <div>
                        <div className={styles.brokerName}>
                          {MOCK_DESCRIPTION_KEY[entry.tx.description]
                            ? tShared(`transactions.${MOCK_DESCRIPTION_KEY[entry.tx.description]}`)
                            : entry.tx.description}
                        </div>
                        <div className={styles.payoutDate}>
                          {entry.tx.broker_name} · MT5 #{entry.tx.mt5_number} · {formatDate(entry.tx.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className={styles.rowRight}>
                      <div className={`${styles.txAmount} ${entry.tx.type === "credit" ? styles.credit : styles.debit}`}>
                        {entry.tx.type === "credit" ? "+" : "−"} ${entry.tx.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={entry.withdrawal.id} className={styles.row}>
                    <div className={styles.rowLeft}>
                      <div>
                        <div className={styles.brokerName}>
                          {tShared(`withdrawModal.method_${entry.withdrawal.method}`)}
                        </div>
                        <div className={styles.payoutDate}>
                          {entry.withdrawal.broker_name} · MT5 #{entry.withdrawal.mt5_number} · {formatDate(entry.withdrawal.created_at)}
                        </div>
                        {entry.withdrawal.status === "rejected" && entry.withdrawal.admin_note && (
                          <div className={styles.rejectionReason}>
                            {t("history.rejectionReason", { reason: entry.withdrawal.admin_note })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.rowRight}>
                      <div className={`${styles.txAmount} ${styles.debit}`}>− ${entry.withdrawal.amount.toFixed(2)}</div>
                      <div className={styles.payoutDate}>{t(`history.withdrawalStatus.${entry.withdrawal.status}`)}</div>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </>
      )}

      {activeTab === "manage" && (
        <>
          <BrokerCashbackStrip />

          <div className={styles.manageHeader}>
            <p className={styles.sectionSubtitle}>{t("manage.subtitle")}</p>
            <button className={styles.addAccountBtn} onClick={() => setShowAdd(true)}>
              {tShared("addAccount")}
            </button>
          </div>

          {dataError && <p className={styles.errorMsg}>{dataError}</p>}

          <div className={styles.list}>
            {dataLoading ? (
              <div className={styles.empty}>{tShared("loading")}</div>
            ) : accounts.length === 0 ? (
              <div className={styles.empty}>{tShared("noAccounts")}</div>
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
                  <div className={styles.manageRowRight}>
                    <span className={styles.statusBadge}>{a.metaapi_connection_status}</span>
                    {BROKEN_LINK_STATUSES.has(a.metaapi_connection_status) && (
                      <button
                        className={styles.reconnectBtn}
                        disabled={reconnectingId === a.id}
                        onClick={() => handleReconnectAccount(a)}
                      >
                        {reconnectingId === a.id ? t("manage.reconnecting") : t("manage.reconnect")}
                      </button>
                    )}
                    {BROKEN_LINK_STATUSES.has(a.metaapi_connection_status) && a.lifetime_earned === 0 && (
                      <button
                        className={styles.removeBtn}
                        disabled={removingId === a.id}
                        onClick={() => handleRemoveAccount(a)}
                      >
                        {removingId === a.id ? t("manage.removing") : t("manage.remove")}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {showAdd && (
        <AddAccountModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            fetchData();
          }}
        />
      )}

      {showWithdraw && (
        <WithdrawModal
          accounts={accounts}
          onClose={() => setShowWithdraw(false)}
          onSubmitted={fetchData}
        />
      )}
    </div>
  );
}
