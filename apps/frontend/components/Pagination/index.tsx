// Styles
import styles from "./Pagination.module.scss";
import cx from "classnames";
// Icons
import ArrowLeft from "@/assets/icons/arrowLeft.svg";

interface IPagination {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: IPagination) => {
  return (
    <div className={styles.container}>
      <button
        className={styles.pageButton}
        onClick={() => {
          onPageChange(1);
        }}
      >
        <ArrowLeft />
        <ArrowLeft />
      </button>
      <button
        className={styles.pageButton}
        onClick={() => {
          onPageChange(currentPage - 1);
        }}
      >
        <ArrowLeft />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          className={cx(styles.pageButton, {
            [styles.active]: page === currentPage,
          })}
          key={page}
          onClick={() => {
            onPageChange(page);
          }}
        >
          {page}
        </button>
      ))}
      {currentPage < totalPages && (
        <button
          className={styles.pageButton}
          onClick={() => {
            onPageChange(currentPage + 1);
          }}
        >
          <ArrowLeft className={styles.arrowRight} />
        </button>
      )}
      <button
        className={styles.pageButton}
        onClick={() => {
          onPageChange(totalPages);
        }}
      >
        <ArrowLeft className={styles.arrowRight} />
        <ArrowLeft className={styles.arrowRight} />
      </button>
    </div>
  );
};

export default Pagination;
