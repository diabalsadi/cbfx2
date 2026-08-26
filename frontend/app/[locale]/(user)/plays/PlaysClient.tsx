"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import styles from "./plays.module.scss";
import { playsApi, type Play } from "@/helpers/api";

export default function PlaysPage() {
  const t = useTranslations("plays");
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "open" | "closed" | "cancelled"
  >("open");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    const apiParam = typeFilter === "all" ? undefined : typeFilter;
    playsApi
      .listOpen(apiParam)
      .then((data) => {
        setPlays(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [typeFilter]);

  const filteredPlays = plays.filter((play) => {
    const matchesSearch = play.pair
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ? true : play.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("title")}</h1>
          <p className={styles.pageSubtitle}>{t("subtitle")}</p>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.leftControls}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>⌕</span>
            <input
              className={styles.search}
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className={styles.dropdown}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">{t("allPlayTypes")}</option>
            <option value="Scalp">{t("scalp")}</option>
            <option value="Swing">{t("swing")}</option>
            <option value="Long-term">{t("longTerm")}</option>
          </select>
        </div>

        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${statusFilter === "open" ? styles.activeFilter : ""}`}
            onClick={() => setStatusFilter("open")}
          >
            {t("activePlays")}
          </button>
          <button
            className={`${styles.filterBtn} ${statusFilter === "all" ? styles.activeFilter : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            {t("allPlays")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>{t("loading")}</p>
        </div>
      ) : filteredPlays.length === 0 ? (
        <div className={styles.empty}>
          <h3>{t("noResultsTitle")}</h3>
          <p>{t("noResultsSub")}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredPlays.map((play) => {
            const isLong = play.direction === "LONG";
            return (
              <div
                key={play.id}
                className={`${styles.card} ${isLong ? styles.longCard : styles.shortCard}`}
                onClick={() => setSelectedPlay(play)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.pairInfo}>
                    <span className={styles.pair}>{play.pair}</span>
                    <div className={styles.metaBadgeRow}>
                      <span className={styles.timeframe}>
                        {play.timeframe || t("na")}
                      </span>
                      <span className={styles.playType}>{play.play_type}</span>
                    </div>
                  </div>
                  <span
                    className={`${styles.direction} ${isLong ? styles.long : styles.short}`}
                  >
                    {play.direction}
                  </span>
                </div>

                <div className={styles.levels}>
                  <div className={styles.levelRow}>
                    <span className={styles.levelLabel}>{t("entryPrice")}</span>
                    <span className={styles.levelValue}>
                      {play.entry_price}
                    </span>
                  </div>
                  <div className={styles.levelRow}>
                    <span className={styles.levelLabel}>{t("takeProfit")}</span>
                    <span className={`${styles.levelValue} ${styles.tpText}`}>
                      {play.take_profit || "—"}
                    </span>
                  </div>
                  <div className={styles.levelRow}>
                    <span className={styles.levelLabel}>{t("stopLoss")}</span>
                    <span className={`${styles.levelValue} ${styles.slText}`}>
                      {play.stop_loss || "—"}
                    </span>
                  </div>
                </div>

                {play.notes && (
                  <p className={styles.excerpt}>
                    {play.notes.length > 90
                      ? `${play.notes.substring(0, 90)}...`
                      : play.notes}
                  </p>
                )}

                <div className={styles.cardFooter}>
                  <span className={styles.status}>
                    <span
                      className={`${styles.dot} ${play.status === "open" ? styles.dotOpen : ""}`}
                    />
                    {play.status.toUpperCase()}
                  </span>
                  <span className={styles.viewDetails}>{t("details")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPlay && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedPlay(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              onClick={() => setSelectedPlay(null)}
            >
              ✕
            </button>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleWrap}>
                <h2>{t("setup", { pair: selectedPlay.pair })}</h2>
                <span
                  className={`${styles.modalDirection} ${selectedPlay.direction === "LONG" ? styles.long : styles.short}`}
                >
                  {selectedPlay.direction}
                </span>
                <span className={styles.modalTypeBadge}>
                  {selectedPlay.play_type}
                </span>
              </div>
              <span className={styles.modalTimeframe}>
                {t("timeframeLabel", { timeframe: selectedPlay.timeframe || t("any") })}
              </span>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailLevels}>
                <div className={styles.detailLevelBox}>
                  <span className={styles.detailLabel}>{t("entryPrice")}</span>
                  <span className={styles.detailVal}>
                    {selectedPlay.entry_price}
                  </span>
                </div>
                <div className={styles.detailLevelBox}>
                  <span className={styles.detailLabel}>{t("takeProfitAbbrev")}</span>
                  <span className={`${styles.detailVal} ${styles.tpText}`}>
                    {selectedPlay.take_profit || "—"}
                  </span>
                </div>
                <div className={styles.detailLevelBox}>
                  <span className={styles.detailLabel}>{t("stopLossAbbrev")}</span>
                  <span className={`${styles.detailVal} ${styles.slText}`}>
                    {selectedPlay.stop_loss || "—"}
                  </span>
                </div>
              </div>

              {selectedPlay.notes && (
                <div className={styles.notesSection}>
                  <h3>{t("analysisNotes")}</h3>
                  <p>{selectedPlay.notes}</p>
                </div>
              )}

              <div className={styles.metaInfo}>
                <div className={styles.metaRow}>
                  <span>{t("status")}</span>
                  <span
                    className={`${styles.statusBadge} ${selectedPlay.status === "open" ? styles.statusOpen : ""}`}
                  >
                    {selectedPlay.status.toUpperCase()}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span>{t("publishedBy")}</span>
                  <span>{selectedPlay.author_email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
