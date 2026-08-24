"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/helpers/api";
import styles from "../login/Login.module.scss";

export default function ChangePasswordPage() {
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
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await api.patch("/users/me", { current_password: currentPassword, new_password: newPassword });
      await refreshUser();
      router.replace("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't update password");
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

        <h1 className={styles.title}>Set a new password</h1>
        <p className={styles.subtitle}>
          {user?.email ? `An administrator regenerated the password for ${user.email}. ` : ""}
          Enter the temporary password you were emailed, then choose your own.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Temporary password</label>
            <input
              className={styles.input}
              type="password"
              placeholder="From your email"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>New password</label>
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
            <span className={styles.hint}>
              At least 8 characters, with uppercase, lowercase, a number, and a special character.
            </span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Confirm new password</label>
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
            {loading ? "Updating…" : "Set new password"}
          </button>
        </form>

        <button
          type="button"
          onClick={logout}
          className={styles.link}
          style={{ background: "none", border: "none", cursor: "pointer", marginTop: "16px" }}
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
}
