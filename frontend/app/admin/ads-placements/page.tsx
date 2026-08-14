"use client";
import { useState, useEffect } from "react";
import { api, type AdPlacementPage } from "@/helpers/api";
import BrokerSectionPlacements from "./BrokerSectionPlacements";
import AdBanners from "./AdBanners";
import styles from "./AdsPlacements.module.scss";

interface BrokerOption {
  id: string;
  name: string;
}

const PAGES: { value: AdPlacementPage; label: string; description: string }[] = [
  {
    value: "homepage",
    label: "Homepage",
    description:
      "Featured Brokers, Sponsored Brokers, Featured Partners, More Partner Brokers, and the standalone sponsored banner ads.",
  },
];

export default function AdsPlacementsAdminPage() {
  const [page, setPage] = useState<AdPlacementPage>(PAGES[0].value);
  const [brokers, setBrokers] = useState<BrokerOption[]>([]);

  useEffect(() => {
    api
      .get<BrokerOption[]>("/brokers/")
      .then(setBrokers)
      .catch(() => setBrokers([]));
  }, []);

  const activePage = PAGES.find((p) => p.value === page) ?? PAGES[0];

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Ad Placements</h2>
          <p className={styles.subtitle}>
            Configure which ad blocks appear on each route, and what fills them.
          </p>
        </div>
        <div className={styles.pageSelectWrap}>
          <label className={styles.pageSelectLabel} htmlFor="ad-placements-page">
            Route
          </label>
          <select
            id="ad-placements-page"
            className={styles.pageSelect}
            value={page}
            onChange={(e) => setPage(e.target.value as AdPlacementPage)}
          >
            {PAGES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className={styles.pageDescription}>{activePage.description}</p>

      {page === "homepage" && (
        <>
          <BrokerSectionPlacements brokers={brokers} />
          <AdBanners page="homepage" />
        </>
      )}
    </div>
  );
}
