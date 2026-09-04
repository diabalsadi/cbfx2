"use client";
import { useTranslations } from "next-intl";
import { useTheme } from "@/contexts/ThemeContext";
import { EconomicCalendarWidget } from "@/components/TradingViewWidgets";
import styles from "./calendar.module.scss";

export default function CalendarPage() {
  const t = useTranslations("calendar");
  const { theme } = useTheme();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
      </div>

      <div className={styles.calendarPanel}>
        <EconomicCalendarWidget theme={theme} />
      </div>
    </div>
  );
}
