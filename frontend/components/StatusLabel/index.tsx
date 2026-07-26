// Styles
import styles from "./StatusLabel.module.scss";
import cx from "classnames";

interface IStatusLabelProps {
  data: { status: string };
}

const StatusLabel = ({ data }: IStatusLabelProps) => {
  return (
    <div className={cx(styles.container, styles[data?.status?.toLowerCase()])}>
      {data?.status}
    </div>
  );
};

export default StatusLabel;
