"use client";
import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { mt5AccountsAdminApi, type AdminMT5Account } from "@/helpers/api";
import Card from "@/components/Card";
import styles from "./MT5Accounts.module.scss";

const HEALTHY_STATUSES = new Set(["connected", "idle"]);

const STATUS_LABEL_KEYS: Record<
  string,
  "status_not_connected" | "status_pending" | "status_deployed" | "status_connected" | "status_idle" | "status_error"
> = {
  not_connected: "status_not_connected",
  pending: "status_pending",
  deployed: "status_deployed",
  connected: "status_connected",
  idle: "status_idle",
  error: "status_error",
};

export default function AdminMT5AccountsPage() {
  const t = useTranslations("adminMt5Accounts");
  const locale = useLocale();
  const [items, setItems] = useState<AdminMT5Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    mt5AccountsAdminApi
      .list()
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmtDate = (value: string | null) =>
    value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : t("never");

  const badgeClass = (status: string) => {
    if (status === "error") return styles.badgeError;
    if (HEALTHY_STATUSES.has(status)) return styles.badgeHealthy;
    return styles.badgeNeutral;
  };

  const statusLabel = (status: string) => t(STATUS_LABEL_KEYS[status] ?? "status_not_connected");

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <Card className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("user")}</th>
                <th>{t("broker")}</th>
                <th>{t("mt5Number")}</th>
                <th>{t("accountType")}</th>
                <th>{t("status")}</th>
                <th>{t("lastSynced")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    {t("loading")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    {t("none")}
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id}>
                    <td className={styles.email}>{it.user_email}</td>
                    <td>{it.broker_name}</td>
                    <td>{it.mt5_number}</td>
                    <td>{it.account_type || "—"}</td>
                    <td>
                      <span className={`${styles.badge} ${badgeClass(it.metaapi_connection_status)}`}>
                        {statusLabel(it.metaapi_connection_status)}
                      </span>
                    </td>
                    <td>{fmtDate(it.metaapi_last_synced_at)}</td>
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
