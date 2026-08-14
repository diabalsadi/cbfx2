"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminRole } from "@/helpers/roles";
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
  // A signed-in site user (role "user") still has `user` truthy here — the
  // token/session is shared across both portals — so admin pages must also
  // check the role, not just that someone is logged in.
  const isAuthorized = !!user && isAdminRole(user.role);

  useEffect(() => {
    if (!loading && !isAuthorized && !isLoginPage) {
      router.replace("/admin/login");
    }
  }, [isAuthorized, loading, router, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
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

  if (!isAuthorized) return null;

  return <AdminLayout>{children}</AdminLayout>;
}
