"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AllCampaignsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/ads-campaigns");
  }, [router]);
  return (
    <p style={{ color: "var(--text-muted)", padding: 40 }}>Redirecting…</p>
  );
}
