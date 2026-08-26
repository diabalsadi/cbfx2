"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { mediaApi, type MediaImage } from "@/helpers/api";
import Card from "@/components/Card";
import styles from "./Media.module.scss";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileName(key: string): string {
  return key.split("/").pop() || key;
}

export default function MediaManagerPage() {
  const t = useTranslations("adminMedia");
  const [images, setImages] = useState<MediaImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(() => {
    setLoading(true);
    mediaApi
      .list()
      .then(setImages)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setError("");
    setUploading(true);
    try {
      for (const file of list) {
        const uploaded = await mediaApi.upload(file);
        setImages((prev) => [uploaded, ...prev]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("uploadFailed"));
    } finally {
      setUploading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  };

  const handleCopy = async (image: MediaImage) => {
    try {
      await navigator.clipboard.writeText(image.url);
      setCopiedKey(image.key);
      setTimeout(() => setCopiedKey((k) => (k === image.key ? null : k)), 1800);
    } catch {
      setError(t("copyFailed"));
    }
  };

  const handleDelete = async (image: MediaImage, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t("deleteConfirm", { name: fileName(image.key) }))) return;
    setDeletingKey(image.key);
    try {
      await mediaApi.remove(image.key);
      setImages((prev) => prev.filter((i) => i.key !== image.key));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("deleteFailed"));
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>
            {t.rich("subtitle", {
              code: (chunks) => <code className={styles.token}>{chunks}</code>,
            })}
          </p>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <Card
        className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          hidden
          onChange={handleFileInput}
        />
        <span className={styles.dropzoneIcon}>▨</span>
        <p className={styles.dropzoneText}>
          {uploading ? t("uploading") : t("dropzoneText")}
        </p>
        <p className={styles.dropzoneHint}>{t("dropzoneHint")}</p>
      </Card>

      {loading ? (
        <p className={styles.emptyState}>{t("loading")}</p>
      ) : images.length === 0 ? (
        <p className={styles.emptyState}>{t("noImages")}</p>
      ) : (
        <div className={styles.grid}>
          {images.map((image) => (
            <Card
              key={image.key}
              className={styles.tile}
              isHoverable
              onClick={() => handleCopy(image)}
              title={t("clickToCopy")}
            >
              <div className={styles.thumbWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={fileName(image.key)} className={styles.thumb} />
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={(e) => handleDelete(image, e)}
                  disabled={deletingKey === image.key}
                  aria-label={t("deleteAria", { name: fileName(image.key) })}
                >
                  ✕
                </button>
                {copiedKey === image.key && <div className={styles.copiedOverlay}>{t("copied")}</div>}
              </div>
              <div className={styles.tileMeta}>
                <span className={styles.tileName}>{fileName(image.key)}</span>
                <span className={styles.tileSize}>{formatSize(image.size)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
