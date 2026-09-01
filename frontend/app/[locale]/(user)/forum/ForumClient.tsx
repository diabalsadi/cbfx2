"use client";

import { Link } from "@/i18n/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { forumApi, type ForumThread } from "@/helpers/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import styles from "./forum.module.scss";

const CATEGORIES = [
  "All",
  "General",
  "Forex",
  "Crypto",
  "Metals",
  "Indices",
  "Strategy",
] as const;

export default function ForumPage() {
  const t = useTranslations("forum");
  const { user } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [category, setCategory] = useState("All");
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [threadCategory, setThreadCategory] = useState("General");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    forumApi
      .listThreads()
      .then(setThreads)
      .catch((err) => setError(err.message));
  }, []);

  const visibleThreads =
    category === "All"
      ? threads
      : threads.filter(
          (thread) => thread.category.toLowerCase() === category.toLowerCase(),
        );

  const openComposer = () => (user ? setShowComposer(true) : openLoginModal());

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function createThread(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      if (body.trim()) formData.append("body", body.trim());
      formData.append("category", threadCategory);
      if (imageFile) formData.append("image", imageFile);

      const thread = await forumApi.createThread(formData);
      setThreads((current) => [thread, ...current]);
      setTitle("");
      setBody("");
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowComposer(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("unableToCreate"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>
            <span>CBFX</span> {t("titleSuffix")}
          </h1>
          <p>{t("subtitle")}</p>
        </div>
        <button className={styles.createButton} onClick={openComposer}>
          {t("newDiscussion")}
        </button>
      </header>

      <div className={styles.filters} aria-label={t("filterAriaLabel")}>
        {CATEGORIES.map((item) => (
          <button
            key={item}
            className={category === item ? styles.activeFilter : ""}
            onClick={() => setCategory(item)}
          >
            {t(`categories.${item}`)}
          </button>
        ))}
      </div>

      {showComposer && (
        <form className={styles.composer} onSubmit={createThread}>
          <div className={styles.composerHeader}>{t("startDiscussion")}</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titlePlaceholder")}
            required
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("bodyPlaceholder")}
            rows={4}
          />
          <div className={styles.fileUpload}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelection}
              className={styles.hiddenFileInput}
            />
            <button
              type="button"
              className={styles.attachButton}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg
                className={styles.attachIcon}
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M14 9.5V13.5C14 14.0523 13.5523 14.5 13 14.5H3C2.44772 14.5 2 14.0523 2 13.5V9.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11.5 5.5L8 2L4.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 2V10.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t("attachImage")}
            </button>
            {imageFile && (
              <div className={styles.fileChip}>
                <span className={styles.fileName}>{imageFile.name}</span>
                <button
                  type="button"
                  className={styles.removeFile}
                  onClick={clearImage}
                  aria-label={t("removeImage")}
                >
                  ×
                </button>
              </div>
            )}
          </div>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className={styles.previewImage}
            />
          )}
          <select
            value={threadCategory}
            onChange={(e) => setThreadCategory(e.target.value)}
          >
            {CATEGORIES.slice(1).map((item) => (
              <option key={item} value={item}>
                {t(`categories.${item}`)}
              </option>
            ))}
          </select>
          <div className={styles.composerActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setShowComposer(false)}
            >
              {t("cancel")}
            </button>
            <button className={styles.postButton} disabled={saving}>
              {saving ? t("posting") : t("postDiscussion")}
            </button>
          </div>
        </form>
      )}

      {error && <p className={styles.error}>{error}</p>}
      <section className={styles.list}>
        {visibleThreads.map((thread) => (
          <Link
            href={`/forum/${thread.id}`}
            key={thread.id}
            className={styles.thread}
          >
            <div className={styles.threadTop}>
              <span className={styles.category}>
                {CATEGORIES.includes(thread.category as (typeof CATEGORIES)[number])
                  ? t(`categories.${thread.category as (typeof CATEGORIES)[number]}`)
                  : thread.category}
              </span>
              {thread.is_pinned && (
                <span className={styles.pinned}>{t("pinned")}</span>
              )}
            </div>
            <h2>{thread.title}</h2>
            {thread.body && <p>{thread.body}</p>}
            {thread.image_url && (
              <img
                src={thread.image_url}
                alt={thread.title}
                className={styles.threadImage}
              />
            )}
            <div className={styles.meta}>
              {t("byAuthor", { author: thread.author_email.split("@")[0] })} ·{" "}
              {t("repliesCount", { count: thread.reply_count })}
            </div>
          </Link>
        ))}
        {!error && visibleThreads.length === 0 && (
          <p className={styles.empty}>{t("noneYet")}</p>
        )}
      </section>
    </div>
  );
}
