"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysAgoISO(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

// Shown to signed-out visitors so the page isn't just an empty prompt — the
// same layout renders this instead of real data, with a banner explaining
// it's an example.
const MOCK_ACCOUNTS: MT5Account[] = [
  {
    id: "mock-1", broker_id: "mock-ic", broker_name: "IC Markets", broker_img_src: null,
    mt5_number: "50219384", balance: 128.40, lifetime_earned: 512.90, created_at: daysAgoISO(120),
  },
  {
    id: "mock-2", broker_id: "mock-xm", broker_name: "XM Global", broker_img_src: null,
    mt5_number: "88213765", balance: 54.10, lifetime_earned: 289.20, created_at: daysAgoISO(90),
  },
  {
    id: "mock-3", broker_id: "mock-pep", broker_name: "Pepperstone", broker_img_src: null,
    mt5_number: "91345612", balance: 76.90, lifetime_earned: 198.50, created_at: daysAgoISO(60),
  },
];

const MOCK_TRANSACTIONS: WalletTransaction[] = [
  { id: "mock-t1", mt5_account_id: "mock-1", broker_name: "IC Markets", mt5_number: "50219384", type: "credit", amount: 45.20, description: "Cashback rebate", created_at: daysAgoISO(2) },
  { id: "mock-t2", mt5_account_id: "mock-2", broker_name: "XM Global", mt5_number: "88213765", type: "debit", amount: 25.00, description: "Withdrawal to Skrill", created_at: daysAgoISO(5) },
  { id: "mock-t3", mt5_account_id: "mock-3", broker_name: "Pepperstone", mt5_number: "91345612", type: "credit", amount: 76.90, description: "Cashback rebate", created_at: daysAgoISO(9) },
  { id: "mock-t4", mt5_account_id: "mock-1", broker_name: "IC Markets", mt5_number: "50219384", type: "credit", amount: 38.90, description: "Cashback rebate", created_at: daysAgoISO(16) },
  { id: "mock-t5", mt5_account_id: "mock-1", broker_name: "IC Markets", mt5_number: "50219384", type: "debit", amount: 60.00, description: "Withdrawal to bank account", created_at: daysAgoISO(30) },
];

function AddAccountModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [brokers, setBrokers] = useState<PublicBroker[]>([]);
  const [brokersLoading, setBrokersLoading] = useState(true);
  const [brokerId, setBrokerId] = useState("");
  const [mt5Number, setMt5Number] = useState("");
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
      setError("Please select a broker");
      return;
    }
    if (!mt5Number.trim()) {
      setError("MT5 account number is required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await mt5AccountsApi.create({ broker_id: brokerId, mt5_number: mt5Number.trim() });
      onAdded();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Add MT5 Account</h3>
          <button onClick={onClose} className={styles.modalClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.field}>
            <label className={styles.label}>Broker</label>
            <select
              className={styles.select}
              value={brokerId}
              onChange={(e) => setBrokerId(e.target.value)}
              disabled={brokersLoading || brokers.length === 0}
              required
            >
              <option value="" disabled>
                {brokersLoading ? "Loading brokers…" : "Select a broker…"}
              </option>
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.cashback_rate}% cashback
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>MT5 Account Number</label>
            <input
              className={styles.input}
              value={mt5Number}
              onChange={(e) => setMt5Number(e.target.value)}
              placeholder="e.g. 50219384"
              required
            />
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={saving}>
            {saving ? "Adding…" : "Add account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CashbackPage() {
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
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load accounts"))
      .finally(() => setDataLoading(false));
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
        <h1 className={styles.pageTitle}>Cashback</h1>
      </div>

      {isPreview && (
        <div className={styles.previewBanner}>
          <span>You&apos;re viewing example data.</span>
          <button className={styles.previewSignInBtn} onClick={openLoginModal}>
            Sign in to see your real accounts
          </button>
        </div>
      )}

      {/* Balance card */}
      <div className={styles.balanceCard}>
        <div className={styles.balanceLabel}>
          <span className={styles.balanceIcon}>💳</span>
          Available balance
        </div>
        <div className={styles.balanceAmount}>${available.toFixed(2)}</div>
        <div className={styles.lifetimeLabel}>≈ ${lifetime.toFixed(2)} lifetime earned</div>

        <div className={styles.balanceActions}>
          <button
            className={styles.withdrawBtn}
            onClick={isPreview ? openLoginModal : () => setShowWithdraw(true)}
          >
            ↓ Withdraw
          </button>
          <button
            className={styles.addAccountBtn}
            onClick={isPreview ? openLoginModal : () => setShowAdd(true)}
          >
            + Add MT5 account
          </button>
        </div>
      </div>

      {/* Withdraw modal */}
      {showWithdraw && (
        <div className={styles.modalOverlay} onClick={() => setShowWithdraw(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Withdraw Cashback</h3>
              <button onClick={() => setShowWithdraw(false)} className={styles.modalClose}>
                ✕
              </button>
            </div>
            <p className={styles.modalText}>Withdrawals aren&apos;t available yet — check back soon.</p>
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
          <div className={styles.statLabel}>Available</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>${lifetime.toFixed(2)}</div>
          <div className={styles.statLabel}>Lifetime earned</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{brokerCount}</div>
          <div className={styles.statLabel}>Brokers connected</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{accounts.length}</div>
          <div className={styles.statLabel}>MT5 accounts</div>
        </div>
      </div>

      {/* Accounts */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>YOUR MT5 ACCOUNTS</div>
        {error && <p className={styles.errorMsg}>{error}</p>}
        <div className={styles.list}>
          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : accounts.length === 0 ? (
            <div className={styles.empty}>No MT5 accounts linked yet.</div>
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
                  <div className={styles.payoutDate}>${a.lifetime_earned.toFixed(2)} lifetime</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* History — money in / money out */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>HISTORY</div>
        <div className={styles.list}>
          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : transactions.length === 0 ? (
            <div className={styles.empty}>No transactions yet.</div>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className={styles.row}>
                <div className={styles.rowLeft}>
                  <div>
                    <div className={styles.brokerName}>{t.description}</div>
                    <div className={styles.payoutDate}>
                      {t.broker_name} · MT5 #{t.mt5_number} · {formatDate(t.created_at)}
                    </div>
                  </div>
                </div>
                <div className={styles.rowRight}>
                  <div
                    className={`${styles.txAmount} ${t.type === "credit" ? styles.credit : styles.debit}`}
                  >
                    {t.type === "credit" ? "+" : "−"} ${t.amount.toFixed(2)}
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
