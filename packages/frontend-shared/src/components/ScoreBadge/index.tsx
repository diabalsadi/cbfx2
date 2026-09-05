import styles from "./ScoreBadge.module.scss";

// Renders nothing when there's no score yet, rather than an empty/zero
// badge — a broker with no editorial score shouldn't look like it scored 0.
export default function ScoreBadge({
  score,
  size,
}: {
  score: number | null | undefined;
  size?: "sm" | "md";
}) {
  if (score == null) return null;

  return (
    <span className={`${styles.badge} ${size === "sm" ? styles.sm : ""}`}>
      <span className={styles.value}>{score.toFixed(1)}</span>
      <span className={styles.max}>/10</span>
    </span>
  );
}
