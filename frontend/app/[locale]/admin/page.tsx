"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminRootPage() {
  const t = useTranslations("adminAuth");
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "editor") {
        router.replace("/admin/articles");
      } else if (user.role === "broker" || user.role === "super_admin") {
        router.replace("/admin/overview");
      } else if (user.role === "client") {
        router.replace("/admin/referrals");
      } else {
        // Fallback for an unknown role
        router.replace("/admin/overview");
      }
    } else if (!loading && !user) {
      router.replace("/admin/login");
    }
  }, [user, loading, router]);

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
      {t("loading")}
    </div>
  );
}
