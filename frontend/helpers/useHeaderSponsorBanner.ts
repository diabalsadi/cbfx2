"use client";
import { useState, useEffect } from "react";
import { publicApi, type AdBannerContent } from "@/helpers/api";

// The "header" / "sponsor_logo" ad placement — the "Sponsored by" logo shown
// next to the site logo. Fetched once and shared by every page under the
// (user) layout via UserNav, same pattern as useSigninBanner for the auth
// pages' featured-broker panel.
export function useHeaderSponsorBanner(): AdBannerContent | null {
  const [banner, setBanner] = useState<AdBannerContent | null>(null);

  useEffect(() => {
    publicApi
      .adBanners("header")
      .then((banners) => setBanner(banners.sponsor_logo ?? null))
      .catch(() => setBanner(null));
  }, []);

  return banner;
}
