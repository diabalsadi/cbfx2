"use client";
import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import Card from "@/components/Card";
import styles from "./Reports.module.scss";

export default function ReportsPage() {
  const t = useTranslations("adminReports");
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleFiles = (newFiles: File[]) => setFiles(newFiles);
  const clearFiles = () => {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const recentFiles = [
    { name: "Q1-2025-Report.zip", size: "14.2 MB", date: "Mar 31, 2025" },
    { name: "Feb-2025-Analytics.zip", size: "8.7 MB", date: "Feb 28, 2025" },
    { name: "Jan-2025-Report.rar", size: "11.3 MB", date: "Jan 31, 2025" },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
      </div>

      <Card
        className={`${styles.uploadCard} ${isDragging ? styles.dragging : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className={styles.uploadIcon}>📁</div>
        {files.length === 0 ? (
          <>
            <p className={styles.uploadText}>
              {t.rich("dragDrop", {
                browse: (chunks) => (
                  <span
                    className={styles.browseLink}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {chunks}
                  </span>
                ),
              })}
            </p>
            <p className={styles.uploadHint}>{t("supportsHint")}</p>
          </>
        ) : (
          <div className={styles.fileList}>
            {files.map((f, i) => (
              <div key={i} className={styles.fileItem}>
                <span className={styles.fileIcon}>📄</span>
                <span className={styles.fileName}>{f.name}</span>
                <span className={styles.fileSize}>
                  {(f.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            ))}
            <button className={styles.clearBtn} onClick={clearFiles}>
              {t("removeAndSelect")}
            </button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          multiple
          accept=".zip,.rar"
          onChange={(e) =>
            e.target.files && handleFiles(Array.from(e.target.files))
          }
        />
        {files.length > 0 && (
          <button className={styles.uploadBtn}>
            {t("uploadFilesBtn", { count: files.length })}
          </button>
        )}
      </Card>

      <div>
        <h3 className={styles.sectionTitle}>{t("recentFiles")}</h3>
        <Card className={styles.tableCard}>
          <div className={styles.tableWrapper}>
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
                {recentFiles.map((f, i) => (
                  <tr key={i}>
                    <td className={styles.fileName2}>
                      <span className={styles.fileIcon}>📄</span>
                      {f.name}
                    </td>
                    <td className={styles.fileSize2}>{f.size}</td>
                    <td className={styles.fileDate}>{f.date}</td>
                    <td>
                      <button className={styles.downloadBtn}>{t("download")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
