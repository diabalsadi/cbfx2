"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import style from "./Layout.module.scss";
import cx from "classnames";

interface ILayoutProps {
  children: React.ReactNode;
  className?: string;
}

const navItems = [
  {
    labelKey: "overview",
    href: "/admin/overview",
    icon: "◈",
    roles: ["super_admin", "broker"],
  },
  { labelKey: "users", href: "/admin/users", icon: "⊹", roles: ["super_admin"] },
  {
    labelKey: "articles",
    href: "/admin/articles",
    icon: "◎",
    roles: ["super_admin", "editor"],
  },
  {
    labelKey: "campaigns",
    href: "/admin/ads-campaigns",
    icon: "◉",
    roles: ["super_admin", "broker"],
  },
  {
    labelKey: "referralClients",
    href: "/admin/referral-clients",
    icon: "⇄",
    roles: ["super_admin"],
  },
  {
    labelKey: "brokers",
    href: "/admin/brokers",
    icon: "⛁",
    roles: ["super_admin", "broker"],
  },
  {
    labelKey: "adPlacements",
    href: "/admin/ads-placements",
    icon: "▤",
    roles: ["super_admin"],
  },
  {
    labelKey: "seo",
    href: "/admin/seo",
    icon: "◇",
    roles: ["super_admin", "editor"],
  },
  {
    labelKey: "media",
    href: "/admin/media",
    icon: "▨",
    roles: ["super_admin", "editor"],
  },
  {
    labelKey: "reports",
    href: "/admin/reports",
    icon: "▣",
    roles: ["super_admin", "broker"],
  },
  {
    labelKey: "symbolCategories",
    href: "/admin/symbol-categories",
    icon: "◆",
    roles: ["super_admin"],
  },
  {
    labelKey: "rebatePayouts",
    href: "/admin/rebate-payouts",
    icon: "$",
    roles: ["super_admin"],
  },
  {
    labelKey: "withdrawalRequests",
    href: "/admin/withdrawal-requests",
    icon: "↓",
    roles: ["super_admin"],
  },
  {
    labelKey: "mt5Accounts",
    href: "/admin/mt5-accounts",
    icon: "⎋",
    roles: ["super_admin", "broker"],
  },
  {
    labelKey: "copyTraders",
    href: "/admin/copy-traders",
    icon: "⇉",
    roles: ["super_admin", "editor"],
  },
  {
    labelKey: "referrals",
    href: "/admin/referrals",
    icon: "⇄",
    roles: ["client"],
  },
  {
    labelKey: "account",
    href: "/admin/account",
    icon: "◍",
    roles: ["super_admin", "editor", "broker"],
  },
] as const;

const Layout = ({ children, className }: ILayoutProps) => {
  const t = useTranslations("admin");
  const tNav = useTranslations("admin.nav");
  const tRoles = useTranslations("admin.roles");
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const role = user?.role || "";
  const filteredNav = navItems.filter((item) => (item.roles as readonly string[]).includes(role));
  const KNOWN_ROLES = ["super_admin", "editor", "broker", "client"] as const;
  const roleLabel = (r: string) =>
    (KNOWN_ROLES as readonly string[]).includes(r) ? tRoles(r as (typeof KNOWN_ROLES)[number]) : r;

  const toggleSidebar = useCallback(
    () => setIsSidebarOpen((prev) => !prev),
    [],
  );

  const getTitle = () => {
    if (!pathname) return "";
    // Prefer the current nav item's translated label so the page title
    // always matches the sidebar link, rather than title-casing the raw
    // (English, untranslated) URL segment.
    const match = navItems.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
    if (match) return tNav(match.labelKey);
    const segs = pathname.split("/").filter(Boolean);
    const last = segs[segs.length - 1];
    if (!last || last === "admin") return t("dashboard");
    return last
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  useEffect(() => {
    if (isSidebarOpen) document.body.classList.add("overflow-hidden");
    else document.body.classList.remove("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [isSidebarOpen]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  return (
    <div className={style.container}>
      {isSidebarOpen && (
        <div className={style.overlay} onClick={toggleSidebar} />
      )}

      <aside className={cx(style.sidebar, { [style.open]: isSidebarOpen })}>
        <div className={style.sidebarInner}>
          <div className={style.sidebarLogo}>
            <div className={style.logoMark}>CB</div>
            <span className={style.logoText}>CBFX</span>
            <button
              className={style.closeTrigger}
              onClick={toggleSidebar}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className={style.roleBadge}>{roleLabel(role)}</div>

          <nav className={style.nav}>
            <ul className={style.navList}>
              {filteredNav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cx(style.navItem, {
                        [style.active]: isActive,
                      })}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <span className={style.navIcon}>{item.icon}</span>
                      <span className={style.navLabel}>{tNav(item.labelKey)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className={style.spacer} />

          <div className={style.sidebarUser}>
            <div className={style.avatar}>{initials}</div>
            <div className={style.userInfo}>
              <span className={style.userName}>
                {user?.name || user?.email}
              </span>
              <span className={style.userRole}>{roleLabel(role)}</span>
            </div>
            <button
              className={style.logoutBtn}
              onClick={logout}
              title={t("signOut")}
            >
              →
            </button>
          </div>
        </div>
      </aside>

      <div className={style.main}>
        <header className={style.topbar}>
          <div className={style.topbarLeft}>
            <button
              className={style.menuBtn}
              onClick={toggleSidebar}
              aria-label={t("menu")}
            >
              <span />
              <span />
              <span />
            </button>
            <h1 className={style.pageTitle}>{getTitle()}</h1>
          </div>
          <div className={style.topbarRight}>
            <LanguageSwitcher />
            {role === "super_admin" && <NotificationBell />}
            <button
              className={style.themeToggle}
              onClick={toggleTheme}
              aria-label={t("toggleTheme")}
            >
              {theme === "dark" ? "☀︎" : "☽"}
            </button>
          </div>
        </header>
        <main className={cx(style.content, className)}>{children}</main>
      </div>
    </div>
  );
};

export default Layout;
