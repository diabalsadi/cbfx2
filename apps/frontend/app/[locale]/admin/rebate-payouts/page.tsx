"use client";
import { Fragment, useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { rebatePayoutsApi, type PendingRebatePayout } from "@/helpers/api";
import Card from "@/components/Card";
import styles from "./RebatePayouts.module.scss";

export default function RebatePayoutsPage() {
  const t = useTranslations("adminRebatePayouts");
  const locale = useLocale();
  const [items, setItems] = useState<PendingRebatePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openAccountId, setOpenAccountId] = useState<string | null>(null);
  const [actualAmount, setActualAmount] = useState("");
  const [note, setNote] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState("");

  const fetchAll = () => {
    setLoading(true);
    rebatePayoutsApi
      .listPending()
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (n: number) =>
    n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const openPayoutForm = (item: PendingRebatePayout) => {
    setOpenAccountId(item.mt5_account_id);
    setActualAmount(item.expected_amount.toFixed(2));
    setNote("");
    setIssueError("");
  };

  const closePayoutForm = () => {
    setOpenAccountId(null);
    setIssueError("");
  };

  const handleIssue = async (mt5AccountId: string) => {
    const amount = parseFloat(actualAmount);
    if (isNaN(amount) || amount < 0) {
      setIssueError(t("invalidAmount"));
      return;
    }
    setIssuing(true);
    setIssueError("");
    try {
      await rebatePayoutsApi.issue({
        mt5_account_id: mt5AccountId,
        actual_amount: amount,
        note: note || undefined,
      });
      setOpenAccountId(null);
      fetchAll();
    } catch (e: unknown) {
      setIssueError(e instanceof Error ? e.message : t("issueFailed"));
    } finally {
      setIssuing(false);
    }
  };

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
                <th>{t("trades")}</th>
                <th>{t("expectedAmount")}</th>
                <th>{t("actions")}</th>
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
                    {t("noneReady")}
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <Fragment key={it.mt5_account_id}>
                    <tr>
                      <td className={styles.email}>{it.user_email}</td>
                      <td>{it.broker_name}</td>
                      <td>{it.mt5_number}</td>
                      <td>{it.trade_count}</td>
                      <td className={styles.amount}>${fmt(it.expected_amount)}</td>
                      <td>
                        {openAccountId === it.mt5_account_id ? (
                          <button className={styles.cancelBtn} onClick={closePayoutForm}>
                            {t("cancel")}
                          </button>
                        ) : (
                          <button className={styles.payoutBtn} onClick={() => openPayoutForm(it)}>
                            {t("issuePayout")}
                          </button>
                        )}
                      </td>
                    </tr>
                    {openAccountId === it.mt5_account_id && (
                      <tr>
                        <td colSpan={6}>
                          <div className={styles.payoutForm}>
                            <div className={styles.field}>
                              <label className={styles.label}>{t("actualAmount")}</label>
                              <input
                                className={styles.input}
                                type="number"
                                step="0.01"
                                min="0"
                                value={actualAmount}
                                onChange={(e) => setActualAmount(e.target.value)}
                              />
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label}>{t("note")}</label>
                              <input
                                className={styles.input}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={t("notePlaceholder")}
                              />
                            </div>
                            {issueError && <p className={styles.error}>{issueError}</p>}
                            <button
                              className={styles.submitBtn}
                              disabled={issuing}
                              onClick={() => handleIssue(it.mt5_account_id)}
                            >
                              {issuing ? t("issuing") : t("confirmPayout")}
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
