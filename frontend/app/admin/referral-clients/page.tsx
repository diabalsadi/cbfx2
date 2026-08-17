"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
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
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
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
      setCreateError(ex instanceof Error ? ex.message : "Failed to create client");
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
      alert(ex instanceof Error ? ex.message : "Failed to update client");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`Delete client ${email}? This cannot be undone.`)) return;
    try {
      await adminUsersApi.delete(email);
      setClients((prev) => prev.filter((c) => c.email !== email));
    } catch (ex: unknown) {
      alert(ex instanceof Error ? ex.message : "Failed to delete client");
    }
  };

  const referralCountByEmail = useMemo(() => {
    const map = new Map<string, number>();
    stats?.by_client.forEach((c) => map.set(c.client_email, c.total));
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
          <h2 className={styles.title}>Referral Clients</h2>
          <p className={styles.subtitle}>
            Manage client accounts and track who they&apos;ve referred into the platform.
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add Client"}
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>Create New Client</h3>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Full Name</label>
                <input
                  className={styles.input}
                  value={newClient.name}
                  onChange={(e) => setNewClient((v) => ({ ...v, name: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
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
                <label className={styles.label}>Password</label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="Min 8 characters"
                  value={newClient.password}
                  onChange={(e) => setNewClient((v) => ({ ...v, password: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Referral Code (optional, auto-generated if blank)</label>
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
              {creating ? "Creating…" : "Create Client"}
            </button>
          </form>
        </Card>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <span className={styles.statLabel}>Total Referred Signups</span>
          <span className={styles.statValue}>
            {loading ? "—" : (stats?.total ?? 0).toLocaleString("en-US")}
          </span>
          <span className={styles.statSub}>Across all clients, all time</span>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.statLabel}>Client Accounts</span>
          <span className={styles.statValue}>{loading ? "—" : clients.length}</span>
          <span className={styles.statSub}>Assigned a referral code</span>
        </Card>
      </div>

      <div className={styles.grid2}>
        <Card className={styles.chartCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Referrals over time</h3>
            <div className={styles.rangeToggle}>
              <button
                className={range === "weekly" ? styles.rangeBtnActive : styles.rangeBtn}
                onClick={() => setRange("weekly")}
              >
                Week
              </button>
              <button
                className={range === "monthly" ? styles.rangeBtnActive : styles.rangeBtn}
                onClick={() => setRange("monthly")}
              >
                Month
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
          <h3 className={styles.sectionTitle}>By country</h3>
          {!loading && countryData.length > 0 ? (
            <ChartThemeProvider>
              <PieChart series={[{ data: countryData, innerRadius: 40 }]} height={280} sx={chartSx} />
            </ChartThemeProvider>
          ) : (
            !loading && <p className={styles.empty}>No referred signups yet.</p>
          )}
        </Card>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Referral Code</th>
                <th>Referred</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    Loading…
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    No client accounts yet.
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
                    <td className={styles.date}>
                      {new Date(c.created_at).toLocaleDateString("en-US", {
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
                            Save
                          </button>
                          <button className={styles.cancelBtn} onClick={() => setEditingEmail(null)}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className={styles.actionsRow}>
                          <button className={styles.editBtn} onClick={() => startEdit(c)}>
                            Edit
                          </button>
                          <button className={styles.deleteBtn} onClick={() => handleDelete(c.email)}>
                            Delete
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
