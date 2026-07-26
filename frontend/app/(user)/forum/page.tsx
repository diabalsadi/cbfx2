"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
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
];

export default function ForumPage() {
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
      setShowComposer(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to create thread.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>
            <span>CBFX</span> Forum
          </h1>
          <p>
            Discuss markets, trading ideas, and strategies with the community.
          </p>
        </div>
        <button className={styles.createButton} onClick={openComposer}>
          + New discussion
        </button>
      </header>

      <div className={styles.filters} aria-label="Forum categories">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            className={category === item ? styles.activeFilter : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {showComposer && (
        <form className={styles.composer} onSubmit={createThread}>
          <div className={styles.composerHeader}>Start a discussion</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What would you like to discuss?"
            required
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add context, chart ideas, or a question…"
            rows={4}
          />
          <input type="file" accept="image/*" onChange={handleImageSelection} />
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
              <option key={item}>{item}</option>
            ))}
          </select>
          <div className={styles.composerActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setShowComposer(false)}
            >
              Cancel
            </button>
            <button className={styles.postButton} disabled={saving}>
              {saving ? "Posting…" : "Post discussion"}
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
              <span className={styles.category}>{thread.category}</span>
              {thread.is_pinned && (
                <span className={styles.pinned}>Pinned</span>
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
              By {thread.author_email.split("@")[0]} · {thread.reply_count}{" "}
              replies
            </div>
          </Link>
        ))}
        {!error && visibleThreads.length === 0 && (
          <p className={styles.empty}>No discussions in this category yet.</p>
        )}
      </section>
    </div>
  );
}
