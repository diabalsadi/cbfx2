"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdminPortal } from "@/helpers/roles";
import AdminLayout from "@/components/Layout";

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/admin/login";
  const isChangePasswordPage = pathname === "/admin/change-password";
  // A signed-in site user (role "user") still has `user` truthy here — the
  // token/session is shared across both portals — so admin pages must also
  // check the role, not just that someone is logged in.
  const isAuthorized = !!user && canAccessAdminPortal(user.role);
  // Set by a super_admin regenerating this account's password (see
  // users.regenerate_password()) — block every other admin page until it's
  // cleared, so a temp password emailed in plaintext can't linger as the
  // account's real password indefinitely.
  const mustChangePassword = isAuthorized && !!user?.must_change_password;

  useEffect(() => {
    if (loading || isLoginPage) return;
    if (!isAuthorized) {
      router.replace("/admin/login");
    } else if (mustChangePassword && !isChangePasswordPage) {
      router.replace("/admin/change-password");
    } else if (!mustChangePassword && isChangePasswordPage) {
      router.replace("/admin");
    }
  }, [isAuthorized, mustChangePassword, isChangePasswordPage, loading, router, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isChangePasswordPage) {
    return isAuthorized && mustChangePassword ? <>{children}</> : null;
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
          color: "var(--text-secondary)",
          fontSize: "14px",
        }}
      >
        Loading…
      </div>
    );
  }

  if (!isAuthorized || mustChangePassword) return null;

  return <AdminLayout>{children}</AdminLayout>;
}
