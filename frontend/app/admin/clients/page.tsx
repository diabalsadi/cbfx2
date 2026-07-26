"use client";
import { useState, useEffect } from "react";
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

const STATUS_OPTIONS = ["prospect", "active", "paused", "churned"];

export default function ClientsPage() {
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
      setFormError("Company name is required");
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
      setFormError(
        ex instanceof Error ? ex.message : "Failed to create client",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this client?")) return;
    try {
      await api.delete(`/clients/${id}`);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete");
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
          <h2 className={styles.title}>Clients</h2>
          <p className={styles.subtitle}>Manage your client relationships.</p>
        </div>
        <button
          className={styles.addBtn}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "+ Add Client"}
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>New Client</h3>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Company Name *</label>
                <input
                  className={styles.input}
                  placeholder="Acme Corp"
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, company_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Contact Name</label>
                <input
                  className={styles.input}
                  placeholder="John Smith"
                  value={formData.contact_name}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, contact_name: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Contact Email</label>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="john@acme.com"
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
                <label className={styles.label}>Phone</label>
                <input
                  className={styles.input}
                  placeholder="+1 555 000 0000"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, phone: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Monthly Budget ($)</label>
                <input
                  className={styles.input}
                  type="number"
                  placeholder="10000"
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
                <label className={styles.label}>Status</label>
                <select
                  className={styles.input}
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, status: e.target.value }))
                  }
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
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
              {saving ? "Creating…" : "Create Client"}
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
                <th>Company</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Budget / mo</th>
                <th>Status</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    Loading…
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    No clients yet. Add your first one.
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
                        ? `$${c.monthly_budget.toLocaleString()}`
                        : "—"}
                    </td>
                    <td>
                      <span className={statusBadge(c.status)}>{c.status}</span>
                    </td>
                    <td className={styles.date}>
                      {new Date(c.created_at).toLocaleDateString("en-US", {
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
                        Delete
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
