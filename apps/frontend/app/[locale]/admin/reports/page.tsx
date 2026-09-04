"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { api, brokerReportsApi, type BrokerReport } from "@/helpers/api";
import Card from "@/components/Card";
import styles from "./Reports.module.scss";

interface BrokerOption {
  id: string;
  name: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ReportsPage() {
  const t = useTranslations("adminReports");

  const [brokers, setBrokers] = useState<BrokerOption[]>([]);
  const [brokersLoading, setBrokersLoading] = useState(true);
  const [brokerId, setBrokerId] = useState("");

  const [reports, setReports] = useState<BrokerReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [error, setError] = useState("");

  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get<BrokerOption[]>("/brokers/")
      .then(setBrokers)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadBrokersFailed")))
      .finally(() => setBrokersLoading(false));
  }, [t]);

  const fetchReports = useCallback(
    (id: string) => {
      setReportsLoading(true);
      brokerReportsApi
        .list(id)
        .then(setReports)
        .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadFailed")))
        .finally(() => setReportsLoading(false));
    },
    [t]
  );

  useEffect(() => {
    if (brokerId) fetchReports(brokerId);
    else setReports([]);
  }, [brokerId, fetchReports]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (brokerId) setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (brokerId) setPendingFiles(Array.from(e.dataTransfer.files));
  };

  const clearPending = () => {
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!brokerId || pendingFiles.length === 0) return;
    setError("");
    setUploading(true);
    try {
      for (const file of pendingFiles) {
        await brokerReportsApi.upload(brokerId, file);
      }
      clearPending();
      fetchReports(brokerId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      await brokerReportsApi.remove(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("deleteFailed"));
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

      <div className={styles.brokerField}>
        <label className={styles.brokerLabel} htmlFor="report-broker">
          {t("broker")}
        </label>
        <select
          id="report-broker"
          className={styles.brokerSelect}
          value={brokerId}
          onChange={(e) => {
            setBrokerId(e.target.value);
            clearPending();
          }}
          disabled={brokersLoading || brokers.length === 0}
        >
          <option value="" disabled>
            {brokersLoading ? t("loadingBrokers") : t("selectBroker")}
          </option>
          {brokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <Card
        className={`${styles.uploadCard} ${isDragging ? styles.dragging : ""} ${!brokerId ? styles.disabled : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className={styles.uploadIcon}>📁</div>
        {pendingFiles.length === 0 ? (
          <>
            <p className={styles.uploadText}>
              {t.rich("dragDrop", {
                browse: (chunks) => (
                  <span
                    className={styles.browseLink}
                    onClick={() => brokerId && fileInputRef.current?.click()}
                  >
                    {chunks}
                  </span>
                ),
              })}
            </p>
            <p className={styles.uploadHint}>
              {brokerId ? t("supportsHint") : t("selectBrokerFirst")}
            </p>
          </>
        ) : (
          <div className={styles.fileList}>
            {pendingFiles.map((f, i) => (
              <div key={i} className={styles.fileItem}>
                <span className={styles.fileIcon}>📄</span>
                <span className={styles.fileName}>{f.name}</span>
                <span className={styles.fileSize}>{formatSize(f.size)}</span>
              </div>
            ))}
            <button className={styles.clearBtn} onClick={clearPending} disabled={uploading}>
              {t("removeAndSelect")}
            </button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          multiple
          accept=".csv,.xlsx,.xls,.pdf"
          onChange={(e) => e.target.files && setPendingFiles(Array.from(e.target.files))}
        />
        {pendingFiles.length > 0 && (
          <button className={styles.uploadBtn} onClick={handleUpload} disabled={uploading}>
            {uploading ? t("uploading") : t("uploadFilesBtn", { count: pendingFiles.length })}
          </button>
        )}
      </Card>

      <div>
        <h3 className={styles.sectionTitle}>{t("recentFiles")}</h3>
        <Card className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            {!brokerId ? (
              <div className={styles.empty}>{t("selectBrokerFirst")}</div>
            ) : reportsLoading ? (
              <div className={styles.empty}>{t("loading")}</div>
            ) : reports.length === 0 ? (
              <div className={styles.empty}>{t("noReports")}</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("fileName")}</th>
                    <th>{t("size")}</th>
                    <th>{t("date")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td className={styles.fileName2}>
                        <span className={styles.fileIcon}>📄</span>
                        {r.filename}
                      </td>
                      <td className={styles.fileSize2}>{formatSize(r.size)}</td>
                      <td className={styles.fileDate}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <a
                          className={styles.downloadBtn}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t("download")}
                        </a>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(r.id)}>
                          {t("delete")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
