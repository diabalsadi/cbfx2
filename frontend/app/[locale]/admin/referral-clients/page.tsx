"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import {
  adminUsersApi,
  referralsApi,
  type UserProfile,
  type AdminReferralStats,
} from "@/helpers/api";
import Card from "@/components/Card";
import { chartSx } from "@/helpers/chartTheme";
import ChartThemeProvider from "@/components/ChartThemeProvider";
import styles from "./ReferralClients.module.scss";

const PieChart = dynamic(() => import("@mui/x-charts/PieChart").then((m) => m.PieChart), {
  ssr: false,
});
const BarChart = dynamic(() => import("@mui/x-charts/BarChart").then((m) => m.BarChart), {
  ssr: false,
});

type Range = "weekly" | "monthly";

export default function ReferralClientsPage() {
  const t = useTranslations("adminReferralClients");
  const locale = useLocale();
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<AdminReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<Range>("weekly");

  const [showForm, setShowForm] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    password: "",
    referral_code: "",
  });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", referral_code: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchAll = () => {
    setLoading(true);
    setError("");
    Promise.all([adminUsersApi.list("client"), referralsApi.adminStats().catch(() => null)])
      .then(([c, s]) => {
        setClients(c);
        setStats(s);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      await adminUsersApi.create({
        name: newClient.name,
        email: newClient.email,
        password: newClient.password,
        role: "client",
        referral_code: newClient.referral_code || undefined,
      });
      setShowForm(false);
      setNewClient({ name: "", email: "", password: "", referral_code: "" });
      fetchAll();
    } catch (ex: unknown) {
      setCreateError(ex instanceof Error ? ex.message : t("createFailed"));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (c: UserProfile) => {
    setEditingEmail(c.email);
    setEditDraft({ name: c.name || "", referral_code: c.referral_code || "" });
  };

  const saveEdit = async (email: string) => {
    setSavingEdit(true);
    try {
      const updated = await adminUsersApi.update(email, editDraft);
      setClients((prev) => prev.map((c) => (c.email === email ? updated : c)));
      setEditingEmail(null);
    } catch (ex: unknown) {
      alert(ex instanceof Error ? ex.message : t("updateFailed"));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(t("deleteConfirm", { email }))) return;
    try {
      await adminUsersApi.delete(email);
      setClients((prev) => prev.filter((c) => c.email !== email));
    } catch (ex: unknown) {
      alert(ex instanceof Error ? ex.message : t("deleteFailed"));
    }
  };

  const referralCountByEmail = useMemo(() => {
    const map = new Map<string, number>();
    stats?.by_client.forEach((c) => map.set(c.client_email, c.total));
    return map;
  }, [stats]);

  const activeCountByEmail = useMemo(() => {
    const map = new Map<string, number>();
    stats?.by_client.forEach((c) => map.set(c.client_email, c.active));
    return map;
  }, [stats]);

  const countryData = useMemo(
    () =>
      Object.entries(stats?.by_country || {}).map(([country, count], i) => ({
        id: i,
        value: count,
        label: country,
      })),
    [stats]
  );

  const buckets = range === "weekly" ? stats?.weekly : stats?.monthly;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? t("cancel") : t("addClient")}
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>{t("createNewClient")}</h3>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t("fullName")}</label>
                <input
                  className={styles.input}
                  value={newClient.name}
                  onChange={(e) => setNewClient((v) => ({ ...v, name: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("email")}</label>
                <input
                  className={styles.input}
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient((v) => ({ ...v, email: e.target.value }))}
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
                  value={newClient.password}
                  onChange={(e) => setNewClient((v) => ({ ...v, password: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("referralCode")}</label>
                <input
                  className={styles.input}
                  value={newClient.referral_code}
                  onChange={(e) =>
                    setNewClient((v) => ({ ...v, referral_code: e.target.value.toUpperCase() }))
                  }
                />
              </div>
            </div>
            {createError && <p className={styles.error}>{createError}</p>}
            <button className={styles.submitBtn} type="submit" disabled={creating}>
              {creating ? t("creating") : t("createClient")}
            </button>
          </form>
        </Card>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <span className={styles.statLabel}>{t("totalReferredSignups")}</span>
          <span className={styles.statValue}>
            {loading ? "—" : (stats?.total ?? 0).toLocaleString(locale)}
          </span>
          <span className={styles.statSub}>{t("acrossAllClients")}</span>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.statLabel}>{t("activeReferredSignups")}</span>
          <span className={styles.statValue}>
            {loading ? "—" : (stats?.active ?? 0).toLocaleString(locale)}
          </span>
          <span className={styles.statSub}>{t("activeReferredSignupsSub")}</span>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.statLabel}>{t("clientAccounts")}</span>
          <span className={styles.statValue}>{loading ? "—" : clients.length}</span>
          <span className={styles.statSub}>{t("assignedReferralCode")}</span>
        </Card>
      </div>

      <div className={styles.grid2}>
        <Card className={styles.chartCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>{t("referralsOverTime")}</h3>
            <div className={styles.rangeToggle}>
              <button
                className={range === "weekly" ? styles.rangeBtnActive : styles.rangeBtn}
                onClick={() => setRange("weekly")}
              >
                {t("week")}
              </button>
              <button
                className={range === "monthly" ? styles.rangeBtnActive : styles.rangeBtn}
                onClick={() => setRange("monthly")}
              >
                {t("month")}
              </button>
            </div>
          </div>
          {!loading && buckets && (
            <ChartThemeProvider>
              <BarChart
                xAxis={[{ scaleType: "band", data: buckets.map((b) => b.label) }]}
                series={[{ data: buckets.map((b) => b.count), color: "#D9641E" }]}
                height={280}
                grid={{ horizontal: true }}
                sx={chartSx}
              />
            </ChartThemeProvider>
          )}
        </Card>

        <Card className={styles.chartCard}>
          <h3 className={styles.sectionTitle}>{t("byCountry")}</h3>
          {!loading && countryData.length > 0 ? (
            <ChartThemeProvider>
              <PieChart series={[{ data: countryData, innerRadius: 40 }]} height={280} sx={chartSx} />
            </ChartThemeProvider>
          ) : (
            !loading && <p className={styles.empty}>{t("noReferredSignups")}</p>
          )}
        </Card>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("email")}</th>
                <th>{t("referralCodeHeader")}</th>
                <th>{t("referred")}</th>
                <th>{t("active")}</th>
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
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    {t("noClientAccounts")}
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.email}>
                    <td>
                      {editingEmail === c.email ? (
                        <input
                          className={styles.input}
                          value={editDraft.name}
                          onChange={(e) => setEditDraft((v) => ({ ...v, name: e.target.value }))}
                        />
                      ) : (
                        c.name || "—"
                      )}
                    </td>
                    <td className={styles.email}>{c.email}</td>
                    <td>
                      {editingEmail === c.email ? (
                        <input
                          className={styles.input}
                          value={editDraft.referral_code}
                          onChange={(e) =>
                            setEditDraft((v) => ({
                              ...v,
                              referral_code: e.target.value.toUpperCase(),
                            }))
                          }
                        />
                      ) : (
                        <code className={styles.code}>{c.referral_code || "—"}</code>
                      )}
                    </td>
                    <td>{referralCountByEmail.get(c.email) ?? 0}</td>
                    <td>{activeCountByEmail.get(c.email) ?? 0}</td>
                    <td className={styles.date}>
                      {new Date(c.created_at).toLocaleDateString(locale, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      {editingEmail === c.email ? (
                        <div className={styles.actionsRow}>
                          <button
                            className={styles.saveBtn}
                            disabled={savingEdit}
                            onClick={() => saveEdit(c.email)}
                          >
                            {t("save")}
                          </button>
                          <button className={styles.cancelBtn} onClick={() => setEditingEmail(null)}>
                            {t("cancelEdit")}
                          </button>
                        </div>
                      ) : (
                        <div className={styles.actionsRow}>
                          <button className={styles.editBtn} onClick={() => startEdit(c)}>
                            {t("edit")}
                          </button>
                          <button className={styles.deleteBtn} onClick={() => handleDelete(c.email)}>
                            {t("delete")}
                          </button>
                        </div>
                      )}
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
