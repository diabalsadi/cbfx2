"use client";
import { Fragment, useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { withdrawalRequestsApi, type WithdrawalRequest } from "@/helpers/api";
import Card from "@/components/Card";
import styles from "./WithdrawalRequests.module.scss";

export default function WithdrawalRequestsPage() {
  const t = useTranslations("adminWithdrawalRequests");

  // Labeled key/value breakdown of where the money is supposed to go, so an
  // admin can act on it (send crypto, place a wire) without deciphering a
  // packed one-line summary. "fund_mt5" has no destination_details — the
  // account being withdrawn from *is* the destination. Defined inside the
  // component so it closes over the page's own `t` (next-intl's translator
  // type is keyed to its exact namespace, which doesn't type-check cleanly
  // as a passed-down prop).
  const renderDestination = (w: WithdrawalRequest) => {
    const d = w.destination_details as Record<string, string>;

    if (w.method === "crypto") {
      return (
        <dl className={styles.destinationList}>
          <div>
            <dt>{t("labelCurrency")}</dt>
            <dd>{d.currency || "—"}</dd>
          </div>
          <div>
            <dt>{t("labelNetwork")}</dt>
            <dd>{d.network || "—"}</dd>
          </div>
          <div>
            <dt>{t("labelWalletAddress")}</dt>
            <dd className={styles.mono}>{d.wallet_address || "—"}</dd>
          </div>
        </dl>
      );
    }

    if (w.method === "bank_wire") {
      return (
        <dl className={styles.destinationList}>
          <div>
            <dt>{t("labelHolderName")}</dt>
            <dd>{d.holder_name || "—"}</dd>
          </div>
          <div>
            <dt>{t("labelBankName")}</dt>
            <dd>{d.bank_name || "—"}</dd>
          </div>
          <div>
            <dt>{t("labelAccountNumber")}</dt>
            <dd className={styles.mono}>{d.account_number || "—"}</dd>
          </div>
          <div>
            <dt>{t("labelSwiftBic")}</dt>
            <dd className={styles.mono}>{d.swift_bic || "—"}</dd>
          </div>
        </dl>
      );
    }

    return <span>{t("fundMt5Destination", { mt5Number: w.mt5_number })}</span>;
  };

  const locale = useLocale();
  const [items, setItems] = useState<WithdrawalRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | "pending" | "approved" | "rejected">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState("");

  const fetchAll = (filter: "" | "pending" | "approved" | "rejected") => {
    setLoading(true);
    withdrawalRequestsApi
      .listAll(filter || undefined)
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fmt = (n: number) =>
    n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleApprove = async (id: string) => {
    setReviewing(id);
    setReviewError("");
    try {
      await withdrawalRequestsApi.review(id, { decision: "approve" });
      fetchAll(statusFilter);
    } catch (e: unknown) {
      setReviewError(e instanceof Error ? e.message : t("reviewFailed"));
    } finally {
      setReviewing(null);
    }
  };

  const openReject = (id: string) => {
    setRejectingId(id);
    setRejectNote("");
    setReviewError("");
  };

  const handleReject = async (id: string) => {
    setReviewing(id);
    setReviewError("");
    try {
      await withdrawalRequestsApi.review(id, { decision: "reject", admin_note: rejectNote || undefined });
      setRejectingId(null);
      fetchAll(statusFilter);
    } catch (e: unknown) {
      setReviewError(e instanceof Error ? e.message : t("reviewFailed"));
    } finally {
      setReviewing(null);
    }
  };

  const statusClass = (status: string) =>
    status === "approved" ? styles.statusApproved : status === "rejected" ? styles.statusRejected : styles.statusPending;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <div className={styles.headerActions}>
          <select
            className={styles.statusFilter}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="">{t("filterAll")}</option>
            <option value="pending">{t("status_pending")}</option>
            <option value="approved">{t("status_approved")}</option>
            <option value="rejected">{t("status_rejected")}</option>
          </select>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <Card className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("broker")}</th>
                <th>{t("mt5Number")}</th>
                <th>{t("method")}</th>
                <th>{t("destination")}</th>
                <th>{t("amount")}</th>
                <th>{t("status")}</th>
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
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    {statusFilter ? t("noneForStatus") : t("none")}
                  </td>
                </tr>
              ) : (
                items.map((w) => (
                  <Fragment key={w.id}>
                    <tr>
                      <td>{w.broker_name}</td>
                      <td>{w.mt5_number}</td>
                      <td>{t(`method_${w.method}`)}</td>
                      <td className={styles.details}>{renderDestination(w)}</td>
                      <td className={styles.amount}>${fmt(w.amount)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${statusClass(w.status)}`}>
                          {t(`status_${w.status}`)}
                        </span>
                      </td>
                      <td>
                        {w.status === "pending" && (
                          <div className={styles.actions}>
                            {rejectingId === w.id ? (
                              <button className={styles.cancelBtn} onClick={() => setRejectingId(null)}>
                                {t("cancel")}
                              </button>
                            ) : (
                              <>
                                <button
                                  className={styles.approveBtn}
                                  disabled={reviewing === w.id}
                                  onClick={() => handleApprove(w.id)}
                                >
                                  {t("approve")}
                                </button>
                                <button className={styles.rejectBtn} onClick={() => openReject(w.id)}>
                                  {t("reject")}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    {rejectingId === w.id && (
                      <tr>
                        <td colSpan={7}>
                          <div className={styles.reviewForm}>
                            <div className={styles.field}>
                              <label className={styles.label}>{t("rejectNote")}</label>
                              <input
                                className={styles.input}
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                placeholder={t("rejectNotePlaceholder")}
                              />
                            </div>
                            {reviewError && <p className={styles.error}>{reviewError}</p>}
                            <button
                              className={styles.submitBtn}
                              disabled={reviewing === w.id}
                              onClick={() => handleReject(w.id)}
                            >
                              {reviewing === w.id ? t("rejecting") : t("confirmReject")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
