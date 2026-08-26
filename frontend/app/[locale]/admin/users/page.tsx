"use client";
import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/helpers/api";
import { REGION_LABELS } from "@/helpers/regions";
import Card from "@/components/Card";
import styles from "./Users.module.scss";

interface User {
  email: string;
  name: string | null;
  role: string;
  region: string | null;
  created_at: string;
}

const ROLES = ["super_admin", "editor", "broker"] as const;

export default function UsersPage() {
  const t = useTranslations("adminUsers");
  const tRoles = useTranslations("admin.roles");
  const locale = useLocale();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "broker",
  });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    api
      .get<User[]>("/users/")
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (email: string, role: string) => {
    setUpdating(email);
    try {
      const updated = await api.patch<User>(
        `/users/${encodeURIComponent(email)}/role`,
        { role },
      );
      setUsers((prev) => prev.map((u) => (u.email === email ? updated : u)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("updateRoleFailed"));
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(t("deleteConfirm", { email }))) return;
    try {
      await api.delete(`/users/${encodeURIComponent(email)}`);
      setUsers((prev) => prev.filter((u) => u.email !== email));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("deleteFailed"));
    }
  };

  const handleRegeneratePassword = async (email: string) => {
    if (!confirm(t("regenerateConfirm", { email }))) return;
    setUpdating(email);
    try {
      await api.post(`/users/${encodeURIComponent(email)}/regenerate-password`, {});
      alert(t("regenerateSuccess", { email }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("regenerateFailed"));
    } finally {
      setUpdating(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      await api.post("/users/", newUser);
      setShowForm(false);
      setNewUser({ name: "", email: "", password: "", role: "broker" });
      fetchUsers();
    } catch (ex: unknown) {
      setCreateError(ex instanceof Error ? ex.message : t("createFailed"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <button
          className={styles.addBtn}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? t("cancel") : t("addUser")}
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>{t("createNewUser")}</h3>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t("fullName")}</label>
                <input
                  className={styles.input}
                  placeholder={t("fullNamePlaceholder")}
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser((v) => ({ ...v, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("email")}</label>
                <input
                  className={styles.input}
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser((v) => ({ ...v, email: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t("password")}</label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((v) => ({ ...v, password: e.target.value }))
                  }
                  title={t("passwordHint")}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("role")}</label>
                <select
                  className={styles.input}
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser((v) => ({ ...v, role: e.target.value }))
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {tRoles(r)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {createError && <p className={styles.error}>{createError}</p>}
            <button
              className={styles.submitBtn}
              type="submit"
              disabled={creating}
            >
              {creating ? t("creating") : t("createUser")}
            </button>
          </form>
        </Card>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <Card className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("email")}</th>
                <th>{t("role")}</th>
                <th>{t("region")}</th>
                <th>{t("joined")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    {t("loading")}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    {t("noUsers")}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.email}>
                    <td>{u.name || "—"}</td>
                    <td className={styles.email}>{u.email}</td>
                    <td>
                      <select
                        className={styles.roleSelect}
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u.email, e.target.value)
                        }
                        disabled={updating === u.email}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {tRoles(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={styles.region}>
                      {u.region ? REGION_LABELS[u.region] || u.region : "—"}
                    </td>
                    <td className={styles.date}>
                      {new Date(u.created_at).toLocaleDateString(locale, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className={styles.actions}>
                      <button
                        className={styles.regenerateBtn}
                        onClick={() => handleRegeneratePassword(u.email)}
                        disabled={updating === u.email}
                      >
                        {t("regeneratePassword")}
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(u.email)}
                      >
                        {t("delete")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
