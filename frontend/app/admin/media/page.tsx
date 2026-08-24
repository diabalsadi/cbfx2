"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load images"))
      .finally(() => setLoading(false));
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
      setError(e instanceof Error ? e.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
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
      setError("Couldn't copy to clipboard");
    }
  };

  const handleDelete = async (image: MediaImage, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete ${fileName(image.key)}? This can't be undone.`)) return;
    setDeletingKey(image.key);
    try {
      await mediaApi.remove(image.key);
      setImages((prev) => prev.filter((i) => i.key !== image.key));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete image");
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Media</h2>
          <p className={styles.subtitle}>
            Upload images to the bucket&apos;s <code className={styles.token}>images/</code>{" "}
            folder. Click any image to copy its public URL.
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
          {uploading ? "Uploading…" : "Click to browse or drag images here"}
        </p>
        <p className={styles.dropzoneHint}>PNG, JPEG, WEBP, GIF — up to 10MB each</p>
      </Card>

      {loading ? (
        <p className={styles.emptyState}>Loading…</p>
      ) : images.length === 0 ? (
        <p className={styles.emptyState}>No images uploaded yet.</p>
      ) : (
        <div className={styles.grid}>
          {images.map((image) => (
            <Card
              key={image.key}
              className={styles.tile}
              isHoverable
              onClick={() => handleCopy(image)}
              title="Click to copy URL"
            >
              <div className={styles.thumbWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={fileName(image.key)} className={styles.thumb} />
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={(e) => handleDelete(image, e)}
                  disabled={deletingKey === image.key}
                  aria-label={`Delete ${fileName(image.key)}`}
                >
                  ✕
                </button>
                {copiedKey === image.key && <div className={styles.copiedOverlay}>Copied!</div>}
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
