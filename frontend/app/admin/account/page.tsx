"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usersApi } from "@/helpers/api";
import Card from "@/components/Card";
import styles from "./AccountAdmin.module.scss";

import IdentityCardIcon from "@/assets/icons/identityCard.svg";
import SecurityIcon from "@/assets/icons/security.svg";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  broker: "Broker",
};

const TABS = [
  {
    title: "Personal Info",
    icon: <IdentityCardIcon />,
    description: "Update your display name. Your email can't be changed.",
  },
  {
    title: "Security",
    icon: <SecurityIcon />,
    description: "Change your password.",
  },
];

const AccountAdmin = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

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
    <div className={styles.container}>
      <div className={styles.formType}>
        {TABS.map((tab, index) => (
          <Card
            className={styles.formTypeCard}
            isActive={activeTab === index}
            isHoverable={true}
            key={index}
            onClick={() => setActiveTab(index)}
          >
            <div className={styles.cardContent}>
              <div className={styles.iconWrapper}>{tab.icon}</div>
              <div className={styles.textWrapper}>
                <h3>{tab.title}</h3>
                <p>{tab.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className={styles.formContainer} key={activeTab}>
        {activeTab === 0 && (
          <Card className={styles.formCard}>
            <h3 className={styles.formTitle}>Personal Info</h3>

            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input className={styles.input} value={user?.email ?? ""} disabled readOnly />
              <span className={styles.hint}>Email is your account identity and can&apos;t be changed.</span>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Role</label>
              <input className={styles.input} value={roleLabels[user?.role ?? ""] ?? user?.role ?? ""} disabled readOnly />
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
          </Card>
        )}

        {activeTab === 1 && (
          <Card className={styles.formCard}>
            <h3 className={styles.formTitle}>Security</h3>

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
          </Card>
        )}
      </div>
    </div>
  );
};

export default AccountAdmin;
