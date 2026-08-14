"use client";
import { useTheme } from "@/contexts/ThemeContext";
import { EconomicCalendarWidget } from "@/components/TradingViewWidgets";
import styles from "./calendar.module.scss";

export default function CalendarPage() {
  const { theme } = useTheme();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Economic Calendar</h1>
        <p className={styles.subtitle}>Live macro events, powered by TradingView</p>
      </div>

      <div className={styles.calendarPanel}>
        <EconomicCalendarWidget theme={theme} />
      </div>
    </div>
  );
}
