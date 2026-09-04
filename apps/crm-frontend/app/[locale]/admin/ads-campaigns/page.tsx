"use client";
import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { campaignsApi, type Campaign, type CampaignStatus } from "@/helpers/api";
import Card from "@/components/Card";
import styles from "./AdsCampaigns.module.scss";

interface FormData {
  name: string;
  budget: string;
}

const STATUS_LABEL_KEY = {
  draft: "statusDraft",
  pending_review: "statusPendingReview",
  active: "statusActive",
  declined: "statusDeclined",
  paused: "statusPaused",
  completed: "statusCompleted",
} as const satisfies Record<CampaignStatus, string>;

export default function AdsCampaignsPage() {
  const t = useTranslations("adminAdsCampaigns");
  const locale = useLocale();
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
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError(t("campaignNameRequired"));
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
      setFormError(e instanceof Error ? e.message : t("createFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await campaignsApi.delete(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("deleteFailed"));
    }
  };

  const handleReview = async (id: string, decision: "confirm" | "decline") => {
    setActioningId(id);
    try {
      const updated = await campaignsApi.review(id, decision);
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("updateFailed"));
    } finally {
      setActioningId(null);
    }
  };

  const fmt = (n: number) => n.toLocaleString(locale);

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>
            {isSuperAdmin ? t("subtitleSuperAdmin") : t("subtitleBroker")}
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? t("cancel") : t("newCampaign")}
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>
            {isSuperAdmin ? t("createCampaign") : t("launchCampaign")}
          </h3>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t("campaignName")}</label>
                <input
                  className={styles.input}
                  placeholder={t("campaignNamePlaceholder")}
                  value={formData.name}
                  onChange={(e) => setFormData((v) => ({ ...v, name: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("budget")}</label>
                <input
                  className={styles.input}
                  type="number"
                  placeholder={t("budgetPlaceholder")}
                  value={formData.budget}
                  onChange={(e) => setFormData((v) => ({ ...v, budget: e.target.value }))}
                />
              </div>
            </div>
            {formError && <p className={styles.error}>{formError}</p>}
            <button className={styles.submitBtn} type="submit" disabled={saving}>
              {saving ? t("submitting") : isSuperAdmin ? t("createCampaign") : t("launchCampaign")}
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
                <th>{t("campaign")}</th>
                <th>{t("status")}</th>
                {isSuperAdmin && <th>{t("submittedBy")}</th>}
                <th>{t("budget")}</th>
                <th>{t("spend")}</th>
                <th>{t("impressions")}</th>
                <th>{t("clicks")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 7} className={styles.empty}>
                    {t("loading")}
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 7} className={styles.empty}>
                    {isSuperAdmin ? t("noCampaignsCreate") : t("noCampaignsLaunch")}
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className={styles.campaignName}>{c.name}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[c.status] || ""}`}>
                        {t(STATUS_LABEL_KEY[c.status])}
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
                              {t("confirm")}
                            </button>
                            <button
                              className={styles.declineBtn}
                              disabled={actioningId === c.id}
                              onClick={() => handleReview(c.id, "decline")}
                            >
                              {t("decline")}
                            </button>
                          </>
                        )}
                        {isSuperAdmin && (
                          <button className={styles.deleteBtn} onClick={() => handleDelete(c.id)}>
                            {t("delete")}
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
