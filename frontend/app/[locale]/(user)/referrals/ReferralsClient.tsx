"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import { referralsApi, type ReferralStats } from "@/helpers/api";
import ReferralStatsPanel from "@/components/ReferralStatsPanel";
import styles from "./referrals.module.scss";

export default function ReferralsClient() {
  const t = useTranslations("referrals");
  const tNav = useTranslations("nav");
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
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => setStatsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  if (user.role !== "client") {
    return (
      <div className={styles.signedOut}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
        <p className={styles.signedOutText}>{t("notClientMessage")}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
        <p className={styles.pageSubtitle}>{t("subtitle")}</p>
      </div>

      <ReferralStatsPanel referralCode={referralCode} stats={stats} loading={statsLoading} error={error} />
    </div>
  );
}
