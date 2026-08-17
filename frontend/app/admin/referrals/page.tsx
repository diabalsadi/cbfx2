"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { referralsApi, type ReferralStats } from "@/helpers/api";
import ReferralStatsPanel from "@/components/ReferralStatsPanel";
import styles from "./AdminReferrals.module.scss";

export default function AdminReferralsPage() {
  const { user } = useAuth();

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "client") {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([referralsApi.me(), referralsApi.myStats()])
      .then(([info, s]) => {
        setReferralCode(info.referral_code);
        setStats(s);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load referral data"))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || user.role !== "client") {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Referrals</h2>
        <p className={styles.notice}>This view is only available for client accounts.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div>
        <h2 className={styles.title}>Referrals</h2>
        <p className={styles.subtitle}>Track the people who joined CBFX through your referral link.</p>
      </div>

      <ReferralStatsPanel referralCode={referralCode} stats={stats} loading={loading} error={error} />
    </div>
  );
}
