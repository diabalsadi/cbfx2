"use client";
import { useState, useEffect } from "react";
import { api } from "@/helpers/api";
import Card from "@/components/Card";
import styles from "./AdsCampaigns.module.scss";

interface Campaign {
  id: string;
  name: string;
  client_id: string | null;
  budget: number;
  impressions: number;
  clicks: number;
  spend: number;
  status: string;
  created_at: string;
}

interface FormData {
  name: string;
  budget: string;
  status: string;
}

const STATUS_OPTIONS = ["draft", "active", "paused", "completed"];

export default function AdsCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    budget: "",
    status: "draft",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchCampaigns = () => {
    setLoading(true);
    api
      .get<Campaign[]>("/campaigns/")
      .then(setCampaigns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Campaign name is required");
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      await api.post("/campaigns/", {
        name: formData.name,
        budget: parseFloat(formData.budget) || 0,
        status: formData.status,
      });
      setShowForm(false);
      setFormData({ name: "", budget: "", status: "draft" });
      fetchCampaigns();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    try {
      await api.delete(`/campaigns/${id}`);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const updated = await api.put<Campaign>(`/campaigns/${id}`, { status });
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Ad Campaigns</h2>
          <p className={styles.subtitle}>
            Manage advertising campaigns and track performance.
          </p>
        </div>
        <button
          className={styles.addBtn}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "+ New Campaign"}
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>Create Campaign</h3>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Campaign Name</label>
                <input
                  className={styles.input}
                  placeholder="e.g. Summer Push 2025"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Budget ($)</label>
                <input
                  className={styles.input}
                  type="number"
                  placeholder="5000"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, budget: e.target.value }))
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
              {saving ? "Creating…" : "Create Campaign"}
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
                <th>Campaign</th>
                <th>Status</th>
                <th>Budget</th>
                <th>Spend</th>
                <th>Impressions</th>
                <th>Clicks</th>
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
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    No campaigns yet. Create your first one.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className={styles.campaignName}>{c.name}</td>
                    <td>
                      <select
                        className={`${styles.statusSelect} ${styles[c.status] || ""}`}
                        value={c.status}
                        onChange={(e) =>
                          handleStatusChange(c.id, e.target.value)
                        }
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>${fmt(c.budget)}</td>
                    <td>${fmt(c.spend)}</td>
                    <td>{fmt(c.impressions)}</td>
                    <td>{fmt(c.clicks)}</td>
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
