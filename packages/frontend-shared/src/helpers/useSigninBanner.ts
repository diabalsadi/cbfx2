"use client";
import { useState, useEffect } from "react";
import { publicApi, type AdBannerContent } from "@/helpers/api";

// The "signin" / "featured_broker" ad placement — shared by every standalone
// auth page (login, register) so they all show the same admin-configured
// featured broker panel.
export function useSigninBanner(): AdBannerContent | null {
  const [banner, setBanner] = useState<AdBannerContent | null>(null);

  useEffect(() => {
    publicApi
      .adBanners("signin")
      .then((banners) => setBanner(banners.featured_broker ?? null))
      .catch(() => setBanner(null));
  }, []);

  return banner;
}
