// React
// import { useMemo } from "react";
// Styles
import styles from "./DropownFilter.module.scss";
import cx from "classnames";
// Components
import Icon from "../Icon";

interface IDropownFilter {
  label: string;
  options: { value: string; label: string }[];
  value: string | number;
  onChange: (value: string) => void;
  icon?: string;
  className?: string;
}

const DropownFilter = ({
  label,
  options,
  value,
  onChange,
  icon,
  className,
}: IDropownFilter) => {
  return (
    <div className={cx(styles.container, className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.selectOption}
      >
        {label && <option value="">{label}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className={styles.icon}>{icon && <Icon icon={icon} />}</div>
    </div>
  );
};

export default DropownFilter;
