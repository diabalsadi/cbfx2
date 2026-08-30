import styles from "./StarRating.module.scss";

const FIVE_STARS = "★★★★★";

// Renders nothing when there's no rating yet, rather than an empty/zero
// star row — a broker with no editorial rating shouldn't look 0-starred.
export default function StarRating({
  rating,
  size,
}: {
  rating: number | null | undefined;
  size?: "sm" | "md";
}) {
  if (rating == null) return null;
  const pct = `${(Math.max(0, Math.min(5, rating)) / 5) * 100}%`;

  return (
    <span
      className={`${styles.stars} ${size === "sm" ? styles.sm : ""}`}
      role="img"
      aria-label={`${rating} / 5`}
    >
      <span className={styles.starsBg}>{FIVE_STARS}</span>
      {/* Same glyphs re-rendered in gold on top, clipped to the rating's
          percentage — gives an exact partial-star fill with no images/SVG. */}
      <span className={styles.starsFill} style={{ width: pct }}>
        {FIVE_STARS}
      </span>
    </span>
  );
}
