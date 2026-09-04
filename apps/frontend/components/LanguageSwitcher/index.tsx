"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import styles from "./LanguageSwitcher.module.scss";
import cx from "classnames";

// Native-language names, not English translations — a visitor should always
// recognize their own language in this list regardless of what locale is
// currently active.
const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  es: "Español",
  fa: "فارسی",
  pt: "Português",
  zh: "中文",
  vi: "Tiếng Việt",
  hi: "हिन्दी",
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const switchTo = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    // Keeps the visitor on the same page (including any dynamic segments,
    // since `pathname` here is already the resolved path, not a template) —
    // only the locale segment changes. next-intl's router also persists the
    // choice to the NEXT_LOCALE cookie, so middleware.ts's IP-geo default
    // never overrides a visitor's own manual pick on a later visit.
    router.replace(pathname, { locale: next });
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.globeIcon}>🌐</span>
        <span className={styles.currentLabel}>{LOCALE_LABELS[locale as Locale]}</span>
        <span className={cx(styles.chevron, { [styles.chevronOpen]: open })}>▾</span>
      </button>
      {open && (
        <ul className={styles.menu} role="listbox">
          {locales.map((loc) => (
            <li key={loc}>
              <button
                type="button"
                className={cx(styles.option, { [styles.optionActive]: loc === locale })}
                onClick={() => switchTo(loc)}
                role="option"
                aria-selected={loc === locale}
              >
                {LOCALE_LABELS[loc]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
