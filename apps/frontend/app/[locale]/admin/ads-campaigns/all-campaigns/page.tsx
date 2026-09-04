"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function AllCampaignsPage() {
  const t = useTranslations("adminAdsCampaigns");
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/ads-campaigns");
  }, [router]);
  return (
    <p style={{ color: "var(--text-muted)", padding: 40 }}>{t("redirecting")}</p>
  );
}
