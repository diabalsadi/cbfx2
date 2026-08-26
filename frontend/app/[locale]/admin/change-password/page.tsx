"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/helpers/api";
import styles from "../login/Login.module.scss";

export default function ChangePasswordPage() {
  const t = useTranslations("adminAuth");
  const tAuth = useTranslations("auth");
  const tForgot = useTranslations("forgotPassword");
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError(t("passwordsDontMatch"));
      return;
    }
    setLoading(true);
    try {
      await api.patch("/users/me", { current_password: currentPassword, new_password: newPassword });
      await refreshUser();
      router.replace("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoArea}>
          <div className={styles.logoMark}>CB</div>
          <span className={styles.logoText}>CBFX</span>
        </div>

        <h1 className={styles.title}>{t("setNewPasswordTitle")}</h1>
        <p className={styles.subtitle}>
          {user?.email ? t("adminRegeneratedPrefix", { email: user.email }) : ""}
          {t("enterTempPassword")}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>{t("tempPassword")}</label>
            <input
              className={styles.input}
              type="password"
              placeholder={t("tempPasswordPlaceholder")}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("newPassword")}</label>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <span className={styles.hint}>{tAuth("passwordHint")}</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{tForgot("confirmNewPassword")}</label>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? t("updating") : t("setNewPasswordBtn")}
          </button>
        </form>

        <button
          type="button"
          onClick={logout}
          className={styles.link}
          style={{ background: "none", border: "none", cursor: "pointer", marginTop: "16px" }}
        >
          {t("signOutInstead")}
        </button>
      </div>
    </div>
  );
}
