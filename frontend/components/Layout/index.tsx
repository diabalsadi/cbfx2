"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import style from "./Layout.module.scss";
import cx from "classnames";

interface ILayoutProps {
  children: React.ReactNode;
  className?: string;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  broker: "Broker",
};

const navItems = [
  {
    label: "Overview",
    href: "/admin/overview",
    icon: "◈",
    roles: ["super_admin", "broker"],
  },
  { label: "Users", href: "/admin/users", icon: "⊹", roles: ["super_admin"] },
  {
    label: "Articles",
    href: "/admin/articles",
    icon: "◎",
    roles: ["super_admin", "editor"],
  },
  {
    label: "Campaigns",
    href: "/admin/ads-campaigns",
    icon: "◉",
    roles: ["super_admin", "broker"],
  },
  {
    label: "Clients",
    href: "/admin/clients",
    icon: "◫",
    roles: ["super_admin", "broker"],
  },
  {
    label: "Brokers",
    href: "/admin/brokers",
    icon: "⛁",
    roles: ["super_admin", "broker"],
  },
  {
    label: "Ad Placements",
    href: "/admin/ads-placements",
    icon: "▤",
    roles: ["super_admin", "broker"],
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: "▣",
    roles: ["super_admin", "broker"],
  },
  {
    label: "Account",
    href: "/admin/account",
    icon: "◍",
    roles: ["super_admin", "editor", "broker"],
  },
];

const Layout = ({ children, className }: ILayoutProps) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const role = user?.role || "";
  const filteredNav = navItems.filter((item) => item.roles.includes(role));

  const toggleSidebar = useCallback(
    () => setIsSidebarOpen((prev) => !prev),
    [],
  );

  const getTitle = () => {
    if (!pathname) return "";
    const segs = pathname.split("/").filter(Boolean);
    const last = segs[segs.length - 1];
    if (!last || last === "admin") return "Dashboard";
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

          <div className={style.roleBadge}>{roleLabels[role] || role}</div>

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
                      <span className={style.navLabel}>{item.label}</span>
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
              <span className={style.userRole}>{roleLabels[role]}</span>
            </div>
            <button
              className={style.logoutBtn}
              onClick={logout}
              title="Sign out"
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
              aria-label="Menu"
            >
              <span />
              <span />
              <span />
            </button>
            <h1 className={style.pageTitle}>{getTitle()}</h1>
          </div>
          <div className={style.topbarRight}>
            <button
              className={style.themeToggle}
              onClick={toggleTheme}
              aria-label="Toggle theme"
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
