"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import { usersApi } from "@/helpers/api";
import styles from "./account.module.scss";

const KNOWN_ROLES = ["super_admin", "editor", "broker", "user"] as const;

export default function AccountPage() {
  const t = useTranslations("account");
  const tNav = useTranslations("nav");
  const tRoles = useTranslations("account.roles");
  const roleLabel = (role: string) =>
    (KNOWN_ROLES as readonly string[]).includes(role) ? tRoles(role as (typeof KNOWN_ROLES)[number]) : role;
  const { user, loading, refreshUser } = useAuth();
  const { openLoginModal } = useLoginModal();

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

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
        <p className={styles.pageSubtitle}>{t("subtitle")}</p>
      </div>

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
  );
}
