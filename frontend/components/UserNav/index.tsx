"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import { useAuth } from "@/contexts/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import styles from "./UserNav.module.scss";
import cx from "classnames";
import { useState } from "react";

const navItems = [
  { labelKey: "home", href: "/" },
  { labelKey: "markets", href: "/markets" },
  { labelKey: "copyTrading", href: "/copy-trading" },
  { labelKey: "plays", href: "/plays" },
  { labelKey: "analysis", href: "/analysis" },
  { labelKey: "news", href: "/news" },
  { labelKey: "calendar", href: "/calendar" },
  { labelKey: "forum", href: "/forum" },
  { labelKey: "cashback", href: "/cashback" },
] as const;

function LogoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#f97316" />
      <polyline
        points="6,22 12,14 18,18 26,8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function UserNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { openLoginModal } = useLoginModal();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <>
      <header className={styles.navbar}>
        <div className={styles.inner}>
          <button
            className={styles.menuBtn}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={t("menu")}
          >
            <span />
            <span />
            <span />
          </button>

          <Link href="/" className={styles.logo}>
            <LogoIcon />
            <span className={styles.logoText}>CBFX</span>
          </Link>

          <nav className={styles.nav}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(styles.navLink, {
                  [styles.active]: isActive(item.href),
                })}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <div className={styles.actions}>
            <LanguageSwitcher />
            <button
              className={styles.themeBtn}
              onClick={toggleTheme}
              aria-label={t("toggleTheme")}
            >
              {theme === "dark" ? "☀︎" : "☽"}
            </button>
            {user ? (
              <>
                {user.role === "client" && (
                  <Link href="/referrals" className={styles.signIn}>
                    {t("referrals")}
                  </Link>
                )}
                <Link href="/account" className={styles.signIn}>
                  {t("account")}
                </Link>
                <button className={styles.signIn} onClick={logout}>
                  {t("signOut")}
                </button>
              </>
            ) : (
              <>
                <button className={styles.signIn} onClick={openLoginModal}>
                  {t("signIn")}
                </button>
                <button className={styles.getStarted} onClick={openLoginModal}>
                  {t("getStarted")}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {mobileOpen && (
        <nav className={styles.mobileMenu}>
          <div className={styles.mobileLangRow}>
            <LanguageSwitcher />
          </div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx({ [styles.active]: isActive(item.href) })}
              onClick={() => setMobileOpen(false)}
            >
              {t(item.labelKey)}
            </Link>
          ))}
          {user ? (
            <>
              {user.role === "client" && (
                <Link
                  href="/referrals"
                  className={cx({ [styles.active]: isActive("/referrals") })}
                  onClick={() => setMobileOpen(false)}
                >
                  {t("referrals")}
                </Link>
              )}
              <Link
                href="/account"
                className={cx({ [styles.active]: isActive("/account") })}
                onClick={() => setMobileOpen(false)}
              >
                {t("account")}
              </Link>
              <button
                className={styles.mobileSignIn}
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
              >
                {t("signOut")}
              </button>
            </>
          ) : (
            <button
              className={styles.mobileSignIn}
              onClick={() => {
                setMobileOpen(false);
                openLoginModal();
              }}
            >
              {t("signIn")}
            </button>
          )}
        </nav>
      )}
    </>
  );
}
