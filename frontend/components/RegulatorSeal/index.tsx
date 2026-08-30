import { regulatorInfo } from "@/helpers/regulators";
import styles from "./RegulatorSeal.module.scss";

// A styled circular "seal" badge — deliberately not a real regulator logo
// (we don't have rights to reproduce trademarked FCA/CySEC/etc. artwork).
// The checkmark + ring read as "certified" without claiming to be official art.
export default function RegulatorSeal({
  code,
  size = "md",
}: {
  code: string;
  size?: "sm" | "md";
}) {
  const { code: label, jurisdiction } = regulatorInfo(code);

  return (
    <div className={`${styles.seal} ${size === "sm" ? styles.sm : ""}`} title={jurisdiction}>
      <span className={styles.sealCheck}>✓</span>
      <span className={styles.sealCode}>{label}</span>
      {jurisdiction && <span className={styles.sealJurisdiction}>{jurisdiction}</span>}
    </div>
  );
}
