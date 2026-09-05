"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/helpers/api";
import { REGION_LABELS } from "@/helpers/regions";
import { generatePassword } from "@/helpers/generatePassword";
import Card from "@/components/Card";
import styles from "./Users.module.scss";

interface User {
  email: string;
  name: string | null;
  role: string;
  region: string | null;
  created_at: string;
}

interface BrokerSummary {
  id: string;
  name: string;
  owner_email: string | null;
}

// Offered when *creating* a user here — "client" (affiliate) accounts are
// created via the Referral Clients admin page instead.
const ROLES = ["super_admin", "editor", "broker"] as const;

// Every role this page displays/edits — broader than ROLES because "client"
// accounts also have (scoped) admin-portal access (see helpers/roles.ts'
// canAccessAdminPortal) even though they're not admin-portal "staff". Used
// for the fetch filter, the role filter dropdown, and the per-row role
// <select>'s options — leaving "client" out of any of those three reproduces
// the exact mismatched-<select> bug fixed earlier (an unmatched value
// silently displays as whatever the first option happens to be).
const ADMIN_PORTAL_ROLES = ["super_admin", "editor", "broker", "client"] as const;

function BrokerLinkCell({
  user,
  brokers,
  onToggle,
}: {
  user: User;
  brokers: BrokerSummary[];
  onToggle: (brokerId: string, linked: boolean) => void;
}) {
  const t = useTranslations("adminUsers");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const linked = brokers.filter((b) => b.owner_email === user.email);

  const openPanel = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    // The panel is portaled to <body> (see below) specifically so it isn't
    // clipped by .tableCard's overflow: hidden / .tableWrapper's scroll
    // container — so "click outside" has to check both the trigger and the
    // portaled panel, since they're no longer DOM descendants of each other.
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    // position:fixed doesn't track the trigger during scroll — closing on
    // scroll/resize is simpler and more predictable than re-measuring continuously.
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  return (
    <div className={styles.brokerLinkCell}>
      <button
        type="button"
        ref={triggerRef}
        className={styles.brokerLinkTrigger}
        onClick={() => (open ? setOpen(false) : openPanel())}
      >
        {linked.length > 0
          ? linked.map((b) => b.name).join(", ")
          : t("noBrokersLinked")}
        <span className={styles.caret}>▾</span>
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            ref={panelRef}
            className={styles.brokerLinkPanel}
            style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
          >
            {brokers.length === 0 ? (
              <div className={styles.brokerLinkEmpty}>{t("noBrokersAvailable")}</div>
            ) : (
              brokers.map((b) => {
                const checked = b.owner_email === user.email;
                const takenByOther = !!b.owner_email && b.owner_email !== user.email;
                return (
                  <label
                    key={b.id}
                    className={`${styles.brokerLinkOption} ${takenByOther ? styles.brokerLinkOptionDisabled : ""}`}
                    title={takenByOther ? t("brokerLinkedToOther", { email: b.owner_email! }) : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={takenByOther}
                      onChange={() => onToggle(b.id, !checked)}
                    />
                    {b.name}
                  </label>
                );
              })
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function UsersPage() {
  const t = useTranslations("adminUsers");
  const tRoles = useTranslations("admin.roles");
  const locale = useLocale();
  const [users, setUsers] = useState<User[]>([]);
  const [brokers, setBrokers] = useState<BrokerSummary[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("");
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
      // This page manages admin-portal-accessible accounts (the role
      // <select> below only ever offers ADMIN_PORTAL_ROLES) — a plain "user"
      // account has no matching <option>, and browsers silently fall back to
      // displaying the *first* option (super_admin) for an unmatched select
      // value, which looks exactly like that account was already a
      // super_admin even though its real stored role never changed. Keep
      // this page scoped to the roles it actually knows how to display/edit.
      .then((data) =>
        setUsers(data.filter((u) => (ADMIN_PORTAL_ROLES as readonly string[]).includes(u.role))),
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const fetchBrokers = () => {
    api
      .get<BrokerSummary[]>("/brokers/")
      .then(setBrokers)
      .catch(() => setBrokers([]));
  };

  useEffect(() => {
    fetchUsers();
    fetchBrokers();
  }, []);

  const toggleBrokerLink = async (user: User, brokerId: string, linked: boolean) => {
    const prev = brokers;
    // Optimistic update — the panel stays responsive while the request is in flight.
    setBrokers((bs) =>
      bs.map((b) => (b.id === brokerId ? { ...b, owner_email: linked ? user.email : null } : b)),
    );
    try {
      await api.put(`/brokers/${brokerId}`, { owner_email: linked ? user.email : null });
    } catch (e: unknown) {
      setBrokers(prev);
      alert(e instanceof Error ? e.message : t("brokerLinkFailed"));
    }
  };

  const filteredUsers = roleFilter ? users.filter((u) => u.role === roleFilter) : users;

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
        <div className={styles.headerActions}>
          <select
            className={styles.roleFilter}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">{t("allRoles")}</option>
            {ADMIN_PORTAL_ROLES.map((r) => (
              <option key={r} value={r}>
                {tRoles(r)}
              </option>
            ))}
          </select>
          <button
            className={styles.addBtn}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? t("cancel") : t("addUser")}
          </button>
        </div>
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
                <div className={styles.passwordRow}>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder={t("passwordPlaceholder")}
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser((v) => ({ ...v, password: e.target.value }))
                    }
                    title={t("passwordHint")}
                    required
                  />
                  <button
                    type="button"
                    className={styles.generateBtn}
                    onClick={() => setNewUser((v) => ({ ...v, password: generatePassword() }))}
                  >
                    {t("generatePassword")}
                  </button>
                </div>
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
                <th>{t("linkedBroker")}</th>
                <th>{t("region")}</th>
                <th>{t("joined")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    {t("loading")}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    {roleFilter ? t("noUsersForRole") : t("noUsers")}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
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
                        {/* Defensive: if a row's role somehow isn't one of
                            ADMIN_PORTAL_ROLES, render it as its own (disabled)
                            option instead of silently falling back to displaying
                            the first entry — see the fetchUsers filter above for
                            why that's dangerous (looks like an unintended
                            super_admin). */}
                        {!(ADMIN_PORTAL_ROLES as readonly string[]).includes(u.role) && (
                          <option value={u.role} disabled>
                            {u.role}
                          </option>
                        )}
                        {ADMIN_PORTAL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {tRoles(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {u.role === "broker" ? (
                        <BrokerLinkCell
                          user={u}
                          brokers={brokers}
                          onToggle={(brokerId, linked) => toggleBrokerLink(u, brokerId, linked)}
                        />
                      ) : (
                        "—"
                      )}
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
