"use client";
import { useState } from "react";
import Link from "next/link";
import styles from "./cashback.module.scss";

const PAYOUTS = [
  {
    broker: "IC Markets",
    date: "Today · 09:21",
    amount: "$128.40",
    status: "Paid",
    statusKey: "paid",
  },
  {
    broker: "XM Global",
    date: "Yesterday",
    amount: "$54.10",
    status: "Paid",
    statusKey: "paid",
  },
  {
    broker: "Exness",
    date: "May 14",
    amount: "$76.90",
    status: "Pending",
    statusKey: "pending",
  },
  {
    broker: "FBS",
    date: "May 10",
    amount: "$42.00",
    status: "Paid",
    statusKey: "paid",
  },
  {
    broker: "Pepperstone",
    date: "May 3",
    amount: "$91.20",
    status: "Paid",
    statusKey: "paid",
  },
];

const AVAILABLE = 301.4;
const LIFETIME = 1204.6;

export default function CashbackPage() {
  const [showWithdraw, setShowWithdraw] = useState(false);

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Cashback</h1>
      </div>

      {/* Balance card */}
      <div className={styles.balanceCard}>
        <div className={styles.balanceLabel}>
          <span className={styles.balanceIcon}>💳</span>
          Available balance
        </div>
        <div className={styles.balanceAmount}>${AVAILABLE.toFixed(2)}</div>
        <div className={styles.lifetimeLabel}>
          ≈ ${LIFETIME.toFixed(2)} lifetime earned
        </div>

        <div className={styles.balanceActions}>
          <button
            className={styles.withdrawBtn}
            onClick={() => setShowWithdraw(true)}
          >
            ↓ Withdraw
          </button>
          <Link href="/login" className={styles.historyBtn}>
            Full history →
          </Link>
        </div>
      </div>

      {/* Withdraw modal */}
      {showWithdraw && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowWithdraw(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Withdraw Cashback</h3>
              <button
                onClick={() => setShowWithdraw(false)}
                className={styles.modalClose}
              >
                ✕
              </button>
            </div>
            <p className={styles.modalText}>
              Sign in to withdraw your <strong>${AVAILABLE.toFixed(2)}</strong>{" "}
              balance to your broker account or wallet.
            </p>
            <Link href="/login" className={styles.modalCta}>
              Sign in to withdraw →
            </Link>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <div className={styles.statValue}>$301.40</div>
          <div className={styles.statLabel}>Available</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>$1,204.60</div>
          <div className={styles.statLabel}>Lifetime earned</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>5</div>
          <div className={styles.statLabel}>Brokers connected</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>$218.30</div>
          <div className={styles.statLabel}>This month</div>
        </div>
      </div>

      {/* Recent payouts */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>RECENT PAYOUTS</div>
        <div className={styles.list}>
          {PAYOUTS.map((p, i) => (
            <div key={i} className={styles.row}>
              <div className={styles.rowLeft}>
                <div className={`${styles.statusDot} ${styles[p.statusKey]}`} />
                <div>
                  <div className={styles.brokerName}>{p.broker}</div>
                  <div className={styles.payoutDate}>{p.date}</div>
                </div>
              </div>
              <div className={styles.rowRight}>
                <div className={styles.amount}>{p.amount}</div>
                <div className={`${styles.status} ${styles[p.statusKey]}`}>
                  {p.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
