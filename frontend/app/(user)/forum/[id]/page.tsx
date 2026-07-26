"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  use,
  useEffect,
  useRef,
  useState,
} from "react";
import { forumApi, type ForumThreadDetail } from "@/helpers/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import styles from "../forum.module.scss";

export default function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [thread, setThread] = useState<ForumThreadDetail | null>(null);
  const [reply, setReply] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    forumApi
      .getThread(id)
      .then(setThread)
      .catch((err) => setError(err.message));
  }, [id]);

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

  async function submitReply(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      openLoginModal();
      return;
    }
    if (!reply.trim() && !imageFile) return;
    setSaving(true);
    try {
      const formData = new FormData();
      if (reply.trim()) formData.append("body", reply.trim());
      if (imageFile) formData.append("image", imageFile);

      const created = await forumApi.createReply(id, formData);
      setThread((current) =>
        current
          ? {
              ...current,
              reply_count: current.reply_count + 1,
              replies: [...current.replies, created],
            }
          : current,
      );
      setReply("");
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to post reply.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !thread) return <p className={styles.error}>{error}</p>;
  if (!thread) return <p className={styles.empty}>Loading discussion…</p>;

  return (
    <div className={styles.page}>
      <Link href="/forum" className={styles.back}>
        ← Back to forum
      </Link>
      <article className={styles.detail}>
        <div className={styles.threadTop}>
          <span className={styles.category}>{thread.category}</span>
          {thread.is_pinned && <span className={styles.pinned}>Pinned</span>}
        </div>
        <h1>{thread.title}</h1>
        {thread.body && <p>{thread.body}</p>}
        {thread.image_url && (
          <img
            src={thread.image_url}
            alt={thread.title}
            className={styles.threadImage}
          />
        )}
        <div className={styles.meta}>
          Started by {thread.author_email.split("@")[0]} ·{" "}
          {thread.replies.length} replies
        </div>
      </article>

      <section className={styles.replies}>
        <h2>Replies</h2>
        {thread.replies.map((item) => (
          <div key={item.id} className={styles.reply}>
            <div className={styles.replyAuthor}>
              {item.author_email.split("@")[0]}
            </div>
            {item.body && <p>{item.body}</p>}
            {item.image_url && (
              <img
                src={item.image_url}
                alt="Reply attachment"
                className={styles.threadImage}
              />
            )}
          </div>
        ))}
        {thread.replies.length === 0 && (
          <p className={styles.empty}>Be the first to reply.</p>
        )}
      </section>

      <form className={styles.replyForm} onSubmit={submitReply}>
        <label>Join the discussion</label>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={user ? "Write a reply…" : "Sign in to reply…"}
          disabled={!user}
          rows={4}
        />
        <div className={styles.fileUpload}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelection}
            disabled={!user}
            className={styles.hiddenFileInput}
          />
          <button
            type="button"
            className={styles.attachButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={!user}
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
            Attach image
          </button>
          {imageFile && (
            <div className={styles.fileChip}>
              <span className={styles.fileName}>{imageFile.name}</span>
              <button
                type="button"
                className={styles.removeFile}
                onClick={clearImage}
                aria-label="Remove image"
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
        {user ? (
          <button className={styles.postButton} disabled={saving}>
            {saving ? "Posting…" : "Post reply"}
          </button>
        ) : (
          <button
            type="button"
            className={styles.postButton}
            onClick={openLoginModal}
          >
            Sign in to reply
          </button>
        )}
      </form>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
