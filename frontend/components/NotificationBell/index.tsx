"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notificationsApi, type NotificationItem } from "@/helpers/api";
import styles from "./NotificationBell.module.scss";

const POLL_INTERVAL_MS = 60_000;

function relativeTime(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function targetHref(item: NotificationItem): string | null {
  if (item.related_type === "campaign") return "/admin/ads-campaigns";
  if (item.related_type === "user") return "/admin/users";
  return null;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshUnreadCount = useCallback(() => {
    notificationsApi
      .unreadCount()
      .then((res) => setUnreadCount(res.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const id = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      notificationsApi
        .listMine()
        .then(setItems)
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      notificationsApi.markRead(item.id).catch(() => {});
    }
    const href = targetHref(item);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      // best-effort — a stale badge isn't worth surfacing an error for
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.bellBtn}
        onClick={toggleOpen}
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.73 21a2 2 0 0 1-3.46 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>You&apos;re all caught up.</div>
          ) : (
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    className={`${styles.item} ${!item.is_read ? styles.unread : ""}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <span className={styles.itemTitle}>{item.title}</span>
                    {item.body && <span className={styles.itemBody}>{item.body}</span>}
                    <span className={styles.itemTime}>{relativeTime(item.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
