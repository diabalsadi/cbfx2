"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./UserNav.module.scss";
import cx from "classnames";
import { useState } from "react";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Markets", href: "/markets" },
  { label: "Brokers", href: "/brokers" },
  { label: "Copy Trading", href: "/copy-trading" },
  { label: "Plays", href: "/plays" },
  { label: "Analysis", href: "/analysis" },
  { label: "News", href: "/news" },
  { label: "Calendar", href: "/calendar" },
  { label: "Forum", href: "/forum" },
  { label: "Cashback", href: "/cashback" },
];

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
            aria-label="Menu"
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
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={styles.actions}>
            <button
              className={styles.themeBtn}
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀︎" : "☽"}
            </button>
            {user ? (
              <button className={styles.signIn} onClick={logout}>
                Sign out
              </button>
            ) : (
              <>
                <button className={styles.signIn} onClick={openLoginModal}>
                  Sign in
                </button>
                <button className={styles.getStarted} onClick={openLoginModal}>
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {mobileOpen && (
        <nav className={styles.mobileMenu}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx({ [styles.active]: isActive(item.href) })}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <button
              className={styles.mobileSignIn}
              onClick={() => {
                setMobileOpen(false);
                logout();
              }}
            >
              Sign out
            </button>
          ) : (
            <button
              className={styles.mobileSignIn}
              onClick={() => {
                setMobileOpen(false);
                openLoginModal();
              }}
            >
              Sign in
            </button>
          )}
        </nav>
      )}
    </>
  );
}
