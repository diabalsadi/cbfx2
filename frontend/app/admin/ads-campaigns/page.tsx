"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { campaignsApi, type Campaign, type CampaignStatus } from "@/helpers/api";
import Card from "@/components/Card";
import styles from "./AdsCampaigns.module.scss";

interface FormData {
  name: string;
  budget: string;
}

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  active: "Active",
  declined: "Declined",
  paused: "Paused",
  completed: "Completed",
};

export default function AdsCampaignsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({ name: "", budget: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchCampaigns = () => {
    setLoading(true);
    campaignsApi
      .list()
      .then(setCampaigns)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load campaigns"))
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
      // super_admin's campaign starts as a normal draft; anyone else
      // "launching" one always starts pending_review server-side,
      // regardless of what's sent here — see campaigns.py's
      // create_campaign().
      await campaignsApi.create({
        name: formData.name,
        budget: parseFloat(formData.budget) || 0,
      });
      setShowForm(false);
      setFormData({ name: "", budget: "" });
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
      await campaignsApi.delete(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleReview = async (id: string, decision: "confirm" | "decline") => {
    setActioningId(id);
    try {
      const updated = await campaignsApi.review(id, decision);
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setActioningId(null);
    }
  };

  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Ad Campaigns</h2>
          <p className={styles.subtitle}>
            {isSuperAdmin
              ? "Review broker-launched campaigns and manage advertising performance."
              : "Launch a campaign — it goes live once a super admin reviews it."}
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New Campaign"}
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>{isSuperAdmin ? "Create Campaign" : "Launch Campaign"}</h3>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Campaign Name</label>
                <input
                  className={styles.input}
                  placeholder="e.g. Summer Push 2025"
                  value={formData.name}
                  onChange={(e) => setFormData((v) => ({ ...v, name: e.target.value }))}
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
                  onChange={(e) => setFormData((v) => ({ ...v, budget: e.target.value }))}
                />
              </div>
            </div>
            {formError && <p className={styles.error}>{formError}</p>}
            <button className={styles.submitBtn} type="submit" disabled={saving}>
              {saving ? "Submitting…" : isSuperAdmin ? "Create Campaign" : "Launch Campaign"}
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
                {isSuperAdmin && <th>Submitted By</th>}
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
                  <td colSpan={isSuperAdmin ? 8 : 7} className={styles.empty}>
                    Loading…
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 7} className={styles.empty}>
                    No campaigns yet. {isSuperAdmin ? "Create" : "Launch"} your first one.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className={styles.campaignName}>{c.name}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[c.status] || ""}`}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </td>
                    {isSuperAdmin && <td>{c.created_by}</td>}
                    <td>${fmt(c.budget)}</td>
                    <td>${fmt(c.spend)}</td>
                    <td>{fmt(c.impressions)}</td>
                    <td>{fmt(c.clicks)}</td>
                    <td>
                      <div className={styles.actions}>
                        {isSuperAdmin && c.status === "pending_review" && (
                          <>
                            <button
                              className={styles.confirmBtn}
                              disabled={actioningId === c.id}
                              onClick={() => handleReview(c.id, "confirm")}
                            >
                              Confirm
                            </button>
                            <button
                              className={styles.declineBtn}
                              disabled={actioningId === c.id}
                              onClick={() => handleReview(c.id, "decline")}
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {isSuperAdmin && (
                          <button className={styles.deleteBtn} onClick={() => handleDelete(c.id)}>
                            Delete
                          </button>
                        )}
                      </div>
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
