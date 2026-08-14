"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import { usersApi } from "@/helpers/api";
import styles from "./account.module.scss";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  broker: "Broker",
  user: "Member",
};

export default function AccountPage() {
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
        <h1 className={styles.pageTitle}>Account</h1>
        <p className={styles.signedOutText}>Sign in to view and edit your account.</p>
        <button className={styles.signInBtn} onClick={openLoginModal}>
          Sign in
        </button>
      </div>
    );
  }

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Name cannot be empty");
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
      setNameError(e instanceof Error ? e.message : "Failed to update name");
    } finally {
      setNameSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match");
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
      setPasswordError(e instanceof Error ? e.message : "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Account</h1>
        <p className={styles.pageSubtitle}>Manage your profile and password.</p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Personal Info</h2>

        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input className={styles.input} value={user.email} disabled readOnly />
          <span className={styles.hint}>Email is your account identity and can&apos;t be changed.</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Account Type</label>
          <input className={styles.input} value={roleLabels[user.role] ?? user.role} disabled readOnly />
        </div>

        <form onSubmit={handleNameSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              Name
            </label>
            <input
              id="name"
              className={styles.input}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameSaved(false);
              }}
              placeholder="Your name"
            />
          </div>

          {nameError && <p className={styles.error}>{nameError}</p>}
          {nameSaved && <p className={styles.success}>Saved.</p>}

          <button className={styles.submitBtn} type="submit" disabled={nameSaving}>
            {nameSaving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Security</h2>

        <form onSubmit={handlePasswordSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="currentPassword">
              Current Password
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
              New Password
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
              Confirm New Password
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
          {passwordSaved && <p className={styles.success}>Password updated.</p>}

          <button className={styles.submitBtn} type="submit" disabled={passwordSaving}>
            {passwordSaving ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
