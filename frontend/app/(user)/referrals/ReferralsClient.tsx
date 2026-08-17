"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import { referralsApi, type ReferralStats } from "@/helpers/api";
import ReferralStatsPanel from "@/components/ReferralStatsPanel";
import styles from "./referrals.module.scss";

export default function ReferralsClient() {
  const { user, loading } = useAuth();
  const { openLoginModal } = useLoginModal();

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "client") {
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    Promise.all([referralsApi.me(), referralsApi.myStats()])
      .then(([info, s]) => {
        setReferralCode(info.referral_code);
        setStats(s);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load referral data"))
      .finally(() => setStatsLoading(false));
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <div className={styles.signedOut}>
        <h1 className={styles.pageTitle}>Referrals</h1>
        <p className={styles.signedOutText}>Sign in to view your referral stats.</p>
        <button className={styles.signInBtn} onClick={openLoginModal}>
          Sign in
        </button>
      </div>
    );
  }

  if (user.role !== "client") {
    return (
      <div className={styles.signedOut}>
        <h1 className={styles.pageTitle}>Referrals</h1>
        <p className={styles.signedOutText}>
          Referral tracking is available for client accounts. Contact an admin if you believe you should have access.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Referrals</h1>
        <p className={styles.pageSubtitle}>Track the people who joined CBFX through your referral link.</p>
      </div>

      <ReferralStatsPanel referralCode={referralCode} stats={stats} loading={statsLoading} error={error} />
    </div>
  );
}
