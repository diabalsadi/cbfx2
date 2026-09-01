"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { api, type AdPlacementPage } from "@/helpers/api";
import BrokerSectionPlacements from "./BrokerSectionPlacements";
import AdBanners from "./AdBanners";
import styles from "./AdsPlacements.module.scss";

interface BrokerOption {
  id: string;
  name: string;
}

export default function AdsPlacementsAdminPage() {
  const t = useTranslations("adminAdsPlacements");

  const PAGES: {
    value: AdPlacementPage;
    label: string;
    description: string;
    hasBrokerSections: boolean;
  }[] = [
    {
      value: "homepage",
      label: t("pageHomepageLabel"),
      description: t("pageHomepageDescription"),
      hasBrokerSections: true,
    },
    {
      value: "signin",
      label: t("pageSigninLabel"),
      description: t("pageSigninDescription"),
      hasBrokerSections: false,
    },
    {
      value: "header",
      label: t("pageHeaderLabel"),
      description: t("pageHeaderDescription"),
      hasBrokerSections: false,
    },
  ];

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
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <div className={styles.pageSelectWrap}>
          <label className={styles.pageSelectLabel} htmlFor="ad-placements-page">
            {t("route")}
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

      {activePage.hasBrokerSections && <BrokerSectionPlacements brokers={brokers} />}
      <AdBanners page={page} />
    </div>
  );
}
