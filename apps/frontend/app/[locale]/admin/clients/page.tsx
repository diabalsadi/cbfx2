"use client";
import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/helpers/api";
import Card from "@/components/Card";
import styles from "./Clients.module.scss";

interface Client {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  status: string;
  monthly_budget: number | null;
  created_at: string;
}

const STATUS_OPTIONS = ["prospect", "active", "paused", "churned"] as const;
const STATUS_LABEL_KEY = {
  prospect: "statusProspect",
  active: "statusActive",
  paused: "statusPaused",
  churned: "statusChurned",
} as const;

export default function ClientsPage() {
  const t = useTranslations("adminClients");
  const locale = useLocale();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    phone: "",
    monthly_budget: "",
    status: "prospect",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchClients = () => {
    setLoading(true);
    api
      .get<Client[]>("/clients/")
      .then(setClients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim()) {
      setFormError(t("companyNameRequired"));
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      await api.post("/clients/", {
        company_name: formData.company_name,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        phone: formData.phone || null,
        monthly_budget: formData.monthly_budget
          ? parseFloat(formData.monthly_budget)
          : null,
        status: formData.status,
      });
      setShowForm(false);
      setFormData({
        company_name: "",
        contact_name: "",
        contact_email: "",
        phone: "",
        monthly_budget: "",
        status: "prospect",
      });
      fetchClients();
    } catch (ex: unknown) {
      setFormError(ex instanceof Error ? ex.message : t("createFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await api.delete(`/clients/${id}`);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("deleteFailed"));
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: styles.active,
      prospect: styles.prospect,
      paused: styles.paused,
      churned: styles.churned,
    };
    return `${styles.badge} ${map[s] || ""}`;
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
          {showForm ? t("cancel") : t("addClient")}
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>{t("newClient")}</h3>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t("companyName")}</label>
                <input
                  className={styles.input}
                  placeholder={t("companyNamePlaceholder")}
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, company_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("contactName")}</label>
                <input
                  className={styles.input}
                  placeholder={t("contactNamePlaceholder")}
                  value={formData.contact_name}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, contact_name: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t("contactEmail")}</label>
                <input
                  className={styles.input}
                  type="email"
                  placeholder={t("contactEmailPlaceholder")}
                  value={formData.contact_email}
                  onChange={(e) =>
                    setFormData((v) => ({
                      ...v,
                      contact_email: e.target.value,
                    }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("phone")}</label>
                <input
                  className={styles.input}
                  placeholder={t("phonePlaceholder")}
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, phone: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t("monthlyBudget")}</label>
                <input
                  className={styles.input}
                  type="number"
                  placeholder={t("monthlyBudgetPlaceholder")}
                  value={formData.monthly_budget}
                  onChange={(e) =>
                    setFormData((v) => ({
                      ...v,
                      monthly_budget: e.target.value,
                    }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("status")}</label>
                <select
                  className={styles.input}
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, status: e.target.value }))
                  }
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {t(STATUS_LABEL_KEY[s])}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {formError && <p className={styles.error}>{formError}</p>}
            <button
              className={styles.submitBtn}
              type="submit"
              disabled={saving}
            >
              {saving ? t("creating") : t("createClient")}
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
                <th>{t("company")}</th>
                <th>{t("contact")}</th>
                <th>{t("email")}</th>
                <th>{t("budgetPerMonth")}</th>
                <th>{t("status")}</th>
                <th>{t("added")}</th>
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
                    {t("noClients")}
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id}>
                    <td className={styles.companyName}>{c.company_name}</td>
                    <td>{c.contact_name || "—"}</td>
                    <td className={styles.email}>{c.contact_email || "—"}</td>
                    <td>
                      {c.monthly_budget
                        ? `$${c.monthly_budget.toLocaleString(locale)}`
                        : "—"}
                    </td>
                    <td>
                      <span className={statusBadge(c.status)}>
                        {t(
                          STATUS_LABEL_KEY[
                            c.status as keyof typeof STATUS_LABEL_KEY
                          ] ?? "statusProspect"
                        )}
                      </span>
                    </td>
                    <td className={styles.date}>
                      {new Date(c.created_at).toLocaleDateString(locale, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(c.id)}
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
